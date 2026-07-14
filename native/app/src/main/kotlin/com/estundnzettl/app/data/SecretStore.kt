package com.estundnzettl.app.data

import android.content.Context
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Sichere Ablage des Nextcloud-App-Passworts — Pendant zu
 * nextcloudSecret.ts + secureSecrets.ts. Neuer Speicher:
 * EncryptedSharedPreferences (Android-Keystore-Master-Key).
 *
 * Legacy-Migration: Die Capacitor-App legte das Passwort zuletzt im
 * SecureStoragePlugin ab (App-privat, für uns unerreichbar) — davor
 * aber als "enc:v1:"-Wert im settings-Key "nextcloud_pass", dessen
 * AES-GCM-Master-Key ("crypto_mk_v1") mit der Datenbank migriert wird.
 * Diesen Pfad entschlüsseln wir hier, damit Alt-Verbindungen die
 * Migration überleben, wo möglich.
 */
class SecretStore(private val context: Context) {

    companion object {
        private const val TAG = "SecretStore"
        private const val PREFS_NAME = "estundnzettl_secrets"
        const val NEXTCLOUD_SECRET_KEY = "nextcloud_app_secret_v1"
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
    } catch (e: Exception) {
        Log.w(TAG, "Secret-Read fehlgeschlagen", e)
        null
    }

    fun set(key: String, value: String): Boolean = try {
        prefs.edit().putString(key, value).apply()
        true
    } catch (e: Exception) {
        Log.w(TAG, "Secret-Write fehlgeschlagen", e)
        false
    }

    fun delete(key: String) {
        try {
            prefs.edit().remove(key).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Secret-Delete fehlgeschlagen", e)
        }
    }

    /**
     * Entschlüsselt einen Legacy-Wert aus der TS-App
     * (Port von deobfuscate in obfuscate.ts):
     *  - "enc:v1:<b64(iv)>:<b64(ct)>" — AES-GCM mit [masterKeyBase64]
     *  - "obf:<b64(utf8)>" — Base64
     *  - sonst Klartext
     */
    fun deobfuscateLegacy(value: String?, masterKeyBase64: String?): String {
        if (value.isNullOrEmpty()) return ""

        if (value.startsWith(ENC_PREFIX)) {
            if (masterKeyBase64.isNullOrEmpty()) return ""
            return try {
                val body = value.removePrefix(ENC_PREFIX)
                val sep = body.indexOf(':')
                if (sep < 0) return ""
                val iv = Base64.decode(body.substring(0, sep), Base64.DEFAULT)
                val ct = Base64.decode(body.substring(sep + 1), Base64.DEFAULT)
                val keyBytes = Base64.decode(masterKeyBase64, Base64.DEFAULT)
                if (keyBytes.size != 32) return ""
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(
                    Cipher.DECRYPT_MODE,
                    SecretKeySpec(keyBytes, "AES"),
                    GCMParameterSpec(128, iv),
                )
                String(cipher.doFinal(ct), Charsets.UTF_8)
            } catch (e: Exception) {
                Log.w(TAG, "Legacy-Entschlüsselung fehlgeschlagen: ${e.message}")
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
