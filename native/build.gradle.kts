// Root build file — plugin versions live in gradle/libs.versions.toml.
// Alle Kotlin-Plugins werden hier mit Version deklariert (apply false),
// damit Subprojekte sie ohne Klassenpfad-Konflikt anfordern können.
// Nur AGP bleibt draußen: es liegt ausschließlich auf Googles Maven und
// würde JVM-only-Umgebungen ohne Zugriff darauf blockieren — :app
// deklariert es selbst und wird ohne Android SDK gar nicht konfiguriert
// (siehe settings.gradle.kts).
plugins {
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
}
