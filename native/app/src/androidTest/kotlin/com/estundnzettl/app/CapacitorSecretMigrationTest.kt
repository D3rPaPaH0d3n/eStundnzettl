package com.estundnzettl.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.estundnzettl.app.data.SecretStore
import java.security.KeyPairGenerator
import java.security.KeyStore
import javax.crypto.Cipher
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CapacitorSecretMigrationTest {
    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private val alias get() = context.packageName + "_cap_sec"

    @Before
    fun clean() {
        SecretStore(context).delete(SecretStore.NEXTCLOUD_SECRET_KEY)
        context.getSharedPreferences("cap_sec", Context.MODE_PRIVATE).edit().clear().commit()
        KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.deleteEntry(alias)
    }

    @After
    fun cleanAfter() = clean()

    @Test
    fun migratesRsaEncryptedCapacitorPreferenceWithoutDeletingIt() {
        val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore")
        generator.initialize(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(2048)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_PKCS1)
                .build()
        )
        val pair = generator.generateKeyPair()
        val cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding")
        cipher.init(Cipher.ENCRYPT_MODE, pair.public)
        val encoded = Base64.encodeToString(cipher.doFinal("app-password".toByteArray()), Base64.DEFAULT)
        val oldPrefs = context.getSharedPreferences("cap_sec", Context.MODE_PRIVATE)
        oldPrefs.edit().putString(SecretStore.NEXTCLOUD_SECRET_KEY, encoded).commit()

        val store = SecretStore(context)
        assertEquals(
            SecretStore.CapacitorMigrationStatus.MIGRATED_CURRENT_KEY,
            store.migrateCapacitorNextcloudSecret(),
        )
        assertEquals("app-password", store.get(SecretStore.NEXTCLOUD_SECRET_KEY))
        assertEquals(encoded, oldPrefs.getString(SecretStore.NEXTCLOUD_SECRET_KEY, null))
    }
}
