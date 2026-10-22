plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.estundnzettl.app"
    compileSdk = 37

    defaultConfig {
        // Same application id as the former Capacitor app, so the native app
        // ships as an in-place update of the existing Play Store listing.
        applicationId = "com.estundnzettl.app"
        minSdk = 26
        targetSdk = 36
        // Muss über dem versionCode der Capacitor-Produktion (284) liegen,
        // damit Play die Beta als Update anbietet; Luft für Hotfixes gelassen.
        versionCode = 327
        versionName = "5.2.8"

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
            // Side-by-side install next to the Play Store build. Keep the
            // suffix: the Google Drive OAuth client is registered for it.
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

    // Zwei Kanäle aus demselben Code: "beta" (Open Beta/Internal, mit
    // Diagnose-Karte aus src/beta) und "prod" (Produktion, ohne Diagnose,
    // ohne Debug-Logs). Gleiche applicationId, damit beide dasselbe
    // Play-Listing aktualisieren.
    flavorDimensions += "channel"
    productFlavors {
        create("beta") {
            dimension = "channel"
            isDefault = true
        }
        create("prod") {
            dimension = "channel"
            // Eine Nummer unter der Beta aus demselben Commit: Beta-Tester
            // behalten so immer die Beta-Variante (Play liefert den höchsten
            // versionCode aus Beta und Produktion).
            versionCode = defaultConfig.versionCode!! - 1
            proguardFile("proguard-prod.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

android.sourceSets.getByName("androidTest") {
    assets.srcDir("$projectDir/schemas")
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
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.documentfile)
    implementation(libs.androidx.work.runtime.ktx)
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
