<template>
  <div class="band-manage">
    <header class="bm-page-heading">
      <span class="bm-eyebrow">Equipo</span>
      <h1>Administrar banda</h1>
    </header>

    <section class="bm-profile" aria-label="Datos de la banda">
      <div class="bm-profile__image-wrap">
        <img v-if="bandImage && !imageBroken" :src="bandImage" class="bm-profile__image" alt="Imagen de la banda" @error="imageBroken = true">
        <span v-else class="bm-profile__image bm-profile__image--ph">{{ bandInitial }}</span>
        <label v-if="band.can.editBand" class="bm-profile__image-action" for="band-image" aria-label="Cambiar imagen de la banda">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4 16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5Z"/><circle cx="12" cy="13" r="3"/></svg>
        </label>
        <input v-if="band.can.editBand" id="band-image" class="bm-profile__file" type="file" accept="image/jpeg,image/png,image/webp" @change="selectImage">
      </div>

      <form v-if="band.can.editBand" class="bm-profile__form" @submit.prevent="saveBandProfile">
        <div>
          <span class="bm-eyebrow">Datos de la banda</span>
        </div>
        <label class="form-label" for="band-name">Nombre</label>
        <input id="band-name" v-model="bandName" class="form-input" maxlength="60" autocomplete="off">
        <p class="bm-profile__hint">Imagen JPG, PNG o WebP de hasta 4 MB.</p>
        <button class="btn btn-primary" :disabled="profileBusy || !bandName.trim() || !profileChanged">
          {{ profileBusy ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </form>

      <div v-else class="bm-profile__summary">
        <span class="bm-eyebrow">Banda</span>
        <h1>{{ band.currentBand?.name }}</h1>
        <p>Solo el propietario puede cambiar los datos o eliminar la banda.</p>
      </div>
    </section>

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
    <template v-if="band.can.manageBand">
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
      <RouterLink class="bm-link" to="/configuracion">
        <span>Configuraciones</span>
        <span class="bm-link__arrow">›</span>
      </RouterLink>

      <section v-if="band.can.editBand" class="bm-danger" aria-labelledby="delete-band-title">
        <div>
          <h2 id="delete-band-title">Eliminar banda</h2>
          <p>Elimina permanentemente sus actividades, canciones, repertorios e integrantes.</p>
        </div>
        <button class="btn btn-danger" :disabled="deleteBusy" @click="deleteCurrentBand">
          {{ deleteBusy ? 'Eliminando…' : 'Eliminar banda' }}
        </button>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROLE_LABELS, useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { clearLoadError, reportLoadError } from '../composables/useLoadErrors'
import { useConfirm } from '../composables/useConfirm'
import UiSelect from '../components/UiSelect.vue'

const band = useBandStore()
const router = useRouter()
const { showToast, showError } = useToast()
const { confirm } = useConfirm()

const members = ref([])
const invites = ref([])
const newRole = ref('musician')
const busy    = ref(false)
const profileBusy = ref(false)
const deleteBusy = ref(false)
const bandName = ref('')
const imageFile = ref(null)
const previewUrl = ref('')
const imageBroken = ref(false)
const avatarErrors = ref(new Set())

const bandInitial = computed(() => band.currentBand?.name?.trim().charAt(0).toUpperCase() || '♪')
const bandImage = computed(() => previewUrl.value || band.currentBand?.avatar_url || '')
const profileChanged = computed(() =>
  Boolean(imageFile.value) || bandName.value.trim() !== (band.currentBand?.name || ''))

const roleLabel = r => ROLE_LABELS[r] || r
const roleIcons = { leader: '★', musician: '♩', singer: '♪' }
const roleIcon = role => roleIcons[role] || '♫'
const roleOptions = Object.keys(ROLE_LABELS).map(role => ({ value: role, label: roleLabel(role), icon: roleIcon(role) }))

function memberName(m) {
  return m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Usuario'
}

function initial(m) {
  return (m.profile?.display_name || m.profile?.email || '?').charAt(0).toUpperCase()
}

function hideBrokenAvatar(userId) {
  avatarErrors.value = new Set([...avatarErrors.value, userId])
}

function resetBandProfile() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  imageFile.value = null
  imageBroken.value = false
  bandName.value = band.currentBand?.name || ''
}

function selectImage(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showToast('Usa una imagen JPG, PNG o WebP.')
    return
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast('La imagen debe pesar menos de 4 MB.')
    return
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  imageFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  imageBroken.value = false
}

async function saveBandProfile() {
  if (!band.can.editBand || profileBusy.value || !bandName.value.trim()) return
  profileBusy.value = true
  try {
    if (bandName.value.trim() !== band.currentBand?.name) {
      await band.updateBandName(bandName.value)
    }
    if (imageFile.value) await band.updateBandImage(imageFile.value)
    resetBandProfile()
    showToast('Banda actualizada')
  } catch (e) {
    showError(e, 'No se pudo actualizar la banda.')
  } finally {
    profileBusy.value = false
  }
}

async function deleteCurrentBand() {
  if (!band.can.editBand || deleteBusy.value) return
  const name = band.currentBand?.name || 'esta banda'
  const ok = await confirm(
    'Eliminar banda',
    `Se eliminará “${name}” y toda su información.`,
    {
      confirmLabel: 'Eliminar banda',
      cancelLabel: 'Conservar banda',
      tone: 'danger',
      note: 'Esta acción no se puede deshacer.',
    },
  )
  if (!ok) return
  deleteBusy.value = true
  try {
    await band.deleteBand()
    showToast('Banda eliminada')
    await router.replace(band.currentBandId ? '/inicio' : '/practica')
  } catch (e) {
    showError(e, 'No se pudo eliminar la banda.')
  } finally {
    deleteBusy.value = false
  }
}

// El líder puede editar a todos menos al dueño.
function canEdit(m) {
  return band.can.manageBand && m.user_id !== band.currentBand?.owner_id
}

async function refresh() {
  try {
    members.value = await band.loadMembers()
    if (band.can.manageBand) invites.value = await band.loadInvites()
    clearLoadError('integrantes')
  } catch (reason) { reportLoadError('integrantes', reason, refresh) }
}

async function changeRole(m, role) {
  if (m.role === role) return
  try {
    await band.updateMemberRole(m.user_id, role)
    m.role = role
    showToast('Rol actualizado')
  } catch (e) { showError(e, 'No se pudo actualizar') }
}

async function remove(m) {
  const name = m.profile?.display_name || m.profile?.email || 'este miembro'
  const ok = await confirm('Quitar miembro', `¿Quitar a ${name} de la banda?`)
  if (!ok) return
  try {
    await band.removeMember(m.user_id)
    members.value = members.value.filter(x => x.user_id !== m.user_id)
    showToast('Miembro quitado')
  } catch (e) { showError(e, 'No se pudo quitar') }
}

async function create() {
  busy.value = true
  try {
    const inv = await band.createInvite(newRole.value)
    invites.value.unshift(inv)
    await copy(inv.token)
  } catch (e) { showError(e, 'No se pudo crear la invitación') }
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
  } catch (e) { showError(e, 'No se pudo revocar') }
}

