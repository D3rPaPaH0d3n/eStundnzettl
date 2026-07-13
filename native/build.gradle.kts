// Root build file — plugin versions live in gradle/libs.versions.toml.
// Android-specific plugins (AGP, KSP, Compose) are declared directly in
// :app so that JVM-only environments can configure the project without
// access to Google's Maven repository (see settings.gradle.kts).
plugins {
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
