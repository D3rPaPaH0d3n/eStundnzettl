package com.estundnzettl.app

/**
 * Narrowest MIME type covering every file of a share bundle.
 *
 * Messengers such as WhatsApp read a SEND_MULTIPLE with the unspecific
 * wildcard type plus EXTRA_TEXT as a plain text share and silently drop the
 * files, so the bundle advertises e.g. `application/pdf` whenever all
 * files agree and only falls back to a wildcard for mixed types.
 */
internal fun commonShareMimeType(mimeTypes: List<String>): String {
    val normalized = mimeTypes.map { it.trim().lowercase() }.filter { '/' in it }
    if (normalized.isEmpty()) return "*/*"
    if (normalized.all { it == normalized.first() }) return normalized.first()
    val topLevel = normalized.map { it.substringBefore('/') }
    return if (topLevel.all { it == topLevel.first() }) "${topLevel.first()}/*" else "*/*"
}

/**
 * Mixed bundles (report PDF plus a photo) still need the wildcard type.
 * Messengers read that together with EXTRA_TEXT as a text share, so they
 * get the files without the message; mail apps keep the text.
 */
internal fun shouldDropMessengerText(fileCount: Int, mimeType: String?): Boolean =
    fileCount > 1 && mimeType == "*/*"

/**
 * Readable, unique file name for a shared original, e.g.
 * `2026-10-14_Krankenstand.pdf` instead of the internal storage id.
 * [taken] collects the names already used in this bundle.
 */
internal fun attachmentShareFileName(
    label: String,
    date: String?,
    mimeType: String,
    storagePath: String,
    taken: MutableSet<String>,
): String {
    val extension = when (mimeType.lowercase()) {
        "application/pdf" -> "pdf"
        "image/jpeg" -> "jpg"
        "image/png" -> "png"
        "image/webp" -> "webp"
        else -> storagePath.substringAfterLast('/').substringAfterLast('.', "bin").lowercase()
    }
    val safeLabel = label.trim()
        .replace(Regex("[^\\p{L}\\p{N}._-]+"), "_")
        .trim('_', '.')
        .take(60)
        .ifEmpty { "Dokument" }
    val base = listOfNotNull(date?.takeIf { it.isNotBlank() }, safeLabel).joinToString("_")
    var name = "$base.$extension"
    var counter = 2
    while (!taken.add(name.lowercase())) {
        name = "${base}_$counter.$extension"
        counter++
    }
    return name
}
