package com.estundnzettl.app.data

import java.security.SecureRandom

/**
 * Generiert monoton steigende, kollisionsfreie Entry-IDs.
 * Port von src/utils/entryId.ts: `Date.now() * 1000` plus kryptografisch
 * zufälliger Offset (0-999); ein interner Counter hält lokale schnelle
 * Aufrufe strikt monoton und duplikatfrei.
 */
object EntryIdGenerator {

    private val random = SecureRandom()
    private var lastEntryId: Long = 0

    @Synchronized
    fun next(now: Long = System.currentTimeMillis()): Long {
        var id = now * 1000 + random.nextInt(1000)
        if (id <= lastEntryId) id = lastEntryId + 1
        lastEntryId = id
        return id
    }
}
