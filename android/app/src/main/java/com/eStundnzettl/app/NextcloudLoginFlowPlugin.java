package com.estundnzettl.app;

import android.text.TextUtils;
import android.util.Patterns;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import javax.net.ssl.SSLException;

@CapacitorPlugin(name = "NextcloudLoginFlow")
public class NextcloudLoginFlowPlugin extends Plugin {

    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 15000;

    @PluginMethod
    public void startLoginFlow(PluginCall call) {
        String serverUrl = call.getString("serverUrl");
        if (TextUtils.isEmpty(serverUrl)) {
            call.resolve(errorResult("INVALID_URL", "Server-URL fehlt", null, false));
            return;
        }

        try {
            URL baseUrl = normalizeBaseUrl(serverUrl);
            URL loginUrl = new URL(baseUrl.toString() + "/index.php/login/v2");
            HttpResponse response = executeJsonRequest(loginUrl, "POST", null, "application/json");

            if (response.statusCode < 200 || response.statusCode >= 300) {
                call.resolve(httpError("HTTP_ERROR", "Login Flow konnte nicht gestartet werden", response));
                return;
            }

            JSONObject json = parseJsonResponse(response);
            String login = json.optString("login", "").trim();
            JSONObject poll = json.optJSONObject("poll");
            String pollEndpoint = poll != null ? poll.optString("endpoint", "").trim() : "";
            String token = poll != null ? poll.optString("token", "").trim() : "";

            if (login.isEmpty() || pollEndpoint.isEmpty() || token.isEmpty()) {
                call.resolve(errorResult("INVALID_RESPONSE", "Antwort vom Server ist unvollständig", response.statusCode, false));
                return;
            }

            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("loginUrl", login);
            result.put("pollEndpoint", pollEndpoint);
            result.put("token", token);
            call.resolve(result);
        } catch (InvalidInputException e) {
            call.resolve(errorResult(e.code, e.getMessage(), null, false));
        } catch (SocketTimeoutException e) {
            call.resolve(errorResult("TIMEOUT", "Zeitüberschreitung beim Verbinden mit Nextcloud", null, true));
        } catch (SSLException e) {
            call.resolve(errorResult("TLS_ERROR", "TLS-Fehler bei der Verbindung zu Nextcloud", null, true));
        } catch (IOException e) {
            call.resolve(errorResult("NETWORK_ERROR", safeMessage(e, "Netzwerkfehler bei der Verbindung zu Nextcloud"), null, true));
        } catch (JSONException e) {
            call.resolve(errorResult("INVALID_JSON", "Server liefert ungültiges JSON", null, false));
        } catch (Exception e) {
            call.resolve(errorResult("UNKNOWN_ERROR", safeMessage(e, "Unbekannter Fehler"), null, false));
        }
    }