onMounted(() => {
  resetBandProfile()
  refresh()
})
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<style scoped>
.band-manage { max-width: 760px; margin: 0 auto; padding-bottom: 24px; }
.bm-page-heading { margin-bottom: 20px; }
.bm-page-heading .bm-eyebrow { font-size: 10px; }
.bm-page-heading h1 { margin: 4px 0 0; color: var(--color-text-primary); font-family: var(--font-display); font-size: 24px; line-height: 1.2; }
.bm-profile { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 18px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
.bm-profile__image-wrap { position: relative; width: 104px; height: 104px; }
.bm-profile__image { width: 104px; height: 104px; display: block; border: 1px solid var(--color-border); border-radius: 24px; object-fit: cover; }
.bm-profile__image--ph { display: grid; place-items: center; background: var(--color-primary-soft); color: var(--color-primary); font-size: 2.25rem; font-weight: 900; }
.bm-profile__image-action { position: absolute; right: -7px; bottom: -7px; width: 40px; height: 40px; display: grid; place-items: center; border: 3px solid var(--color-background); border-radius: 50%; background: var(--color-primary); color: var(--color-text-on-primary); cursor: pointer; }
.bm-profile__image-action svg { width: 19px; height: 19px; }
.bm-profile__file { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.bm-profile__form { min-width: 0; display: grid; gap: 8px; }
.bm-profile__summary h1 { margin: 2px 0 4px; color: var(--color-text-primary); font-size: 1.25rem; }
.bm-profile__form .btn { justify-self: start; min-width: 160px; }
.bm-profile__hint, .bm-profile__summary p { color: var(--color-text-muted); font-size: 12px; line-height: 1.45; }
.bm-heading { font-size: 14px; margin: 22px 0 10px; }
.bm-section-head { display: flex; align-items: flex-end; justify-content: space-between; margin: 20px 0 10px; }
.bm-section-head .bm-heading { margin: 2px 0 0; }
.bm-eyebrow { color: var(--color-primary-hover); font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.bm-count { min-width: 27px; height: 27px; padding: 0 7px; display: grid; place-items: center; border: 1px solid rgba(var(--color-primary-rgb),.25); border-radius: 9px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 11px; font-weight: 900; }
.bm-list { display: flex; flex-direction: column; gap: 10px; }
.bm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 12px; }

.bm-invite {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px;
}
.bm-member { --role-color: var(--color-primary); --role-soft: var(--color-primary-soft); position: relative; isolation: isolate; min-width: 0; aspect-ratio: 1; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 20px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); box-shadow: var(--shadow-small); animation: member-in .38s both; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.bm-member:nth-child(2n) { animation-delay: .04s; }.bm-member:nth-child(3n) { animation-delay: .08s; }
.bm-member--leader { --role-color: var(--color-role-leader); --role-soft: var(--color-role-leader-soft); }.bm-member--singer { --role-color: var(--color-role-singer); --role-soft: var(--color-role-singer-soft); }.bm-member--musician { --role-color: var(--color-role-musician); --role-soft: var(--color-role-musician-soft); }
.bm-member::before { content: ''; position: absolute; z-index: -1; inset: 0; border-radius: inherit; background: transparent; }
.bm-member:hover { transform: translateY(-2px); border-color: var(--role-color); box-shadow: var(--shadow-medium); }
.bm-avatar-wrap { position: relative; flex: 0 0 auto; }
.bm-avatar { width: 66px; height: 66px; border: 3px solid var(--color-surface); border-radius: 50%; object-fit: cover; display: block; box-shadow: 0 0 0 2px var(--role-soft), var(--shadow-small); }
.bm-avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--role-color); color: var(--color-text-on-primary); font-weight: 900; font-size: 20px;
}
.bm-avatar__badge { position: absolute; right: -4px; bottom: -4px; width: 21px; height: 21px; display: grid; place-items: center; border: 3px solid var(--color-surface); border-radius: 50%; background: var(--role-color); color: var(--color-text-on-primary); font-size: 8px; font-weight: 900; }
.bm-member__info { width: 88%; min-width: 0; margin-top: 6px; text-align: center; }
.bm-member__name { display: -webkit-box; min-height: 23px; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: var(--color-text-primary); font-size: 9.5px; font-weight: 800; line-height: 1.18; }
.bm-owner { display: inline-flex; margin-top: 2px; padding: 1px 5px; border: 1px solid var(--color-primary-border); border-radius: 999px; background: var(--color-primary-soft); color: var(--color-primary); font-size: 5.5px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
.bm-remove { position: absolute; z-index: 3; top: 8px; right: 8px; width: 27px; height: 27px; border: 1px solid rgba(var(--color-danger-rgb),.2); border-radius: 8px; background: var(--color-danger-soft); color: var(--color-danger-text); box-shadow: var(--shadow-small); font: inherit; font-size: 16px; line-height: 1; cursor: pointer; }.bm-remove:active { transform: scale(.92); }
.bm-member__footer { min-height: 25px; display: flex; align-items: center; justify-content: center; gap: 3px; margin-top: 5px; padding: 1px 6px; border: 1px solid var(--role-soft); border-radius: 999px; background: var(--role-soft); color: var(--role-color); }
.bm-role-icon { width: 16px; height: 16px; display: grid; place-items: center; border-radius: 50%; background: var(--color-surface); color: var(--role-color); font-size: 8px; }
.bm-role-label { padding-right: 3px; color: var(--role-color); font-size: 7.5px; font-weight: 900; letter-spacing: .03em; text-transform: uppercase; }

.bm-member__footer :deep(.ui-select) { width: 68px; --select-role-color: var(--role-color); }
.bm-member__footer :deep(.ui-select__trigger) { min-height: 21px; gap: 2px; padding: 2px 1px 2px 3px; border: 0; background: transparent; color: var(--role-color); font-size: 7.5px; font-weight: 900; box-shadow: none; }.bm-member__footer :deep(.ui-select__leading) { display: none; }.bm-member__footer :deep(.ui-select__chevron) { width: 10px; height: 10px; color: var(--role-color); }
.bm-invite-role { width: 130px; }
.band-card__role {
  font-size: 12px; padding: 3px 10px; border-radius: 999px;
  background: var(--color-surface-secondary); color: var(--color-text-secondary);
}
.band-card__role.role-leader { background: var(--color-primary-soft); color: var(--color-primary); }

.bm-create { margin-bottom: 14px; }
.bm-create__row { display: flex; gap: 8px; margin-top: 6px; }
.bm-invite__info { flex: 1; display: flex; align-items: center; gap: 10px; }
.bm-invite__uses { font-size: 12px; color: var(--color-text-muted); }
.bm-invite__actions { display: flex; gap: 8px; }
.bm-empty { color: var(--color-text-muted); font-size: 14px; }

.bm-link {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; text-decoration: none; color: var(--color-text-primary); font-weight: 600;
}
.bm-link:hover { border-color: var(--color-primary); color: var(--color-primary); }
.bm-link__arrow { color: var(--color-text-muted); font-size: 1.4rem; line-height: 1; }
.bm-danger { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(var(--color-danger-rgb), .3); }
.bm-danger h2 { margin: 0; color: var(--color-danger); font-size: 15px; }
.bm-danger p { max-width: 460px; margin-top: 4px; color: var(--color-text-muted); font-size: 12px; line-height: 1.45; }
.bm-danger .btn { flex: 0 0 auto; }
@keyframes member-in { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@media (max-width: 520px) { .bm-profile { grid-template-columns: 1fr; justify-items: center; }.bm-profile__form, .bm-profile__summary { width: 100%; }.bm-profile__form .btn { width: 100%; }.bm-danger { align-items: stretch; flex-direction: column; }.bm-danger .btn { width: 100%; } }
@media (max-width: 350px) { .bm-grid { grid-template-columns: 1fr 1fr; gap: 7px; }.bm-member { padding: 12px 15px; border-radius: 12px; }.bm-avatar { width: 58px; height: 58px; }.bm-member__name { min-height: 21px; font-size: 8.5px; }.bm-remove { top: 6px; right: 6px; width: 25px; height: 25px; }.bm-member__footer { margin-top: 4px; } }
@media (prefers-reduced-motion: reduce) { .bm-member { animation: none; transition: none; } }
</style>
