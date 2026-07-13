package com.estundnzettl.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette

/**
 * Dunkler App-Header — Port von AppHeader.tsx: links Logo (Dashboard)
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
                            tint = Color.White,
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.headerControl),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("⏱️", fontSize = 20.sp)
                    }
                }

                Column {
                    Text(
                        text = headerTitle,
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    if (view == "dashboard") {
                        Text(
                            text = t.t("app.subtitle") + " ⏱️",
                            color = Palette.Zinc400,
                            fontSize = 12.sp,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            if (view == "dashboard") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.headerControl)
                            .clickable(onClick = onOpenSettings),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Filled.Settings,
                            contentDescription = t.t("header.settings"),
                            tint = Palette.Zinc300,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    Column(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Palette.Emerald600)
                            .clickable(onClick = onOpenReport),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Outlined.Assessment,
                            contentDescription = t.t("header.report"),
                            tint = Color.White,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
        }
    }
}
