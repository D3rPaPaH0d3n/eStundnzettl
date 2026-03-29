package com.estundnzettl.app;

import android.accounts.Account;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
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

    private AuthorizationClient authorizationClient;
    private String lastAccessToken;
    private String lastGrantedScope = DEFAULT_SCOPE;
    private String lastAccountEmail;

    @Override
    public void load() {
        super.load();
        authorizationClient = Identity.getAuthorizationClient(getContext());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", lastAccessToken != null && !lastAccessToken.isEmpty());
        result.put("hasToken", lastAccessToken != null && !lastAccessToken.isEmpty());
        result.put("reauthRequired", false);
        result.put("scope", lastGrantedScope != null ? lastGrantedScope : DEFAULT_SCOPE);
        result.put("available", true);
        result.put("implemented", true);
        if (lastAccountEmail != null) {
            result.put("accountEmail", lastAccountEmail);
        }
        call.resolve(result);
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

    @ActivityCallback
    private void handleConnectResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result == null) {
            call.reject("GOOGLE_DRIVE_AUTH_NO_ACTIVITY_RESULT");
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("GOOGLE_DRIVE_AUTH_CANCELLED");
            return;
        }

        Intent data = result.getData();
        try {
            AuthorizationResult authResult = authorizationClient.getAuthorizationResultFromIntent(data);
            resolveWithAuthorization(call, authResult);
        } catch (ApiException e) {
            Log.e(TAG, "getAuthorizationResultFromIntent failed", e);
            call.reject(e.getMessage(), e);
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
}
