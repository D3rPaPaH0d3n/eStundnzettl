package com.estundnzettl.app;

import android.accounts.Account;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.identity.RevokeAccessRequest;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import org.json.JSONObject;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

@CapacitorPlugin(name = "GoogleDriveBackup")
public class GoogleDriveBackupPlugin extends Plugin {
    private static final String TAG = "GoogleDriveBackup";
    private static final String DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    private static final String EMAIL_SCOPE = "email";
    private static final String PREFS_NAME = "google_drive_backup_v2";
    private static final String KEY_CONNECTED = "connected";
    private static final String KEY_SCOPE = "scope";
    private static final String KEY_ACCOUNT_EMAIL = "account_email";

    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final OkHttpClient httpClient = new OkHttpClient();

    private interface EmailCallback {
        void onResult(String email);
    }

    private AuthorizationClient authorizationClient;
    private SharedPreferences authPrefs;
    private final AtomicReference<String> lastAccessToken = new AtomicReference<>(null);
    private volatile String lastGrantedScope = DEFAULT_SCOPE;
    private final AtomicReference<String> lastAccountEmail = new AtomicReference<>(null);

    @Override
    public void load() {
        super.load();
        authorizationClient = Identity.getAuthorizationClient(getContext());
        authPrefs = createEncryptedPrefs();
        lastGrantedScope = authPrefs.getString(KEY_SCOPE, DEFAULT_SCOPE);
        lastAccountEmail.set(authPrefs.getString(KEY_ACCOUNT_EMAIL, null));
    }

    private SharedPreferences createEncryptedPrefs() {
        try {
            MasterKey masterKey = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();
            return EncryptedSharedPreferences.create(
                getContext(),
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            Log.e(TAG, "EncryptedSharedPreferences init failed, falling back to plaintext", e);
            return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        authorizeSilently(call, false);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String requestedScope = call.getString("scope", DEFAULT_SCOPE);
        lastGrantedScope = requestedScope;

        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(buildScopeList(requestedScope))
            .build();

        authorizationClient.authorize(request)
            .addOnSuccessListener(result -> handleAuthorizationResult(call, result))
            .addOnFailureListener(error -> {
                Log.e(TAG, "authorize() failed", error);
                call.reject(error.getMessage(), error);
            });
    }

    private void handleAuthorizationResult(PluginCall call, AuthorizationResult result) {
        if (result == null) {
            call.reject("GOOGLE_DRIVE_AUTH_EMPTY_RESULT");
            return;
        }

        if (result.hasResolution()) {
            PendingIntent pendingIntent = result.getPendingIntent();
            if (pendingIntent == null) {
                call.reject("GOOGLE_DRIVE_AUTH_MISSING_RESOLUTION");
                return;
            }
            try {
                Intent intent = pendingIntent.getIntentSender() != null ? new IntentSenderBridgeActivity.IntentSenderBridgeIntentBuilder(getContext(), pendingIntent).build() : null;
                if (intent == null) {
                    call.reject("GOOGLE_DRIVE_AUTH_RESOLUTION_FAILED");
                    return;
                }
                startActivityForResult(call, intent, "handleConnectResult");
            } catch (Exception e) {
                Log.e(TAG, "resolution launch failed", e);
                call.reject("GOOGLE_DRIVE_AUTH_RESOLUTION_FAILED", e);
            }
            return;
        }

        resolveWithAuthorization(call, result);
    }

    @PluginMethod
    public void refreshToken(PluginCall call) {
        authorizeSilently(call, true);
    }

    @ActivityCallback
    private void handleConnectResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result == null) {
            call.reject("GOOGLE_DRIVE_AUTH_NO_ACTIVITY_RESULT");
            return;
        }

        Intent data = result.getData();
        try {
            AuthorizationResult authResult = authorizationClient.getAuthorizationResultFromIntent(data);
            resolveWithAuthorization(call, authResult);
        } catch (ApiException e) {
            Log.e(TAG, "getAuthorizationResultFromIntent failed", e);
            if (result.getResultCode() != Activity.RESULT_OK) {
                call.reject("GOOGLE_DRIVE_AUTH_CANCELLED", e);
            } else {
                call.reject(e.getMessage(), e);
            }
        } catch (Exception e) {
            Log.e(TAG, "handleConnectResult failed", e);
            if (result.getResultCode() != Activity.RESULT_OK) {
                call.reject("GOOGLE_DRIVE_AUTH_CANCELLED", e);
            } else {
                call.reject("GOOGLE_DRIVE_AUTH_RESULT_ERROR", e);
            }
        }
    }

