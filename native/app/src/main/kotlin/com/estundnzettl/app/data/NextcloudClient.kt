package com.estundnzettl.app.data

import android.util.Base64
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * WebDAV-/Login-Flow-Client für Nextcloud — Port von nextcloudClient.ts
 * (inkl. des Android-HTTP-Teils des NextcloudLoginFlow-Plugins, der hier
 * direkt in Kotlin lebt statt über eine Capacitor-Bridge).
 */
object NextcloudClient {

    private const val TAG = "Nextcloud"
    const val BACKUP_FOLDER = "eStundnzettl"
    const val BACKUP_FILENAME = "estundnzettl_backup.json"

    private val json = Json { ignoreUnknownKeys = true }

    class NextcloudException(message: String) : Exception(message)

    data class HttpResult(val status: Int, val body: String)

    data class LoginFlowStart(val loginUrl: String, val pollEndpoint: String, val token: String)

    sealed class PollResult {
        object Pending : PollResult()
        data class Complete(val server: String, val loginName: String, val appPassword: String) : PollResult()
    }

    // In-Memory-Caches wie im Original (Ordner-Existenz, aufgelöste DAV-UID)
    private val verifiedFolders = HashSet<String>()
    private val resolvedDavUsers = HashMap<String, String>()
    /** 429-Drossel: Zeitstempel, bis wann keine Requests gesendet werden. */
    private var rateLimitedUntil = 0L

    private fun normalizeUrl(url: String): String = url.trimEnd('/')

    /** Pfad-Segment URL-codieren — Leerzeichen als %20, nicht "+". */
    private fun encodePath(segment: String): String =
        URLEncoder.encode(segment, "UTF-8").replace("+", "%20")

    private fun davPath(url: String, user: String): String =
        "${normalizeUrl(url)}/remote.php/dav/files/${encodePath(user)}"

    private fun basicAuth(user: String, pass: String): String =
        "Basic " + Base64.encodeToString("$user:$pass".toByteArray(), Base64.NO_WRAP)

    private fun checkRateLimit() {
        val remaining = rateLimitedUntil - System.currentTimeMillis()
        if (remaining > 0) {
            val seconds = maxOf(1, (remaining + 999) / 1000)
            throw NextcloudException("Nextcloud drosselt gerade Anfragen. Bitte ${seconds}s warten und dann erneut versuchen.")
        }
    }

