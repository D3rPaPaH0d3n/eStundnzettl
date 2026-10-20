package com.estundnzettl.app.data

import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.IOException

/**
 * Verständliche Ursache eines Google-Drive-Fehlers. Vorher sah man in der
 * App nur "fehlgeschlagen" — ob die App bei Google nicht (mehr) registriert
 * ist, die Drive API fehlt oder bloß das Netz weg war, stand nur im Logcat.
 */
enum class GoogleDriveErrorKind(val messageKey: String) {
    /** Play-Services-Code 10: Paketname + SHA-1 in keinem OAuth-Client der Cloud Console. */
    NOT_REGISTERED("settings.backup.gdriveError.notRegistered"),
    /** Zustimmung fehlt oder wurde widerrufen. */
    SIGN_IN_REQUIRED("settings.backup.gdriveError.signInRequired"),
    /** Google-Dialog vom Nutzer abgebrochen. */
    CANCELLED("settings.backup.gdriveError.cancelled"),
    /** HTTP 401: Drive lehnt den Token ab. */
    TOKEN_REJECTED("settings.backup.gdriveError.tokenRejected"),
    /** HTTP 403 accessNotConfigured: Drive API im Cloud-Projekt deaktiviert. */
    API_DISABLED("settings.backup.gdriveError.apiDisabled"),
    STORAGE_FULL("settings.backup.gdriveError.storageFull"),
    RATE_LIMITED("settings.backup.gdriveError.rateLimited"),
    /** Übriges HTTP 403, etwa ein fehlender Scope. */
    ACCESS_DENIED("settings.backup.gdriveError.accessDenied"),
    NETWORK("settings.backup.gdriveError.network"),
    SERVER("settings.backup.gdriveError.server"),
    UNKNOWN("settings.backup.gdriveError.unknown"),
    ;

    companion object {
        fun fromName(name: String?): GoogleDriveErrorKind? = entries.firstOrNull { it.name == name }
    }
}

data class GoogleDriveError(
    val kind: GoogleDriveErrorKind,
    /** Technisches Detail für Diagnose und Support, z. B. "Play Services 10 (DEVELOPER_ERROR)". */
    val detail: String,
)

/** Einordnung ohne Android-Typen — die eigentliche Logik, JVM-testbar. */
internal fun classifyGoogleDriveError(
    playServicesStatus: Int? = null,
    httpStatus: Int? = null,
    httpReason: String? = null,
    authRequired: Boolean = false,
    network: Boolean = false,
): GoogleDriveErrorKind = when {
    authRequired -> GoogleDriveErrorKind.SIGN_IN_REQUIRED
    playServicesStatus != null -> when (playServicesStatus) {
        CommonStatusCodes.DEVELOPER_ERROR -> GoogleDriveErrorKind.NOT_REGISTERED
        CommonStatusCodes.SIGN_IN_REQUIRED, CommonStatusCodes.RESOLUTION_REQUIRED ->
            GoogleDriveErrorKind.SIGN_IN_REQUIRED
        CommonStatusCodes.CANCELED -> GoogleDriveErrorKind.CANCELLED
        CommonStatusCodes.NETWORK_ERROR, CommonStatusCodes.TIMEOUT -> GoogleDriveErrorKind.NETWORK
        else -> GoogleDriveErrorKind.UNKNOWN
    }
    httpStatus == 401 -> GoogleDriveErrorKind.TOKEN_REJECTED
    httpStatus == 403 -> when (httpReason) {
        "accessNotConfigured", "SERVICE_DISABLED" -> GoogleDriveErrorKind.API_DISABLED
        "storageQuotaExceeded" -> GoogleDriveErrorKind.STORAGE_FULL
        "rateLimitExceeded", "userRateLimitExceeded" -> GoogleDriveErrorKind.RATE_LIMITED
        else -> GoogleDriveErrorKind.ACCESS_DENIED
    }
    httpStatus == 429 -> GoogleDriveErrorKind.RATE_LIMITED
    httpStatus != null && httpStatus >= 500 -> GoogleDriveErrorKind.SERVER
    network -> GoogleDriveErrorKind.NETWORK
    else -> GoogleDriveErrorKind.UNKNOWN
}

fun describeGoogleDriveError(error: Throwable): GoogleDriveError = when (error) {
    is GoogleDriveManager.AuthRequiredException ->
        GoogleDriveError(classifyGoogleDriveError(authRequired = true), "AUTH_REQUIRED")
    is GoogleDriveManager.DriveApiException -> GoogleDriveError(
        classifyGoogleDriveError(httpStatus = error.statusCode, httpReason = error.reason),
        "HTTP ${error.statusCode}" + (error.reason?.let { " $it" } ?: "") + " (${error.operation})",
    )
    is ApiException -> GoogleDriveError(
        classifyGoogleDriveError(playServicesStatus = error.statusCode),
        "Play Services ${error.statusCode} (${CommonStatusCodes.getStatusCodeString(error.statusCode)})",
    )
    is IOException -> GoogleDriveError(
        classifyGoogleDriveError(network = true),
        error.javaClass.simpleName + (error.message?.let { ": ${it.take(120)}" } ?: ""),
    )
    else -> GoogleDriveError(
        GoogleDriveErrorKind.UNKNOWN,
        error.message?.take(160) ?: error.javaClass.simpleName,
    )
}

private val errorJson = Json { ignoreUnknownKeys = true }

/**
 * Grund aus einer Drive-Fehlerantwort, z. B. `accessNotConfigured`:
 * `{"error":{"errors":[{"reason":"…"}],"status":"PERMISSION_DENIED"}}`.
 */
internal fun parseDriveErrorReason(body: String): String? = runCatching {
    val error = errorJson.parseToJsonElement(body).jsonObject["error"]?.jsonObject ?: return null
    error["errors"]?.jsonArray?.firstOrNull()?.jsonObject?.get("reason")?.jsonPrimitive?.content
        ?: error["status"]?.jsonPrimitive?.content
}.getOrNull()
