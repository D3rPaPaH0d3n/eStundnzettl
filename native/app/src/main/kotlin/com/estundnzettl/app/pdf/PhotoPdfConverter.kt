package com.estundnzettl.app.pdf

import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import java.io.File

/** Längste Kante des Fotos im geteilten PDF (~190 dpi auf A4). */
private const val PHOTO_PDF_MAX_EDGE_PX = 1600

/** Rand um das Foto in Punkt. */
private const val PHOTO_PDF_MARGIN = 18f

/**
 * Verpackt ein Foto als einseitiges A4-PDF (hoch oder quer, je nach Bild).
 * Beim Teilen haben so alle Dateien denselben Typ `application/pdf`: WhatsApp
 * & Co. nehmen mehrere PDFs an, ein Bündel aus PDF und Foto aber nicht.
 * Liefert false, wenn das Foto nicht lesbar ist.
 */
internal fun convertPhotoToPdf(source: File, mimeType: String, target: File): Boolean {
    val rasterizer = AttachmentRasterizer(PHOTO_PDF_MAX_EDGE_PX, PHOTO_PDF_MAX_EDGE_PX)
    val doc = PdfDocument()
    try {
        var written = false
        rasterizer.rasterize(source, mimeType, limit = 1) { _, _, bitmap ->
            val landscape = bitmap.width > bitmap.height
            val pageW = if (landscape) 842 else 595
            val pageH = if (landscape) 595 else 842
            val page = doc.startPage(PdfDocument.PageInfo.Builder(pageW, pageH, 1).create())
            val boxW = pageW - 2 * PHOTO_PDF_MARGIN
            val boxH = pageH - 2 * PHOTO_PDF_MARGIN
            val scale = minOf(boxW / bitmap.width, boxH / bitmap.height)
            val w = bitmap.width * scale
            val h = bitmap.height * scale
            val left = (pageW - w) / 2f
            val top = (pageH - h) / 2f
            page.canvas.drawBitmap(
                bitmap, null, RectF(left, top, left + w, top + h),
                Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG),
            )
            doc.finishPage(page)
            written = true
        }
        if (!written) return false
        target.outputStream().use { doc.writeTo(it) }
        return true
    } catch (_: Exception) {
        target.delete()
        return false
    } finally {
        doc.close()
    }
}
