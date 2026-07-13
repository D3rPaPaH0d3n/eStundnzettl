package com.estundnzettl.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.estundnzettl.app.ui.theme.EStundnzettlTheme

/**
 * Platzhalter-Shell: Die eigentlichen Screens (Dashboard, Eintrag,
 * Bericht, Einstellungen) werden in Phase 3 des Rewrites portiert —
 * siehe native/README.md.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EStundnzettlTheme {
                PlaceholderScreen()
            }
        }
    }
}

@Composable
private fun PlaceholderScreen() {
    Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "eStundnzettl",
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = "Native Kotlin-Rewrite — Phase 1 (Datenschicht & Kernlogik)",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}
