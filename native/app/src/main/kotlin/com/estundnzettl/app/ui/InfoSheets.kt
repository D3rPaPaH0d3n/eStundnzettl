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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Settings
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
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.AutoFixHigh
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.HourglassEmpty
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.RocketLaunch
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.Upload
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.Work
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.withStyle
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
// Hilfe — Port von HelpModal.tsx (Inhalte aus helpModal.* i18n-Keys):
// nummerierte Schritt-Kreise mit Einrück-Linie, Info-Karten, farbige
// Listen, Hausmasta-Block in Amber und das 2x2-Tipps-Grid.
// ─────────────────────────────────────────────────────────────────

/**
 * Rendert die Trans-Markup-Tags der Web-App: <b>fett</b>,
 * <plus>grün+fett</plus>, <icon/> wird zum Berichts-Symbol 📄.
 */
@Composable
private fun helpMarkup(text: String): androidx.compose.ui.text.AnnotatedString {
    val colors = LocalAppColors.current
    val source = text.replace("<icon/>", "📄").replace("<icon />", "📄")
    return androidx.compose.ui.text.buildAnnotatedString {
        var rest = source
        val pattern = Regex("<(b|plus)>(.*?)</\\1>", RegexOption.DOT_MATCHES_ALL)
        while (true) {
            val match = pattern.find(rest) ?: break
            append(rest.substring(0, match.range.first))
            val (tag, inner) = match.destructured
            val style = if (tag == "plus") {
                androidx.compose.ui.text.SpanStyle(
                    fontWeight = FontWeight.Bold,
                    color = colors.accent,
                )
            } else {
                androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Bold)
            }
            withStyle(style) { append(inner) }
            rest = rest.substring(match.range.last + 1)
        }
        append(rest)
    }
}

/** Nummern-Kreis + Titel, darunter der Inhalt mit Einrück-Linie. */
@Composable
private fun HelpStep(
    number: String,
    title: String,
    circleColor: Color? = null,
    circleIcon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    lineColor: Color? = null,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(
                        circleColor ?: if (colors.isDark) Color.White else Palette.Zinc900,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (circleIcon != null) {
                    Icon(
                        circleIcon, contentDescription = null,
                        tint = Color.White, modifier = Modifier.size(16.dp),
                    )
                } else {
                    Text(
                        number,
                        color = if (colors.isDark) Palette.Zinc900 else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    )
                }
            }
            Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        }
        Row(modifier = Modifier.height(androidx.compose.foundation.layout.IntrinsicSize.Min)) {
            Spacer(modifier = Modifier.width(15.dp))
            Box(
                modifier = Modifier
                    .width(2.dp)
                    .fillMaxHeight()
                    .background(lineColor ?: colors.borderSubtle),
            )
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 22.dp, top = 2.dp, bottom = 2.dp),
                content = content,
            )
        }
    }
}

/** Kleine Info-Karte mit Icon-Titelzeile (Timer/Manuell). */
@Composable
private fun HelpMiniCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    title: String,
    body: String,
) {
    val colors = LocalAppColors.current
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surfaceVariant.copy(alpha = if (colors.isDark) 0.6f else 1f))
            .padding(12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
            Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
        Text(
            helpMarkup(body),
            color = colors.textMuted, fontSize = 12.sp, lineHeight = 17.sp,
        )
    }
}

