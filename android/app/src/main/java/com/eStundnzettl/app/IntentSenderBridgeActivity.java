package com.estundnzettl.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

public class IntentSenderBridgeActivity extends AppCompatActivity {
    private static final String EXTRA_PENDING_INTENT = "pendingIntent";
    private static final int REQUEST_CODE = 9042;

    public static class IntentSenderBridgeIntentBuilder {
        private final Context context;
        private final PendingIntent pendingIntent;

        public IntentSenderBridgeIntentBuilder(Context context, PendingIntent pendingIntent) {
            this.context = context;
            this.pendingIntent = pendingIntent;
        }

        public Intent build() {
            Intent intent = new Intent(context, IntentSenderBridgeActivity.class);
            intent.putExtra(EXTRA_PENDING_INTENT, pendingIntent);
            return intent;
        }
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pendingIntent = getIntent().getParcelableExtra(EXTRA_PENDING_INTENT, PendingIntent.class);
        } else {
            pendingIntent = getIntent().getParcelableExtra(EXTRA_PENDING_INTENT);
        }
        if (pendingIntent == null) {
            setResult(Activity.RESULT_CANCELED);
            finish();
            return;
        }

        try {
            startIntentSenderForResult(
                pendingIntent.getIntentSender(),
                REQUEST_CODE,
                null,
                0,
                0,
                0,
                null
            );
        } catch (IntentSender.SendIntentException e) {
            setResult(Activity.RESULT_CANCELED);
            finish();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE) {
            setResult(resultCode, data);
            finish();
        }
    }
}
