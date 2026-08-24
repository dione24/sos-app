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
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.os.Handler
import android.os.Looper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec

private val SERVICE_UUID: UUID = UUID.fromString("91f3b100-7b45-4ca9-9a62-3bd0b1f6a223")
private val PACKET_CHARACTERISTIC_UUID: UUID = UUID.fromString("91f3b101-7b45-4ca9-9a62-3bd0b1f6a223")
private const val MAX_PACKET_BYTES = 480
private const val SIGNING_KEY_ALIAS = "sos_mali_mesh_origin_signing_v1"
private const val ADVERTISING_MAX_DURATION_MS = 30 * 60 * 1000L

class BleAdvertiserException(code: String, message: String) : CodedException(code, message, null)

class ExpoBleAdvertiserModule : Module() {
  companion object {
    @Volatile private var activeInstance: ExpoBleAdvertiserModule? = null

    fun stopFromForegroundService() {
      activeInstance?.stopFromService()
    }
  }

  private var gattServer: BluetoothGattServer? = null
  private var advertiseCallback: AdvertiseCallback? = null
  private var advertisingSet: AdvertisingSet? = null
  private var advertisingSetCallback: AdvertisingSetCallback? = null
  @Volatile private var packetBytes = ByteArray(0)
  @Volatile private var advertising = false
  private val timeoutHandler = Handler(Looper.getMainLooper())
  private var expiryRunnable: Runnable? = null
  private var startTimeoutRunnable: Runnable? = null
  private var pendingStartPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoBleAdvertiser")

    Events("onAdvertisingStateChanged")

    AsyncFunction("isSupportedAsync") {
      val context = requireContext()
      val adapter = bluetoothAdapter(context)
      mapOf(
        "supported" to (adapter?.isMultipleAdvertisementSupported == true && adapter.bluetoothLeAdvertiser != null),
        "enabled" to (adapter?.isEnabled == true),
        "advertising" to advertising
      )
    }

    AsyncFunction("startAdvertisingAsync") { payload: String, promise: Promise ->
      val context = requireContext()
      assertPermissions(context)
      if (pendingStartPromise != null) {
        throw BleAdvertiserException("ERR_ADVERTISE_STARTING", "Une diffusion Bluetooth est déjà en cours de démarrage.")
      }
      val bytes = payload.toByteArray(Charsets.UTF_8)
      if (bytes.isEmpty()) {
        throw BleAdvertiserException("ERR_EMPTY_PACKET", "Le paquet SOS est vide.")
      }
      if (bytes.size > MAX_PACKET_BYTES) {
        throw BleAdvertiserException(
          "ERR_PACKET_TOO_LARGE",
          "Le paquet SOS dépasse $MAX_PACKET_BYTES octets (${bytes.size})."
        )
      }

      stopInternal()
      packetBytes = bytes

      val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        ?: throw BleAdvertiserException("ERR_BLUETOOTH_UNAVAILABLE", "Gestionnaire Bluetooth indisponible.")
      val adapter = manager.adapter
        ?: throw BleAdvertiserException("ERR_BLUETOOTH_UNAVAILABLE", "Bluetooth indisponible.")
      if (!adapter.isEnabled) {
        throw BleAdvertiserException("ERR_BLUETOOTH_DISABLED", "Le Bluetooth est désactivé.")
      }
      if (!adapter.isMultipleAdvertisementSupported) {
        throw BleAdvertiserException("ERR_ADVERTISE_UNSUPPORTED", "Ce téléphone ne prend pas en charge la diffusion BLE.")
      }

      val server = manager.openGattServer(context, gattCallback)
        ?: throw BleAdvertiserException("ERR_GATT_SERVER", "Impossible d'ouvrir le serveur GATT.")
      val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
      val characteristic = BluetoothGattCharacteristic(
        PACKET_CHARACTERISTIC_UUID,
        BluetoothGattCharacteristic.PROPERTY_READ,
        BluetoothGattCharacteristic.PERMISSION_READ
      )
      service.addCharacteristic(characteristic)
      if (!server.addService(service)) {
        server.close()
        throw BleAdvertiserException("ERR_GATT_SERVICE", "Impossible de publier le service SOS.")
      }
      gattServer = server

      val advertiser = adapter.bluetoothLeAdvertiser
        ?: run {
          stopInternal()
          throw BleAdvertiserException("ERR_ADVERTISE_UNAVAILABLE", "Annonceur BLE indisponible.")
        }
      val data = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        .addServiceUuid(ParcelUuid(SERVICE_UUID))
        .build()
      val callback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
          onAdvertiseStarted(context)
        }

