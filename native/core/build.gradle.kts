// Pure-JVM core module: domain models, locales/holidays, backup format and
// the complete calculation logic (originally ported 1:1 from the Capacitor
// app's src/utils/timeCalculations.ts and calculationConfig.ts, see branch
// legacy/capacitor-4.5.x). No Android dependencies, so the tests run as
// plain JUnit tests; Kover measures their line coverage for the README badge.
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kover)
}

// JVM-Target 17 (kompatibel mit dem :app-Modul), aber ohne fixe Toolchain,
// damit jede installierte JDK >= 17 das Modul bauen kann.
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)
}
