// Root build file — bewusst OHNE plugins-Block.
//
// Jedes Modul deklariert seine Plugins selbst (Versionen aus
// gradle/libs.versions.toml): :core lädt kotlin-jvm/serialization,
// :app lädt AGP (eingebautes Kotlin seit AGP 9) + compose + serialization
// + ksp. Das separate kotlin-android-Plugin ist mit AGP 9 weder nötig
// noch kompatibel.
//
// Kotlin-Plugins mit `apply false` im Root laden das Kotlin-Gradle-Plugin
// in einem Klassenpfad ohne AGP. :app scheitert dann mit
// NoClassDefFoundError: com.android.build.gradle.api.BaseVariant.
// Die Gradle-Warnung, dass das Kotlin-Plugin in :core und :app getrennt
// geladen wird, bleibt deshalb bestehen.
