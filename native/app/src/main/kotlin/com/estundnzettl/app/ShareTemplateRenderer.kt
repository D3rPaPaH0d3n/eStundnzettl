package com.estundnzettl.app

/** Keeps the friendly editor tokens separate from the values sent to other apps. */
internal object ShareTemplateRenderer {
    private const val CANONICAL_PERIOD = "{{period}}"
    private const val CANONICAL_NAME = "{{name}}"

    private val periodToken = Regex(
        """\{\{\s*(?:period|date|zeitraum|datum)\s*\}\}|\[\s*(?:Zeitraum|Period|Datum|Date)\s*]|[‹«]\s*(?:Zeitraum|Period|Datum|Date)\s*[›»]""",
        RegexOption.IGNORE_CASE,
    )
    private val nameToken = Regex(
        """\{\{\s*name\s*\}\}|\[\s*Name\s*]|[‹«]\s*Name\s*[›»]""",
        RegexOption.IGNORE_CASE,
    )

    fun render(template: String, period: String, name: String): String = template
        .replace(periodToken, period)
        .replace(nameToken, name)

    fun canonicalize(template: String): String = template
        .replace(periodToken, CANONICAL_PERIOD)
        .replace(nameToken, CANONICAL_NAME)

    fun friendly(template: String, periodLabel: String, nameLabel: String): String =
        canonicalize(template)
            .replace(CANONICAL_PERIOD, periodLabel)
            .replace(CANONICAL_NAME, nameLabel)
}
