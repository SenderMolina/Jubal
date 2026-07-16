<template>
  <div class="band-manage">
    <h1 class="section-title">{{ band.currentBand?.name || 'Banda' }}</h1>
    <p class="section-subtitle">Miembros e invitaciones de tu banda.</p>

    <!-- Miembros -->
    <div class="bm-section-head">
      <div>
        <span class="bm-eyebrow">El equipo</span>
        <h2 class="bm-heading">Integrantes</h2>
      </div>
      <span class="bm-count">{{ members.length }}</span>
    </div>
    <div v-if="members.length" class="bm-grid">
      <article
        v-for="m in members"
        :key="m.user_id"
        class="bm-member"
        :class="`bm-member--${m.role}`"
        :title="m.profile?.email || memberName(m)"
      >
        <button
          v-if="canEdit(m)"
          class="bm-remove"
          :aria-label="`Quitar a ${memberName(m)}`"
          title="Quitar integrante"
          @click="remove(m)"
        >×</button>
        <div class="bm-avatar-wrap">
          <img
            v-if="m.profile?.avatar_url && !avatarErrors.has(m.user_id)"
            :src="m.profile.avatar_url"
            class="bm-avatar"
            :alt="`Foto de ${memberName(m)}`"
            @error="hideBrokenAvatar(m.user_id)"
          >
          <div v-else class="bm-avatar bm-avatar--ph">{{ initial(m) }}</div>
          <span class="bm-avatar__badge" aria-hidden="true">{{ roleIcon(m.role) }}</span>
        </div>
        <div class="bm-member__info">
          <h3 class="bm-member__name">{{ memberName(m) }}</h3>
          <span v-if="m.user_id === band.currentBand?.owner_id" class="bm-owner">Dueño</span>
        </div>

        <footer class="bm-member__footer">
          <span class="bm-role-icon" aria-hidden="true">{{ roleIcon(m.role) }}</span>
          <UiSelect
            v-if="canEdit(m)"
            :model-value="m.role"
            :options="roleOptions"
            :aria-label="`Rol de ${memberName(m)}`"
            @update:model-value="changeRole(m, $event)"
          />
          <span v-else class="bm-role-label">{{ roleLabel(m.role) }}</span>
        </footer>
      </article>
    </div>
    <p v-else class="bm-empty">Cargando miembros…</p>

    <!-- Invitaciones (solo líder) -->
    <template v-if="band.isLeader">
      <h2 class="bm-heading">Invitaciones</h2>

      <div class="bm-create">
        <label class="form-label">Crear link de invitación con rol:</label>
        <div class="bm-create__row">
          <UiSelect v-model="newRole" class="bm-invite-role" :options="roleOptions" aria-label="Rol de la invitación" />
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
import UiSelect from '../components/UiSelect.vue'

const band = useBandStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

const members = ref([])
const invites = ref([])
const newRole = ref('musician')
const busy    = ref(false)
const avatarErrors = ref(new Set())

const roleLabels = { leader: 'Líder', musician: 'Músico', singer: 'Corista' }
const roleLabel = r => roleLabels[r] || r
const roleIcons = { leader: '★', musician: '♩', singer: '♪' }
const roleIcon = role => roleIcons[role] || '♫'
const roleOptions = Object.keys(roleLabels).map(role => ({ value: role, label: roleLabel(role), icon: roleIcon(role) }))

function memberName(m) {
  return m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Usuario'
}

function initial(m) {
  return (m.profile?.display_name || m.profile?.email || '?').charAt(0).toUpperCase()
}

