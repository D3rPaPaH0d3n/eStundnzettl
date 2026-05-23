package com.estundnzettl.app

import android.Manifest
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.common.util.concurrent.ListenableFuture
import com.google.mlkit.genai.common.audio.AudioSource
import com.google.mlkit.genai.common.DownloadCallback
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.common.GenAiException
import com.google.mlkit.genai.prompt.GenerateContentRequest
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.TextPart
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures
import com.google.mlkit.genai.speechrecognition.SpeechRecognition
import com.google.mlkit.genai.speechrecognition.SpeechRecognizer
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerOptions
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerRequest
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerResponse
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.takeWhile
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

@CapacitorPlugin(
    name = "NanoDiagnostics",
    permissions = [
        Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "microphone"),
    ],
)
class NanoDiagnosticsPlugin : Plugin() {
    private val executor = Executors.newSingleThreadExecutor()

    @PluginMethod
    fun getStatus(call: PluginCall) {
        executor.execute {
            val result = JSObject()
            val speech = JSObject()
            result.put("speechAdvanced", speech)

            checkSpeechAdvanced(speech)

            call.resolve(result)
        }
    }

    @PluginMethod
    fun downloadSpeechAdvanced(call: PluginCall) {
        executor.execute {
            var speechRecognizer: SpeechRecognizer? = null
            try {
                speechRecognizer = createSpeechRecognizer()
                @Suppress("UNCHECKED_CAST")
                val downloadFlow = speechRecognizer.javaClass
                    .getMethod("download")
                    .invoke(speechRecognizer) as Flow<Any>

                runBlocking {
                    downloadFlow.collect { status ->
                        if (status.javaClass.simpleName == "DownloadFailed") {
                            val error = runCatching {
                                status.javaClass.getMethod("getE").invoke(status) as? Throwable
                            }.getOrNull()
                            throw error ?: IllegalStateException(status.toString())
                        }
                    }
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject("Speech Advanced download could not be started", e)
            } finally {
                runCatching { speechRecognizer?.close() }
            }
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
                val request = GenerateContentRequest.Builder(
                    TextPart("Return exactly this text and nothing else: ESTUNDNZETTL_NANO_OK"),
                ).apply {
                    temperature = 0.0f
                    maxOutputTokens = 16
                }.build()
                val future = prompt.generateContent(request)
                val response = future.get(30, TimeUnit.SECONDS)
                val responseText = response.candidates
                    .firstOrNull()
                    ?.text
                    ?: response.toString()

                val result = JSObject()
                result.put("text", responseText)
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Prompt smoke test failed", e)
            }
        }
    }

    @PluginMethod
    fun recognizeSpeech(call: PluginCall) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "recognizeSpeechPermissionCallback")
            return
        }

        runSpeechRecognition(call)
    }

    @PermissionCallback
    private fun recognizeSpeechPermissionCallback(call: PluginCall) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission denied")
            return
        }

        runSpeechRecognition(call)
    }

    private fun runSpeechRecognition(call: PluginCall) {
        executor.execute {
            var recognizer: SpeechRecognizer? = null
            try {
                recognizer = createSpeechRecognizer()
                val status = runBlocking { recognizer.checkStatus() }
                if (status != FeatureStatus.AVAILABLE) {
                    call.reject("Speech Advanced de-DE is not available: ${statusName(status)}")
                    return@execute
                }

                val request = SpeechRecognizerRequest.builder().apply {
                    audioSource = AudioSource.fromMic()
                }.build()
                val finalTextParts = mutableListOf<String>()
                var partialText = ""

                val completed = runBlocking {
                    withTimeoutOrNull(45_000L) {
                        recognizer.startRecognition(request).takeWhile { response ->
                            when (response) {
                                is SpeechRecognizerResponse.PartialTextResponse -> {
                                    partialText = response.text
                                    true
                                }

                                is SpeechRecognizerResponse.FinalTextResponse -> {
                                    if (response.text.isNotBlank()) {
                                        finalTextParts.add(response.text.trim())
                                    }
                                    true
                                }

                                is SpeechRecognizerResponse.ErrorResponse -> {
                                    throw response.e
                                }

                                is SpeechRecognizerResponse.CompletedResponse -> false
                            }
                        }.collect()
                        true
                    }
                } ?: false

                val text = finalTextParts.joinToString(" ").ifBlank { partialText.trim() }
                if (text.isBlank()) {
                    call.reject(if (completed) "No speech recognized" else "Speech recognition timed out")
                    return@execute
                }

                val result = JSObject()
                result.put("text", text)
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Speech recognition failed", e)
            } finally {
                runCatching {
                    if (recognizer != null) runBlocking { recognizer.stopRecognition() }
                }
                runCatching { recognizer?.close() }
            }
        }
    }

    private fun checkSpeechAdvanced(out: JSObject) {
        var recognizer: SpeechRecognizer? = null
        try {
            recognizer = createSpeechRecognizer()
            val status = runBlocking { recognizer.checkStatus() }
            out.put("status", statusName(status))
        } catch (e: Exception) {
            out.put("status", "ERROR")
            out.put("error", e.toString())
        } finally {
            runCatching { recognizer?.close() }
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

    private fun createSpeechRecognizer(): SpeechRecognizer {
        val options = SpeechRecognizerOptions.builder().apply {
            locale = Locale.GERMANY
            preferredMode = SpeechRecognizerOptions.Mode.MODE_ADVANCED
        }.build()

        return SpeechRecognition.getClient(options)
    }

    private fun createPromptClient(): GenerativeModelFutures =
        GenerativeModelFutures.from(Generation.getClient())

    private fun statusName(status: Int): String =
        when (status) {
            FeatureStatus.UNAVAILABLE -> "UNAVAILABLE"
            FeatureStatus.DOWNLOADABLE -> "DOWNLOADABLE"
            FeatureStatus.DOWNLOADING -> "DOWNLOADING"
            FeatureStatus.AVAILABLE -> "AVAILABLE"
            else -> "UNKNOWN_$status"
        }

}
