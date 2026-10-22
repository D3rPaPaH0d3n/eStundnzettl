package com.estundnzettl.app.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.LruCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.Closeable
import java.io.File

/**
 * Hält das Vorschau-PDF offen und rendert Seiten erst, wenn sie sichtbar
 * werden. Mit eingebetteten Anhang-Seiten kann ein Bericht 20+ Seiten
 * haben; alle vorab in Zoom-Auflösung zu rendern sprengt den Speicher.
 */
internal class ReportPreviewDocument private constructor(
    private val file: File,
    private val pfd: ParcelFileDescriptor,
    private val renderer: PdfRenderer,
    /** Höhe / Breite je Seite, für Platzhalter in der richtigen Größe. */
    val pageAspects: List<Float>,
) : Closeable {
    private val lock = Any()
    private var closed = false
    private val cache = object : LruCache<String, Bitmap>(CACHE_BYTES) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount
    }

    val pageCount: Int get() = pageAspects.size

    /** Bereits gerenderte Seite ohne neu zu rendern (vermeidet Weiß-Blitzer). */
    fun peek(index: Int, widthPx: Int): Bitmap? = synchronized(lock) { cache.get(key(index, widthPx)) }

    /** Rendert Seite [index] in [widthPx] Breite; null, wenn das Dokument schon geschlossen ist. */
    suspend fun render(index: Int, widthPx: Int): Bitmap? = withContext(Dispatchers.Default) {
        // PdfRenderer erlaubt nur eine offene Seite gleichzeitig
        synchronized(lock) {
            if (closed || index !in 0 until pageCount) return@synchronized null
            cache.get(key(index, widthPx))?.let { return@synchronized it }
            renderer.openPage(index).use { page ->
                val width = widthPx.coerceAtLeast(1)
                val height = (width.toFloat() * page.height / page.width).toInt().coerceAtLeast(1)
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                bitmap.eraseColor(android.graphics.Color.WHITE)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                cache.put(key(index, widthPx), bitmap)
                bitmap
            }
        }
    }

    override fun close() {
        synchronized(lock) {
            if (closed) return
            closed = true
            // Bitmaps nicht recyceln: Compose zeigt sie evtl. noch bis zum nächsten Frame
            cache.evictAll()
            runCatching { renderer.close() }
            runCatching { pfd.close() }
            file.delete()
        }
    }

    private fun key(index: Int, widthPx: Int) = "$index@$widthPx"

    companion object {
        /** Gerenderte Seiten im Speicher, ca. 4 Seiten in Zoom-Auflösung. */
        private const val CACHE_BYTES = 64 * 1024 * 1024

        fun open(context: Context, bytes: ByteArray): ReportPreviewDocument {
            val file = File.createTempFile("report-preview", ".pdf", context.cacheDir)
            try {
                file.writeBytes(bytes)
                val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                try {
                    val renderer = PdfRenderer(pfd)
                    val aspects = (0 until renderer.pageCount).map { index ->
                        renderer.openPage(index).use { it.height.toFloat() / it.width }
                    }
                    return ReportPreviewDocument(file, pfd, renderer, aspects)
                } catch (e: Exception) {
                    pfd.close()
                    throw e
                }
            } catch (e: Exception) {
                file.delete()
                throw e
            }
        }
    }
}