function hideBrokenAvatar(userId) {
  avatarErrors.value = new Set([...avatarErrors.value, userId])
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
  if (m.role === role) return
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
.band-manage { max-width: 760px; margin: 0 auto; padding-bottom: 24px; }
.bm-heading { font-size: 14px; margin: 22px 0 10px; }
.bm-section-head { display: flex; align-items: flex-end; justify-content: space-between; margin: 20px 0 10px; }
.bm-section-head .bm-heading { margin: 2px 0 0; }
.bm-eyebrow { color: var(--accent2); font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.bm-count { min-width: 27px; height: 27px; padding: 0 7px; display: grid; place-items: center; border: 1px solid rgba(var(--brand-rgb),.25); border-radius: 9px; background: var(--accent-soft); color: var(--accent2); font-size: 11px; font-weight: 900; }
.bm-list { display: flex; flex-direction: column; gap: 10px; }
.bm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 12px; }

.bm-invite {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px;
}
.bm-member { --role-color: var(--accent); --role-soft: var(--accent-soft); position: relative; isolation: isolate; min-width: 0; aspect-ratio: 1; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 20px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: var(--shadow); animation: member-in .38s both; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.bm-member:nth-child(2n) { animation-delay: .04s; }.bm-member:nth-child(3n) { animation-delay: .08s; }
.bm-member--leader { --role-color: var(--action2); --role-soft: var(--action-soft); }.bm-member--singer { --role-color: #8a59b8; --role-soft: #f2eafb; }.bm-member--musician { --role-color: var(--accent2); --role-soft: var(--accent-soft); }
.bm-member::before { content: ''; position: absolute; z-index: -1; inset: 0; border-radius: inherit; background: radial-gradient(circle at 50% 20%, var(--role-soft), transparent 54%); }
.bm-member:hover { transform: translateY(-2px); border-color: var(--role-color); box-shadow: var(--shadow-hover); }
.bm-avatar-wrap { position: relative; flex: 0 0 auto; }
.bm-avatar { width: 66px; height: 66px; border: 3px solid var(--surface); border-radius: 50%; object-fit: cover; display: block; box-shadow: 0 0 0 2px var(--role-soft), 0 6px 14px rgba(var(--ink-rgb),.12); }
.bm-avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(145deg, var(--role-color), var(--accent2)); color: #fff; font-weight: 900; font-size: 20px;
}
.bm-avatar__badge { position: absolute; right: -4px; bottom: -4px; width: 21px; height: 21px; display: grid; place-items: center; border: 3px solid var(--surface); border-radius: 50%; background: var(--role-color); color: #fff; font-size: 8px; font-weight: 900; }
.bm-member__info { width: 88%; min-width: 0; margin-top: 6px; text-align: center; }
.bm-member__name { display: -webkit-box; min-height: 23px; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: var(--text); font-size: 9.5px; font-weight: 800; line-height: 1.18; }
.bm-owner { display: inline-flex; margin-top: 2px; padding: 1px 5px; border: 1px solid rgba(var(--amber-rgb),.25); border-radius: 999px; background: var(--action-soft); color: var(--action2); font-size: 5.5px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
.bm-remove { position: absolute; z-index: 3; top: 8px; right: 8px; width: 27px; height: 27px; border: 1px solid rgba(var(--ink-rgb),.08); border-radius: 8px; background: #fff0f1; color: var(--red); box-shadow: 0 3px 8px rgba(var(--ink-rgb),.12); font: inherit; font-size: 16px; line-height: 1; cursor: pointer; }.bm-remove:active { transform: scale(.92); }
.bm-member__footer { min-height: 25px; display: flex; align-items: center; justify-content: center; gap: 3px; margin-top: 5px; padding: 1px 6px; border: 1px solid var(--role-soft); border-radius: 999px; background: var(--role-soft); color: var(--role-color); }
.bm-role-icon { width: 16px; height: 16px; display: grid; place-items: center; border-radius: 50%; background: var(--surface); color: var(--role-color); font-size: 8px; }
.bm-role-label { padding-right: 3px; color: var(--role-color); font-size: 7.5px; font-weight: 900; letter-spacing: .03em; text-transform: uppercase; }

.bm-member__footer :deep(.ui-select) { width: 68px; --select-role-color: var(--role-color); }
.bm-member__footer :deep(.ui-select__trigger) { min-height: 21px; gap: 2px; padding: 2px 1px 2px 3px; border: 0; background: transparent; color: var(--role-color); font-size: 7.5px; font-weight: 900; box-shadow: none; }.bm-member__footer :deep(.ui-select__leading) { display: none; }.bm-member__footer :deep(.ui-select__chevron) { width: 10px; height: 10px; color: var(--role-color); }
.bm-invite-role { width: 130px; }
.band-card__role {
  font-size: 12px; padding: 3px 10px; border-radius: 999px;
  background: var(--surface2); color: var(--text-mid);
}
.band-card__role.role-leader { background: var(--accent-soft); color: var(--accent); }

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
@keyframes member-in { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@media (max-width: 350px) { .bm-grid { grid-template-columns: 1fr 1fr; gap: 7px; }.bm-member { padding: 12px 15px; border-radius: 12px; }.bm-avatar { width: 58px; height: 58px; }.bm-member__name { min-height: 21px; font-size: 8.5px; }.bm-remove { top: 6px; right: 6px; width: 25px; height: 25px; }.bm-member__footer { margin-top: 4px; } }
@media (prefers-reduced-motion: reduce) { .bm-member { animation: none; transition: none; } }
</style>