    private void resolveWithAuthorization(PluginCall call, AuthorizationResult result) {
        String accessToken = result.getAccessToken();
        if (accessToken == null || accessToken.isEmpty()) {
            call.reject("GOOGLE_DRIVE_AUTH_NO_ACCESS_TOKEN");
            return;
        }

        lastAccessToken.set(accessToken);
        String localEmail = extractEmail(result);
        if (localEmail != null && !localEmail.isEmpty()) {
            lastAccountEmail.set(localEmail);
        }

        fetchUserEmailAsync(accessToken, fetchedEmail -> {
            if (fetchedEmail != null && !fetchedEmail.isEmpty()) {
                lastAccountEmail.set(fetchedEmail);
            }
            persistAuthMetadata(true);

            JSObject response = new JSObject();
            response.put("accessToken", accessToken);
            response.put("scope", lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);
            response.put("connected", true);
            response.put("hasToken", true);
            response.put("source", "authorization-client");
            String email = lastAccountEmail.get();
            if (email != null && !email.isEmpty()) {
                response.put("accountEmail", email);
            }
            call.resolve(response);
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        final String tokenToClear = lastAccessToken.getAndSet(null);
        final String scopeToRevoke = lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE;
        final String accountEmail = lastAccountEmail.getAndSet(null);

        clearPersistedAuthMetadata();

        if (tokenToClear != null && !tokenToClear.isEmpty()) {
            try {
                ClearTokenRequest clearTokenRequest = ClearTokenRequest.builder()
                    .setToken(tokenToClear)
                    .build();
                authorizationClient.clearToken(clearTokenRequest);
            } catch (Exception e) {
                Log.w(TAG, "clearToken failed", e);
            }
        }

        try {
            RevokeAccessRequest.Builder revokeBuilder = RevokeAccessRequest.builder()
                .setScopes(Collections.singletonList(new Scope(scopeToRevoke)));

            if (accountEmail != null && !accountEmail.isEmpty()) {
                revokeBuilder.setAccount(new Account(accountEmail, "com.google"));
            }

            authorizationClient.revokeAccess(revokeBuilder.build())
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(error -> {
                    Log.w(TAG, "revokeAccess failed", error);
                    call.resolve();
                });
        } catch (Exception e) {
            Log.w(TAG, "disconnect revoke setup failed", e);
            call.resolve();
        }
    }

    private void authorizeSilently(PluginCall call, boolean requireToken) {
        String requestedScope = call.getString("scope", lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);
        lastGrantedScope = requestedScope;

        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(buildScopeList(requestedScope))
            .build();

        authorizationClient.authorize(request)
            .addOnSuccessListener(result -> handleSilentAuthorizationResult(call, result, requireToken))
            .addOnFailureListener(error -> {
                Log.w(TAG, "silent authorize() failed", error);
                if (requireToken) {
                    call.reject("AUTH_REQUIRED", error);
                    return;
                }
                call.resolve(buildStatusResponse(false, isPersistedConnectionAvailable(), false));
            });
    }

    private void handleSilentAuthorizationResult(PluginCall call, AuthorizationResult result, boolean requireToken) {
        if (result == null) {
            if (requireToken) {
                call.reject("AUTH_REQUIRED");
                return;
            }
            call.resolve(buildStatusResponse(false, isPersistedConnectionAvailable(), false));
            return;
        }

        if (result.hasResolution()) {
            if (requireToken) {
                call.reject("AUTH_REQUIRED");
                return;
            }
            call.resolve(buildStatusResponse(false, isPersistedConnectionAvailable(), true));
            return;
        }

        String accessToken = result.getAccessToken();
        if (accessToken == null || accessToken.isEmpty()) {
            if (requireToken) {
                call.reject("AUTH_REQUIRED");
                return;
            }
            call.resolve(buildStatusResponse(false, isPersistedConnectionAvailable(), false));
            return;
        }

        lastAccessToken.set(accessToken);
        String localEmail = extractEmail(result);
        if (localEmail != null && !localEmail.isEmpty()) {
            lastAccountEmail.set(localEmail);
        }

        fetchUserEmailAsync(accessToken, fetchedEmail -> {
            if (fetchedEmail != null && !fetchedEmail.isEmpty()) {
                lastAccountEmail.set(fetchedEmail);
            }
            persistAuthMetadata(true);

            if (requireToken) {
                JSObject response = buildStatusResponse(true, true, false);
                response.put("accessToken", accessToken);
                call.resolve(response);
                return;
            }

            call.resolve(buildStatusResponse(true, true, false));
        });
    }

    private JSObject buildStatusResponse(boolean hasToken, boolean connected, boolean reauthRequired) {
        JSObject result = new JSObject();
        result.put("connected", connected);
        result.put("hasToken", hasToken);
        result.put("reauthRequired", reauthRequired);
        result.put("scope", lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);
        result.put("available", true);
        result.put("implemented", true);
        String email = lastAccountEmail.get();
        if (email != null && !email.isEmpty()) {
            result.put("accountEmail", email);
        }
        return result;
    }

    private boolean isPersistedConnectionAvailable() {
        return authPrefs != null && authPrefs.getBoolean(KEY_CONNECTED, false);
    }

    private List<Scope> buildScopeList(String driveScope) {
        return Arrays.asList(new Scope(driveScope), new Scope(EMAIL_SCOPE));
    }

    private void fetchUserEmailAsync(String accessToken, EmailCallback callback) {
        if (accessToken == null || accessToken.isEmpty()) {
            callback.onResult(null);
            return;
        }
        try {
            Request request = new Request.Builder()
                .url(USERINFO_URL)
                .header("Authorization", "Bearer " + accessToken)
                .build();

            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    Log.w(TAG, "userinfo fetch failed", e);
                    callback.onResult(null);
                }

                @Override
                public void onResponse(Call call, Response response) {
                    try (Response r = response) {
                        if (!r.isSuccessful() || r.body() == null) {
                            Log.w(TAG, "userinfo fetch HTTP " + r.code());
                            callback.onResult(null);
                            return;
                        }
                        String body = r.body().string();
                        JSONObject json = new JSONObject(body);
                        String email = json.optString("email", null);
                        callback.onResult(email);
                    } catch (Exception e) {
                        Log.w(TAG, "userinfo parse failed", e);
                        callback.onResult(null);
                    }
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "userinfo request setup failed", e);
            callback.onResult(null);
        }
    }

    private String extractEmail(AuthorizationResult result) {
        try {
            GoogleSignInAccount signInAccount = result != null ? result.toGoogleSignInAccount() : null;
            if (signInAccount == null) {
                return lastAccountEmail.get();
            }
            String email = signInAccount.getEmail();
            if (email != null && !email.isEmpty()) {
                return email;
            }
            Account account = signInAccount.getAccount();
            if (account != null && account.name != null && !account.name.isEmpty()) {
                return account.name;
            }
        } catch (Exception e) {
            Log.w(TAG, "extractEmail failed", e);
        }
        return lastAccountEmail.get();
    }

    private void persistAuthMetadata(boolean connected) {
        if (authPrefs == null) {
            return;
        }
        SharedPreferences.Editor editor = authPrefs.edit()
            .putBoolean(KEY_CONNECTED, connected)
            .putString(KEY_SCOPE, lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);

        String email = lastAccountEmail.get();
        if (email != null && !email.isEmpty()) {
            editor.putString(KEY_ACCOUNT_EMAIL, email);
        } else {
            editor.remove(KEY_ACCOUNT_EMAIL);
        }

        editor.apply();
    }

    private void clearPersistedAuthMetadata() {
        if (authPrefs == null) {
            return;
        }
        authPrefs.edit()
            .remove(KEY_CONNECTED)
            .remove(KEY_SCOPE)
            .remove(KEY_ACCOUNT_EMAIL)
            .apply();
    }
}
