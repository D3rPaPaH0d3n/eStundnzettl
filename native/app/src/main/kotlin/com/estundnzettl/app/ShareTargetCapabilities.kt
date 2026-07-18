package com.estundnzettl.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Build

data class ShareTargetOption(
    val component: ComponentName,
    val label: String,
    val isEmail: Boolean,
)

/** Discovers installed PDF share targets without broad package visibility. */
object ShareTargetCapabilities {
    fun installedPdfTargets(context: Context): List<ShareTargetOption> {
        val packageManager = context.packageManager
        val emailPackages = emailPackages(packageManager)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
        }

        return queryActivities(packageManager, shareIntent)
            .mapNotNull { info ->
                val activity = info.activityInfo ?: return@mapNotNull null
                val component = ComponentName(activity.packageName, activity.name)
                val label = runCatching {
                    activity.applicationInfo.loadLabel(packageManager).toString()
                }.getOrElse {
                    info.loadLabel(packageManager)?.toString().orEmpty()
                }.ifBlank { activity.packageName }
                ShareTargetOption(
                    component = component,
                    label = label,
                    isEmail = activity.packageName in emailPackages,
                )
            }
            .distinctBy { it.component.packageName }
            .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.label })
    }

    fun isEmailTarget(context: Context, component: ComponentName): Boolean =
        component.packageName in emailPackages(context.packageManager)

    private fun emailPackages(packageManager: PackageManager): Set<String> {
        val emailIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"))
        return queryActivities(packageManager, emailIntent)
            .mapNotNull { it.activityInfo?.packageName }
            .toSet()
    }

    @Suppress("DEPRECATION")
    private fun queryActivities(
        packageManager: PackageManager,
        intent: Intent,
    ): List<ResolveInfo> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        packageManager.queryIntentActivities(
            intent,
            PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_DEFAULT_ONLY.toLong()),
        )
    } else {
        packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
    }
}
