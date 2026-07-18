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

/** Discovers installed mail and messaging targets that can receive a PDF. */
object ShareTargetCapabilities {
    fun installedPdfTargets(context: Context): List<ShareTargetOption> {
        val packageManager = context.packageManager
        val emailPackages = emailPackages(packageManager)
        val messagingPackages = messagingPackages(packageManager)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
        }

        return queryActivities(packageManager, shareIntent)
            .mapNotNull { info ->
                val activity = info.activityInfo ?: return@mapNotNull null
                val packageName = activity.packageName
                val isEmail = packageName in emailPackages
                if (!isEmail && !isMessagingPackage(packageName, messagingPackages)) {
                    return@mapNotNull null
                }
                val component = ComponentName(activity.packageName, activity.name)
                val label = runCatching {
                    activity.applicationInfo.loadLabel(packageManager).toString()
                }.getOrElse {
                    info.loadLabel(packageManager)?.toString().orEmpty()
                }.ifBlank { activity.packageName }
                ShareTargetOption(
                    component = component,
                    label = label,
                    isEmail = isEmail,
                )
            }
            .distinctBy { it.component.packageName }
            .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.label })
    }

    fun isEmailTarget(context: Context, component: ComponentName): Boolean =
        component.packageName in emailPackages(context.packageManager)

    fun isCommunicationTarget(context: Context, component: ComponentName): Boolean {
        val packageManager = context.packageManager
        return component.packageName in emailPackages(packageManager) ||
            isMessagingPackage(component.packageName, messagingPackages(packageManager))
    }

    private fun emailPackages(packageManager: PackageManager): Set<String> {
        val emailIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"))
        return queryActivities(packageManager, emailIntent)
            .mapNotNull { it.activityInfo?.packageName }
            .toSet()
    }

    private fun messagingPackages(packageManager: PackageManager): Set<String> =
        listOf("sms:", "smsto:")
            .flatMap { uri ->
                queryActivities(
                    packageManager,
                    Intent(Intent.ACTION_SENDTO, Uri.parse(uri)),
                )
            }
            .mapNotNull { it.activityInfo?.packageName }
            .toSet()

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

private val KNOWN_MESSAGING_PACKAGE_MARKERS = setOf(
    "whatsapp",
    "telegram",
    "signal",
    "messenger",
    "messaging",
    "messages",
    "threema",
    "viber",
    "discord",
    "slack",
    "teams",
    "skype",
    "wechat",
    "beeper",
    "element",
)

private val KNOWN_MESSAGING_PACKAGES = setOf(
    "com.facebook.orca",
    "com.tencent.mm",
    "jp.naver.line.android",
    "com.kakao.talk",
    "com.wire",
)

internal fun isMessagingPackage(
    packageName: String,
    intentMessagingPackages: Set<String>,
): Boolean {
    val normalized = packageName.lowercase()
    return packageName in intentMessagingPackages ||
        normalized in KNOWN_MESSAGING_PACKAGES ||
        KNOWN_MESSAGING_PACKAGE_MARKERS.any(normalized::contains)
}
