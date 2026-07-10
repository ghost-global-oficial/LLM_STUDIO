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

            // CPU - real processor model from /proc/cpuinfo
            try {
                val cpuCores = Runtime.getRuntime().availableProcessors()
                var processorModel = ""

                // Try /proc/cpuinfo
                try {
                    val file = File("/proc/cpuinfo")
                    if (file.exists()) {
                        val lines = file.readLines()
                        for (line in lines) {
                            if (line.startsWith("Hardware", true) || line.startsWith("model name", true) || line.startsWith("CPU implementer", true)) {
                                val value = line.split(":").getOrNull(1)?.trim() ?: ""
                                if (value.isNotEmpty() && value != "0x00" && value != "0x41" && value != "0x51") {
                                    processorModel = value
                                    break
                                }
                            }
                        }
                    }
                } catch (e: Exception) {}

                // Try /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq for frequency
                var cpuFreq = ""
                try {
                    val file = File("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq")
                    if (file.exists()) {
                        val freqKhz = file.readText().trim().toLongOrNull() ?: 0
                        if (freqKhz > 0) {
                            cpuFreq = if (freqKhz >= 1000000) {
                                String.format("%.1f GHz", freqKhz.toDouble() / 1000000)
                            } else {
                                "${freqKhz / 1000} MHz"
                            }
                        }
                    }
                } catch (e: Exception) {}

                // Fallback to system properties
                if (processorModel.isEmpty()) {
                    val chipname = getSystemProperty("ro.hardware.chipname")
                    val platform = getSystemProperty("ro.board.platform")
                    val hardware = Build.HARDWARE ?: ""
                    processorModel = when {
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
                }

                val freqInfo = if (cpuFreq.isNotEmpty()) " @ $cpuFreq" else ""
                map.putString("cpu", "$processorModel ($cpuCores cores)$freqInfo")
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
}
