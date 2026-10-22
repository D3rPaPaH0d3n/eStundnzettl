package com.estundnzettl.app.pdf

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.media.ExifInterface
import android.os.ParcelFileDescriptor
import java.io.File

/**
 * Auflösung der Anhang-Seiten. Bewusst klein: PdfDocument speichert
 * Bitmaps verlustfrei, 110 dpi halten eine Krankmeldung lesbar und das
 * Bundle für Mail-Limits schlank.
 */
internal const val ATTACHMENT_DPI = 110

/**
 * Obergrenze eingebetteter Anhang-Seiten pro Bericht. PdfDocument hält
 * jedes gezeichnete Bitmap bis writeTo() im Speicher.
 */
internal const val MAX_EMBEDDED_ATTACHMENT_PAGES = 20

/** Pixelmaß, auf das eine Fläche von [widthPt] x [heightPt] Punkt bei [dpi] gerastert wird. */
internal fun rasterSizeForBox(widthPt: Float, heightPt: Float, dpi: Int = ATTACHMENT_DPI): Pair<Int, Int> =
    (widthPt / 72f * dpi).toInt().coerceAtLeast(1) to (heightPt / 72f * dpi).toInt().coerceAtLeast(1)

/** Größe von [srcW] x [srcH], seitenverhältnistreu in [maxW] x [maxH] eingepasst (nie vergrößert). */
internal fun fitInside(srcW: Int, srcH: Int, maxW: Int, maxH: Int): Pair<Int, Int> {
    if (srcW <= 0 || srcH <= 0) return 1 to 1
    val scale = minOf(maxW.toFloat() / srcW, maxH.toFloat() / srcH, 1f)
    return (srcW * scale).toInt().coerceAtLeast(1) to (srcH * scale).toInt().coerceAtLeast(1)
}

/** Größte Zweierpotenz, mit der das Bild beim Decodieren noch mindestens [maxW] x [maxH] füllt. */
internal fun decodeSampleSize(srcW: Int, srcH: Int, maxW: Int, maxH: Int): Int {
    var sample = 1
    while (srcW / (sample * 2) >= maxW && srcH / (sample * 2) >= maxH) sample *= 2
    return sample
}

/** Empfängt eine gerasterte Seite: Seitenindex, Gesamtseitenzahl, Raster. */
internal typealias PageSink = (index: Int, total: Int, bitmap: Bitmap) -> Unit

/**
 * Rastert hochgeladene Dokumente (PDF, JPEG/PNG/WebP) seitenweise für
 * die Anhang-Seiten des Berichts. PdfDocument kann keine fremden
 * PDF-Seiten übernehmen, daher landen auch PDF-Anhänge als Bild im Bericht.
 */
internal class AttachmentRasterizer(
    private val maxWidthPx: Int,
    private val maxHeightPx: Int,
) {
    /**
     * Ruft [onPage] für die ersten [limit] Seiten auf und liefert die
     * Gesamtseitenzahl des Dokuments, oder null, wenn es nicht lesbar ist.
     */
    fun rasterize(file: File, mimeType: String, limit: Int, onPage: PageSink): Int? =
        try {
            when {
                !file.isFile -> null
                mimeType == "application/pdf" -> rasterizePdf(file, limit, onPage)
                mimeType.startsWith("image/") -> rasterizeImage(file)?.let { bitmap ->
                    if (limit > 0) onPage(0, 1, bitmap)
                    1
                }
                else -> null
            }
        } catch (_: Exception) {
            // Passwortgeschützt, beschädigt oder zu groß: Platzhalter statt Absturz
            null
        } catch (_: OutOfMemoryError) {
            null
        }

    private fun rasterizePdf(file: File, limit: Int, onPage: PageSink): Int =
        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
            PdfRenderer(pfd).use { renderer ->
                for (index in 0 until minOf(renderer.pageCount, limit)) {
                    renderer.openPage(index).use { page ->
                        val (w, h) = rasterSizeForPage(page.width, page.height)
                        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                        bitmap.eraseColor(Color.WHITE)
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
                        onPage(index, renderer.pageCount, bitmap)
                    }
                }
                renderer.pageCount
            }
        }

    /** PDF-Seitenmaß (Punkt) bei [ATTACHMENT_DPI], eingepasst in die Zielfläche. */
    private fun rasterSizeForPage(widthPt: Int, heightPt: Int): Pair<Int, Int> {
        val (w, h) = rasterSizeForBox(widthPt.toFloat(), heightPt.toFloat())
        return fitInside(w, h, maxWidthPx, maxHeightPx)
    }

    private fun rasterizeImage(file: File): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val rotation = exifRotation(file)
        // Bei 90°/270° tauschen Breite und Höhe nach dem Drehen
        val (srcW, srcH) = if (rotation % 180 == 0) {
            bounds.outWidth to bounds.outHeight
        } else {
            bounds.outHeight to bounds.outWidth
        }
        val (targetW, targetH) = fitInside(srcW, srcH, maxWidthPx, maxHeightPx)
        val options = BitmapFactory.Options().apply {
            inSampleSize = decodeSampleSize(srcW, srcH, targetW, targetH)
        }
        val decoded = BitmapFactory.decodeFile(file.path, options) ?: return null

        val matrix = Matrix().apply {
            postRotate(rotation.toFloat())
            val rotatedW = if (rotation % 180 == 0) decoded.width else decoded.height
            val scale = targetW.toFloat() / rotatedW
            if (scale < 1f) postScale(scale, scale)
        }
        if (matrix.isIdentity) return decoded
        val transformed = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        if (transformed !== decoded) decoded.recycle()
        return transformed
    }

    private fun exifRotation(file: File): Int = try {
        when (
            ExifInterface(file.path).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL,
            )
        ) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90
            ExifInterface.ORIENTATION_ROTATE_180 -> 180
            ExifInterface.ORIENTATION_ROTATE_270 -> 270
            else -> 0
        }
    } catch (_: Exception) {
        0
    }
}
