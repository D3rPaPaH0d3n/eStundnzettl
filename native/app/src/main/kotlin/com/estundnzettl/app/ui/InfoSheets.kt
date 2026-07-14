package com.estundnzettl.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Entfernt die Trans-Markup-Tags (<b>, <plus>, <icon/>) aus i18n-Texten. */
private fun stripMarkup(text: String): String =
    text.replace(Regex("</?(b|plus|icon)\\s*/?>"), "")

// ─────────────────────────────────────────────────────────────────
// Hilfe — Port von HelpModal.tsx (Inhalte aus helpModal.* i18n-Keys)
// ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpSheet(onDismiss: () -> Unit) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    fun h(key: String): String = stripMarkup(t.t("helpModal.$key"))

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.background) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 32.dp),
        ) {
            item {
                Column {
                    Text(h("title"), color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    Text(h("subtitle"), color = colors.textMuted, fontSize = 13.sp)
                }
            }
            item {
                AppCard {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(h("intro.badge"), color = colors.accent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(h("intro.body"), color = colors.textSecondary, fontSize = 13.sp)
                    }
                }
            }

            val steps = listOf<Pair<String, List<Pair<String?, String>>>>(
                "step1.title" to listOf(
                    null to "step1.lead",
                    "step1.timerTitle" to "step1.timerBody",
                    "step1.manualTitle" to "step1.manualBody",
                ),
                "step2.title" to listOf(
                    null to "step2.lead",
                    null to "step2.arrival",
                    null to "step2.drive",
                ),
                "step3.title" to listOf(null to "step3.body"),
                "step4.title" to listOf(null to "step4.body"),
                "step5.title" to listOf(null to "step5.preview", null to "step5.share"),
                "step6.title" to listOf(
                    null to "step6.lead",
                    "step6.gdriveTitle" to "step6.gdriveBody",
                    "step6.localTitle" to "step6.localBody",
                ),
                "step7.title" to listOf(
                    null to "step7.lead",
                    null to "step7.nextcloud",
                    null to "step7.jsonIO",
                    null to "step7.pdfArchive",
                    null to "step7.codes",
                    null to "step7.recordOnly",
                ),
            )

            items(steps) { (titleKey, rows) ->
                AppCard {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(h(titleKey), color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        rows.forEach { (subTitle, bodyKey) ->
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                if (subTitle != null) {
                                    Text(h(subTitle), color = colors.accent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                                Text(h(bodyKey), color = colors.textSecondary, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            item {
                AppCard {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(h("tips.title"), color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        listOf(
                            "tips.deleteTitle" to "tips.deleteBody",
                            "tips.editTitle" to "tips.editBody",
                            "tips.autoBackupTitle" to "tips.autoBackupBody",
                            "tips.themeTitle" to "tips.themeBody",
                        ).forEach { (title, body) ->
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(h(title), color = colors.accent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text(h(body), color = colors.textSecondary, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            item {
                Text(
                    h("tagline"),
                    color = colors.textMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// Changelog — Port von ChangelogModal.tsx (Daten aus assets/changelog)
// ─────────────────────────────────────────────────────────────────

data class ChangelogSection(val title: String, val items: List<String>)
data class ChangelogVersion(
    val version: String,
    val date: String,
    val title: String,
    val isMajor: Boolean,
    val sections: List<ChangelogSection>,
)

fun loadChangelog(context: android.content.Context, language: String): List<ChangelogVersion> {
    val lang = if (language == "en") "en" else "de"
    return try {
        val raw = context.assets.open("changelog/changelog.$lang.json")
            .bufferedReader().use { it.readText() }
        Json.parseToJsonElement(raw).jsonArray.map { el ->
            val obj = el.jsonObject
            ChangelogVersion(
                version = obj["version"]?.jsonPrimitive?.content ?: "",
                date = obj["date"]?.jsonPrimitive?.content ?: "",
                title = obj["title"]?.jsonPrimitive?.content ?: "",
                isMajor = obj["isMajor"]?.jsonPrimitive?.content == "true",
                sections = obj["sections"]?.jsonArray?.map { sec ->
                    val so = sec.jsonObject
                    ChangelogSection(
                        title = so["title"]?.jsonPrimitive?.content ?: "",
                        items = so["items"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList(),
                    )
                } ?: emptyList(),
            )
        }
    } catch (_: Exception) {
        emptyList()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangelogSheet(onDismiss: () -> Unit) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val versions = remember(t.language) { loadChangelog(context, t.language) }
    var expandedVersion by remember { mutableStateOf(versions.firstOrNull()?.version) }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.background) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 32.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        t.t("changelogModal.title"),
                        color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp,
                    )
                    Text(
                        t.t("changelogModal.versionsCount", "count" to versions.size),
                        color = colors.textMuted, fontSize = 13.sp,
                    )
                }
            }
            items(versions, key = { it.version }) { version ->
                val expanded = expandedVersion == version.version
                AppCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    expandedVersion = if (expanded) null else version.version
                                },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "v${version.version}",
                                        color = if (version.isMajor) colors.accent else colors.textPrimary,
                                        fontWeight = FontWeight.Bold, fontSize = 14.sp,
                                    )
                                    Text(version.date, color = colors.textFaint, fontSize = 12.sp)
                                }
                                Text(version.title, color = colors.textSecondary, fontSize = 13.sp)
                            }
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = null,
                                tint = colors.textFaint,
                                modifier = Modifier
                                    .size(18.dp)
                                    .rotate(if (expanded) 180f else 0f),
                            )
                        }
                        if (expanded) {
                            Column(
                                modifier = Modifier.padding(top = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                version.sections.forEach { section ->
                                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                        Text(
                                            section.title,
                                            color = colors.textPrimary,
                                            fontWeight = FontWeight.Bold, fontSize = 13.sp,
                                        )
                                        section.items.forEach { item ->
                                            Row {
                                                Text("•  ", color = colors.accent, fontSize = 12.sp)
                                                Text(item, color = colors.textSecondary, fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// App-Tour — Port von AppTour.tsx als Schritt-Dialog-Sequenz
// (die DOM-Spotlight-Positionierung des Originals entfällt nativ)
// ─────────────────────────────────────────────────────────────────

private val TOUR_STEPS = listOf("welcome", "dashboard", "fabTap", "fabTimer", "report", "settings", "done")

@Composable
fun AppTourDialog(i18n: I18n, onClose: () -> Unit) {
    val colors = LocalAppColors.current
    var index by remember { mutableStateOf(0) }
    val step = TOUR_STEPS[index]
    val isLast = index == TOUR_STEPS.lastIndex

    Dialog(onDismissRequest = onClose) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(colors.surface)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                i18n.t("appTour.steps.$step.title"),
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
            )
            Text(
                i18n.t("appTour.steps.$step.body"),
                color = colors.textSecondary,
                fontSize = 14.sp,
            )
            if (step == "fabTimer") {
                Text(
                    "☝ " + i18n.t("appTour.steps.fabTimer.hint"),
                    color = colors.accent,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Fortschritts-Punkte
                Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    TOUR_STEPS.indices.forEach { i ->
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (i == index) colors.accentStrong else colors.surfaceVariant),
                        )
                    }
                }
                Row {
                    TextButton(onClick = onClose) {
                        Text(i18n.t("appTour.skipAria"), color = colors.textMuted, fontSize = 13.sp)
                    }
                    TextButton(onClick = { if (isLast) onClose() else index++ }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (isLast) {
                                Icon(
                                    Icons.Filled.Check, contentDescription = null,
                                    tint = Palette.Emerald600, modifier = Modifier.size(16.dp),
                                )
                            }
                            Text(
                                if (isLast) i18n.t("appTour.finish") else i18n.t("appTour.next"),
                                color = colors.accentStrong,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(start = 4.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