        override fun onStartFailure(errorCode: Int) {
          onAdvertiseFailed(errorCode)
        }
      }
      pendingStartPromise = promise
      val startTimeout = Runnable {
        if (pendingStartPromise != null) {
          pendingStartPromise?.reject(
            BleAdvertiserException("ERR_ADVERTISE_TIMEOUT", "Le démarrage de la diffusion Bluetooth a expiré.")
          )
          pendingStartPromise = null
          stopInternal()
          sendState("error", "Délai de démarrage Bluetooth dépassé")
        }
      }
      startTimeoutRunnable = startTimeout
      timeoutHandler.postDelayed(startTimeout, 10_000L)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val setCallback = object : AdvertisingSetCallback() {
          override fun onAdvertisingSetStarted(set: AdvertisingSet?, txPower: Int, status: Int) {
            // Android reports 0 for ADVERTISE_SUCCESS on AdvertisingSetCallback.
            if (status == 0 && set != null) {
              advertisingSet = set
              onAdvertiseStarted(context)
            } else {
              onAdvertiseFailed(status)
            }
          }
        }
        val parameters = AdvertisingSetParameters.Builder()
          .setLegacyMode(true)
          .setConnectable(true)
          .setScannable(true)
          .setInterval(AdvertisingSetParameters.INTERVAL_HIGH)
          .setTxPowerLevel(AdvertisingSetParameters.TX_POWER_HIGH)
          .build()
        advertisingSetCallback = setCallback
        advertiser.startAdvertisingSet(parameters, data, null, null, null, 0, 0, setCallback)
      } else {
        val settings = AdvertiseSettings.Builder()
          .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
          .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
          .setConnectable(true)
          .setTimeout(0)
          .build()
        advertiseCallback = callback
        advertiser.startAdvertising(settings, data, callback)
      }
    }

    AsyncFunction("stopAdvertisingAsync") {
      stopInternal()
      sendState("stopped", null)
      activeInstance = null
      stopForegroundAnchor()
      mapOf("stopped" to true)
    }

    AsyncFunction("getStatusAsync") {
      mapOf("advertising" to advertising, "bytes" to packetBytes.size)
    }

    AsyncFunction("signPayloadAsync") { payload: String ->
      val entry = getOrCreateSigningEntry()
      val signer = Signature.getInstance("SHA256withECDSA")
      signer.initSign(entry.privateKey)
      signer.update(payload.toByteArray(Charsets.UTF_8))
      mapOf(
        "publicKey" to Base64.encodeToString(entry.certificate.publicKey.encoded, Base64.NO_WRAP),
        "signature" to Base64.encodeToString(signer.sign(), Base64.NO_WRAP)
      )
    }

    AsyncFunction("verifyPayloadAsync") { payload: String, publicKey: String, signature: String ->
      try {
        val keyBytes = Base64.decode(publicKey, Base64.NO_WRAP)
        val signatureBytes = Base64.decode(signature, Base64.NO_WRAP)
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(keyBytes))
        val verifier = Signature.getInstance("SHA256withECDSA")
        verifier.initVerify(key)
        verifier.update(payload.toByteArray(Charsets.UTF_8))
        verifier.verify(signatureBytes)
      } catch (_: Exception) {
        false
      }
    }

    OnDestroy {
      pendingStartPromise?.reject(
        BleAdvertiserException("ERR_MODULE_DESTROYED", "La diffusion Bluetooth a été interrompue.")
      )
      pendingStartPromise = null
      stopInternal()
      activeInstance = null
      stopForegroundAnchor()
    }
  }

  private val gattCallback = object : BluetoothGattServerCallback() {
    override fun onCharacteristicReadRequest(
      device: android.bluetooth.BluetoothDevice,
      requestId: Int,
      offset: Int,
      characteristic: BluetoothGattCharacteristic
    ) {
      val server = gattServer ?: return
      if (characteristic.uuid != PACKET_CHARACTERISTIC_UUID || offset > packetBytes.size) {
        server.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null)
        return
      }
      server.sendResponse(
        device,
        requestId,
        BluetoothGatt.GATT_SUCCESS,
        offset,
        packetBytes.copyOfRange(offset, packetBytes.size)
      )
    }
  }

  private fun requireContext(): Context = appContext.reactContext
    ?: throw BleAdvertiserException("ERR_NO_CONTEXT", "Contexte Android indisponible.")

  private fun bluetoothAdapter(context: Context): BluetoothAdapter? =
    (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  private fun assertPermissions(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val connect = ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
      val advertise = ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADVERTISE)
      if (connect != PackageManager.PERMISSION_GRANTED || advertise != PackageManager.PERMISSION_GRANTED) {
        throw BleAdvertiserException("ERR_BLUETOOTH_PERMISSION", "Permissions Bluetooth connexion et diffusion requises.")
      }
    }
  }

  private fun stopInternal() {
    clearStartTimeout()
    expiryRunnable?.let(timeoutHandler::removeCallbacks)
    expiryRunnable = null
    val context = appContext.reactContext
    val callback = advertiseCallback
    if (context != null && callback != null) {
      try {
        bluetoothAdapter(context)?.bluetoothLeAdvertiser?.stopAdvertising(callback)
      } catch (_: SecurityException) {
        // Permission may have been revoked while the app was running.
      }
    }
    advertiseCallback = null
    val setCallback = advertisingSetCallback
    if (context != null && setCallback != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        bluetoothAdapter(context)?.bluetoothLeAdvertiser?.stopAdvertisingSet(setCallback)
      } catch (_: SecurityException) {
        // Permission may have been revoked while the app was running.
      }
    }
    advertisingSetCallback = null
    advertisingSet = null
    gattServer?.close()
    gattServer = null
    advertising = false
  }

  private fun clearStartTimeout() {
    startTimeoutRunnable?.let(timeoutHandler::removeCallbacks)
    startTimeoutRunnable = null
  }

  private fun onAdvertiseStarted(context: Context) {
    advertising = true
    activeInstance = this
    clearStartTimeout()
    ContextCompat.startForegroundService(
      context,
      Intent(context, BleRelayForegroundService::class.java)
        .setAction(BleRelayForegroundService.ACTION_START)
    )
    pendingStartPromise?.resolve(mapOf("started" to true, "bytes" to packetBytes.size))
    pendingStartPromise = null
    sendState("active", null)
    val expiry = Runnable {
      stopInternal()
      sendState("expired", "Diffusion arrêtée automatiquement après 30 minutes")
      activeInstance = null
      stopForegroundAnchor()
    }
    expiryRunnable = expiry
    timeoutHandler.postDelayed(expiry, ADVERTISING_MAX_DURATION_MS)
  }

  private fun onAdvertiseFailed(errorCode: Int) {
    advertising = false
    clearStartTimeout()
    pendingStartPromise?.reject(
      BleAdvertiserException("ERR_ADVERTISE_FAILED", "Échec de diffusion BLE ($errorCode)")
    )
    pendingStartPromise = null
    sendState("error", "Échec de diffusion BLE ($errorCode)")
    gattServer?.close()
    gattServer = null
  }

  private fun stopFromService() {
    stopInternal()
    sendState("stopped", "Diffusion arrêtée depuis la notification")
    activeInstance = null
  }

  private fun stopForegroundAnchor() {
    appContext.reactContext?.stopService(
      Intent(appContext.reactContext, BleRelayForegroundService::class.java)
    )
  }

  private fun sendState(state: String, message: String?) {
    val body = mutableMapOf<String, Any>("state" to state, "advertising" to advertising)
    if (message != null) body["message"] = message
    sendEvent("onAdvertisingStateChanged", body)
  }

  private fun getOrCreateSigningEntry(): KeyStore.PrivateKeyEntry {
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    if (!keyStore.containsAlias(SIGNING_KEY_ALIAS)) {
      val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
      val specification = KeyGenParameterSpec.Builder(
        SIGNING_KEY_ALIAS,
        KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
      )
        .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
        .setDigests(KeyProperties.DIGEST_SHA256)
        .setUserAuthenticationRequired(false)
        .build()
      generator.initialize(specification)
      generator.generateKeyPair()
    }
    return keyStore.getEntry(SIGNING_KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
      ?: throw BleAdvertiserException("ERR_SIGNING_KEY", "Clé de signature locale indisponible.")
  }
}
