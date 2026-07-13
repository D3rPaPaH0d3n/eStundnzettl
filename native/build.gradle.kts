// Root build file — bewusst OHNE plugins-Block.
//
// Jedes Modul deklariert seine Plugins selbst (Versionen aus
// gradle/libs.versions.toml): :core lädt kotlin-jvm/serialization,
// :app lädt AGP + kotlin-android + compose + ksp gemeinsam in EINEM
// Klassenpfad (AGP und das Kotlin-Android-Plugin müssen sich sehen).
//
// Würde der Root das Kotlin-Plugin laden, könnte :app entweder die
// Version nicht prüfen ("already on the classpath") oder das Kotlin-
// Android-Plugin fände die AGP-Klassen nicht (BaseVariant). Und AGP im
// Root würde JVM-only-Umgebungen ohne Google-Maven-Zugriff blockieren —
// dort wird :app über settings.gradle.kts gar nicht erst konfiguriert.
