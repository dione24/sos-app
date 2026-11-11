package expo.modules.bleadvertiser

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.AdvertisingSet
import android.bluetooth.le.AdvertisingSetCallback
import android.bluetooth.le.AdvertisingSetParameters
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.ParcelUuid
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.UUID

private val SERVICE_UUID: UUID = UUID.fromString("91f3b100-7b45-4ca9-9a62-3bd0b1f6a223")
private val PACKET_CHARACTERISTIC_UUID: UUID = UUID.fromString("91f3b101-7b45-4ca9-9a62-3bd0b1f6a223")
private const val MAX_PACKET_BYTES = 480
private const val SIGNING_KEY_ALIAS = "sos_mali_mesh_origin_signing_v1"
private const val ADVERTISING_MAX_DURATION_MS = 30 * 60 * 1000L

class BleAdvertiserException(code: String, message: String) : CodedException(code, message, null)

class ExpoBleAdvertiserModule : Module() {
  companion object {
    @Volatile private var activeInstance: ExpoBleAdvertiserModule? = null

    fun isSessionActive(generation: Long): Boolean = activeInstance?.let {
      it.advertising && it.sessions.isCurrent(generation)
    } == true

    fun foregroundServiceStarted(generation: Long) {
      activeInstance?.let { module -> module.worker.post { module.completeStart(generation) } }
    }

    fun stopFromForegroundService(generation: Long, failed: Boolean = false) {
      activeInstance?.let { module ->
        module.worker.post {
          module.endSession(generation, BleAdvertiserException(
            "ERR_FOREGROUND_STOPPED", "La diffusion Bluetooth a été interrompue."
          ), if (failed) "error" else "stopped", "Diffusion arrêtée depuis le service Android")
        }
      }
    }
  }

  private val sessions = AdvertisingSessionState<Promise>()
  // Bluetooth Binder calls and callbacks never wait on the Android UI thread.
  private val workerThread = HandlerThread("sos.ble.advertiser").apply { start() }
  private val worker = Handler(workerThread.looper)
  @Volatile private var destroyed = false
  @Volatile private var packetBytes = ByteArray(0)
  @Volatile private var advertising = false
  private var gattServer: BluetoothGattServer? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiseCallback: AdvertiseCallback? = null
  private var advertisingSetCallback: AdvertisingSetCallback? = null
  private var expiryRunnable: Runnable? = null
  private var startTimeoutRunnable: Runnable? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoBleAdvertiser")
    Events("onAdvertisingStateChanged")

    AsyncFunction("isSupportedAsync") {
      val adapter = bluetoothAdapter(requireContext())
      mapOf("supported" to (adapter?.isMultipleAdvertisementSupported == true && adapter.bluetoothLeAdvertiser != null),
        "enabled" to (adapter?.isEnabled == true), "advertising" to advertising)
    }

    AsyncFunction("startAdvertisingAsync") { payload: String, requestId: String, promise: Promise ->
      enqueue(promise) { startAdvertising(payload, requestId, promise) }
    }

    AsyncFunction("stopAdvertisingAsync") { requestId: String?, promise: Promise ->
      enqueue(promise) {
        sessions.generationFor(requestId)?.let { generation ->
          endSession(generation, BleAdvertiserException("ERR_ADVERTISE_CANCELLED", "Le partage Bluetooth a été annulé."), "stopped", null)
        }
        promise.resolve(mapOf("stopped" to true))
      }
    }

    AsyncFunction("getStatusAsync") { mapOf("advertising" to advertising, "bytes" to packetBytes.size) }

    AsyncFunction("signPayloadAsync") { payload: String ->
      val entry = getOrCreateSigningEntry()
      val signer = Signature.getInstance("SHA256withECDSA")
      signer.initSign(entry.privateKey)
      signer.update(payload.toByteArray(Charsets.UTF_8))
      mapOf("publicKey" to Base64.encodeToString(entry.certificate.publicKey.encoded, Base64.NO_WRAP),
        "signature" to Base64.encodeToString(signer.sign(), Base64.NO_WRAP))
    }

