package com.estundnzettl.app

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.estundnzettl.app.data.CrashRecoveryStore
import com.estundnzettl.app.data.SettingsRepository
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.core.calc.DEMO_USER
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.regex.Pattern

@RunWith(AndroidJUnit4::class)
class CoreUserFlowsSmokeTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val device = UiDevice.getInstance(instrumentation)
    private val pkg = context.packageName

    @Before
    fun launchWithProfile() {
        CrashRecoveryStore(context).clear()
        runBlocking {
            val settings = SettingsRepository(AppDatabase.get(context).settingsDao())
            settings.setUserData(DEMO_USER)
            settings.setString("estundnzettl_native_welcome_seen_v1", "1")
            settings.setString("last_seen_changelog_version_code", BuildConfig.VERSION_CODE.toString())
            settings.setString("last_seen_changelog_version_name", BuildConfig.VERSION_NAME)
            settings.setString("estundnzettl_support_prompt_dismissed_v1", "true")
            settings.setString("estundnzettl_hint_report_seen_v2", "1")
        }
        val intent = context.packageManager.getLaunchIntentForPackage(pkg)!!
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(pkg).depth(0)), TIMEOUT)
    }

    @Test
    fun dashboardShowsMonthAndAddAction() {
        assertNotNull(device.wait(Until.findObject(By.text(Pattern.compile(".+ 20\\d{2}"))), TIMEOUT))
        assertNotNull(device.wait(Until.findObject(By.desc(Pattern.compile("Neuen Eintrag.*|Add new entry.*"))), TIMEOUT))
    }

    @Test
    fun monthPickerOpensFromDashboard() {
        val month = device.wait(Until.findObject(By.text(Pattern.compile(".+ 20\\d{2}"))), TIMEOUT)
        assertNotNull(month)
        month.click()
        assertNotNull(device.wait(Until.findObject(By.text(Pattern.compile("Monat wählen|Select month"))), TIMEOUT))
        assertNotNull(device.wait(Until.findObject(By.text(Pattern.compile("Jän\\.|Jan\\."))), TIMEOUT))
    }

    @Test
    fun settingsOpenFromHeader() {
        val button = device.wait(
            Until.findObject(By.desc(Pattern.compile("Einstellungen öffnen|Open settings"))), TIMEOUT,
        )
        assertNotNull(button)
        button.click()
        assertTrue(
            device.wait(
                Until.gone(By.desc(Pattern.compile("Einstellungen öffnen|Open settings"))), TIMEOUT,
            )
        )
    }

    @Test
    fun reportOpensFromHeader() {
        val button = device.wait(
            Until.findObject(By.desc(Pattern.compile("Bericht öffnen|Open report"))), TIMEOUT,
        )
        assertNotNull(button)
        button.click()
        assertTrue(
            device.wait(
                Until.gone(By.desc(Pattern.compile("Bericht öffnen|Open report"))), TIMEOUT,
            )
        )
    }

    @Test
    fun addActionOpensEntryForm() {
        val button = device.wait(
            Until.findObject(By.desc(Pattern.compile("Neuen Eintrag.*|Add new entry.*"))), TIMEOUT,
        )
        assertNotNull(button)
        button.click()
        assertNotNull(device.wait(Until.findObject(By.text(Pattern.compile("Neuer Eintrag|New entry"))), TIMEOUT))
    }

    companion object {
        private const val TIMEOUT = 10_000L
    }
}
