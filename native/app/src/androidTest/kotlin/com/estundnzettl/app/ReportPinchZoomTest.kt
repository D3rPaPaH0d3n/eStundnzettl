package com.estundnzettl.app

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.estundnzettl.app.data.SettingsRepository
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.core.calc.DEMO_USER
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import java.util.regex.Pattern

/**
 * Verifiziert das Pinch-to-Zoom der PDF-Vorschau (Port des Touch-Handlers
 * aus PdfBlobPreview.tsx): Zwei-Finger-Spreizen muss den Zoom ueber 100%
 * heben — sichtbar am %-Label des Reset-Buttons, das bei 100% ein Icon ist.
 */
@RunWith(AndroidJUnit4::class)
class ReportPinchZoomTest {

    @Test
    fun pinchOutZoomsPreview() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        val context = instrumentation.targetContext
        val pkg = context.packageName

        // Zustand seeden, damit weder Onboarding noch der einmalige
        // Report-Hinweis den Ablauf ueberlagern (frische Installation).
        runBlocking {
            val settings = SettingsRepository(AppDatabase.get(context).settingsDao())
            settings.setUserData(DEMO_USER)
            settings.setString("estundnzettl_hint_report_seen_v2", "1")
            settings.setString("last_seen_changelog_version_code", BuildConfig.VERSION_CODE.toString())
            settings.setString("last_seen_changelog_version_name", BuildConfig.VERSION_NAME)
            settings.setString("estundnzettl_support_prompt_dismissed_v1", "true")
        }

        val intent = context.packageManager.getLaunchIntentForPackage(pkg)!!
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(pkg).depth(0)), 10_000)

        // Bericht ueber den Header-Button oeffnen (content-description
        // kommt aus i18n "header.report")
        val reportButton = device.wait(
            Until.findObject(By.desc(Pattern.compile("Bericht öffnen|Open report"))),
            10_000,
        )
        assertNotNull("Report-Button nicht gefunden — Onboarding offen?", reportButton)
        reportButton.click()

        // PDF-Generierung + PdfRenderer brauchen einen Moment
        Thread.sleep(6_000)

        val root = device.findObject(By.pkg(pkg).depth(0))
        root.pinchOpen(0.5f)

        val zoomLabel = device.wait(
            Until.findObject(By.text(Pattern.compile("\\d+%"))),
            3_000,
        )
        assertNotNull("Kein Zoom-Label — Pinch-Out hat den Zoom nicht geaendert", zoomLabel)
        assertNotEquals("100%", zoomLabel.text)
    }
}
