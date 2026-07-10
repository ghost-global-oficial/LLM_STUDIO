package com.ghostsystems.talosllmstudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class DownloadService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var downloadThread: Thread? = null
    @Volatile private var isCancelled = false
    private var startTime: Long = 0

    companion object {
        const val CHANNEL_ID = "download_channel"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "ACTION_START"
        const val ACTION_CANCEL = "ACTION_CANCEL"
        const val EXTRA_URL = "EXTRA_URL"
        const val EXTRA_PATH = "EXTRA_PATH"
        const val EXTRA_NAME = "EXTRA_NAME"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_CANCEL -> {
                cancelDownload()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START -> {
                val url = intent.getStringExtra(EXTRA_URL) ?: return START_NOT_STICKY
                val path = intent.getStringExtra(EXTRA_PATH) ?: return START_NOT_STICKY
                val name = intent.getStringExtra(EXTRA_NAME) ?: "Downloading..."
                startDownload(url, path, name)
            }
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Model Downloads",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows download progress for models"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun formatSize(bytes: Long): String {
        return when {
            bytes >= 1073741824 -> String.format("%.2f GB", bytes / 1073741824.0)
            bytes >= 1048576 -> String.format("%.1f MB", bytes / 1048576.0)
            bytes >= 1024 -> String.format("%.1f KB", bytes / 1024.0)
            else -> "$bytes B"
        }
    }

    private fun formatTimeRemaining(bytesRemaining: Long, bytesPerSecond: Long): String {
        if (bytesPerSecond <= 0) return "Calculando..."
        val secondsRemaining = bytesRemaining / bytesPerSecond
        return when {
            secondsRemaining < 60 -> "${secondsRemaining}s restantes"
            secondsRemaining < 3600 -> "${secondsRemaining / 60}m ${secondsRemaining % 60}s restantes"
            else -> "${secondsRemaining / 3600}h ${(secondsRemaining % 3600) / 60}m restantes"
        }
    }

    private fun buildProgressNotification(
        name: String,
        downloaded: Long,
        total: Long,
        bytesPerSecond: Long
    ): Notification {
        val cancelIntent = Intent(this, DownloadService::class.java).apply {
            action = ACTION_CANCEL
        }
        val cancelPendingIntent = PendingIntent.getService(
            this, 0, cancelIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val progress = if (total > 0) ((downloaded * 100) / total).toInt() else 0
        val downloadedStr = formatSize(downloaded)
        val totalStr = formatSize(total)
        val remaining = total - downloaded
        val remainingStr = formatSize(remaining)
        val speedStr = formatSize(bytesPerSecond) + "/s"
        val timeStr = formatTimeRemaining(remaining, bytesPerSecond)

        val bigText = buildString {
            appendLine("$downloadedStr / $totalStr ($progress%)")
            appendLine("Velocidade: $speedStr")
            appendLine("Falta: $remainingStr")
            appendLine(timeStr)
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("A descarregar: $name")
            .setContentText("$progress% — $downloadedStr / $totalStr")
            .setSubText(speedStr)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setProgress(100, progress, false)
            .setOngoing(true)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancelar", cancelPendingIntent)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun doDownload(url: String, path: String, name: String) {
        var connection: HttpURLConnection? = null
        var inputStream: BufferedInputStream? = null
        var outputStream: FileOutputStream? = null

        try {
            val tmpPath = "$path.downloading.tmp"
            val dir = File(path).parentFile
            if (dir != null && !dir.exists()) dir.mkdirs()

            val fileUrl = URL(url)
            connection = fileUrl.openConnection() as HttpURLConnection
            connection.connectTimeout = 30000
            connection.readTimeout = 60000
            connection.connect()

            val totalSize = connection.contentLength.toLong()
            inputStream = BufferedInputStream(connection.inputStream, 8192)
            outputStream = FileOutputStream(tmpPath)

            val buffer = ByteArray(8192)
            var downloaded: Long = 0
            var count: Int
            var lastNotifyTime = System.currentTimeMillis()
            var lastDownloaded: Long = 0

            while (inputStream.read(buffer).also { count = it } != -1) {
                if (isCancelled) {
                    outputStream.close()
                    inputStream.close()
                    File(tmpPath).delete()
                    return
                }

                outputStream.write(buffer, 0, count)
                downloaded += count

                val now = System.currentTimeMillis()
                val elapsed = now - lastNotifyTime

                if (elapsed >= 500 || downloaded == totalSize) {
                    val bytesPerSecond = if (elapsed > 0) {
                        ((downloaded - lastDownloaded) * 1000) / elapsed
                    } else 0

                    val notification = buildProgressNotification(name, downloaded, totalSize, bytesPerSecond)
                    val manager = getSystemService(NotificationManager::class.java)
                    manager.notify(NOTIFICATION_ID, notification)

                    val progressIntent = Intent("com.ghostsystems.talosllmstudio.DOWNLOAD_PROGRESS").apply {
                        putExtra("progress", if (totalSize > 0) ((downloaded * 100) / totalSize).toInt() else 0)
                        putExtra("downloaded", downloaded)
                        putExtra("total", totalSize)
                        putExtra("bytesPerSecond", bytesPerSecond)
                    }
                    sendBroadcast(progressIntent)

                    lastNotifyTime = now
                    lastDownloaded = downloaded
                }
            }

            outputStream.flush()
            outputStream.close()
            inputStream.close()
            outputStream = null
            inputStream = null

            val tmpFile = File(tmpPath)
            val finalFile = File(path)
            if (tmpFile.exists() && tmpFile.length() > 1024) {
                tmpFile.renameTo(finalFile)
            } else {
                tmpFile.delete()
                throw Exception("Downloaded file too small")
            }

            val doneIntent = Intent("com.ghostsystems.talosllmstudio.DOWNLOAD_COMPLETE")
            sendBroadcast(doneIntent)

            val doneNotification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Download Concluído")
                .setContentText("$name descarregado com sucesso")
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setAutoCancel(true)
                .setOngoing(false)
                .build()
            val manager = getSystemService(NotificationManager::class.java)
            manager.notify(NOTIFICATION_ID, doneNotification)

        } catch (e: Exception) {
            try { File("$path.downloading.tmp").delete() } catch (_: Exception) {}

            val errorIntent = Intent("com.ghostsystems.talosllmstudio.DOWNLOAD_ERROR").apply {
                putExtra("error", e.message)
            }
            sendBroadcast(errorIntent)

            val errorNotification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Download Falhou")
                .setContentText(e.message ?: "Erro desconhecido")
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setAutoCancel(true)
                .setOngoing(false)
                .build()
            val manager = getSystemService(NotificationManager::class.java)
            manager.notify(NOTIFICATION_ID, errorNotification)
        } finally {
            try { outputStream?.close() } catch (_: Exception) {}
            try { inputStream?.close() } catch (_: Exception) {}
            connection?.disconnect()
            wakeLock?.let { if (it.isHeld) it.release() }
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun startDownload(url: String, path: String, name: String) {
        cancelDownload()
        isCancelled = false
        startTime = System.currentTimeMillis()

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LLMStudio::DownloadLock")
        wakeLock?.acquire(60 * 60 * 1000L)

        startForeground(NOTIFICATION_ID, buildProgressNotification(name, 0, 0, 0))

        downloadThread = Thread({ doDownload(url, path, name) }, "DownloadThread").apply {
            isDaemon = true
            start()
        }
    }

    private fun cancelDownload() {
        isCancelled = true
        downloadThread?.interrupt()
        downloadThread = null
        wakeLock?.let { if (it.isHeld) it.release() }
    }

    override fun onDestroy() {
        cancelDownload()
        super.onDestroy()
    }
}
