package com.ghostsystems.talosllmstudio

import android.app.ActivityManager
import android.os.Build
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import java.io.File

class DeviceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceModule"

    private fun getSystemProperty(key: String): String {
        return try {
            val cl = Class.forName("android.os.SystemProperties")
            val get = cl.getMethod("get", String::class.java, String::class.java)
            get.invoke(null, key, "") as String
        } catch (e: Exception) {
            ""
        }
    }

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

            // CPU - real processor model
            try {
                val cpuCores = Runtime.getRuntime().availableProcessors()
                val chipname = getSystemProperty("ro.hardware.chipname")
                val platform = getSystemProperty("ro.board.platform")
                val hardware = Build.HARDWARE ?: ""

                val processorModel = when {
                    chipname.isNotEmpty() -> chipname
                    platform.contains("sm8", true) -> "Qualcomm Snapdragon ${platform.uppercase()}"
                    platform.contains("sdm", true) -> "Qualcomm Snapdragon ${platform.uppercase()}"
                    platform.contains("exynos", true) -> "Samsung Exynos"
                    platform.contains("mt", true) -> "MediaTek Dimensity"
                    hardware.contains("qualcomm", true) -> "Qualcomm Snapdragon"
                    hardware.contains("samsung", true) -> "Samsung Exynos"
                    hardware.contains("mediatek", true) || hardware.contains("mtk", true) -> "MediaTek"
                    hardware.contains("hisilicon", true) -> "HiSilicon Kirin"
                    else -> hardware.ifEmpty { "Unknown" }
                }
                map.putString("cpu", "$processorModel ($cpuCores cores)")
            } catch (e: Exception) {
                map.putString("cpu", "N/A")
            }

            // GPU - try multiple sources
            val gpuInfo = try {
                var gpu = ""

                // Try /sys/class/kgsl/kgsl-3d0/gpu_model (Qualcomm)
                try {
                    val file = File("/sys/class/kgsl/kgsl-3d0/gpu_model")
                    if (file.exists()) {
                        gpu = file.readText().trim()
                    }
                } catch (e: Exception) {}

                // Try /sys/class/kgsl/kgsl-3d0/gpu_name
                if (gpu.isEmpty()) {
                    try {
                        val file = File("/sys/class/kgsl/kgsl-3d0/gpu_name")
                        if (file.exists()) {
                            gpu = file.readText().trim()
                        }
                    } catch (e: Exception) {}
                }

                // Try /proc/gpuinfo
                if (gpu.isEmpty()) {
                    try {
                        val file = File("/proc/gpuinfo")
                        if (file.exists()) {
                            val line = file.readLines().firstOrNull()
                            if (line != null) {
                                gpu = line
                            }
                        }
                    } catch (e: Exception) {}
                }

                // Fallback to system properties
                if (gpu.isEmpty()) {
                    val platform = getSystemProperty("ro.board.platform")
                    val hardware = Build.HARDWARE ?: ""
                    gpu = when {
                        hardware.contains("qualcomm", true) || platform.contains("sm", true) -> "Qualcomm Adreno"
                        hardware.contains("samsung", true) || platform.contains("exynos", true) -> "Samsung Xclipse"
                        hardware.contains("mediatek", true) || platform.contains("mt", true) -> "ARM Mali"
                        hardware.contains("hisilicon", true) -> "ARM Mali"
                        hardware.contains("qcom", true) -> "Qualcomm Adreno"
                        else -> hardware.ifEmpty { "N/A" }
                    }
                }

                gpu
            } catch (e: Exception) {
                "N/A"
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

    @ReactMethod
    fun getPerformanceSettings(mode: String, promise: Promise) {
        try {
            val map = Arguments.createMap()
            val cpuCores = Runtime.getRuntime().availableProcessors()
            val totalRamMB = try {
                val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val memInfo = ActivityManager.MemoryInfo()
                activityManager.getMemoryInfo(memInfo)
                (memInfo.totalMem / (1024 * 1024)).toInt()
            } catch (e: Exception) { 4096 }

            when (mode) {
                "performance" -> {
                    map.putInt("n_threads", cpuCores)
                    map.putInt("n_ctx", if (totalRamMB >= 6144) 4096 else 2048)
                    map.putInt("n_gpu_layers", if (totalRamMB >= 6144) 99 else 33)
                    map.putBoolean("use_mlock", true)
                }
                "balanced" -> {
                    map.putInt("n_threads", (cpuCores * 0.75).toInt().coerceAtLeast(2))
                    map.putInt("n_ctx", if (totalRamMB >= 6144) 2048 else 1024)
                    map.putInt("n_gpu_layers", if (totalRamMB >= 6144) 33 else 0)
                    map.putBoolean("use_mlock", false)
                }
                "efficiency" -> {
                    map.putInt("n_threads", (cpuCores * 0.5).toInt().coerceAtLeast(2))
                    map.putInt("n_ctx", 512)
                    map.putInt("n_gpu_layers", 0)
                    map.putBoolean("use_mlock", false)
                }
                else -> {
                    map.putInt("n_threads", (cpuCores * 0.75).toInt().coerceAtLeast(2))
                    map.putInt("n_ctx", 1024)
                    map.putInt("n_gpu_layers", 0)
                    map.putBoolean("use_mlock", false)
                }
            }

            map.putInt("cpu_cores", cpuCores)
            map.putInt("total_ram_mb", totalRamMB)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
