package com.estundnzettl.app

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.chooser.ChooserResult
import androidx.core.content.edit
import androidx.core.content.IntentCompat

/** Records that Android's Sharesheet handed the report to a selected target. */
class ShareChosenReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val selectedComponent = if (Build.VERSION.SDK_INT >= 35) {
            IntentCompat.getParcelableExtra(
                intent,
                Intent.EXTRA_CHOOSER_RESULT,
                ChooserResult::class.java,
            )?.selectedComponent
        } else {
            IntentCompat.getParcelableExtra(
                intent,
                Intent.EXTRA_CHOSEN_COMPONENT,
                ComponentName::class.java,
            )
        }
        ShareHandoffStore.markChosen(context, selectedComponent = selectedComponent)
    }
}

/** Persists the handoff until the report screen is visible again. */
object ShareHandoffStore {
    private const val PREFS_NAME = "share_handoff"
    private const val KEY_CHOSEN_AT = "chosen_at"
    private const val KEY_PREFERRED_COMPONENT = "preferred_component"
    private const val KEY_USE_PREFERRED_TARGET = "use_preferred_target"
    private const val KEY_CUSTOM_MESSAGE_TEMPLATE = "custom_message_template"
    private const val KEY_CUSTOM_SUBJECT_TEMPLATE = "custom_subject_template"
    private const val KEY_EMAIL_RECIPIENT = "email_recipient"
    private const val MAX_AGE_MS = 10 * 60 * 1_000L

    fun markChosen(
        context: Context,
        now: Long = System.currentTimeMillis(),
        selectedComponent: ComponentName? = null,
    ) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putLong(KEY_CHOSEN_AT, now)
            if (selectedComponent != null) {
                putString(KEY_PREFERRED_COMPONENT, selectedComponent.flattenToString())
            }
        }
    }

    fun usePreferredTarget(context: Context): Boolean =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_USE_PREFERRED_TARGET, false)

    fun setUsePreferredTarget(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putBoolean(KEY_USE_PREFERRED_TARGET, enabled)
        }
    }

    fun preferredComponent(context: Context): ComponentName? {
        val flattened = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_PREFERRED_COMPONENT, null)
            ?: return null
        return ComponentName.unflattenFromString(flattened)
    }

    fun preferredTargetLabel(context: Context): String? {
        val component = preferredComponent(context) ?: return null
        return runCatching {
            context.packageManager.getActivityInfo(component, 0)
                .loadLabel(context.packageManager)
                .toString()
        }.getOrNull()
    }

    fun clearPreferredTarget(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            remove(KEY_PREFERRED_COMPONENT)
        }
    }

    fun customMessageTemplate(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_CUSTOM_MESSAGE_TEMPLATE, null)

    fun setCustomMessageTemplate(context: Context, template: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putString(KEY_CUSTOM_MESSAGE_TEMPLATE, template)
        }
    }

    fun resetCustomMessageTemplate(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            remove(KEY_CUSTOM_MESSAGE_TEMPLATE)
        }
    }

    fun customSubjectTemplate(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_CUSTOM_SUBJECT_TEMPLATE, null)

    fun setCustomSubjectTemplate(context: Context, template: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putString(KEY_CUSTOM_SUBJECT_TEMPLATE, template)
        }
    }

    fun resetCustomSubjectTemplate(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            remove(KEY_CUSTOM_SUBJECT_TEMPLATE)
        }
    }

    fun emailRecipient(context: Context): String =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_EMAIL_RECIPIENT, "")
            .orEmpty()

    fun setEmailRecipient(context: Context, recipient: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            if (recipient.isBlank()) remove(KEY_EMAIL_RECIPIENT)
            else putString(KEY_EMAIL_RECIPIENT, recipient)
        }
    }

    fun consume(context: Context, now: Long = System.currentTimeMillis()): Boolean {
        val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val chosenAt = preferences.getLong(KEY_CHOSEN_AT, 0L)
        if (chosenAt == 0L) return false

        preferences.edit { remove(KEY_CHOSEN_AT) }
        return now >= chosenAt && now - chosenAt <= MAX_AGE_MS
    }
}
