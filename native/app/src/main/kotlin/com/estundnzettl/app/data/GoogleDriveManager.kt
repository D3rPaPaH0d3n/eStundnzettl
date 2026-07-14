package com.estundnzettl.app.data

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.coroutines.resume

/**
 * Google-Drive-Anbindung — Port von GoogleDriveBackupPlugin.java +
 * googleDrive.ts/googleDrivePdfArchive.ts. Auth über den Play-Services
 * AuthorizationClient (Paketname + Signatur müssen dafür als
 * Android-OAuth-Client in der Google Cloud Console registriert sein —
 * für die native App-ID einmalig neu einzurichten).
 *
 * Zwei getrennte Scopes wie im Original:
 *  - Backup:      drive.appdata (unsichtbarer App-Ordner)
 *  - PDF-Archiv:  drive.file (sichtbarer Ordner "eStundnzettl Archiv")
 */
class GoogleDriveManager(
    private val context: Context,
    private val settings: SettingsRepository,
) {

    companion object {
        private const val TAG = "GoogleDrive"
        const val SCOPE_APPDATA = "https://www.googleapis.com/auth/drive.appdata"
        const val SCOPE_FILE = "https://www.googleapis.com/auth/drive.file"
        const val KEY_ACCOUNT_EMAIL = "gdrive_account_email"
        const val KEY_PDF_ACCOUNT_EMAIL = "gdrive_pdf_account_email"
        private const val ARCHIVE_FOLDER_NAME = "eStundnzettl Archiv"
    }

    class AuthRequiredException(val pendingIntent: PendingIntent?) :
        Exception("Google Drive Anmeldung erforderlich")

    private val json = Json { ignoreUnknownKeys = true }

    // ─── Autorisierung ──────────────────────────────────────────────

    /**
     * Autorisiert den gewünschten Scope. Liefert den Access-Token oder
     * wirft [AuthRequiredException] mit PendingIntent, wenn der Nutzer
     * erst zustimmen muss (Aufrufer startet den Intent-Sender und ruft
     * danach [tokenFromResultIntent] auf).
     */
    suspend fun authorize(scope: String): String {
        val request = AuthorizationRequest.builder()
            .setRequestedScopes(listOf(Scope(scope), Scope("email")))
            .build()
        val result = suspendCancellableCoroutine<AuthorizationResult> { cont ->
            Identity.getAuthorizationClient(context)
                .authorize(request)
                .addOnSuccessListener { cont.resume(it) }
                .addOnFailureListener { e ->
                    if (cont.isActive) cont.cancel(e)
                }
        }
        if (result.hasResolution()) {
            throw AuthRequiredException(result.pendingIntent)
        }
        return result.accessToken ?: throw AuthRequiredException(null)
    }

    /** Token aus dem Ergebnis-Intent der Zustimmung extrahieren. */
    fun tokenFromResultIntent(intent: Intent?): String? = try {
        val result = Identity.getAuthorizationClient(context)
            .getAuthorizationResultFromIntent(intent)
        result.accessToken
    } catch (e: Exception) {
        Log.w(TAG, "Authorization-Result fehlgeschlagen: ${e.message}")
        null
    }

    /** E-Mail des verbundenen Kontos (userinfo mit email-Scope). */
    suspend fun fetchAccountEmail(accessToken: String): String = withContext(Dispatchers.IO) {
        try {
            val res = http("https://www.googleapis.com/oauth2/v3/userinfo", "GET", accessToken)
            if (res.first == 200) {
                json.parseToJsonElement(res.second).jsonObject["email"]?.jsonPrimitive?.content ?: ""
            } else {
                ""
            }
        } catch (_: Exception) {
            ""
        }
    }

    // ─── Drive REST (HttpURLConnection) ─────────────────────────────

    private fun http(
        url: String,
        method: String,
        token: String,
        body: ByteArray? = null,
        contentType: String? = null,
    ): Pair<Int, String> {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = if (method == "PATCH") "POST" else method
            if (method == "PATCH") connection.setRequestProperty("X-HTTP-Method-Override", "PATCH")
            connection.connectTimeout = 30_000
            connection.readTimeout = 60_000
            connection.setRequestProperty("Authorization", "Bearer $token")
            if (contentType != null) connection.setRequestProperty("Content-Type", contentType)
            if (body != null) {
                connection.doOutput = true
                connection.outputStream.use { it.write(body) }
            }
            val status = connection.responseCode
            val stream = if (status >= 400) connection.errorStream else connection.inputStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            return status to text
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun findFileId(token: String, name: String, spaces: String, parentId: String? = null): String? =
        withContext(Dispatchers.IO) {
            var query = "name = '$name' and trashed = false"
            if (parentId != null) query += " and '$parentId' in parents"
            val url = "https://www.googleapis.com/drive/v3/files" +
                "?q=${URLEncoder.encode(query, "UTF-8")}" +
                "&spaces=$spaces&fields=files(id)"
            val (status, bodyText) = http(url, "GET", token)
            if (status != 200) throw Exception("Drive-Suche fehlgeschlagen (HTTP $status)")
            json.parseToJsonElement(bodyText).jsonObject["files"]?.jsonArray
                ?.firstOrNull()?.jsonObject?.get("id")?.jsonPrimitive?.content
        }

    /**
     * JSON-Backup in den appDataFolder hochladen (Update wenn vorhanden) —
     * Port von uploadOrUpdateFile.
     */
    suspend fun uploadOrUpdateBackup(token: String, fileName: String, content: String): Unit =
        withContext(Dispatchers.IO) {
            val existingId = findFileId(token, fileName, spaces = "appDataFolder")
            if (existingId != null) {
                val (status, _) = http(
                    "https://www.googleapis.com/upload/drive/v3/files/$existingId?uploadType=media",
                    "PATCH", token, content.toByteArray(), "application/json",
                )
                if (status !in 200..299) throw Exception("Drive-Update fehlgeschlagen (HTTP $status)")
            } else {
                uploadMultipart(
                    token,
                    metadata = """{"name":${json.encodeToString(kotlinx.serialization.json.JsonPrimitive.serializer(), kotlinx.serialization.json.JsonPrimitive(fileName))},"parents":["appDataFolder"]}""",
                    content = content.toByteArray(),
                    contentType = "application/json",
                )
            }
        }

    /** Backup aus dem appDataFolder laden — null wenn keines existiert. */
    suspend fun downloadBackup(token: String, fileName: String): String? = withContext(Dispatchers.IO) {
        val id = findFileId(token, fileName, spaces = "appDataFolder") ?: return@withContext null
        val (status, bodyText) = http("https://www.googleapis.com/drive/v3/files/$id?alt=media", "GET", token)
        if (status !in 200..299) throw Exception("Drive-Download fehlgeschlagen (HTTP $status)")
        bodyText
    }

    /**
     * PDF in den sichtbaren Ordner "eStundnzettl Archiv" hochladen —
     * Port von uploadPdfArchiveFile (drive.file-Scope).
     */
    suspend fun uploadPdfArchive(token: String, fileName: String, bytes: ByteArray): Unit =
        withContext(Dispatchers.IO) {
            val folderId = ensureArchiveFolder(token)
            val existingId = findFileId(token, fileName, spaces = "drive", parentId = folderId)
            if (existingId != null) {
                val (status, _) = http(
                    "https://www.googleapis.com/upload/drive/v3/files/$existingId?uploadType=media",
                    "PATCH", token, bytes, "application/pdf",
                )
                if (status !in 200..299) throw Exception("Drive-Update fehlgeschlagen (HTTP $status)")
            } else {
                uploadMultipart(
                    token,
                    metadata = """{"name":${json.encodeToString(kotlinx.serialization.json.JsonPrimitive.serializer(), kotlinx.serialization.json.JsonPrimitive(fileName))},"parents":["$folderId"]}""",
                    content = bytes,
                    contentType = "application/pdf",
                )
            }
        }

    private suspend fun ensureArchiveFolder(token: String): String = withContext(Dispatchers.IO) {
        val query = "name = '$ARCHIVE_FOLDER_NAME' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        val url = "https://www.googleapis.com/drive/v3/files?q=${URLEncoder.encode(query, "UTF-8")}&fields=files(id)"
        val (status, bodyText) = http(url, "GET", token)
        if (status == 200) {
            val id = json.parseToJsonElement(bodyText).jsonObject["files"]?.jsonArray
                ?.firstOrNull()?.jsonObject?.get("id")?.jsonPrimitive?.content
            if (id != null) return@withContext id
        }
        val meta = """{"name":"$ARCHIVE_FOLDER_NAME","mimeType":"application/vnd.google-apps.folder"}"""
        val (createStatus, createBody) = http(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            "POST", token, meta.toByteArray(), "application/json",
        )
        if (createStatus !in 200..299) throw Exception("Archiv-Ordner konnte nicht erstellt werden (HTTP $createStatus)")
        json.parseToJsonElement(createBody).jsonObject["id"]?.jsonPrimitive?.content
            ?: throw Exception("Archiv-Ordner ohne ID")
    }

    private fun uploadMultipart(token: String, metadata: String, content: ByteArray, contentType: String) {
        val boundary = "estundnzettl_boundary"
        val head = (
            "--$boundary\r\n" +
                "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
                metadata + "\r\n" +
                "--$boundary\r\n" +
                "Content-Type: $contentType\r\n\r\n"
            ).toByteArray()
        val tail = "\r\n--$boundary--".toByteArray()
        val body = head + content + tail
        val (status, bodyText) = http(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            "POST", token, body, "multipart/related; boundary=$boundary",
        )
        if (status !in 200..299) throw Exception("Drive-Upload fehlgeschlagen (HTTP $status): ${bodyText.take(200)}")
    }
}