    private suspend fun http(
        url: String,
        method: String,
        user: String? = null,
        pass: String? = null,
        body: ByteArray? = null,
        contentType: String? = null,
        depthHeader: Boolean = false,
        timeoutMs: Int = 30_000,
    ): HttpResult = withContext(Dispatchers.IO) {
        checkRateLimit()
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            // WebDAV-Verben (PROPFIND, MKCOL) via Reflection-freiem Trick:
            // HttpURLConnection erlaubt nur Standard-Methoden — für andere
            // nutzen wir X-HTTP-Method-Override? Nextcloud unterstützt das
            // nicht überall; setRequestMethod wirft bei PROPFIND/MKCOL.
            try {
                connection.requestMethod = method
            } catch (_: java.net.ProtocolException) {
                // Fallback: Methode per Reflection setzen (übliches Muster
                // für WebDAV mit HttpURLConnection)
                setMethodViaReflection(connection, method)
            }
            connection.connectTimeout = timeoutMs
            connection.readTimeout = timeoutMs
            connection.instanceFollowRedirects = true
            connection.setRequestProperty("Accept", "application/json, */*")
            connection.setRequestProperty("OCS-APIRequest", "true")
            connection.setRequestProperty("User-Agent", "eStundnzettl-Native")
            if (user != null && pass != null) {
                connection.setRequestProperty("Authorization", basicAuth(user, pass))
            }
            if (depthHeader) connection.setRequestProperty("Depth", "0")
            if (contentType != null) connection.setRequestProperty("Content-Type", contentType)
            if (body != null) {
                connection.doOutput = true
                connection.outputStream.use { it.write(body) }
            }

            val status = connection.responseCode
            val stream = if (status >= 400) connection.errorStream else connection.inputStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""

            if (status == 429) {
                rateLimitedUntil = System.currentTimeMillis() + 30_000
                throw NextcloudException("Nextcloud drosselt gerade Anfragen. Bitte 30s warten und dann erneut versuchen.")
            }
            HttpResult(status, text)
        } finally {
            connection.disconnect()
        }
    }

    private fun setMethodViaReflection(connection: HttpURLConnection, method: String) {
        try {
            var target: Any = connection
            // HttpsURLConnectionImpl delegiert an ein inneres delegate-Feld
            try {
                val delegateField = target.javaClass.getDeclaredField("delegate")
                delegateField.isAccessible = true
                target = delegateField.get(target) ?: target
            } catch (_: NoSuchFieldException) {
            }
            var clazz: Class<*>? = target.javaClass
            while (clazz != null) {
                try {
                    val methodField = clazz.getDeclaredField("method")
                    methodField.isAccessible = true
                    methodField.set(target, method)
                    return
                } catch (_: NoSuchFieldException) {
                    clazz = clazz.superclass
                }
            }
        } catch (e: Exception) {
            throw NextcloudException("HTTP-Methode $method wird nicht unterstützt: ${e.message}")
        }
    }

    // ─── Login Flow v2 ──────────────────────────────────────────────

    suspend fun initiateLoginFlow(serverUrl: String): LoginFlowStart {
        var normalized = serverUrl.trim()
        if (normalized.isEmpty()) throw NextcloudException("Server-URL fehlt")
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://$normalized"
        }
        normalized = normalizeUrl(normalized)

        val res = http("$normalized/index.php/login/v2", "POST")
        if (res.status !in 200..299) {
            throw NextcloudException("Login Flow konnte nicht gestartet werden (HTTP ${res.status})")
        }
        val data = try {
            json.parseToJsonElement(res.body).jsonObject
        } catch (_: Exception) {
            throw NextcloudException("Server liefert ungültiges JSON")
        }
        val login = data["login"]?.jsonPrimitive?.content
        val poll = data["poll"]?.jsonObject
        val endpoint = poll?.get("endpoint")?.jsonPrimitive?.content
        val token = poll?.get("token")?.jsonPrimitive?.content
        if (login == null || endpoint == null || token == null) {
            throw NextcloudException("Antwort vom Server ist unvollständig")
        }
        return LoginFlowStart(login, endpoint, token)
    }

    suspend fun pollLoginResult(pollEndpoint: String, token: String): PollResult {
        val body = "token=${URLEncoder.encode(token, "UTF-8")}"
        val res = http(
            pollEndpoint, "POST",
            body = body.toByteArray(),
            contentType = "application/x-www-form-urlencoded",
        )
        if (res.status == 404) return PollResult.Pending
        if (res.status !in 200..299) {
            throw NextcloudException("Polling des Login Flow fehlgeschlagen (HTTP ${res.status})")
        }
        val data = try {
            json.parseToJsonElement(res.body).jsonObject
        } catch (_: Exception) {
            throw NextcloudException("Server liefert ungültiges JSON")
        }
        val server = data["server"]?.jsonPrimitive?.content
        val loginName = data["loginName"]?.jsonPrimitive?.content
        val appPassword = data["appPassword"]?.jsonPrimitive?.content
        if (server == null || loginName == null || appPassword == null) {
            throw NextcloudException("Antwort vom Server ist unvollständig")
        }
        return PollResult.Complete(normalizeUrl(server), loginName, appPassword)
    }

    // ─── DAV-User-Auflösung + Verbindung ────────────────────────────

    /** Echte uid via OCS auflösen (loginName kann E-Mail/Display-Name sein). */
    private suspend fun resolveUserId(serverUrl: String, loginName: String, appPassword: String): String {
        return try {
            val res = http(
                "${normalizeUrl(serverUrl)}/ocs/v1.php/cloud/user?format=json",
                "GET", loginName, appPassword,
            )
            if (res.status == 200 && res.body.isNotEmpty()) {
                val uid = json.parseToJsonElement(res.body)
                    .jsonObject["ocs"]?.jsonObject
                    ?.get("data")?.jsonObject
                    ?.get("id")?.jsonPrimitive?.content
                uid?.trim().takeUnless { it.isNullOrEmpty() } ?: loginName
            } else {
                loginName
            }
        } catch (_: Exception) {
            loginName
        }
    }

    private suspend fun getDavUser(url: String, user: String, pass: String): String {
        val key = "${normalizeUrl(url)}|${user.trim()}"
        resolvedDavUsers[key]?.let { return it }
        val davUser = resolveUserId(url, user, pass)
        resolvedDavUsers[key] = davUser
        return davUser
    }

    suspend fun testConnection(url: String, user: String, pass: String): Result<Unit> {
        return try {
            val davUser = getDavUser(url, user, pass)
            val res = http("${davPath(url, davUser)}/", "PROPFIND", user, pass, depthHeader = true)
            when (res.status) {
                207, 200 -> Result.success(Unit)
                401 -> Result.failure(NextcloudException("Ungültige Anmeldedaten (401)"))
                404 -> Result.failure(NextcloudException("Server nicht gefunden (404)"))
                else -> Result.failure(NextcloudException("Unerwarteter Status: ${res.status}"))
            }
        } catch (e: Exception) {
            Result.failure(NextcloudException("Verbindung fehlgeschlagen: ${e.message}"))
        }
    }

    /** Ordner-Pfad unterhalb des DAV-Roots anlegen (MKCOL je Segment). */
    suspend fun ensureFolderPath(url: String, user: String, pass: String, segments: List<String>) {
        val davUser = getDavUser(url, user, pass)
        val base = davPath(url, davUser)
        var acc = ""
        for (segment in segments) {
            if (segment.isEmpty()) continue
            acc += "/" + encodePath(segment)
            val cacheKey = "${normalizeUrl(url)}|$user::$acc"
            if (cacheKey in verifiedFolders) continue
            val res = http("$base$acc/", "MKCOL", user, pass)
            when (res.status) {
                201, 405, 409 -> verifiedFolders.add(cacheKey)
                401 -> throw NextcloudException("Nicht autorisiert (401)")
                else -> throw NextcloudException("MKCOL ${res.status} auf $base$acc/")
            }
        }
    }

    // ─── Backup Upload / Download ───────────────────────────────────

    suspend fun uploadBackup(url: String, user: String, pass: String, jsonContent: String) {
        ensureFolderPath(url, user, pass, listOf(BACKUP_FOLDER))
        val davUser = getDavUser(url, user, pass)
        val target = "${davPath(url, davUser)}/$BACKUP_FOLDER/$BACKUP_FILENAME"
        val res = http(
            target, "PUT", user, pass,
            body = jsonContent.toByteArray(),
            contentType = "application/json",
            timeoutMs = 60_000,
        )
        when (res.status) {
            201, 204 -> return
            401 -> throw NextcloudException("Nicht autorisiert (401)")
            else -> throw NextcloudException("Upload ${res.status} auf $target")
        }
    }

    /** null wenn kein Backup existiert (404). */
    suspend fun downloadBackup(url: String, user: String, pass: String): String? {
        val davUser = getDavUser(url, user, pass)
        val res = http("${davPath(url, davUser)}/$BACKUP_FOLDER/$BACKUP_FILENAME", "GET", user, pass, timeoutMs = 60_000)
        if (res.status == 404) return null
        if (res.status == 401) throw NextcloudException("Nicht autorisiert (401)")
        if (res.status !in 200..299) throw NextcloudException("Download fehlgeschlagen: ${res.status}")
        return res.body
    }

    suspend fun findBackup(url: String, user: String, pass: String): Boolean = try {
        val davUser = getDavUser(url, user, pass)
        val res = http(
            "${davPath(url, davUser)}/$BACKUP_FOLDER/$BACKUP_FILENAME",
            "PROPFIND", user, pass, depthHeader = true,
        )
        res.status == 207
    } catch (e: Exception) {
        Log.w(TAG, "findBackup fehlgeschlagen: ${e.message}")
        false
    }

    /** Binäre Datei (z.B. PDF) unter einen Ordner-Pfad hochladen. */
    suspend fun uploadBinaryToPath(
        url: String,
        user: String,
        pass: String,
        folders: List<String>,
        filename: String,
        bytes: ByteArray,
        mimeType: String = "application/octet-stream",
    ) {
        ensureFolderPath(url, user, pass, folders)
        val davUser = getDavUser(url, user, pass)
        val folderPath = folders.joinToString("/") { encodePath(it) }
        val target = "${davPath(url, davUser)}/$folderPath/${encodePath(filename)}"
        val res = http(target, "PUT", user, pass, body = bytes, contentType = mimeType, timeoutMs = 120_000)
        when (res.status) {
            201, 204 -> return
            401 -> throw NextcloudException("Nicht autorisiert (401)")
            else -> throw NextcloudException("Upload ${res.status} auf $target")
        }
    }
}
