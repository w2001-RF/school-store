import { computed, ref, watch } from 'vue'

export function usePagination(source, defaultPageSize = 5) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const totalPages = computed(() => Math.max(1, Math.ceil(source.value.length / pageSize.value)))
  const paginated = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return source.value.slice(start, start + pageSize.value)
  })

  watch(source, () => {
    if (page.value > totalPages.value) page.value = totalPages.value
  })

  function goToPage(nextPage) {
    page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  }

  function resetPage() {
    page.value = 1
  }

  return { page, pageSize, totalPages, paginated, goToPage, resetPage }
}
