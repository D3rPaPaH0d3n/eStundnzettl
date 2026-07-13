// Pure-JVM core module: domain models, locales/holidays and the complete
// calculation logic ported 1:1 from src/utils/timeCalculations.ts and
// src/utils/calculationConfig.ts. No Android dependencies, so the ported
// Vitest suites run as plain JUnit tests.
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
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
