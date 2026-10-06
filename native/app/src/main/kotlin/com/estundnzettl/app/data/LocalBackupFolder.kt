package com.estundnzettl.app.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.documentfile.provider.DocumentFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate

/**
 * User-chosen folder for local backups and the monthly PDF archive.
 * The system folder picker returns a tree URI; the grant is persisted
 * so later backups can write without asking again.
 */
class LocalBackupFolder(
    private val context: Context,
    private val settings: SettingsRepository,
) {

    suspend fun hasPersistedTree(): Boolean {
        val uri = readUri() ?: return false
        return context.contentResolver.persistedUriPermissions.any { permission ->
            permission.uri == uri && permission.isReadPermission && permission.isWritePermission
        }
    }

    suspend fun persist(uri: Uri): Boolean = withContext(Dispatchers.IO) {
        if (uri.scheme != "content") return@withContext false
        val flags = PERSIST_FLAGS
        val granted = runCatching {
            context.contentResolver.takePersistableUriPermission(uri, flags)
            context.contentResolver.persistedUriPermissions.any { permission ->
                permission.uri == uri && permission.isWritePermission
            }
        }.getOrDefault(false)
        if (!granted) return@withContext false
        settings.setString(KEY_TREE_URI, uri.toString())
        true
    }

    suspend fun clear() {
        val uri = readUri()
        if (uri != null) {
            runCatching { context.contentResolver.releasePersistableUriPermission(uri, PERSIST_FLAGS) }
        }
        settings.delete(KEY_TREE_URI)
    }

    /** Writes the canonical backup file and one dated copy into the chosen folder. */
    suspend fun writeText(content: String): Boolean = withContext(Dispatchers.IO) {
        val dir = backupDirectory() ?: return@withContext false
        val bytes = content.toByteArray(Charsets.UTF_8)
        val primary = writeFile(dir, FILE_NAME, "application/json", bytes)
        if (primary) writeDatedCopy(dir, bytes)
        primary
    }

    /** Writes a PDF under eStundnzettl/Archiv inside the chosen folder. */
    suspend fun writeArchive(filename: String, bytes: ByteArray): Boolean = withContext(Dispatchers.IO) {
        val backupDir = backupDirectory() ?: return@withContext false
        val archive = findOrCreateDirectory(backupDir, ARCHIVE_DIR) ?: return@withContext false
        writeFile(archive, filename, "application/pdf", bytes)
    }

    /** Reads a backup from a tree the user just picked. Does not store the grant. */
    suspend fun readBackup(uri: Uri): String? = withContext(Dispatchers.IO) {
        val tree = DocumentFile.fromTreeUri(context, uri) ?: return@withContext null
        readFrom(tree) ?: childDirectory(tree, FOLDER_NAME)?.let { readFrom(it) }
    }

    private suspend fun readUri(): Uri? =
        settings.getString(KEY_TREE_URI)?.takeIf { it.isNotEmpty() }?.let { runCatching { Uri.parse(it) }.getOrNull() }

    private suspend fun backupDirectory(): DocumentFile? {
        val uri = readUri() ?: return null
        val tree = DocumentFile.fromTreeUri(context, uri) ?: return null
        val childName = preferredBackupDirectoryName(tree.name)
        return if (childName == null) tree else findOrCreateDirectory(tree, childName)
    }

    private fun writeDatedCopy(dir: DocumentFile, bytes: ByteArray) {
        val today = LocalDate.now().toString()
        val datedName = "estundnzettl_backup_$today.json"
        val alreadyToday = dir.listFiles().any { file ->
            file.name?.startsWith("estundnzettl_backup_$today") == true
        }
        if (!alreadyToday) writeFile(dir, datedName, "application/json", bytes)
        dir.listFiles()
            .filter { file ->
                val name = file.name ?: return@filter false
                name.startsWith("estundnzettl_backup_") && name.endsWith(".json")
            }
            .sortedByDescending { it.name }
            .drop(DATED_COPIES)
            .forEach { file -> runCatching { file.delete() } }
    }

    private fun readFrom(dir: DocumentFile): String? {
        val files = dir.listFiles().filter { it.isFile }
        val chosen = chooseBackupFileName(files.mapNotNull { it.name }) ?: return null
        val file = files.firstOrNull { it.name == chosen } ?: return null
        return runCatching {
            context.contentResolver.openInputStream(file.uri)?.use { stream ->
                stream.readBytes().toString(Charsets.UTF_8)
            }
        }.onFailure { Log.w(TAG, "Backup im Ordner konnte nicht gelesen werden", it) }
            .getOrNull()
    }

    private fun writeFile(dir: DocumentFile, displayName: String, mime: String, bytes: ByteArray): Boolean {
        val base = displayName.substringBeforeLast('.').ifEmpty { displayName }
        val existing = dir.listFiles().firstOrNull { file ->
            val name = file.name ?: return@firstOrNull false
            file.isFile && (name == displayName || name == base || name == "$base.json" || name == "$base.pdf")
        }
        if (existing != null) {
            val overwritten = runCatching {
                context.contentResolver.openOutputStream(existing.uri, "wt")?.use { stream ->
                    stream.write(bytes)
                    true
                } ?: false
            }.getOrDefault(false)
            if (overwritten) return true
        }
        val created = dir.createFile(mime, base) ?: return false
        return runCatching {
            context.contentResolver.openOutputStream(created.uri)?.use { stream ->
                stream.write(bytes)
                true
            } ?: false
        }.getOrDefault(false)
    }

    private fun findOrCreateDirectory(parent: DocumentFile, name: String): DocumentFile? =
        childDirectory(parent, name) ?: parent.createDirectory(name)

    private fun childDirectory(parent: DocumentFile, name: String): DocumentFile? =
        parent.listFiles().firstOrNull { it.isDirectory && it.name.equals(name, ignoreCase = true) }

    companion object {
        private const val TAG = "LocalBackupFolder"
        const val KEY_TREE_URI = "local_backup_tree_uri"
        const val FOLDER_NAME = "eStundnzettl"
        const val FILE_NAME = "estundnzettl_backup.json"
        private const val ARCHIVE_DIR = "Archiv"
        private const val DATED_COPIES = 7
        private const val PERSIST_FLAGS =
            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    }
}

/** null means the chosen tree is already the backup folder. */
internal fun preferredBackupDirectoryName(treeDisplayName: String?): String? =
    if (treeDisplayName.equals(LocalBackupFolder.FOLDER_NAME, ignoreCase = true)) null
    else LocalBackupFolder.FOLDER_NAME

/** Prefers the canonical file, then the newest dated copy. */
internal fun chooseBackupFileName(names: List<String>): String? {
    if (LocalBackupFolder.FILE_NAME in names) return LocalBackupFolder.FILE_NAME
    return names
        .filter { it.startsWith("estundnzettl_backup_") && it.endsWith(".json") }
        .maxOrNull()
}
