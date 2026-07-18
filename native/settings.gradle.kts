pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "eStundnzettl-native"

include(":core")

// The :app module needs the Android SDK (and Google's Maven repo for the
// Android Gradle Plugin). Skip it in environments without an SDK so that
// `gradle :core:test` keeps working everywhere — Android Studio writes
// local.properties automatically, so the app module appears there.
val localProps = file("local.properties")
val hasAndroidSdk = (localProps.exists() && localProps.readText().contains("sdk.dir")) ||
    System.getenv("ANDROID_HOME") != null ||
    System.getenv("ANDROID_SDK_ROOT") != null
if (hasAndroidSdk) {
    include(":app")
} else {
    logger.lifecycle("Android SDK not found — configuring only :core (pure JVM). Open in Android Studio or set ANDROID_HOME to build :app.")
}
