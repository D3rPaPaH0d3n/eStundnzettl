package com.estundnzettl.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n

@Composable
fun AppErrorScreen(
    onRestart: () -> Unit,
    onCopyDiagnostic: () -> Unit,
    onContactSupport: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            Icons.Outlined.BugReport,
            contentDescription = null,
            tint = colors.danger,
            modifier = Modifier.padding(8.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            t.t("crashRecovery.title"),
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 24.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            t.t("crashRecovery.body"),
            color = colors.textSecondary,
            fontSize = 15.sp,
            lineHeight = 22.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            t.t("crashRecovery.dataSafe"),
            color = colors.positive,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(28.dp))
        Button(
            onClick = onRestart,
            colors = ButtonDefaults.buttonColors(containerColor = colors.accentStrong),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(t.t("crashRecovery.restart"), fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onCopyDiagnostic, modifier = Modifier.fillMaxWidth()) {
            Text(t.t("crashRecovery.copyDiagnostic"))
        }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onContactSupport, modifier = Modifier.fillMaxWidth()) {
            Text(t.t("crashRecovery.contactSupport"))
        }
    }
}
