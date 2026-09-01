<template>
  <div class="not-found">
    <h1>404</h1>
    <p>{{ $t('common.notFound') || 'Page introuvable' }}</p>
    <router-link to="/dashboard" class="btn-primary">Retour à l'accueil</router-link>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}
.not-found h1 {
  font-size: 4rem;
  margin-bottom: 0.5rem;
  color: #374151;
}
.not-found p {
  color: #6b7280;
  margin-bottom: 24px;
}
</style>