    AsyncFunction("verifyPayloadAsync") { payload: String, publicKey: String, signature: String ->
      try {
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(Base64.decode(publicKey, Base64.NO_WRAP)))
        val verifier = Signature.getInstance("SHA256withECDSA")
        verifier.initVerify(key)
        verifier.update(payload.toByteArray(Charsets.UTF_8))
        verifier.verify(Base64.decode(signature, Base64.NO_WRAP))
      } catch (_: Exception) { false }
    }

    OnDestroy {
      destroyed = true
      // Settle while Expo still owns its JS runtime; Binder cleanup can follow off UI.
      sessions.generationFor()?.let { generation ->
        val ended = sessions.end(generation)
        try {
          ended?.pending?.reject(BleAdvertiserException("ERR_MODULE_DESTROYED", "La diffusion Bluetooth a été interrompue."))
        } catch (_: Exception) { }
        BleRelayForegroundService.requestStop(generation)
      }
      if (activeInstance === this@ExpoBleAdvertiserModule) activeInstance = null
      advertising = false
      packetBytes = ByteArray(0)
      worker.post {
        releaseResources()
        workerThread.quitSafely()
      }
    }
  }

  private fun enqueue(promise: Promise, action: () -> Unit) {
    if (destroyed || !worker.post {
      try { action() } catch (error: Exception) {
        promise.reject(BleAdvertiserException("ERR_BLUETOOTH", error.message ?: "Bluetooth indisponible."))
      }
    }) promise.reject(BleAdvertiserException("ERR_MODULE_DESTROYED", "Module Bluetooth indisponible."))
  }

  private fun startAdvertising(payload: String, requestId: String, promise: Promise) {
    if (sessions.isStarting()) throw BleAdvertiserException("ERR_ADVERTISE_STARTING", "Une diffusion Bluetooth est déjà en cours de démarrage.")
    val context = requireContext()
    assertPermissions(context)
    val bytes = payload.toByteArray(Charsets.UTF_8)
    if (bytes.isEmpty() || bytes.size > MAX_PACKET_BYTES) throw BleAdvertiserException("ERR_PACKET_SIZE", "Le paquet SOS doit contenir entre 1 et $MAX_PACKET_BYTES octets.")
    sessions.generationFor()?.let { endSession(it, BleAdvertiserException("ERR_ADVERTISE_REPLACED", "Alerte remplacée."), "stopped", null) }
    val generation = sessions.begin(requestId, promise)
    packetBytes = bytes
    try {
      val adapter = bluetoothAdapter(context) ?: throw BleAdvertiserException("ERR_BLUETOOTH_UNAVAILABLE", "Bluetooth indisponible.")
      if (!adapter.isEnabled) throw BleAdvertiserException("ERR_BLUETOOTH_DISABLED", "Le Bluetooth est désactivé.")
      if (!adapter.isMultipleAdvertisementSupported) throw BleAdvertiserException("ERR_ADVERTISE_UNSUPPORTED", "Diffusion BLE non prise en charge.")
      val timeout = Runnable {
        endSession(generation, BleAdvertiserException("ERR_ADVERTISE_TIMEOUT", "Le démarrage Bluetooth a expiré."), "error", "Délai de démarrage Bluetooth dépassé")
      }
      startTimeoutRunnable = timeout
      worker.postDelayed(timeout, 10_000L)
      val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
      val server = manager.openGattServer(context, gattCallback(generation))
        ?: throw BleAdvertiserException("ERR_GATT_SERVER", "Impossible d'ouvrir le serveur GATT.")
      gattServer = server
      if (destroyed || !sessions.isCurrent(generation)) throw BleAdvertiserException("ERR_MODULE_DESTROYED", "Diffusion interrompue.")
      val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
      service.addCharacteristic(BluetoothGattCharacteristic(PACKET_CHARACTERISTIC_UUID,
        BluetoothGattCharacteristic.PROPERTY_READ, BluetoothGattCharacteristic.PERMISSION_READ))
      if (!server.addService(service)) throw BleAdvertiserException("ERR_GATT_SERVICE", "Impossible de publier le service SOS.")
      if (destroyed || !sessions.isCurrent(generation)) throw BleAdvertiserException("ERR_MODULE_DESTROYED", "Diffusion interrompue.")
      val radio = adapter.bluetoothLeAdvertiser ?: throw BleAdvertiserException("ERR_ADVERTISE_UNAVAILABLE", "Annonceur BLE indisponible.")
      advertiser = radio
      val data = AdvertiseData.Builder().setIncludeDeviceName(false).setIncludeTxPowerLevel(false)
        .addServiceUuid(ParcelUuid(SERVICE_UUID)).build()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val callback = object : AdvertisingSetCallback() {
          override fun onAdvertisingSetStarted(set: AdvertisingSet?, txPower: Int, status: Int) {
            worker.post {
              if (!sessions.isCurrent(generation)) {
                try { radio.stopAdvertisingSet(this) } catch (_: Exception) { }
              } else if (status == 0 && set != null) onAdvertiseStarted(generation, context)
              else advertiseFailed(generation, status)
            }
          }
        }
        advertisingSetCallback = callback
        val parameters = AdvertisingSetParameters.Builder().setLegacyMode(true).setConnectable(true).setScannable(true)
          .setInterval(AdvertisingSetParameters.INTERVAL_HIGH).setTxPowerLevel(AdvertisingSetParameters.TX_POWER_HIGH).build()
        radio.startAdvertisingSet(parameters, data, null, null, null, 0, 0, callback)
      } else {
        val callback = object : AdvertiseCallback() {
          override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            worker.post {
              if (sessions.isCurrent(generation)) onAdvertiseStarted(generation, context)
              else try { radio.stopAdvertising(this) } catch (_: Exception) { }
            }
          }
          override fun onStartFailure(errorCode: Int) { worker.post { advertiseFailed(generation, errorCode) } }
        }
        advertiseCallback = callback
        val settings = AdvertiseSettings.Builder().setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
          .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH).setConnectable(true).setTimeout(0).build()
        radio.startAdvertising(settings, data, callback)
      }
    } catch (error: Exception) {
      endSession(generation, if (error is BleAdvertiserException) error else BleAdvertiserException("ERR_ADVERTISE_FAILED", error.message ?: "Diffusion BLE impossible."), "error", "Diffusion Bluetooth interrompue")
    }
  }

  private fun gattCallback(generation: Long) = object : BluetoothGattServerCallback() {
    override fun onCharacteristicReadRequest(device: android.bluetooth.BluetoothDevice, requestId: Int, offset: Int, characteristic: BluetoothGattCharacteristic) {
      worker.post {
        if (!sessions.isCurrent(generation)) return@post
        val server = gattServer ?: return@post
        val packet = packetBytes
        try {
          if (characteristic.uuid != PACKET_CHARACTERISTIC_UUID || offset < 0 || offset > packet.size) {
            server.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null)
          } else server.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, packet.copyOfRange(offset, packet.size))
        } catch (_: SecurityException) {
          endSession(generation, BleAdvertiserException("ERR_BLUETOOTH_PERMISSION", "Permission Bluetooth révoquée."), "error", "Permission Bluetooth révoquée")
        }
      }
    }
  }

  private fun onAdvertiseStarted(generation: Long, context: Context) {
    if (!sessions.isCurrent(generation) || advertising || destroyed) return
    advertising = true
    activeInstance = this
    try {
      ContextCompat.startForegroundService(context, Intent(context, BleRelayForegroundService::class.java)
        .setAction(BleRelayForegroundService.ACTION_START).putExtra(BleRelayForegroundService.EXTRA_SESSION_ID, generation))
    } catch (_: Exception) {
      endSession(generation, BleAdvertiserException("ERR_FOREGROUND_START", "Android ne peut pas maintenir cette diffusion."), "error", "Service de diffusion indisponible")
    }
  }

  private fun completeStart(generation: Long) {
    if (destroyed || !sessions.isCurrent(generation) || !advertising) return
    val promise = sessions.complete(generation) ?: return
    startTimeoutRunnable?.let(worker::removeCallbacks)
    startTimeoutRunnable = null
    val expiry = Runnable {
      endSession(generation, BleAdvertiserException("ERR_ADVERTISE_EXPIRED", "Alerte expirée."), "expired", "Diffusion arrêtée automatiquement après 30 minutes")
    }
    expiryRunnable = expiry
    worker.postDelayed(expiry, ADVERTISING_MAX_DURATION_MS)
    promise.resolve(mapOf("started" to true, "bytes" to packetBytes.size))
    sendState("active", null)
  }

  private fun advertiseFailed(generation: Long, errorCode: Int) {
    endSession(generation, BleAdvertiserException("ERR_ADVERTISE_FAILED", "Échec de diffusion BLE ($errorCode)"), "error", "Échec de diffusion BLE ($errorCode)")
  }

  private fun endSession(generation: Long, error: BleAdvertiserException, state: String, message: String?) {
    val ended = sessions.end(generation) ?: return
    // Settle before releasing Binder resources. A missing callback cannot retain the promise.
    advertising = false
    packetBytes = ByteArray(0)
    if (activeInstance === this) activeInstance = null
    BleRelayForegroundService.requestStop(generation)
    try { ended.pending?.reject(error) } finally { releaseResources() }
    sendState(state, message)
  }

  private fun releaseResources() {
    startTimeoutRunnable?.let(worker::removeCallbacks)
    expiryRunnable?.let(worker::removeCallbacks)
    startTimeoutRunnable = null
    expiryRunnable = null
    try { advertiseCallback?.let { advertiser?.stopAdvertising(it) } } catch (_: Exception) { }
    try { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) advertisingSetCallback?.let { advertiser?.stopAdvertisingSet(it) } } catch (_: Exception) { }
    try { gattServer?.close() } catch (_: Exception) { }
    advertiseCallback = null
    advertisingSetCallback = null
    advertiser = null
    gattServer = null
  }

  private fun requireContext(): Context = appContext.reactContext ?: throw BleAdvertiserException("ERR_NO_CONTEXT", "Contexte Android indisponible.")
  private fun bluetoothAdapter(context: Context): BluetoothAdapter? = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
  private fun assertPermissions(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED)) {
      throw BleAdvertiserException("ERR_BLUETOOTH_PERMISSION", "Permissions Bluetooth connexion et diffusion requises.")
    }
  }
  private fun sendState(state: String, message: String?) {
    if (destroyed) return
    val body = mutableMapOf<String, Any>("state" to state, "advertising" to advertising)
    if (message != null) body["message"] = message
    sendEvent("onAdvertisingStateChanged", body)
  }

  private fun getOrCreateSigningEntry(): KeyStore.PrivateKeyEntry {
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    if (!keyStore.containsAlias(SIGNING_KEY_ALIAS)) {
      val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
      val specification = KeyGenParameterSpec.Builder(SIGNING_KEY_ALIAS, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
        .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1")).setDigests(KeyProperties.DIGEST_SHA256).setUserAuthenticationRequired(false).build()
      generator.initialize(specification)
      generator.generateKeyPair()
    }
    return keyStore.getEntry(SIGNING_KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
      ?: throw BleAdvertiserException("ERR_SIGNING_KEY", "Clé de signature locale indisponible.")
  }
}