    /**
     * Generic HTTP request for WebDAV operations (MKCOL, PROPFIND, PUT, GET, etc.)
     * Supports Basic Auth and arbitrary HTTP methods.
     */
    @PluginMethod
    public void httpRequest(PluginCall call) {
        String urlStr = call.getString("url");
        String method = call.getString("method", "GET");
        String body = call.getString("body");
        String username = call.getString("username");
        String password = call.getString("password");
        String reqContentType = call.getString("contentType");

        if (TextUtils.isEmpty(urlStr)) {
            call.resolve(errorResult("INVALID_URL", "URL fehlt", null, false));
            return;
        }

        new Thread(() -> {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method.toUpperCase());
                conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
                conn.setReadTimeout(30000); // longer for uploads
                conn.setInstanceFollowRedirects(true);
                conn.setUseCaches(false);

                // Basic Auth
                if (username != null && password != null) {
                    String credentials = username + ":" + password;
                    String encoded = android.util.Base64.encodeToString(
                        credentials.getBytes(StandardCharsets.UTF_8),
                        android.util.Base64.NO_WRAP
                    );
                    conn.setRequestProperty("Authorization", "Basic " + encoded);
                }

                if (reqContentType != null) {
                    conn.setRequestProperty("Content-Type", reqContentType);
                }

                // Write body for PUT, POST, PROPPATCH
                if (body != null && !method.equalsIgnoreCase("GET") && !method.equalsIgnoreCase("HEAD")) {
                    conn.setDoOutput(true);
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    conn.setFixedLengthStreamingMode(bytes.length);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(bytes);
                    }
                }

                int statusCode = conn.getResponseCode();
                InputStream is = statusCode >= 400 ? conn.getErrorStream() : conn.getInputStream();
                String responseBody = is != null ? readBody(is) : "";
                conn.disconnect();

                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("status", statusCode);
                result.put("body", responseBody);
                call.resolve(result);
            } catch (SocketTimeoutException e) {
                call.resolve(errorResult("TIMEOUT", "Zeitüberschreitung", null, true));
            } catch (SSLException e) {
                call.resolve(errorResult("TLS_ERROR", "TLS/SSL-Fehler: " + safeMessage(e, "Unbekannt"), null, true));
            } catch (IOException e) {
                call.resolve(errorResult("NETWORK_ERROR", safeMessage(e, "Netzwerkfehler"), null, true));
            } catch (Exception e) {
                call.resolve(errorResult("UNKNOWN_ERROR", safeMessage(e, "Unbekannter Fehler"), null, false));
            }
        }).start();
    }

    @PluginMethod
    public void pollLoginFlow(PluginCall call) {
        String pollEndpoint = call.getString("pollEndpoint");
        String token = call.getString("token");

        if (TextUtils.isEmpty(pollEndpoint)) {
            call.resolve(errorResult("INVALID_POLL_ENDPOINT", "Poll-Endpunkt fehlt", null, false));
            return;
        }
        if (TextUtils.isEmpty(token)) {
            call.resolve(errorResult("INVALID_TOKEN", "Token fehlt", null, false));
            return;
        }

        try {
            URL endpointUrl = validateAbsoluteHttpsOrHttpUrl(pollEndpoint, "INVALID_POLL_ENDPOINT", "Poll-Endpunkt ist ungültig");
            String body = "token=" + java.net.URLEncoder.encode(token, StandardCharsets.UTF_8);
            HttpResponse response = executeJsonRequest(endpointUrl, "POST", body, "application/x-www-form-urlencoded");

            if (response.statusCode == 404) {
                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("status", "pending");
                call.resolve(result);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                call.resolve(httpError("HTTP_ERROR", "Polling des Login Flow fehlgeschlagen", response));
                return;
            }

            JSONObject json = parseJsonResponse(response);
            String server = json.optString("server", "").trim();
            String loginName = json.optString("loginName", "").trim();
            String appPassword = json.optString("appPassword", "").trim();

            if (server.isEmpty() || loginName.isEmpty() || appPassword.isEmpty()) {
                call.resolve(errorResult("INVALID_RESPONSE", "Antwort vom Server ist unvollständig", response.statusCode, false));
                return;
            }

            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("status", "complete");
            result.put("server", server);
            result.put("loginName", loginName);
            result.put("appPassword", appPassword);
            call.resolve(result);
        } catch (InvalidInputException e) {
            call.resolve(errorResult(e.code, e.getMessage(), null, false));
        } catch (SocketTimeoutException e) {
            call.resolve(errorResult("TIMEOUT", "Zeitüberschreitung beim Polling mit Nextcloud", null, true));
        } catch (SSLException e) {
            call.resolve(errorResult("TLS_ERROR", "TLS-Fehler bei der Verbindung zu Nextcloud", null, true));
        } catch (IOException e) {
            call.resolve(errorResult("NETWORK_ERROR", safeMessage(e, "Netzwerkfehler bei der Verbindung zu Nextcloud"), null, true));
        } catch (JSONException e) {
            call.resolve(errorResult("INVALID_JSON", "Server liefert ungültiges JSON", null, false));
        } catch (Exception e) {
            call.resolve(errorResult("UNKNOWN_ERROR", safeMessage(e, "Unbekannter Fehler"), null, false));
        }
    }

    private static URL normalizeBaseUrl(String rawUrl) throws InvalidInputException {
        String trimmed = rawUrl == null ? "" : rawUrl.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidInputException("INVALID_URL", "Server-URL fehlt");
        }

        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            trimmed = "https://" + trimmed;
        }
        trimmed = trimmed.replaceAll("/+$", "");
        return validateAbsoluteHttpsOrHttpUrl(trimmed, "INVALID_URL", "Server-URL ist ungültig");
    }

    private static URL validateAbsoluteHttpsOrHttpUrl(String rawUrl, String code, String message) throws InvalidInputException {
        try {
            URI uri = new URI(rawUrl.trim());
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equals("https") && !scheme.equals("http"))) {
                throw new InvalidInputException(code, message);
            }
            if (TextUtils.isEmpty(uri.getHost()) && !Patterns.WEB_URL.matcher(rawUrl).matches()) {
                throw new InvalidInputException(code, message);
            }
            return uri.toURL();
        } catch (URISyntaxException | IOException e) {
            throw new InvalidInputException(code, message);
        }
    }

    private static HttpResponse executeJsonRequest(URL url, String method, String body, String contentType) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setInstanceFollowRedirects(true);
        connection.setUseCaches(false);
        connection.setRequestProperty("Accept", "application/json");

        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", contentType + "; charset=UTF-8");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(bytes);
            }
        }

        int statusCode = connection.getResponseCode();
        String contentTypeHeader = connection.getHeaderField("Content-Type");
        InputStream inputStream = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String bodyText = readBody(inputStream);
        connection.disconnect();
        return new HttpResponse(statusCode, contentTypeHeader, bodyText);
    }

    private static JSONObject parseJsonResponse(HttpResponse response) throws JSONException, InvalidInputException {
        String body = response.body == null ? "" : response.body.trim();
        String contentType = response.contentType == null ? "" : response.contentType.toLowerCase();

        if (body.isEmpty()) {
            throw new InvalidInputException("INVALID_RESPONSE", "Server hat leer geantwortet");
        }
        if (contentType.contains("text/html") || body.startsWith("<")) {
            throw new InvalidInputException("INVALID_CONTENT_TYPE", "Server liefert HTML statt JSON");
        }
        return new JSONObject(body);
    }

    private static String readBody(InputStream inputStream) throws IOException {
        if (inputStream == null) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedInputStream bufferedInputStream = new BufferedInputStream(inputStream);
             BufferedReader reader = new BufferedReader(new InputStreamReader(bufferedInputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private static JSObject httpError(String code, String message, HttpResponse response) {
        boolean retriable = response.statusCode == 408 || response.statusCode == 429 || response.statusCode >= 500;
        String detail = response.body == null ? "" : response.body.trim();
        if (!detail.isEmpty()) {
            detail = detail.length() > 180 ? detail.substring(0, 180) + "…" : detail;
            message = message + " (HTTP " + response.statusCode + ": " + detail + ")";
        }
        return errorResult(code, message, response.statusCode, retriable);
    }

    private static JSObject errorResult(String code, String message, Integer httpStatus, boolean retriable) {
        JSObject result = new JSObject();
        result.put("ok", false);
        JSObject error = new JSObject();
        error.put("code", code);
        error.put("message", message);
        error.put("retriable", retriable);
        if (httpStatus != null) {
            error.put("httpStatus", httpStatus);
        }
        result.put("error", error);
        return result;
    }

    private static String safeMessage(Exception e, String fallback) {
        String message = e.getMessage();
        return message == null || message.trim().isEmpty() ? fallback : message;
    }

    private static class InvalidInputException extends Exception {
        final String code;

        InvalidInputException(String code, String message) {
            super(message);
            this.code = code;
        }
    }

    private static class HttpResponse {
        final int statusCode;
        final String contentType;
        final String body;

        HttpResponse(int statusCode, String contentType, String body) {
            this.statusCode = statusCode;
            this.contentType = contentType;
            this.body = body;
        }
    }
}
