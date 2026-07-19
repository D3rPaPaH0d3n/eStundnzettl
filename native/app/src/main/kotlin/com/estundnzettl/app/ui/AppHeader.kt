package com.estundnzettl.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.R
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n

private val AppNameFontFamily = FontFamily(
    Font(
        resId = R.font.kalam_bold,
        weight = FontWeight.Bold,
    ),
)

/**
 * App-Header — Port von AppHeader.tsx: links Logo (Dashboard)
 * bzw. Zurück-Pfeil, Titel + Untertitel, rechts Einstellungen und Bericht.
 */
@Composable
fun AppHeader(
    view: String,
    headerTitle: String,
    onNavigateBack: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenReport: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.headerBackground)
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (view != "dashboard") {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = t.t("header.backToOverview"),
                            tint = colors.headerContent,
                        )
                    }
                } else {
                    Image(
                        painter = painterResource(R.drawable.app_logo),
                        contentDescription = null,
                        modifier = Modifier.size(52.dp),
                        colorFilter = ColorFilter.tint(colors.headerContent),
                    )
                }

                Column {
                    Text(
                        text = headerTitle,
                        color = colors.headerContent,
                        fontSize = if (view == "dashboard") 27.sp else 20.sp,
                        lineHeight = if (view == "dashboard") 28.sp else 24.sp,
                        fontFamily = if (view == "dashboard") AppNameFontFamily else FontFamily.SansSerif,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = if (view == "dashboard") (-0.1).sp else 0.sp,
                    )
                    if (view == "dashboard") {
                        Text(
                            text = t.t("app.subtitle") + " ⏱️",
                            color = colors.headerContentMuted,
                            fontSize = 12.sp,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.offset(y = (-6).dp),
                        )
                    }
                }
            }

            if (view == "dashboard") {
                val tourTargets = LocalTourTargets.current
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(
                        modifier = Modifier
                            .tourTarget(tourTargets, "settings")
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.headerControl)
                            .clickable(onClick = onOpenSettings),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Outlined.Settings,
                            contentDescription = t.t("header.settings"),
                            tint = colors.headerContentMuted,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    Column(
                        modifier = Modifier
                            .tourTarget(tourTargets, "report")
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.accentStrong)
                            .clickable(onClick = onOpenReport),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            fileBarChartIcon(),
                            contentDescription = t.t("header.report"),
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Lucide "FileBarChart" als Stroke-Vektor — das Bericht-Icon des
 * Original-Headers (Dokument mit Balkendiagramm).
 */
@Composable
internal fun fileBarChartIcon(): ImageVector = remember {
    ImageVector.Builder(
        name = "FileBarChart",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        val stroke = SolidColor(Color.White)
        path(
            fill = null,
            stroke = stroke,
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            // Dokument-Umriss mit Eselsohr
            moveTo(15f, 2f)
            horizontalLineTo(6f)
            arcToRelative(2f, 2f, 0f, false, false, -2f, 2f)
            verticalLineTo(20f)
            arcToRelative(2f, 2f, 0f, false, false, 2f, 2f)
            horizontalLineTo(18f)
            arcToRelative(2f, 2f, 0f, false, false, 2f, -2f)
            verticalLineTo(7f)
            close()
        }
        path(
            fill = null,
            stroke = stroke,
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(14f, 2f)
            verticalLineTo(6f)
            arcToRelative(2f, 2f, 0f, false, false, 2f, 2f)
            horizontalLineTo(20f)
        }
        path(
            fill = null,
            stroke = stroke,
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(8f, 18f)
            verticalLineToRelative(-2f)
            moveTo(12f, 18f)
            verticalLineToRelative(-6f)
            moveTo(16f, 18f)
            verticalLineToRelative(-4f)
        }
    }.build()
}
