package com.estundnzettl.app.data

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val LOCAL_MINUTES: DateTimeFormatter = DateTimeFormatter
    .ofPattern("yyyy-MM-dd HH:mm")
    .withZone(ZoneId.systemDefault())

/** Drive-/ISO-Zeitstempel als lokale "yyyy-MM-dd HH:mm"-Anzeige. */
internal fun formatTimestamp(iso: String?): String? {
    if (iso.isNullOrBlank()) return null
    return runCatching {
        LOCAL_MINUTES.format(Instant.parse(iso))
    }.getOrDefault(iso)
}
