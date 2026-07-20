package com.estundnzettl.app

internal const val APP_PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.estundnzettl.app"

internal fun buildAppRecommendationText(intro: String): String =
    intro.trimEnd() + "\n\n" + APP_PLAY_STORE_URL
