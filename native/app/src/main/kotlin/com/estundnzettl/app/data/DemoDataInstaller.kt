package com.estundnzettl.app.data

import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.core.calc.DEMO_USER
import com.estundnzettl.core.calc.DEMO_WORK_CODES
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.generateDemoCalculationConfig
import com.estundnzettl.core.calc.generateDemoEntries
import com.estundnzettl.core.config.toJson
import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.util.UUID

/** Both entry points install the same complete demo, with real local PDF documents. */
internal suspend fun installDemoData(db: AppDatabase, filesDir: File, today: LocalDate = LocalDate.now()) {
    withContext(Dispatchers.IO) {
        val entries = generateDemoEntries(today)
        val previousAttachments = db.attachmentDao().getAll()
        val relativeDir = "attachments/demo-${UUID.randomUUID()}"
        val directory = File(filesDir, relativeDir)
        check(directory.mkdirs()) { "Could not create demo document directory" }
        try {
            val attachments = entries.filter { it.type == EntryType.WORK && it.code != WorkCodes.ARRIVAL }
                .groupBy { it.date.take(7) }.values.flatMap { monthEntries ->
                    val entry = monthEntries.first()
                    listOf("Arbeitsauftrag", "Regieschein").map { label ->
                        val id = "demo-${UUID.randomUUID()}"
                        val name = "${label}_${entry.date}.pdf"
                        val file = File(directory, "$id.pdf")
                        writeDemoDocument(file, label, entry)
                        Attachment(
                            id = id, entryId = entry.id, label = "$label (Demo)", fileName = name,
                            mimeType = "application/pdf", storagePath = "$relativeDir/$id.pdf",
                            fileSize = file.length(), createdAt = "${entry.date}T12:00:00Z",
                        )
                    }
                }
            db.replaceFullSnapshot(
                ImportSnapshot(
                    entries = entries, userData = DEMO_USER.toJson(), workCodes = DEMO_WORK_CODES,
                    attachments = attachments, attachmentLabels = attachments.map { it.label }.distinct(),
                    calculationConfig = generateDemoCalculationConfig(today).toJson(), locale = "at",
                ),
            )
        } catch (failure: Throwable) {
            directory.deleteRecursively()
            throw failure
        }
        // Remove replaced document files only after the snapshot committed successfully.
        val root = File(filesDir, "attachments").canonicalFile
        previousAttachments.forEach { attachment ->
            runCatching {
                val old = File(filesDir, attachment.storagePath).canonicalFile
                if (old.path.startsWith(root.path + File.separator) && old.isFile) old.delete()
            }
        }
    }
}

private fun writeDemoDocument(file: File, title: String, entry: Entry) {
    val document = PdfDocument()
    try {
        val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.DKGRAY; textSize = 12f }
        val canvas = page.canvas
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = 24f
        canvas.drawText("$title – DEMO", 48f, 72f, paint)
        paint.typeface = Typeface.DEFAULT
        paint.textSize = 12f
        val lines = listOf(
            "Musterbetrieb | eStundnzettl", "", "Datum: ${entry.date}",
            "Mitarbeiter: ${DEMO_USER.name}", "Projekt: ${entry.project.orEmpty()}", "",
        ) + if (title == "Arbeitsauftrag") listOf(
            "Auftrag: Montage und Funktionsprüfung der Anlage.",
            "Material und Werkzeug vorbereiten, Ausführung dokumentieren.",
            "Nach Abschluss den Regieschein zum Arbeitstag hinzufügen.",
        ) else listOf(
            "Leistung: Montage abgeschlossen und Funktion geprüft.",
            "Arbeitszeit: ${entry.start}–${entry.end}, Pause: ${entry.pause} Minuten",
            "Netto: ${entry.netDuration / 60} h ${entry.netDuration % 60} min",
            "Nächtigung: ${if (entry.overnight) "Ja" else "Nein"}",
        )
        lines.forEachIndexed { index, line -> canvas.drawText(line, 48f, 116f + index * 23f, paint) }
        paint.textSize = 10f
        canvas.drawText("Fiktive Beispieldaten – kein echter Auftrag oder Leistungsnachweis.", 48f, 760f, paint)
        document.finishPage(page)
        file.outputStream().use { document.writeTo(it) }
    } finally {
        document.close()
    }
}
