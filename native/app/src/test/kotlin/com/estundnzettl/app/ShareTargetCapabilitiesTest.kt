package com.estundnzettl.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareTargetCapabilitiesTest {
    @Test
    fun `recognizes common messenger packages`() {
        assertTrue(isMessagingPackage("com.whatsapp", emptySet()))
        assertTrue(isMessagingPackage("org.telegram.messenger", emptySet()))
        assertTrue(isMessagingPackage("com.facebook.orca", emptySet()))
        assertTrue(isMessagingPackage("com.google.android.apps.messaging", emptySet()))
    }

    @Test
    fun `recognizes an installed SMS handler without knowing its package`() {
        assertTrue(isMessagingPackage("at.example.smsclient", setOf("at.example.smsclient")))
    }

    @Test
    fun `does not treat storage and transport targets as messengers`() {
        assertFalse(isMessagingPackage("com.google.android.apps.docs", emptySet()))
        assertFalse(isMessagingPackage("com.android.bluetooth", emptySet()))
        assertFalse(isMessagingPackage("com.google.android.apps.nbu.files", emptySet()))
    }
}
