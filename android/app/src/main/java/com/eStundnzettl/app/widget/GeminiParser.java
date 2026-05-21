package com.estundnzettl.app.widget;

import android.content.Context;
import android.util.Log;

import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.prompt.GenerateContentRequest;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.GenerativeModel;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.MoreExecutors;

import java.util.concurrent.TimeUnit;

public class GeminiParser {
    private static final String TAG = "GeminiParser";
    private static GenerativeModelFutures sFutures = null;

    public interface Callback {
        void onSuccess(String jsonResult);
        void onError(String error);
    }

    private static GenerativeModelFutures getFutures() {
        if (sFutures == null) {
            GenerativeModel model = Generation.INSTANCE.getClient();
            sFutures = GenerativeModelFutures.from(model);
        }
        return sFutures;
    }

    public static void parseVoiceInput(String text, Callback callback) {
        try {
            GenerativeModelFutures futures = getFutures();
            
            String prompt = "Du bist ein Assistent für Zeiterfassung. Extrahiere aus diesem Text Startzeit, Endzeit, Pause (Minuten) und Projektname. Gib strikt nur ein JSON zurück. Format: {\"start\":\"HH:MM\",\"end\":\"HH:MM\",\"pause\":0,\"project\":\"Name\"}.\nText: " + text;
            
            GenerateContentRequest request = new GenerateContentRequest.Builder()
                .addTextPart(prompt)
                .build();

            ListenableFuture<com.google.mlkit.genai.prompt.GenerateContentResponse> responseFuture = futures.generateContent(request);
            
            Futures.addCallback(responseFuture, new FutureCallback<com.google.mlkit.genai.prompt.GenerateContentResponse>() {
                @Override
                public void onSuccess(com.google.mlkit.genai.prompt.GenerateContentResponse result) {
                    callback.onSuccess(result.getText());
                }

                @Override
                public void onFailure(Throwable t) {
                    callback.onError("Gemini API Error: " + t.getMessage());
                }
            }, MoreExecutors.directExecutor());

        } catch (Exception e) {
            callback.onError(e.getMessage());
        }
    }
}
