<template>
  <div class="team-view">
    <h2>👥 {{ $t('team.title') }}</h2>

    <div v-if="!isSupabase" class="empty banner">{{ $t('team.unavailable') }}</div>
    <template v-else>
      <div v-if="tenant.loading" class="empty">{{ $t('common.loading') }}</div>
      <template v-else>
        <section class="org-card">
          <h3>{{ tenant.organization?.name || '—' }}</h3>
          <p>{{ $t('team.status') }} : <span class="status" :class="tenant.organization?.status">{{ tenant.organization?.status }}</span></p>
          <p v-if="tenant.organization?.currency">{{ $t('team.currency') }} : {{ tenant.organization.currency }}</p>
        </section>

        <section class="report-table">
          <div class="section-head">
            <h3>{{ $t('team.members') }}</h3>
            <button type="button" class="btn-secondary" :disabled="tenant.loading" :title="$t('actions.refresh')" @click="refresh">↻ {{ $t('actions.refresh') }}</button>
          </div>
          <p v-if="!tenant.members.length" class="empty">{{ $t('team.noMembers') }}</p>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>{{ $t('team.member') }}</th>
                <th>{{ $t('team.role') }}</th>
                <th>{{ $t('team.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in tenant.members" :key="member.id">
                <td>
                  <strong>{{ member.full_name || member.email || member.user_id }}</strong>
                  <div class="member-email" v-if="member.full_name && member.email">{{ member.email }}</div>
                </td>
                <td>
                  <select
                    :value="member.role"
                    :disabled="!tenant.isOwnerOrManager"
                    @change="changeMember(member, { role: $event.target.value })"
                  >
                    <option value="owner">{{ $t('team.roles.owner') }}</option>
                    <option value="manager">{{ $t('team.roles.manager') }}</option>
                    <option value="cashier">{{ $t('team.roles.cashier') }}</option>
                    <option value="stock_manager">{{ $t('team.roles.stockManager') }}</option>
                    <option value="accountant">{{ $t('team.roles.accountant') }}</option>
                    <option value="viewer">{{ $t('team.roles.viewer') }}</option>
                  </select>
                </td>
                <td>
                  <select
                    :value="member.status"
                    :disabled="!tenant.isOwnerOrManager"
                    @change="changeMember(member, { status: $event.target.value })"
                  >
                    <option value="active">{{ $t('team.statuses.active') }}</option>
                    <option value="invited">{{ $t('team.statuses.invited') }}</option>
                    <option value="suspended">{{ $t('team.statuses.suspended') }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTenantStore } from '../stores/tenant.js'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'
import { db } from '../services/database/index.js'

const tenant = useTenantStore()
const auth = useAuthStore()
const toast = useToast()

const isSupabase = computed(() => db.constructor.name === 'SupabaseAdapter')

onMounted(refresh)

async function refresh() {
  if (!isSupabase.value) return
  await tenant.fetchCurrentOrganization(auth.user?.id)
  await tenant.fetchMembers()
}

async function changeMember(member, changes) {
  try {
    await tenant.updateMember(member.id, changes)
  } catch (error) {
    toast.error(error.message)
  }
}
</script>

<style scoped>
.banner { background: white; border: 1px solid var(--line); border-radius: 12px; }
.org-card { background: white; padding: 20px; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); margin-bottom: 20px; }
.org-card h3 { margin: 0 0 8px; }
.org-card p { margin: 4px 0; color: #4b5563; }
.report-table { background: white; padding: 20px; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-head h3 { margin: 0; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table select { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.member-email { color: #6b7280; font-size: .82rem; }
.empty { text-align: center; padding: 24px; color: #6b7280; }
.status { text-transform: capitalize; font-weight: 600; }
</style>
