<template>
  <div class="profile">
    <div class="profile-card">
      <img v-if="avatarUrl" :src="avatarUrl" class="profile-avatar" alt="">
      <span v-else class="profile-avatar profile-avatar--ph">{{ initial }}</span>

      <h1 class="profile-name">{{ fullName }}</h1>
      <p v-if="email" class="profile-email">{{ email }}</p>

      <div class="profile-meta">
        <span class="profile-band">{{ band.personalMode ? 'Práctica personal' : (band.currentBand?.name || 'Jubal') }}</span>
        <span v-if="!band.personalMode" class="profile-role" :class="'role-' + band.myRole">{{ roleLabel }}</span>
      </div>
    </div>

    <div class="profile-actions">
      <button class="profile-btn profile-btn--danger" @click="signOut">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Cerrar sesión</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useBandStore } from '../stores/band'

const auth = useAuthStore()
const band = useBandStore()

const fullName = computed(() =>
  auth.user?.user_metadata?.full_name || auth.user?.email || 'Usuario')
const email = computed(() => auth.user?.email || '')
const avatarUrl = computed(() => auth.user?.user_metadata?.avatar_url || '')
const initial = computed(() => fullName.value.charAt(0).toUpperCase())

const roleLabel = computed(() =>
  ({ leader: 'Líder', musician: 'Músico', singer: 'Corista' }[band.myRole] || ''))

async function signOut() {
  band.reset()
  await auth.signOut()
}
</script>

<style scoped>
.profile { max-width: 480px; margin: 0 auto; }

.profile-card {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 28px 20px; background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-small); margin: 8px 0 20px;
}
.profile-avatar {
  width: 84px; height: 84px; border-radius: 50%; object-fit: cover;
  border: 1px solid var(--color-border); margin-bottom: 14px;
}
.profile-avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary); color: var(--color-text-on-primary); font-weight: 700; font-size: 2rem;
}
.profile-name {
  font-family: var(--font); font-weight: 900; font-size: 1.4rem;
  color: var(--color-text-primary); margin: 0;
}
.profile-email { color: var(--color-text-muted); font-size: .88rem; margin: 4px 0 0; }

.profile-meta { display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap; justify-content: center; }
.profile-band {
  font-size: 13px; padding: 4px 12px; border-radius: 999px;
  background: var(--color-surface-secondary); color: var(--color-text-secondary); font-weight: 600;
}
.profile-role {
  font-size: 13px; padding: 4px 12px; border-radius: 999px;
  background: var(--color-surface-secondary); color: var(--color-text-secondary); font-weight: 600;
}
.profile-role.role-leader { background: var(--color-role-leader); color: var(--color-text-on-primary); }

.profile-actions { display: flex; flex-direction: column; gap: 10px; }
.profile-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-small);
  color: var(--color-text-primary); font-weight: 600; font-size: .95rem; cursor: pointer;
  font-family: inherit; text-align: left; transition: all .15s;
}
.profile-btn svg { width: 20px; height: 20px; color: var(--color-primary); flex-shrink: 0; }
.profile-btn span { flex: 1; }
.profile-btn:hover { border-color: var(--color-primary); transform: translateY(-1px); box-shadow: var(--shadow-medium); }
.profile-btn--danger { color: var(--color-danger); }
.profile-btn--danger svg { color: var(--color-danger); }
</style>
