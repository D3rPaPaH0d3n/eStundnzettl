package com.estundnzettl.app

import org.junit.Assert.assertEquals
import org.junit.Test

class GooglePlayServicesStatusTest {

    @Test fun `success is available`() =
        assertEquals(GooglePlayServicesStatus.AVAILABLE, googlePlayServicesStatus(0))

    @Test fun `missing services are identified`() =
        assertEquals(GooglePlayServicesStatus.MISSING, googlePlayServicesStatus(1))

    @Test fun `outdated services are identified`() =
        assertEquals(GooglePlayServicesStatus.UPDATE_REQUIRED, googlePlayServicesStatus(2))

    @Test fun `disabled services are identified`() =
        assertEquals(GooglePlayServicesStatus.DISABLED, googlePlayServicesStatus(3))

    @Test fun `invalid services are identified`() =
        assertEquals(GooglePlayServicesStatus.INVALID, googlePlayServicesStatus(9))

    @Test fun `unknown failure is unavailable`() =
        assertEquals(GooglePlayServicesStatus.UNAVAILABLE, googlePlayServicesStatus(99))
}
