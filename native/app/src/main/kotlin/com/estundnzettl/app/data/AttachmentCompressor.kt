package com.estundnzettl.app.data

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.media.ExifInterface
import com.estundnzettl.app.pdf.decodeSampleSize
import com.estundnzettl.app.pdf.fitInside
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

/** Längste Kante eines hochgeladenen Fotos: reicht für eine lesbare Krankmeldung. */
internal const val MAX_IMAGE_EDGE_PX = 2048

/** JPEG-Qualität der gespeicherten Fotos. */
internal const val IMAGE_JPEG_QUALITY = 82

/** Größte Foto-Datei, die überhaupt angenommen wird (vor dem Komprimieren). */
internal const val MAX_IMAGE_INPUT_BYTES = 25L * 1024 * 1024

/** PDFs lassen sich nicht verlustfrei verkleinern, daher eine feste Grenze. */
internal const val MAX_PDF_BYTES = 5L * 1024 * 1024

/**
 * Verkleinert ein hochgeladenes Foto vor dem Speichern: Drehung aus den
 * EXIF-Daten einrechnen, auf [MAX_IMAGE_EDGE_PX] begrenzen, Transparenz auf
 * Weiß legen und als JPEG ablegen. Hält App-Speicher, Bericht und Teilen
 * klein; Metadaten wie GPS fallen dabei weg.
 */
internal object AttachmentCompressor {
    /** Komprimiertes JPEG, oder null, wenn die Datei kein lesbares Bild ist. */
    fun compressImage(bytes: ByteArray): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val rotation = exifRotation(bytes)
        val (srcW, srcH) = if (rotation % 180 == 0) {
            bounds.outWidth to bounds.outHeight
        } else {
            bounds.outHeight to bounds.outWidth
        }
        val (targetW, targetH) = fitInside(srcW, srcH, MAX_IMAGE_EDGE_PX, MAX_IMAGE_EDGE_PX)
        val options = BitmapFactory.Options().apply {
            inSampleSize = decodeSampleSize(srcW, srcH, targetW, targetH)
        }
        val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: return null

        val rotatedW = if (rotation % 180 == 0) decoded.width else decoded.height
        val scale = minOf(targetW.toFloat() / rotatedW, 1f)
        val matrix = Matrix().apply {
            postRotate(rotation.toFloat())
            if (scale < 1f) postScale(scale, scale)
        }
        val transformed = if (matrix.isIdentity) {
            decoded
        } else {
            Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        }

        // JPEG kennt keine Transparenz: auf weißen Grund legen statt schwarz
        val flattened = Bitmap.createBitmap(transformed.width, transformed.height, Bitmap.Config.ARGB_8888)
        Canvas(flattened).apply {
            drawColor(Color.WHITE)
            drawBitmap(transformed, 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))
        }
        if (transformed !== decoded) transformed.recycle()
        decoded.recycle()

        return ByteArrayOutputStream().use { out ->
            flattened.compress(Bitmap.CompressFormat.JPEG, IMAGE_JPEG_QUALITY, out)
            flattened.recycle()
            out.toByteArray()
        }
    }

    private fun exifRotation(bytes: ByteArray): Int = try {
        when (
            ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(
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

/** Dateiname des gespeicherten Fotos: gleicher Name, Endung `.jpg`. */
internal fun compressedImageFileName(fileName: String): String {
    val base = fileName.substringBeforeLast('.', fileName).ifEmpty { "foto" }
    return "$base.jpg"
}
