package com.estundnzettl.app

import org.junit.Assert.assertEquals
import org.junit.Test

class ToastToneTest {

    @Test
    fun `message keeps explicitly assigned success tone`() {
        assertEquals(UiMessageTone.SUCCESS, UiMessage("saved", tone = UiMessageTone.SUCCESS).tone)
    }

    @Test
    fun `translated wording cannot change tone`() {
        val german = UiMessage("Beliebiger deutscher Text", raw = true, tone = UiMessageTone.ERROR)
        val english = german.copy(key = "Arbitrary English text")
        assertEquals(german.tone, english.tone)
    }

    @Test
    fun `errors default to long duration`() {
        assertEquals(UiMessageDuration.LONG, UiMessage("failed", tone = UiMessageTone.ERROR).duration)
    }

    @Test
    fun `warnings default to long duration`() {
        assertEquals(UiMessageDuration.LONG, UiMessage("required", tone = UiMessageTone.WARNING).duration)
    }

    @Test
    fun `neutral status defaults to short info`() {
        val message = UiMessage("generating")
        assertEquals(UiMessageTone.INFO, message.tone)
        assertEquals(UiMessageDuration.SHORT, message.duration)
    }

    @Test
    fun `critical error can remain until dismissed`() {
        val message = UiMessage(
            "critical",
            tone = UiMessageTone.ERROR,
            duration = UiMessageDuration.UNTIL_DISMISSED,
        )
        assertEquals(UiMessageDuration.UNTIL_DISMISSED, message.duration)
    }
}
