package com.ghostsystems.talosllmstudio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class DownloadModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var receiverRegistered = false
    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            when (intent.action) {
                "com.ghostsystems.talosllmstudio.DOWNLOAD_PROGRESS" -> {
                    val progress = intent.getIntExtra("progress", 0)
                    val downloaded = intent.getLongExtra("downloaded", 0)
                    val total = intent.getLongExtra("total", 0)
                    val bps = intent.getLongExtra("bytesPerSecond", 0)

                    val params = Arguments.createMap().apply {
                        putInt("progress", progress)
                        putDouble("downloaded", downloaded.toDouble())
                        putDouble("total", total.toDouble())
                        putDouble("bytesPerSecond", bps.toDouble())
                    }
                    sendEvent("onDownloadProgress", params)
                }
                "com.ghostsystems.talosllmstudio.DOWNLOAD_COMPLETE" -> {
                    val params = Arguments.createMap().apply {
                        putBoolean("completed", true)
                    }
                    sendEvent("onDownloadComplete", params)
                    unregisterReceiver()
                }
                "com.ghostsystems.talosllmstudio.DOWNLOAD_ERROR" -> {
                    val error = intent.getStringExtra("error") ?: "Unknown error"
                    val params = Arguments.createMap().apply {
                        putString("error", error)
                    }
                    sendEvent("onDownloadError", params)
                    unregisterReceiver()
                }
            }
        }
    }

    override fun getName(): String = "DownloadModule"

    @ReactMethod
    fun startDownload(url: String, path: String, name: String) {
        val context = reactApplicationContext
        registerReceiver(context)

        val intent = Intent(context, DownloadService::class.java).apply {
            action = DownloadService.ACTION_START
            putExtra(DownloadService.EXTRA_URL, url)
            putExtra(DownloadService.EXTRA_PATH, path)
            putExtra(DownloadService.EXTRA_NAME, name)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @ReactMethod
    fun cancelDownload() {
        val context = reactApplicationContext
        val intent = Intent(context, DownloadService::class.java).apply {
            action = DownloadService.ACTION_CANCEL
        }
        context.startService(intent)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun registerReceiver(context: Context) {
        unregisterReceiver()

        val filter = IntentFilter().apply {
            addAction("com.ghostsystems.talosllmstudio.DOWNLOAD_PROGRESS")
            addAction("com.ghostsystems.talosllmstudio.DOWNLOAD_COMPLETE")
            addAction("com.ghostsystems.talosllmstudio.DOWNLOAD_ERROR")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }
        receiverRegistered = true
    }

    private fun unregisterReceiver() {
        if (!receiverRegistered) return
        try {
            reactApplicationContext.unregisterReceiver(receiver)
        } catch (_: Exception) {}
        receiverRegistered = false
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    fun cleanup() {
        unregisterReceiver()
    }
}
