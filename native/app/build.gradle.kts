plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.estundnzettl.app"
    compileSdk = 36

    defaultConfig {
        // Same application id as the Capacitor app so the native rewrite can
        // eventually replace it as an in-place update on the Play Store.
        applicationId = "com.estundnzettl.app"
        minSdk = 26
        targetSdk = 36
        // Muss über dem versionCode der Capacitor-Produktion (284) liegen,
        // damit Play die Beta als Update anbietet; Luft für Hotfixes gelassen.
        versionCode = 308
        versionName = "5.0.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // CI signs with the shared debug keystore (the Google Drive OAuth
    // client is registered against its SHA-1). Locally the default
    // ~/.android/debug.keystore applies — same keystore, same signature.
    System.getenv("DEBUG_KEYSTORE_FILE")?.let { path ->
        signingConfigs.getByName("debug") {
            storeFile = file(path)
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            // Side-by-side install next to the production Capacitor app
            // while both versions are being compared.
            applicationIdSuffix = ".native"
        }
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

// Die UI-Sprachdateien (848 Keys, de/en) kommen 1:1 aus der bestehenden
// App (src/i18n/locales) — Single Source of Truth, kein Text-Drift.
val syncI18n = tasks.register<Copy>("syncI18n") {
    from(rootProject.layout.projectDirectory.dir("../src/i18n/locales")) {
        include("*.json")
    }
    into(layout.buildDirectory.dir("generated/i18nAssets/i18n"))
}

android.sourceSets.getByName("main") {
    assets.srcDir(layout.buildDirectory.dir("generated/i18nAssets"))
}

android.sourceSets.getByName("androidTest") {
    assets.srcDir("$projectDir/schemas")
}

tasks.named("preBuild") {
    dependsOn(syncI18n)
}

dependencies {
    implementation(project(":core"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.browser)
    implementation(libs.play.services.auth)
    implementation(libs.play.review.ktx)

    debugImplementation(libs.androidx.compose.ui.tooling)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)

    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.uiautomator)
    androidTestImplementation(libs.androidx.room.testing)
}
