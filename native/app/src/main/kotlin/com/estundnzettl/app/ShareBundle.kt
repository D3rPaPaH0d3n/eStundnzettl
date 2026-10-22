package com.estundnzettl.app

import com.estundnzettl.core.model.Attachment

/**
 * Narrowest MIME type covering every file of a share bundle.
 *
 * Receivers match on the advertised type, so the bundle names e.g.
 * `application/pdf` whenever all files agree and only falls back to a
 * wildcard for mixed types (which messengers cannot take, see
 * [messengerShareAttachments]).
 */
internal fun commonShareMimeType(mimeTypes: List<String>): String {
    val normalized = mimeTypes.map { it.trim().lowercase() }.filter { '/' in it }
    if (normalized.isEmpty()) return "*/*"
    if (normalized.all { it == normalized.first() }) return normalized.first()
    val topLevel = normalized.map { it.substringBefore('/') }
    return if (topLevel.all { it == topLevel.first() }) "${topLevel.first()}/*" else "*/*"
}

/**
 * Originals that go along with a messenger share. WhatsApp & Co. drop a
 * mixed bundle (report PDF plus a photo) entirely, so messengers only get
 * PDFs: none at all when the documents are already embedded as pages in
 * the report, otherwise the PDF originals.
 */
internal fun messengerShareAttachments(attachments: List<Attachment>, embedded: Boolean): List<Attachment> =
    if (embedded) emptyList() else attachments.filter { it.mimeType.equals("application/pdf", ignoreCase = true) }

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
