package com.ghostsystems.talosllmstudio

import android.app.ActivityManager
import android.os.Build
import android.content.Context
import android.opengl.GLES20
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
            val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            val totalRamGB = String.format("%.1f", memInfo.totalMem.toDouble() / (1024 * 1024 * 1024))
            map.putString("ram", "$totalRamGB GB")

            // CPU
            val cpuArch = Build.SUPPORTED_ABIS.firstOrNull() ?: "unknown"
            val cpuCores = Runtime.getRuntime().availableProcessors()
            map.putString("cpu", "$cpuArch ($cpuCores cores)")

            // GPU - try to get from OpenGL
            val gpuInfo = try {
                val renderer = GLES20.glGetString(GLES20.GL_RENDERER)
                val vendor = GLES20.glGetString(GLES20.GL_VENDOR)
                if (renderer != null) renderer else "N/A"
            } catch (e: Exception) {
                "N/A"
            }
            map.putString("gpu", gpuInfo)

            // Device model
            map.putString("model", "${Build.MANUFACTURER} ${Build.MODEL}")

            // VRAM (on mobile, shared with RAM)
            map.putString("vram", "Compartilhado com RAM")

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
