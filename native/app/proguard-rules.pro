# Keep kotlinx.serialization generated serializers.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}

# The one-shot localStorage migration bridge is invoked from WebView JavaScript.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