/** Icon links, Fließtext rechts (Urlaub/Dokumente). */
@Composable
private fun HelpIconParagraph(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    body: String,
) {
    val colors = LocalAppColors.current
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Text(
            helpMarkup(body),
            color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpSheet(onDismiss: () -> Unit) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    fun h(key: String): String = t.t("helpModal.$key")

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.background) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 40.dp),
        ) {
            item {
                Column {
                    Text(
                        h("title"),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Black,
                        fontSize = 24.sp,
                    )
                    Text(h("subtitle"), color = colors.textMuted, fontSize = 13.sp)
                }
            }

            // Intro (Emerald-Karte mit Raketen-Badge)
            item {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (colors.isDark) Palette.Emerald500.copy(alpha = 0.1f) else Palette.Emerald50,
                        )
                        .border(
                            1.dp,
                            if (colors.isDark) Palette.Emerald700.copy(alpha = 0.5f) else Palette.Emerald100,
                            RoundedCornerShape(16.dp),
                        )
                        .padding(16.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.RocketLaunch, contentDescription = null,
                            tint = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            h("intro.badge").uppercase(),
                            color = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 0.8.sp,
                        )
                    }
                    Text(
                        h("intro.body"),
                        color = colors.textSecondary, fontSize = 13.sp, lineHeight = 20.sp,
                    )
                }
            }

            // Orientierung für Menschen, die Smartphone-Apps noch nicht gewohnt sind.
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        h("firstSteps.title").uppercase(),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        letterSpacing = 0.8.sp,
                    )
                    HelpMiniCard(
                        Icons.Filled.Add, Palette.Emerald500,
                        h("firstSteps.addTitle"), h("firstSteps.addBody"),
                    )
                    HelpMiniCard(
                        Icons.Outlined.BarChart, Palette.Blue500,
                        h("firstSteps.reportTitle"), h("firstSteps.reportBody"),
                    )
                    HelpMiniCard(
                        Icons.Outlined.Settings, Palette.Amber600,
                        h("firstSteps.settingsTitle"), h("firstSteps.settingsBody"),
                    )
                    Text(
                        helpMarkup(h("firstSteps.gestureHint")),
                        color = colors.textMuted,
                        fontSize = 12.sp,
                        lineHeight = 17.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.accent.copy(alpha = 0.08f))
                            .padding(12.dp),
                    )
                }
            }

            // Schritt 1: Stunden erfassen
            item {
                HelpStep("1", h("step1.title")) {
                    Text(h("step1.lead"), color = colors.textMuted, fontSize = 13.sp, lineHeight = 19.sp)
                    HelpMiniCard(
                        Icons.Filled.PlayArrow, Palette.Green500,
                        h("step1.timerTitle"), h("step1.timerBody"),
                    )
                    HelpMiniCard(
                        Icons.Filled.AutoFixHigh, Palette.Emerald500,
                        h("step1.manualTitle"), h("step1.manualBody"),
                    )
                }
            }

            // Schritt 2: Fahrtzeiten (grün/orange Punkte)
            item {
                HelpStep("2", h("step2.title")) {
                    Text(
                        helpMarkup(h("step2.lead")),
                        color = colors.textMuted, fontSize = 13.sp, lineHeight = 19.sp,
                    )
                    listOf(
                        Triple(Palette.Green500, Palette.Green50, h("step2.arrival")),
                        Triple(Palette.Orange500, Palette.Orange50, h("step2.drive")),
                    ).forEach { (dot, bg, text) ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (colors.isDark) dot.copy(alpha = 0.12f) else bg)
                                .padding(8.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(dot),
                            )
                            Text(
                                helpMarkup(text),
                                color = colors.textSecondary, fontSize = 12.sp, lineHeight = 17.sp,
                            )
                        }
                    }
                }
            }

            // Schritt 3: Urlaub, Krank & ZA
            item {
                HelpStep("3", h("step3.title")) {
                    HelpIconParagraph(Icons.Outlined.HourglassEmpty, Palette.Purple500, h("step3.body"))
                }
            }

            // Schritt 4: Dokumente
            item {
                HelpStep("4", h("step4.title")) {
                    HelpIconParagraph(Icons.Filled.AttachFile, Palette.Blue500, h("step4.body"))
                }
            }

            // Schritt 5: Monatsabschluss
            item {
                HelpStep("5", h("step5.title")) {
                    Text(
                        helpMarkup(h("step5.preview")),
                        color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp,
                    )
                    Text(
                        helpMarkup(h("step5.share")),
                        color = colors.textSecondary, fontSize = 13.sp, lineHeight = 19.sp,
                    )
                }
            }

            // Schritt 6: Backup
            item {
                HelpStep("6", h("step6.title")) {
                    Text(h("step6.lead"), color = colors.textMuted, fontSize = 13.sp, lineHeight = 19.sp)
                    listOf(
                        Triple(Icons.Outlined.Cloud, h("step6.gdriveTitle"), h("step6.gdriveBody")),
                        Triple(Icons.Filled.FolderOpen, h("step6.localTitle"), h("step6.localBody")),
                    ).forEach { (icon, title, body) ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(
                                icon, contentDescription = null,
                                tint = Palette.Emerald500, modifier = Modifier.size(18.dp),
                            )
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text(
                                    helpMarkup(body),
                                    color = colors.textMuted, fontSize = 12.sp, lineHeight = 17.sp,
                                )
                            }
                        }
                    }
                }
            }

            // Schritt 7: Hausmasta-Modus (Amber)
            item {
                HelpStep(
                    "7", h("step7.title"),
                    circleColor = Palette.Amber600,
                    circleIcon = Icons.Filled.Build,
                    lineColor = if (colors.isDark) Palette.Amber900 else Palette.Amber100,
                ) {
                    Text(
                        helpMarkup(h("step7.lead")),
                        color = colors.textMuted, fontSize = 13.sp, lineHeight = 19.sp,
                    )
                    listOf(
                        Icons.Outlined.Dns to h("step7.nextcloud"),
                        Icons.Outlined.Upload to h("step7.jsonIO"),
                        Icons.Outlined.Description to h("step7.pdfArchive"),
                        Icons.Outlined.Sell to h("step7.codes"),
                        Icons.Outlined.Work to h("step7.recordOnly"),
                    ).forEach { (icon, text) ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                icon, contentDescription = null,
                                tint = Palette.Amber600, modifier = Modifier.size(14.dp),
                            )
                            Text(
                                helpMarkup(text),
                                color = colors.textMuted, fontSize = 12.sp, lineHeight = 17.sp,
                            )
                        }
                    }
                }
            }

            // Neue Funktionen, bewusst ohne Fachbegriffe erklärt.
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        h("newFeatures.title").uppercase(),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        letterSpacing = 0.8.sp,
                    )
                    HelpMiniCard(
                        Icons.Outlined.HourglassEmpty, Palette.Purple500,
                        h("newFeatures.nightTitle"), h("newFeatures.nightBody"),
                    )
                    HelpMiniCard(
                        Icons.Outlined.LightMode, Palette.Emerald500,
                        h("newFeatures.materialTitle"), h("newFeatures.materialBody"),
                    )
                    HelpMiniCard(
                        Icons.Outlined.AutoAwesome, Palette.Blue500,
                        h("newFeatures.tourTitle"), h("newFeatures.tourBody"),
                    )
                    HelpMiniCard(
                        Icons.Outlined.VerifiedUser, Palette.Amber600,
                        h("newFeatures.restoreTitle"), h("newFeatures.restoreBody"),
                    )
                }
            }

            // Tipps & Tricks (2x2-Grid)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        h("tips.title").uppercase(),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        letterSpacing = 0.8.sp,
                    )
                    val tips = listOf(
                        Triple(Icons.Filled.Fingerprint, h("tips.deleteTitle"), h("tips.deleteBody")),
                        Triple(Icons.Filled.AutoFixHigh, h("tips.editTitle"), h("tips.editBody")),
                        Triple(Icons.Outlined.VerifiedUser, h("tips.autoBackupTitle"), h("tips.autoBackupBody")),
                        Triple(Icons.Outlined.LightMode, h("tips.themeTitle"), h("tips.themeBody")),
                    )
                    tips.chunked(2).forEach { rowTips ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            rowTips.forEach { (icon, title, body) ->
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(colors.surfaceVariant.copy(alpha = if (colors.isDark) 0.6f else 1f))
                                        .padding(14.dp),
                                ) {
                                    Icon(
                                        icon, contentDescription = null,
                                        tint = colors.textSecondary, modifier = Modifier.size(20.dp),
                                    )
                                    Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text(
                                        helpMarkup(body),
                                        color = colors.textMuted, fontSize = 11.sp, lineHeight = 15.sp,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Tagline
            item {
                Text(
                    h("tagline").uppercase(),
                    color = colors.textFaint.copy(alpha = 0.6f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
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

// Die App-Tour lebt jetzt in TourOverlay.kt (AppTourOverlay) — mit
// Spotlight-Markierungen wie AppTour.tsx statt zentriertem Dialog.
