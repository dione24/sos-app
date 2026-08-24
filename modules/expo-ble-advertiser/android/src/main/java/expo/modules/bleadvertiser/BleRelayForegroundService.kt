package expo.modules.bleadvertiser

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder

class BleRelayForegroundService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.bleadvertiser.START"
    const val ACTION_STOP = "expo.modules.bleadvertiser.STOP"
    private const val CHANNEL_ID = "sos_mali_ble_relay"
    private const val NOTIFICATION_ID = 122
  }

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Relais SOS Bluetooth", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Indique clairement lorsqu'une alerte SOS est diffusée aux téléphones proches."
        setShowBadge(false)
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      ExpoBleAdvertiserModule.stopFromForegroundService()
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    startForeground(NOTIFICATION_ID, buildNotification())
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    ExpoBleAdvertiserModule.stopFromForegroundService()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun buildNotification(): Notification {
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val stopIntent = Intent(this, BleRelayForegroundService::class.java).setAction(ACTION_STOP)
    val stopPendingIntent = PendingIntent.getService(
      this,
      1,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION") Notification.Builder(this)
    }
    return builder
      .setSmallIcon(android.R.drawable.stat_sys_warning)
      .setContentTitle("Alerte SOS diffusée")
      .setContentText("Relais Bluetooth actif · arrêt automatique sous 30 min")
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .addAction(Notification.Action.Builder(null, "Arrêter l'alerte", stopPendingIntent).build())
      .build()
  }
}
