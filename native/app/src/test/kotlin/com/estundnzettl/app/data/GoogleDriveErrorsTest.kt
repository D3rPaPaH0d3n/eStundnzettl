package com.estundnzettl.app.data

import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.net.UnknownHostException

class GoogleDriveErrorsTest {

    @Test
    fun `unregistered app is recognized from the Play Services developer error`() {
        assertEquals(GoogleDriveErrorKind.NOT_REGISTERED, classifyGoogleDriveError(playServicesStatus = 10))
        val described = describeGoogleDriveError(ApiException(Status(10)))
        assertEquals(GoogleDriveErrorKind.NOT_REGISTERED, described.kind)
        assertEquals("Play Services 10 (DEVELOPER_ERROR)", described.detail)
    }

    @Test
    fun `Play Services status codes map to sign-in, cancel and network`() {
        assertEquals(GoogleDriveErrorKind.SIGN_IN_REQUIRED, classifyGoogleDriveError(playServicesStatus = 4))
        assertEquals(GoogleDriveErrorKind.SIGN_IN_REQUIRED, classifyGoogleDriveError(playServicesStatus = 6))
        assertEquals(GoogleDriveErrorKind.CANCELLED, classifyGoogleDriveError(playServicesStatus = 16))
        assertEquals(GoogleDriveErrorKind.NETWORK, classifyGoogleDriveError(playServicesStatus = 7))
        assertEquals(GoogleDriveErrorKind.NETWORK, classifyGoogleDriveError(playServicesStatus = 15))
        assertEquals(GoogleDriveErrorKind.UNKNOWN, classifyGoogleDriveError(playServicesStatus = 8))
    }

    @Test
    fun `Drive HTTP errors are told apart by status and reason`() {
        assertEquals(GoogleDriveErrorKind.TOKEN_REJECTED, classifyGoogleDriveError(httpStatus = 401))
        assertEquals(
            GoogleDriveErrorKind.API_DISABLED,
            classifyGoogleDriveError(httpStatus = 403, httpReason = "accessNotConfigured"),
        )
        assertEquals(
            GoogleDriveErrorKind.STORAGE_FULL,
            classifyGoogleDriveError(httpStatus = 403, httpReason = "storageQuotaExceeded"),
        )
        assertEquals(
            GoogleDriveErrorKind.RATE_LIMITED,
            classifyGoogleDriveError(httpStatus = 403, httpReason = "userRateLimitExceeded"),
        )
        assertEquals(
            GoogleDriveErrorKind.ACCESS_DENIED,
            classifyGoogleDriveError(httpStatus = 403, httpReason = "insufficientPermissions"),
        )
        assertEquals(GoogleDriveErrorKind.RATE_LIMITED, classifyGoogleDriveError(httpStatus = 429))
        assertEquals(GoogleDriveErrorKind.SERVER, classifyGoogleDriveError(httpStatus = 503))
        assertEquals(GoogleDriveErrorKind.UNKNOWN, classifyGoogleDriveError(httpStatus = 404))
    }

    @Test
    fun `Drive exception detail carries status, reason and operation`() {
        val described = describeGoogleDriveError(
            GoogleDriveManager.DriveApiException("Upload", 403, "accessNotConfigured"),
        )
        assertEquals(GoogleDriveErrorKind.API_DISABLED, described.kind)
        assertEquals("HTTP 403 accessNotConfigured (Upload)", described.detail)
        assertEquals("HTTP 500 (Suche)", describeGoogleDriveError(GoogleDriveManager.DriveApiException("Suche", 500)).detail)
    }

    @Test
    fun `missing consent and network failures are recognized`() {
        assertEquals(
            GoogleDriveErrorKind.SIGN_IN_REQUIRED,
            describeGoogleDriveError(GoogleDriveManager.AuthRequiredException(null)).kind,
        )
        assertEquals(
            GoogleDriveErrorKind.NETWORK,
            describeGoogleDriveError(UnknownHostException("www.googleapis.com")).kind,
        )
        assertEquals(GoogleDriveErrorKind.UNKNOWN, describeGoogleDriveError(IllegalStateException("kaputt")).kind)
    }

    @Test
    fun `reason is read from Drive error responses`() {
        val disabled = """
            {"error":{"code":403,"message":"Google Drive API has not been used in project 1 before or it is disabled.",
            "errors":[{"message":"…","domain":"usageLimits","reason":"accessNotConfigured"}],"status":"PERMISSION_DENIED"}}
        """.trimIndent()
        assertEquals("accessNotConfigured", parseDriveErrorReason(disabled))
        assertEquals("UNAUTHENTICATED", parseDriveErrorReason("""{"error":{"code":401,"status":"UNAUTHENTICATED"}}"""))
        assertNull(parseDriveErrorReason("<html>Bad Gateway</html>"))
        assertNull(parseDriveErrorReason(""))
    }

    @Test
    fun `stored kind names survive a round trip`() {
        GoogleDriveErrorKind.entries.forEach { assertEquals(it, GoogleDriveErrorKind.fromName(it.name)) }
        assertNull(GoogleDriveErrorKind.fromName(""))
        assertNull(GoogleDriveErrorKind.fromName(null))
    }
}
