package com.estundnzettl.app.ui

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Haptisches Feedback — Pendant zu Capacitor Haptics.impact
 * (ImpactStyle.Light/Medium/Heavy). Vorgefertigte Effekte ab API 29,
 * davor kurze One-Shot-Vibrationen.
 */
object Haptics {

    private fun vibrator(context: Context): Vibrator? = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    } catch (_: Exception) {
        null
    }

    private fun vibrate(context: Context, effectId: Int, fallbackMs: Long) {
        val v = vibrator(context) ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                v.vibrate(VibrationEffect.createPredefined(effectId))
            } else {
                v.vibrate(VibrationEffect.createOneShot(fallbackMs, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        } catch (_: Exception) {
        }
    }

    /** ImpactStyle.Light */
    fun light(context: Context) = vibrate(context, VibrationEffect.EFFECT_TICK, 10)

    /** ImpactStyle.Medium */
    fun medium(context: Context) = vibrate(context, VibrationEffect.EFFECT_CLICK, 20)

    /** ImpactStyle.Heavy */
    fun heavy(context: Context) = vibrate(context, VibrationEffect.EFFECT_HEAVY_CLICK, 35)
}
