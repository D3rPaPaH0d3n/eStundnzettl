package com.estundnzettl.app.i18n

import android.content.Context
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * Minimaler i18next-kompatibler Lookup über den unveränderten
 * Sprachdateien der Web-App (assets/i18n/de.json bzw. en.json):
 * - Keys mit Punkt-Notation ("dashboard.actual")
 * - Interpolation mit {{name}}
 * - Plural-Suffixe key_one / key_other über das "count"-Argument
 */
class I18n private constructor(
    private val strings: JsonObject,
    private val fallback: JsonObject?,
    val language: String,
) {

    fun t(key: String, vararg args: Pair<String, Any?>): String {
        val argMap = args.toMap()

        // Plural-Auflösung wie i18next: count == 1 → _one, sonst _other
        val count = (argMap["count"] as? Number)?.toInt()
        val resolvedKey = if (count != null) {
            val suffix = if (count == 1) "_one" else "_other"
            if (lookup("$key$suffix") != null) "$key$suffix" else key
        } else {
            key
        }

        val template = lookup(resolvedKey)
            ?: (argMap["defaultValue"] as? String)
            ?: return key

        return interpolate(template, argMap)
    }

    private fun lookup(dottedKey: String): String? =
        lookupIn(strings, dottedKey) ?: fallback?.let { lookupIn(it, dottedKey) }

    private fun lookupIn(root: JsonObject, dottedKey: String): String? {
        var node: JsonObject = root
        val parts = dottedKey.split(".")
        for ((index, part) in parts.withIndex()) {
            val child = node[part] ?: return null
            if (index == parts.lastIndex) {
                return (child as? JsonPrimitive)?.takeIf { it.isString }?.content
            }
            node = child as? JsonObject ?: return null
        }
        return null
    }

    private fun interpolate(template: String, args: Map<String, Any?>): String {
        if (!template.contains("{{")) return template
        var result = template
        for ((name, value) in args) {
            result = result.replace("{{$name}}", value?.toString() ?: "")
        }
        return result
    }

    companion object {
        const val DEFAULT_LANGUAGE = "de"
        val SUPPORTED_LANGUAGES = listOf("de", "en")

        private val json = Json { ignoreUnknownKeys = true }

        fun load(context: Context, language: String): I18n {
            val lang = if (language in SUPPORTED_LANGUAGES) language else DEFAULT_LANGUAGE
            val strings = loadLocale(context, lang)
            val fallback = if (lang != DEFAULT_LANGUAGE) loadLocale(context, DEFAULT_LANGUAGE) else null
            return I18n(strings, fallback, lang)
        }

        /** Systemsprache → unterstützte App-Sprache (de-Fallback wie die Web-App). */
        fun resolveSystemLanguage(systemLanguage: String): String =
            if (systemLanguage.lowercase().startsWith("en")) "en" else "de"

        private fun loadLocale(context: Context, lang: String): JsonObject {
            val text = context.assets.open("i18n/$lang.json").bufferedReader().readText()
            return json.parseToJsonElement(text) as JsonObject
        }
    }
}
