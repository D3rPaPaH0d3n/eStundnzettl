package com.estundnzettl.app.data

import android.content.Context
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.io.ByteArrayOutputStream
import java.security.KeyStore
import java.security.interfaces.RSAKey
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Keystore-backed storage for the Nextcloud app password. */
class SecretStore(private val context: Context) {

    companion object {
        private const val TAG = "SecretStore"
        private const val PREFS_NAME = "estundnzettl_secrets"
        const val NEXTCLOUD_SECRET_KEY = "nextcloud_app_secret_v1"
        private const val LEGACY_NEXTCLOUD_SECRET_KEY = "nextcloud_app_password_v1"
        private const val CAPACITOR_PREFS_NAME = "cap_sec"
        private const val ENC_PREFIX = "enc:v1:"
        private const val LEGACY_OBF_PREFIX = "obf:"
    }

    private val prefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun get(key: String): String? = try {
        prefs.getString(key, null)
    } catch (exception: Exception) {
        Log.w(TAG, "Secret read failed", exception)
        null
    }

    /** Writes and immediately verifies a secret before reporting success. */
    fun set(key: String, value: String): Boolean = try {
        prefs.edit().putString(key, value).apply()
        prefs.getString(key, null) == value
    } catch (exception: Exception) {
        Log.w(TAG, "Secret write failed", exception)
        false
    }

    fun delete(key: String) {
        try {
            prefs.edit().remove(key).apply()
        } catch (exception: Exception) {
            Log.w(TAG, "Secret delete failed", exception)
        }
    }

    enum class CapacitorMigrationStatus {
        NOT_FOUND,
        ALREADY_PRESENT,
        MIGRATED_CURRENT_KEY,
        MIGRATED_LEGACY_KEY,
    }

    /**
     * Migrates the value written by capacitor-secure-storage-plugin.
     *
     * The production rewrite retains package name, UID and signing identity,
     * so the old private SharedPreferences file and Android Keystore key remain
     * readable after an in-place update. Both are left untouched for rollback.
     */
    fun migrateCapacitorNextcloudSecret(): CapacitorMigrationStatus {
        if (!get(NEXTCLOUD_SECRET_KEY).isNullOrEmpty()) {
            return CapacitorMigrationStatus.ALREADY_PRESENT
        }

        val legacyPrefs = context.getSharedPreferences(CAPACITOR_PREFS_NAME, Context.MODE_PRIVATE)
        val source = when {
            legacyPrefs.contains(NEXTCLOUD_SECRET_KEY) ->
                NEXTCLOUD_SECRET_KEY to CapacitorMigrationStatus.MIGRATED_CURRENT_KEY
            legacyPrefs.contains(LEGACY_NEXTCLOUD_SECRET_KEY) ->
                LEGACY_NEXTCLOUD_SECRET_KEY to CapacitorMigrationStatus.MIGRATED_LEGACY_KEY
            else -> return CapacitorMigrationStatus.NOT_FOUND
        }
        val encoded = legacyPrefs.getString(source.first, null)
            ?: error("Capacitor secret preference exists but is not a string")
        val password = decryptCapacitorValue(encoded)
        check(password.isNotEmpty()) { "Capacitor Nextcloud secret decrypted to an empty value" }
        check(set(NEXTCLOUD_SECRET_KEY, password)) { "Migrated Nextcloud secret could not be verified" }
        return source.second
    }

    /** Migrates the older SQLite/localStorage secret representation. */
    fun migrateLegacyRawNextcloudSecret(value: String?, masterKeyBase64: String?): Boolean {
        if (!get(NEXTCLOUD_SECRET_KEY).isNullOrEmpty() || value.isNullOrEmpty()) return false
        val password = deobfuscateLegacy(value, masterKeyBase64)
        check(password.isNotEmpty()) { "Legacy Nextcloud secret could not be decrypted" }
        check(set(NEXTCLOUD_SECRET_KEY, password)) { "Legacy Nextcloud secret could not be verified" }
        return true
    }

    private fun decryptCapacitorValue(encoded: String): String {
        val encrypted = Base64.decode(encoded, Base64.DEFAULT)
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val alias = context.packageName + "_cap_sec"
        val privateKey = keyStore.getKey(alias, null)

        // The plugin used a base64-only fallback when Android Keystore setup
        // failed. Supporting it keeps even those rare installations migratable.
        if (privateKey == null) return String(encrypted, Charsets.UTF_8)

        val blockSize = ((privateKey as? RSAKey)?.modulus?.bitLength()?.plus(7)?.div(8)) ?: 256
        check(encrypted.isNotEmpty()) { "Empty Capacitor secret payload" }
        if (encrypted.size % blockSize != 0) return String(encrypted, Charsets.UTF_8)
        val output = ByteArrayOutputStream()
        var offset = 0
        while (offset < encrypted.size) {
            val cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding")
            cipher.init(Cipher.DECRYPT_MODE, privateKey)
            output.write(cipher.doFinal(encrypted, offset, blockSize))
            offset += blockSize
        }
        return output.toString(Charsets.UTF_8.name())
    }

    /**
     * Decodes the older TypeScript representation:
     *  - enc:v1:<base64(iv)>:<base64(ciphertext)> (AES-GCM)
     *  - obf:<base64(utf8)>
     *  - plain text
     */
    fun deobfuscateLegacy(value: String?, masterKeyBase64: String?): String {
        if (value.isNullOrEmpty()) return ""

        if (value.startsWith(ENC_PREFIX)) {
            if (masterKeyBase64.isNullOrEmpty()) return ""
            return try {
                val body = value.removePrefix(ENC_PREFIX)
                val separator = body.indexOf(':')
                if (separator < 0) return ""
                val iv = Base64.decode(body.substring(0, separator), Base64.DEFAULT)
                val ciphertext = Base64.decode(body.substring(separator + 1), Base64.DEFAULT)
                val keyBytes = Base64.decode(masterKeyBase64, Base64.DEFAULT)
                if (keyBytes.size != 32) return ""
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(
                    Cipher.DECRYPT_MODE,
                    SecretKeySpec(keyBytes, "AES"),
                    GCMParameterSpec(128, iv),
                )
                String(cipher.doFinal(ciphertext), Charsets.UTF_8)
            } catch (exception: Exception) {
                Log.w(TAG, "Legacy secret decryption failed: ${exception.message}")
                ""
            }
        }

        if (value.startsWith(LEGACY_OBF_PREFIX)) {
            return try {
                String(Base64.decode(value.removePrefix(LEGACY_OBF_PREFIX), Base64.DEFAULT), Charsets.UTF_8)
            } catch (_: Exception) {
                ""
            }
        }

        return value
    }
}
