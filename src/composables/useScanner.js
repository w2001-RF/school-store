import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * useScanner - logique de scan de code-barres / QR code.
 *
 * Responsabilités :
 *   - Gestion du cycle de vie du scanner (start/stop/cleanup)
 *   - Anti-doublon (cooldown entre scans)
 *   - Saisie manuelle de secours si pas de caméra
 *   - Gestion robuste des erreurs
 *
 * Utilisation :
 *   const { scanning, error, start, stop, submitManual } = useScanner({
 *     onScan: (code) => invoices.addProductByBarcode(code)
 *   })
 *   onMounted(() => start())
 *   onBeforeUnmount(() => stop())
 */
export function useScanner(options = {}) {
  const {
    onScan = () => {},
    onError = () => {},
    cooldown = 1500,        // ms entre deux scans acceptés
    fps = 10,
    qrboxSize = 250,
    cameraFacing = 'environment' // 'environment' = caméra arrière sur mobile
  } = options

  // shallowRef : l'instance Html5Qrcode ne doit pas être réactive en profondeur
  const scanner = shallowRef(null)

  // État réactif exposé
  const scanning = ref(false)
  const error = ref('')
  const lastScanned = ref('')
  const lastScanAt = ref(0)
  const manualMode = ref(false)
  const manualCode = ref('')

  // ID unique pour le container DOM (le scanner s'attache à un <div id="...">)
  const elementId = `scanner-${Math.random().toString(36).slice(2, 9)}`

  /**
   * Démarre la caméra et le scan.
   * Tolère l'absence de caméra en basculant en mode saisie manuelle.
   */
  async function start() {
    if (scanning.value) return
    error.value = ''

    try {
      // Vérification préalable : l'API est dispo ?
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('API caméra non disponible dans ce navigateur')
      }

      const instance = new Html5Qrcode(elementId)
      await instance.start(
        { facingMode: cameraFacing },
        { fps, qrbox: { width: qrboxSize, height: qrboxSize } },
        handleDecoded,
        () => { /* erreurs de frame ignorées (normales) */ }
      )
      scanner.value = instance
      scanning.value = true
    } catch (e) {
      const message = e?.message || String(e)
      error.value = `Caméra indisponible : ${message}. Utilisez la saisie manuelle.`
      manualMode.value = true
      onError(e)
    }
  }

  /**
   * Callback interne : appelé à chaque code détecté.
   * Applique un cooldown pour éviter les scans en double.
   */
  function handleDecoded(decodedText) {
    const now = Date.now()
    if (now - lastScanAt.value < cooldown) return
    if (decodedText === lastScanned.value) return

    lastScanned.value = decodedText
    lastScanAt.value = now
    onScan(decodedText)

    // Auto-reset après le cooldown (pour les feedbacks visuels)
    setTimeout(() => {
      if (Date.now() - lastScanAt.value >= cooldown) {
        lastScanned.value = ''
      }
    }, cooldown)
  }

  /**
   * Valide un code saisi manuellement.
   */
  function submitManual() {
    const code = manualCode.value.trim()
    if (!code) return
    handleDecoded(code)
    manualCode.value = ''
  }

  /**
   * Bascule entre caméra et saisie manuelle.
   */
  async function toggleManualMode() {
    if (manualMode.value && scanning.value) {
      await stop()
      manualMode.value = true
    } else if (manualMode.value) {
      manualMode.value = false
      await start()
    } else {
      await stop()
      manualMode.value = true
    }
  }

  /**
   * Stoppe proprement le scanner et libère la caméra.
   */
  async function stop() {
    if (!scanner.value) {
      scanning.value = false
      return
    }
    try {
      await scanner.value.stop()
      await scanner.value.clear()
    } catch (e) {
      // Erreur fréquente si déjà stoppé : on ignore
    } finally {
      scanner.value = null
      scanning.value = false
    }
  }

  /**
   * Bip / feedback haptique (utile sur mobile).
   */
  function vibrate(pattern = [80]) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch {}
    }
  }

  // Sécurité : si le composable est démonté alors que le scanner tourne
  onBeforeUnmount(() => { stop() })

  return {
    // État
    scanning,
    error,
    lastScanned,
    manualMode,
    manualCode,
    elementId,

    // Actions
    start,
    stop,
    submitManual,
    toggleManualMode,
    vibrate
  }
}
