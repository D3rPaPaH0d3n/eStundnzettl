package com.estundnzettl.app;

import android.accounts.Account;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

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
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import java.util.Collections;

@CapacitorPlugin(name = "GoogleDriveBackup")
public class GoogleDriveBackupPlugin extends Plugin {
    private static final String TAG = "GoogleDriveBackup";
    private static final String DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    private static final String PREFS_NAME = "google_drive_backup";
    private static final String KEY_CONNECTED = "connected";
    private static final String KEY_SCOPE = "scope";
    private static final String KEY_ACCOUNT_EMAIL = "account_email";

    private AuthorizationClient authorizationClient;
    private SharedPreferences authPrefs;
    private String lastAccessToken;
    private String lastGrantedScope = DEFAULT_SCOPE;
    private String lastAccountEmail;

    @Override
    public void load() {
        super.load();
        authorizationClient = Identity.getAuthorizationClient(getContext());
        authPrefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        lastGrantedScope = authPrefs.getString(KEY_SCOPE, DEFAULT_SCOPE);
        lastAccountEmail = authPrefs.getString(KEY_ACCOUNT_EMAIL, null);
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
            .setRequestedScopes(Collections.singletonList(new Scope(requestedScope)))
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

        lastAccessToken = accessToken;

        if (result.toGoogleSignInAccount() != null && result.toGoogleSignInAccount().getAccount() != null) {
            Account account = result.toGoogleSignInAccount().getAccount();
            lastAccountEmail = account.name;
        }
        persistAuthMetadata(true);

        JSObject response = new JSObject();
        response.put("accessToken", accessToken);
        response.put("scope", lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);
        response.put("connected", true);
        response.put("hasToken", true);
        response.put("source", "authorization-client");
        if (lastAccountEmail != null) {
            response.put("accountEmail", lastAccountEmail);
        }
        call.resolve(response);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        final String tokenToClear = lastAccessToken;
        final String scopeToRevoke = lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE;
        final String accountEmail = lastAccountEmail;

        lastAccessToken = null;
        lastAccountEmail = null;
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
            .setRequestedScopes(Collections.singletonList(new Scope(requestedScope)))
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

        lastAccessToken = accessToken;

        if (result.toGoogleSignInAccount() != null && result.toGoogleSignInAccount().getAccount() != null) {
            Account account = result.toGoogleSignInAccount().getAccount();
            lastAccountEmail = account.name;
        }

        persistAuthMetadata(true);

        if (requireToken) {
            JSObject response = buildStatusResponse(true, true, false);
            response.put("accessToken", accessToken);
            call.resolve(response);
            return;
        }

        call.resolve(buildStatusResponse(true, true, false));
    }

    private JSObject buildStatusResponse(boolean hasToken, boolean connected, boolean reauthRequired) {
        JSObject result = new JSObject();
        result.put("connected", connected);
        result.put("hasToken", hasToken);
        result.put("reauthRequired", reauthRequired);
        result.put("scope", lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);
        result.put("available", true);
        result.put("implemented", true);
        if (lastAccountEmail != null && !lastAccountEmail.isEmpty()) {
            result.put("accountEmail", lastAccountEmail);
        }
        return result;
    }

    private boolean isPersistedConnectionAvailable() {
        return authPrefs != null && authPrefs.getBoolean(KEY_CONNECTED, false);
    }

    private void persistAuthMetadata(boolean connected) {
        if (authPrefs == null) {
            return;
        }
        SharedPreferences.Editor editor = authPrefs.edit()
            .putBoolean(KEY_CONNECTED, connected)
            .putString(KEY_SCOPE, lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);

        if (lastAccountEmail != null && !lastAccountEmail.isEmpty()) {
            editor.putString(KEY_ACCOUNT_EMAIL, lastAccountEmail);
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
