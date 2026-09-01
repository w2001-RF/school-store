import { computed, ref } from 'vue'

const storageKey = 'school-store-theme'
const preference = ref(localStorage.getItem(storageKey) || 'system')
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(mediaQuery.matches)

mediaQuery.addEventListener('change', event => {
  systemDark.value = event.matches
  if (preference.value === 'system') applyTheme()
})

const isDark = computed(() => preference.value === 'dark' || (preference.value === 'system' && systemDark.value))

function applyTheme() {
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
  document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
}

function setTheme(nextTheme) {
  if (!['light', 'dark', 'system'].includes(nextTheme)) return
  preference.value = nextTheme
  localStorage.setItem(storageKey, nextTheme)
  applyTheme()
}

applyTheme()

export function useTheme() {
  return { preference, isDark, setTheme }
}
