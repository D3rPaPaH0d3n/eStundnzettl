package com.estundnzettl.app

import org.junit.Assert.assertEquals
import org.junit.Test

class ToastToneTest {

    @Test
    fun `saved entry is success`() {
        assertEquals(
            UiMessageTone.SUCCESS,
            resolveToastTone(UiMessage("toasts.entry.saved"), "Eintrag gespeichert"),
        )
    }

    @Test
    fun `activated mode is success`() {
        assertEquals(
            UiMessageTone.SUCCESS,
            resolveToastTone(
                UiMessage("settings.recordingMode.toastSimple"),
                "Nur Arbeitszeiten eintragen aktiviert",
            ),
        )
    }

    @Test
    fun `failed backup is error`() {
        assertEquals(
            UiMessageTone.ERROR,
            resolveToastTone(UiMessage("toasts.autoBackup.failed"), "Backup fehlgeschlagen"),
        )
    }

    @Test
    fun `required selection is warning`() {
        assertEquals(
            UiMessageTone.WARNING,
            resolveToastTone(UiMessage("attachments.toast.selectFile"), "Bitte Datei auswählen"),
        )
    }

    @Test
    fun `neutral status remains info`() {
        assertEquals(
            UiMessageTone.INFO,
            resolveToastTone(UiMessage("settings.pdfArchive.toast.generating"), "PDF wird erstellt"),
        )
    }

    @Test
    fun `explicit tone overrides automatic classifier`() {
        assertEquals(
            UiMessageTone.WARNING,
            resolveToastTone(
                UiMessage("custom", raw = true, tone = UiMessageTone.WARNING),
                "Beliebiger Text",
            ),
        )
    }
}
