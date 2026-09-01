import { ref, watch } from 'vue'

/**
 * Returns a ref that mirrors `source` but only updates after `delay` ms
 * of inactivity, to avoid recomputing expensive filters on every keystroke.
 */
export function useDebouncedRef(source, delay = 300) {
  const debounced = ref(source.value)
  let timeoutId
  watch(source, (value) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => { debounced.value = value }, delay)
  })
  return debounced
}
