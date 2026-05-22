package com.estundnzettl.app

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.common.util.concurrent.ListenableFuture
import com.google.mlkit.genai.common.DownloadCallback
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.common.GenAiException
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@CapacitorPlugin(name = "NanoDiagnostics")
class NanoDiagnosticsPlugin : Plugin() {
    private val executor = Executors.newSingleThreadExecutor()

    @PluginMethod
    fun getStatus(call: PluginCall) {
        executor.execute {
            val result = JSObject()
            result.put("androidSdk", Build.VERSION.SDK_INT)
            result.put("device", "${Build.MANUFACTURER} ${Build.MODEL}")
            result.put("aicoreVersion", getPackageVersion("com.google.android.aicore"))
            result.put("aicoreInstalled", result.getString("aicoreVersion") != null)

            val speech = JSObject()
            val prompt = JSObject()
            result.put("speechAdvanced", speech)
            result.put("prompt", prompt)

            checkSpeechAdvanced(speech)
            checkPrompt(prompt)

            call.resolve(result)
        }
    }

    @PluginMethod
    fun downloadPrompt(call: PluginCall) {
        executor.execute {
            try {
                val prompt = createPromptClient()
                prompt.javaClass
                    .getMethod("download", DownloadCallback::class.java)
                    .invoke(
                        prompt,
                        object : DownloadCallback {
                            override fun onDownloadStarted(totalBytesToDownload: Long) = Unit
                            override fun onDownloadProgress(totalBytesDownloaded: Long) = Unit

                            override fun onDownloadCompleted() {
                                call.resolve()
                            }

                            override fun onDownloadFailed(e: GenAiException) {
                                call.reject("Prompt download failed", e)
                            }
                        },
                    )
            } catch (e: Exception) {
                call.reject("Prompt download could not be started", e)
            }
        }
    }

    @PluginMethod
    fun runPromptSmokeTest(call: PluginCall) {
        executor.execute {
            try {
                val prompt = createPromptClient()
                val textPart = Class
                    .forName("com.google.mlkit.genai.prompt.TextPart")
                    .getConstructor(String::class.java)
                    .newInstance("Return exactly this text and nothing else: ESTUNDNZETTL_NANO_OK")
                val contentPartClass = Class.forName("com.google.mlkit.genai.prompt.ContentPart")
                val builderClass = Class.forName("com.google.mlkit.genai.prompt.GenerateContentRequest\$Builder")
                val requestBuilder = runCatching {
                    builderClass.getConstructor(contentPartClass).newInstance(textPart)
                }.getOrElse {
                    val partArray = java.lang.reflect.Array.newInstance(contentPartClass, 1)
                    java.lang.reflect.Array.set(partArray, 0, textPart)
                    builderClass.getConstructor(partArray.javaClass).newInstance(partArray)
                }
                val request = requestBuilder.let { builder ->
                    runCatching {
                        builder.javaClass.getMethod("setTemperature", Float::class.javaPrimitiveType).invoke(builder, 0.0f)
                    }
                    runCatching {
                        builder.javaClass.getMethod("setMaxOutputTokens", Int::class.javaPrimitiveType).invoke(builder, 16)
                    }
                    builder.javaClass.getMethod("build").invoke(builder)
                }
                @Suppress("UNCHECKED_CAST")
                val future = prompt.javaClass.getMethod("generateContent", request.javaClass).invoke(prompt, request) as ListenableFuture<Any>
                val response = future.get(30, TimeUnit.SECONDS)
                val responseText = response.javaClass.methods
                    .firstOrNull { it.name == "getText" && it.parameterCount == 0 }
                    ?.invoke(response)
                    ?.toString()
                    ?: response.toString()

                val result = JSObject()
                result.put("text", responseText)
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Prompt smoke test failed", e)
            }
        }
    }

    private fun checkSpeechAdvanced(out: JSObject) {
        try {
            val recognizer = createSpeechRecognizer()
            @Suppress("UNCHECKED_CAST")
            val future = recognizer.javaClass.getMethod("checkStatus").invoke(recognizer) as ListenableFuture<Int>
            out.put("status", statusName(future.get(15, TimeUnit.SECONDS)))
            runCatching { recognizer.javaClass.getMethod("close").invoke(recognizer) }
        } catch (e: Exception) {
            out.put("status", "ERROR")
            out.put("error", e.toString())
        }
    }

    private fun checkPrompt(out: JSObject) {
        try {
            val prompt = createPromptClient()
            @Suppress("UNCHECKED_CAST")
            val future = prompt.javaClass.getMethod("checkStatus").invoke(prompt) as ListenableFuture<Int>
            out.put("status", statusName(future.get(15, TimeUnit.SECONDS)))
        } catch (e: Exception) {
            out.put("status", "ERROR")
            out.put("error", e.toString())
        }
    }

    private fun createSpeechRecognizer(): Any {
        val optionsBuilder = Class
            .forName("com.google.mlkit.genai.speechrecognition.SpeechRecognizerOptions")
            .getMethod("builder", Context::class.java)
            .invoke(null, context)!!

        runCatching {
            optionsBuilder.javaClass.getMethod("setLocale", Locale::class.java).invoke(optionsBuilder, Locale.GERMANY)
        }

        runCatching {
            val modeClass = Class.forName("com.google.mlkit.genai.speechrecognition.SpeechRecognizerOptions\$Mode")
            val advanced = modeClass.enumConstants.first { (it as Enum<*>).name == "MODE_ADVANCED" }
            optionsBuilder.javaClass.getMethod("setPreferredMode", modeClass).invoke(optionsBuilder, advanced)
        }

        val options = optionsBuilder.javaClass.getMethod("build").invoke(optionsBuilder)!!
        return Class
            .forName("com.google.mlkit.genai.speechrecognition.SpeechRecognition")
            .getMethod("getClient", options.javaClass)
            .invoke(null, options)!!
    }

    private fun createPromptClient(): Any {
        val generation = Class
            .forName("com.google.mlkit.genai.prompt.Generation")
            .getField("INSTANCE")
            .get(null)
        val model = generation.javaClass.getMethod("getClient").invoke(generation)
        return Class
            .forName("com.google.mlkit.genai.prompt.GenerativeModelFutures")
            .getMethod("from", Class.forName("com.google.mlkit.genai.prompt.GenerativeModel"))
            .invoke(null, model)!!
    }

    private fun statusName(status: Int): String =
        when (status) {
            FeatureStatus.UNAVAILABLE -> "UNAVAILABLE"
            FeatureStatus.DOWNLOADABLE -> "DOWNLOADABLE"
            FeatureStatus.DOWNLOADING -> "DOWNLOADING"
            FeatureStatus.AVAILABLE -> "AVAILABLE"
            else -> "UNKNOWN_$status"
        }

    private fun getPackageVersion(packageName: String): String? =
        try {
            val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(packageName, 0)
            }
            info.versionName
        } catch (_: PackageManager.NameNotFoundException) {
            null
        }
}
