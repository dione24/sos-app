package expo.modules.bleadvertiser

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper

class BleRelayForegroundService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.bleadvertiser.START"
    const val ACTION_STOP = "expo.modules.bleadvertiser.STOP"
    const val EXTRA_SESSION_ID = "sos_ble_session"
    private const val CHANNEL_ID = "sos_mali_ble_relay"
    private const val NOTIFICATION_ID = 122
    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile private var activeService: BleRelayForegroundService? = null

    /** An old failure/timeout must never stop a newer foreground session. */
    fun requestStop(generation: Long) {
      mainHandler.post { activeService?.stopSession(generation) }
    }
  }

  private val session = ForegroundSessionState()

  override fun onCreate() {
    super.onCreate()
    activeService = this
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Relais SOS Bluetooth", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Indique clairement lorsqu'une alerte SOS est diffusée aux téléphones proches."
        setShowBadge(false)
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val generation = intent?.getLongExtra(EXTRA_SESSION_ID, 0L) ?: 0L
    if (intent?.action == ACTION_STOP) {
      ExpoBleAdvertiserModule.stopFromForegroundService(generation)
      stopSession(generation)
      return START_NOT_STICKY
    }
    if (!ExpoBleAdvertiserModule.isSessionActive(generation)) {
      // The BLE request may have been cancelled before Android delivered START.
      session.rejectStart(startId, ExpoBleAdvertiserModule::isSessionActive)?.let { stopId ->
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelfResult(stopId)
      }
      return START_NOT_STICKY
    }
    session.started(generation, startId)
    try {
      startForeground(NOTIFICATION_ID, buildNotification())
      ExpoBleAdvertiserModule.foregroundServiceStarted(generation)
    } catch (_: Exception) {
      ExpoBleAdvertiserModule.stopFromForegroundService(generation, failed = true)
      stopSession(generation)
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    ExpoBleAdvertiserModule.stopFromForegroundService(session.generation)
    if (activeService === this) activeService = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun stopSession(generation: Long) {
    val stopId = session.stop(generation) ?: return
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelfResult(stopId)
  }

  private fun buildNotification(): Notification {
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val stopIntent = Intent(this, BleRelayForegroundService::class.java).setAction(ACTION_STOP)
      .putExtra(EXTRA_SESSION_ID, session.generation)
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
      .setContentText("Nafalan · relais Bluetooth actif · arrêt sous 30 min")
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .addAction(Notification.Action.Builder(null, "Arrêter l'alerte", stopPendingIntent).build())
      .build()
  }
}
