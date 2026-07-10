package com.ghostsystems.talosllmstudio

import android.app.ActivityManager
import android.os.Build
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments

class DeviceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceModule"

    @ReactMethod
    fun getHardwareInfo(promise: Promise) {
        try {
            val map = Arguments.createMap()

            // RAM
            try {
                val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val memInfo = ActivityManager.MemoryInfo()
                activityManager.getMemoryInfo(memInfo)
                val totalRamGB = String.format("%.1f", memInfo.totalMem.toDouble() / (1024 * 1024 * 1024))
                map.putString("ram", "$totalRamGB GB")
            } catch (e: Exception) {
                map.putString("ram", "N/A")
            }

            // CPU
            try {
                val cpuCores = Runtime.getRuntime().availableProcessors()
                val processorModel = try {
                    val cl = Class.forName("android.os.SystemProperties")
                    val get = cl.getMethod("get", String::class.java, String::class.java)

                    // Try multiple properties for CPU model
                    val chipname = get.invoke(null, "ro.hardware.chipname", "") as String
                    val platform = get.invoke(null, "ro.board.platform", "") as String
                    val hardware = Build.HARDWARE ?: ""

                    when {
                        chipname.isNotEmpty() -> chipname
                        platform.contains("sm8", true) -> "Qualcomm Snapdragon ${platform.uppercase()}"
                        platform.contains("sdm", true) -> "Qualcomm Snapdragon ${platform.uppercase()}"
                        platform.contains("exynos", true) -> "Samsung Exynos $platform"
                        platform.contains("mt", true) || platform.contains("dimensity", true) -> "MediaTek $platform"
                        platform.contains("kirin", true) -> "HiSilicon Kirin $platform"
                        hardware.contains("qualcomm", true) -> "Qualcomm Snapdragon"
                        hardware.contains("samsung", true) -> "Samsung Exynos"
                        hardware.contains("mediatek", true) || hardware.contains("mtk", true) -> "MediaTek"
                        hardware.contains("hisilicon", true) -> "HiSilicon Kirin"
                        else -> "Unknown"
                    }
                } catch (e: Exception) {
                    "Unknown"
                }
                map.putString("cpu", "$processorModel ($cpuCores cores)")
            } catch (e: Exception) {
                map.putString("cpu", "N/A")
            }

            // GPU - read from system properties
            val gpuInfo = try {
                val cl = Class.forName("android.os.SystemProperties")
                val get = cl.getMethod("get", String::class.java, String::class.java)
                val renderer = get.invoke(null, "ro.hardware.chipname", "") as String
                if (renderer.isNotEmpty()) {
                    renderer
                } else {
                    val board = Build.BOARD ?: ""
                    val hardware = Build.HARDWARE ?: ""
                    when {
                        hardware.contains("qualcomm", true) || board.contains("msm", true) -> "Qualcomm Adreno"
                        hardware.contains("samsung", true) || hardware.contains("exynos", true) -> "Samsung Xclipse/Mali"
                        hardware.contains("mediatek", true) || hardware.contains("mtk", true) -> "ARM Mali"
                        hardware.contains("hisilicon", true) -> "ARM Mali"
                        else -> hardware.ifEmpty { "N/A" }
                    }
                }
            } catch (e: Exception) {
                val hardware = Build.HARDWARE ?: "N/A"
                hardware.ifEmpty { "N/A" }
            }
            map.putString("gpu", gpuInfo)

            // Device model
            map.putString("model", "${Build.MANUFACTURER} ${Build.MODEL}")

            // VRAM
            map.putString("vram", "Compartilhado com RAM")

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
