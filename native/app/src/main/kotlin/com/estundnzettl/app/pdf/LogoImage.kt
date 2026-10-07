package com.estundnzettl.app.pdf

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.util.Base64
import com.estundnzettl.core.model.REPORT_LOGO_MAX_CHARS
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

/** Längste Logo-Kante beim Speichern — reicht für ~120 pt Breite in Druckqualität. */
private const val LOGO_STORE_MAX_PX = 600

/** Obergrenze beim Dekodieren gespeicherter Logos (auch aus fremden Backups). */
private const val LOGO_DECODE_MAX_PX = 1200

/** Ab dieser Größe wird ein PNG ohne Transparenz-Bedarf als JPEG gespeichert. */
private const val LOGO_PNG_SOFT_MAX_CHARS = 700_000

/**
 * Gewähltes Bild → Logo-Data-URL. PNG behält transparente Hintergründe;
 * wird es zu groß, fällt es auf JPEG auf weißem Grund zurück.
 * Wirft, wenn das Bild nicht lesbar ist oder auch als JPEG zu groß bleibt.
 */
fun uriToLogoDataUrl(context: Context, uri: Uri): String {
    val bitmap = decodeScaledForStore(context, uri)
    val png = bitmap.toDataUrl(Bitmap.CompressFormat.PNG, 100, "image/png")
    if (png.length <= LOGO_PNG_SOFT_MAX_CHARS) return png

    // JPEG kennt keine Transparenz — sonst würde der Hintergrund schwarz
    val opaque = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
    Canvas(opaque).apply {
        drawColor(Color.WHITE)
        drawBitmap(bitmap, 0f, 0f, null)
    }
    val jpeg = opaque.toDataUrl(Bitmap.CompressFormat.JPEG, 90, "image/jpeg")
    check(jpeg.length <= REPORT_LOGO_MAX_CHARS) { "Logo zu groß" }
    return jpeg
}

private fun decodeScaledForStore(context: Context, uri: Uri): Bitmap {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        return ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            val longest = max(info.size.width, info.size.height)
            if (longest > LOGO_STORE_MAX_PX) {
                val scale = LOGO_STORE_MAX_PX.toFloat() / longest
                decoder.setTargetSize(
                    (info.size.width * scale).roundToInt().coerceAtLeast(1),
                    (info.size.height * scale).roundToInt().coerceAtLeast(1),
                )
            }
        }
    }
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        ?: error("Bild nicht lesbar")
    val decoded = decodeBounded(bytes, LOGO_STORE_MAX_PX * 2) ?: error("Bild nicht lesbar")
    val longest = max(decoded.width, decoded.height)
    if (longest <= LOGO_STORE_MAX_PX) return decoded
    val scale = LOGO_STORE_MAX_PX.toFloat() / longest
    return Bitmap.createScaledBitmap(
        decoded,
        (decoded.width * scale).roundToInt().coerceAtLeast(1),
        (decoded.height * scale).roundToInt().coerceAtLeast(1),
        true,
    )
}

private fun Bitmap.toDataUrl(format: Bitmap.CompressFormat, quality: Int, mime: String): String {
    val out = ByteArrayOutputStream()
    compress(format, quality, out)
    return "data:$mime;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
}

/** Gespeichertes Logo → Bitmap, höchstens [LOGO_DECODE_MAX_PX] Kantenlänge; null bei Fehlern. */
fun decodeLogoDataUrl(dataUrl: String?): Bitmap? {
    val base64 = dataUrl?.substringAfter("base64,", "").orEmpty()
    if (base64.isEmpty()) return null
    return runCatching { decodeBounded(Base64.decode(base64, Base64.DEFAULT), LOGO_DECODE_MAX_PX) }.getOrNull()
}

/** Dekodiert mit inSampleSize, damit auch Riesenbilder keinen Speicher sprengen. */
private fun decodeBounded(bytes: ByteArray, maxPx: Int): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / sample > maxPx) sample *= 2
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
}
