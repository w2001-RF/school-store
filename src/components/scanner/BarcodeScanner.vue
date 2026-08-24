<template>
  <div class="scanner-wrapper">
    <div v-if="!scanning && !errorMsg" class="scanner-placeholder">
      <div class="scanner-icon">📷</div>
      <p>{{ $t('scanner.activate') }}</p>
      <button class="btn-primary" @click="start">{{ $t('scanner.start') }}</button>
    </div>
    <div v-else-if="errorMsg" class="scanner-error">
      <p>⚠️ {{ errorMsg }}</p>
      <button class="btn-secondary" @click="start">{{ $t('scanner.retry') }}</button>
    </div>
    <div v-if="scanning || starting" class="scanner-active">
      <div class="scanner-video-container">
        <div :id="elementId" class="scanner-video"></div>
        <div class="scanner-overlay">
          <div class="scan-line"></div>
          <div class="scan-corners"></div>
        </div>
      </div>
      <div class="scanner-actions">
        <button class="btn-secondary" @click="stop">{{ $t('scanner.stop') }}</button>
        <button class="btn-primary" @click="manualEntry = !manualEntry">{{ $t('scanner.manual') }}</button>
      </div>
      <div v-if="manualEntry" class="manual-entry">
        <input v-model="manualCode" :placeholder="$t('scanner.code')" @keyup.enter="submitManual" />
        <button class="btn-primary" @click="submitManual">{{ $t('scanner.validate') }}</button>
      </div>
    </div>
    <div v-if="lastScanned" class="last-scanned">
      ✅ {{ $t('scanner.last') }} : <strong>{{ lastScanned }}</strong>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, nextTick } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

const emit = defineEmits(['scan'])
const elementId = `scanner-${Date.now()}`
const scanning = ref(false)
const starting = ref(false)
const errorMsg = ref('')
const manualCode = ref('')
const manualEntry = ref(false)
const lastScanned = ref('')
let scanner = null
let scanLocked = false

onBeforeUnmount(() => stop())

async function start() {
  errorMsg.value = ''
  if (scanner) await stop()
  scanLocked = false
  starting.value = true
  try {
    if (!window.isSecureContext) {
      throw new Error('la caméra nécessite une connexion HTTPS sur le téléphone')
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('la caméra n’est pas disponible dans ce navigateur')
    }
    await nextTick()
    scanner = new Html5Qrcode(elementId)
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (scanLocked) return
        scanLocked = true
        lastScanned.value = decodedText
        emit('scan', decodedText)
        await stop()
        // bip visuel : brève pause pour éviter double scan
        setTimeout(() => { lastScanned.value = '' }, 1500)
      },
      () => {} // ignore erreurs de frame
    )
    scanning.value = true
    starting.value = false
  } catch (e) {
    const message = e?.message || (typeof e === 'string' ? e : 'permission refusée ou caméra indisponible')
    if (scanner && !scanning.value) {
      try { await scanner.clear() } catch {}
      scanner = null
    }
    errorMsg.value = `Impossible d'accéder à la caméra : ${message}. Utilisez la saisie manuelle.`
    manualEntry.value = true
    scanning.value = false
    starting.value = false
  }
}

async function stop() {
  if (scanner) {
    try { await scanner.stop(); await scanner.clear() } catch {}
    scanner = null
  }
  scanning.value = false
  starting.value = false
}

function submitManual() {
  if (manualCode.value.trim()) {
    lastScanned.value = manualCode.value.trim()
    emit('scan', manualCode.value.trim())
    manualCode.value = ''
  }
}
</script>

<style scoped>
.scanner-wrapper {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.scanner-placeholder {
  text-align: center;
  padding: 30px 10px;
}

.scanner-icon {
  font-size: 4rem;
  margin-bottom: 12px;
}

.scanner-error {
  text-align: center;
  padding: 20px;
  color: #dc2626;
}

.scanner-active {
  position: relative;
  width: 100%;
}

.scanner-video-container {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.scanner-video {
  width: 100%;
  max-width: 500px;
  aspect-ratio: 4 / 3;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  background: #111827;
}

.scanner-video :deep(video) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  object-fit: scale-down;
}

.scanner-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(70vw, 250px);
  aspect-ratio: 1;
  pointer-events: none;
}

.scan-corners {
  position: absolute;
  inset: 0;
  border: 3px solid #10b981;
  border-radius: 8px;
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #10b981;
  animation: scan 2s linear infinite;
  box-shadow: 0 0 8px #10b981;
}

@keyframes scan {

  0%,
  100% {
    top: 0
  }

  50% {
    top: 100%
  }
}

.scanner-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 12px;
  flex-wrap: wrap;
}

.manual-entry {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.manual-entry input {
  flex: 1;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.last-scanned {
  margin-top: 12px;
  padding: 10px;
  background: #d1fae5;
  border-radius: 6px;
  text-align: center;
}

.btn-primary,
.btn-secondary {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

@media (max-width: 640px) {
  .scanner-wrapper {
    padding: 12px;
  }

  .scanner-video {
    max-width: none;
    aspect-ratio: 3 / 4;
  }

  .scanner-overlay {
    width: min(68vw, 240px);
  }

  .scanner-actions button {
    flex: 1;
    min-width: 120px;
  }

  .manual-entry {
    flex-direction: column;
  }

  .manual-entry button {
    width: 100%;
  }

  .scanner-video :deep(#qr-shaded-region) {
    border-width: 3px !important;
    border-color: #10b981 !important;
    border-radius: 8px !important;
  }

  .scanner-video :deep(#qr-shaded-region) > div {
    box-shadow: none !important;
    border-color: transparent !important;
  }
}
</style>
