export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'School Store Manager',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  currency: import.meta.env.VITE_APP_CURRENCY || 'EUR',
  scannerCooldown: Number(import.meta.env.VITE_SCANNER_COOLDOWN) || 1500,
  lowStockThreshold: Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD) || 10
}
