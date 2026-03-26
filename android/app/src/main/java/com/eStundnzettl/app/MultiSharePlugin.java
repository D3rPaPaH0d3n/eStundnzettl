package com.estundnzettl.app;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;

/**
 * Custom Capacitor plugin for ACTION_SEND_MULTIPLE.
 * Shares multiple files (PDF + attachments) in a single native Android share intent.
 */
@CapacitorPlugin(name = "MultiShare")
public class MultiSharePlugin extends Plugin {

    @PluginMethod
    public void shareMultiple(PluginCall call) {
        JSArray filesArray = call.getArray("files");
        String chooserTitle = call.getString("chooserTitle", "Teilen");

        if (filesArray == null || filesArray.length() == 0) {
            call.reject("Keine Dateien zum Teilen");
            return;
        }

        try {
            ArrayList<Uri> uris = new ArrayList<>();
            boolean hasPdf = false;
            boolean hasImage = false;

            for (int i = 0; i < filesArray.length(); i++) {
                JSONObject fileObj = filesArray.getJSONObject(i);
                String path = fileObj.getString("path");
                String mimeType = fileObj.optString("mimeType", "application/octet-stream");

                // Strip file:// prefix if present
                if (path.startsWith("file://")) {
                    path = Uri.parse(path).getPath();
                }

                File file = new File(path);
                if (!file.exists()) {
                    call.reject("Datei nicht gefunden: " + path);
                    return;
                }

                Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
                );
                uris.add(contentUri);

                if (mimeType.contains("pdf")) hasPdf = true;
                if (mimeType.startsWith("image/")) hasImage = true;
            }

            // Determine MIME type for the intent
            String intentMimeType;
            if (hasPdf && hasImage) {
                intentMimeType = "*/*";
            } else if (hasPdf) {
                intentMimeType = "application/pdf";
            } else if (hasImage) {
                intentMimeType = "image/*";
            } else {
                intentMimeType = "*/*";
            }

            Intent intent = new Intent(Intent.ACTION_SEND_MULTIPLE);
            intent.setType(intentMimeType);
            intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getActivity().startActivity(Intent.createChooser(intent, chooserTitle));
            call.resolve();
        } catch (JSONException e) {
            call.reject("Fehler beim Parsen der Dateiliste: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Fehler beim Teilen: " + e.getMessage());
        }
    }
}
