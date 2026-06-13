<template>
  <div class="band-manage">
    <h1 class="section-title">{{ band.currentBand?.name || 'Banda' }}</h1>
    <p class="section-subtitle">Miembros e invitaciones de tu banda.</p>

    <!-- Miembros -->
    <h2 class="bm-heading">Miembros</h2>
    <div v-if="members.length" class="bm-list">
      <div v-for="m in members" :key="m.user_id" class="bm-member">
        <img v-if="m.profile?.avatar_url" :src="m.profile.avatar_url" class="bm-avatar" alt="">
        <div v-else class="bm-avatar bm-avatar--ph">{{ initial(m) }}</div>
        <div class="bm-member__info">
          <div class="bm-member__name">
            {{ m.profile?.display_name || m.profile?.email || 'Usuario' }}
            <span v-if="m.user_id === band.currentBand?.owner_id" class="bm-owner">dueño</span>
          </div>
          <div class="bm-member__email">{{ m.profile?.email }}</div>
        </div>

        <select
          v-if="canEdit(m)"
          class="bm-role-select"
          :value="m.role"
          @change="changeRole(m, $event.target.value)"
        >
          <option value="leader">Líder</option>
          <option value="musician">Músico</option>
          <option value="singer">Corista</option>
        </select>
        <span v-else class="band-card__role" :class="'role-' + m.role">{{ roleLabel(m.role) }}</span>

        <button v-if="canEdit(m)" class="btn btn-danger btn-sm icon-btn" title="Quitar" @click="remove(m)">✕</button>
      </div>
    </div>
    <p v-else class="bm-empty">Cargando miembros…</p>

    <!-- Invitaciones (solo líder) -->
    <template v-if="band.isLeader">
      <h2 class="bm-heading">Invitaciones</h2>

      <div class="bm-create">
        <label class="form-label">Crear link de invitación con rol:</label>
        <div class="bm-create__row">
          <select v-model="newRole" class="bm-role-select">
            <option value="musician">Músico</option>
            <option value="singer">Corista</option>
            <option value="leader">Líder</option>
          </select>
          <button class="btn btn-primary btn-sm" :disabled="busy" @click="create">Generar link</button>
        </div>
      </div>

      <div v-if="invites.length" class="bm-list">
        <div v-for="inv in invites" :key="inv.id" class="bm-invite">
          <div class="bm-invite__info">
            <span class="band-card__role" :class="'role-' + inv.role">{{ roleLabel(inv.role) }}</span>
            <span class="bm-invite__uses">{{ inv.uses }} uso(s)</span>
          </div>
          <div class="bm-invite__actions">
            <button class="btn btn-sm" @click="copy(inv.token)">Copiar link</button>
            <button class="btn btn-danger btn-sm" @click="revoke(inv)">Revocar</button>
          </div>
        </div>
      </div>
      <p v-else class="bm-empty">Aún no hay invitaciones activas.</p>

      <h2 class="bm-heading">Configuración</h2>
      <RouterLink class="bm-link" to="/tipos">
        <span>Tipos de canción</span>
        <span class="bm-link__arrow">›</span>
      </RouterLink>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const band = useBandStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

const members = ref([])
const invites = ref([])
const newRole = ref('musician')
const busy    = ref(false)

const roleLabels = { leader: 'Líder', musician: 'Músico', singer: 'Corista' }
const roleLabel = r => roleLabels[r] || r

function initial(m) {
  return (m.profile?.display_name || m.profile?.email || '?').charAt(0).toUpperCase()
}

// El líder puede editar a todos menos al dueño.
function canEdit(m) {
  return band.isLeader && m.user_id !== band.currentBand?.owner_id
}

async function refresh() {
  members.value = await band.loadMembers()
  if (band.isLeader) invites.value = await band.loadInvites()
}

async function changeRole(m, role) {
  try {
    await band.updateMemberRole(m.user_id, role)
    m.role = role
    showToast('Rol actualizado')
  } catch (e) { showToast(e.message || 'No se pudo actualizar') }
}

async function remove(m) {
  const name = m.profile?.display_name || m.profile?.email || 'este miembro'
  const ok = await confirm('Quitar miembro', `¿Quitar a ${name} de la banda?`)
  if (!ok) return
  try {
    await band.removeMember(m.user_id)
    members.value = members.value.filter(x => x.user_id !== m.user_id)
    showToast('Miembro quitado')
  } catch (e) { showToast(e.message || 'No se pudo quitar') }
}

async function create() {
  busy.value = true
  try {
    const inv = await band.createInvite(newRole.value)
    invites.value.unshift(inv)
    await copy(inv.token)
  } catch (e) { showToast(e.message || 'No se pudo crear la invitación') }
  finally { busy.value = false }
}

async function copy(token) {
  const link = band.inviteLink(token)
  try {
    await navigator.clipboard.writeText(link)
    showToast('Link copiado al portapapeles')
  } catch {
    showToast(link)
  }
}

async function revoke(inv) {
  const ok = await confirm('Revocar invitación', 'El link dejará de funcionar.')
  if (!ok) return
  try {
    await band.revokeInvite(inv.id)
    invites.value = invites.value.filter(x => x.id !== inv.id)
    showToast('Invitación revocada')
  } catch (e) { showToast(e.message || 'No se pudo revocar') }
}

onMounted(refresh)
</script>

<style scoped>
.band-manage { padding-bottom: 24px; }
.bm-heading { font-size: 16px; margin: 24px 0 12px; }
.bm-list { display: flex; flex-direction: column; gap: 10px; }

.bm-member, .bm-invite {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
}
.bm-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.bm-avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--accent, #c8a04b); color: #1a1a1a; font-weight: 700;
}
.bm-member__info { flex: 1; min-width: 0; }
.bm-member__name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.bm-member__email { font-size: 12px; color: var(--text-muted, #888); overflow: hidden; text-overflow: ellipsis; }
.bm-owner {
  font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
  background: rgba(255,255,255,.12); padding: 2px 6px; border-radius: 6px; color: var(--text-muted, #ccc);
}

.bm-role-select {
  padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.06); color: inherit; font-size: 13px;
}
.band-card__role {
  font-size: 12px; padding: 3px 10px; border-radius: 999px;
  background: rgba(255,255,255,.1); color: var(--text-muted, #ccc);
}
.band-card__role.role-leader { background: var(--accent, #c8a04b); color: #1a1a1a; }

.bm-create { margin-bottom: 14px; }
.bm-create__row { display: flex; gap: 8px; margin-top: 6px; }
.bm-invite__info { flex: 1; display: flex; align-items: center; gap: 10px; }
.bm-invite__uses { font-size: 12px; color: var(--text-muted, #888); }
.bm-invite__actions { display: flex; gap: 8px; }
.bm-empty { color: var(--text-muted, #888); font-size: 14px; }

.bm-link {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; text-decoration: none; color: var(--text); font-weight: 600;
}
.bm-link:hover { border-color: var(--accent); color: var(--accent); }
.bm-link__arrow { color: var(--text-muted); font-size: 1.4rem; line-height: 1; }
</style>
