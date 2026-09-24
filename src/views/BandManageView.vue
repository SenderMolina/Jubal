<template>
  <div class="band-manage">
    <!-- div, no <header>: main.css tiene un header{} global legacy con fondo y borde -->
    <div class="bm-heading">
      <span class="bm-eyebrow">Banda</span>
      <h1 class="bm-title">Administrar banda</h1>
    </div>

    <!-- Datos de la banda -->
    <section class="bm-card bm-profile" aria-label="Datos de la banda">
      <component
        :is="band.can.editBand ? 'label' : 'div'"
        class="bm-profile__image-wrap"
        :for="band.can.editBand ? 'band-image' : undefined"
        :aria-label="band.can.editBand ? 'Cambiar imagen de la banda' : undefined"
      >
        <img v-if="bandImage && !imageBroken" :src="bandImage" class="bm-profile__image" alt="" @error="imageBroken = true">
        <span v-else class="bm-profile__image bm-profile__image--ph" aria-hidden="true">{{ bandInitial }}</span>
        <span v-if="band.can.editBand" class="bm-profile__image-action" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4 16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5Z"/><circle cx="12" cy="13" r="3"/></svg>
        </span>
      </component>
      <input v-if="band.can.editBand" id="band-image" class="bm-profile__file" type="file" accept="image/jpeg,image/png,image/webp" @change="selectImage">

      <form v-if="band.can.editBand" class="bm-profile__form" @submit.prevent="saveBandProfile">
        <label class="bm-label" for="band-name">Nombre de la banda</label>
        <input id="band-name" v-model="bandName" class="form-input" maxlength="60" autocomplete="off">
      </form>
      <div v-else class="bm-profile__summary">
        <strong>{{ band.currentBand?.name }}</strong>
        <small>Solo el dueño puede cambiar los datos o eliminar la banda.</small>
      </div>
    </section>
    <!-- Guardar solo aparece cuando hay algo que guardar -->
    <button
      v-if="band.can.editBand && profileChanged"
      class="btn btn-primary bm-profile__save"
      :disabled="profileBusy || !bandName.trim()"
      @click="saveBandProfile"
    >{{ profileBusy ? 'Guardando…' : 'Guardar cambios' }}</button>

    <!-- Integrantes -->
    <section class="bm-section" aria-labelledby="bm-members-title">
      <h2 id="bm-members-title" class="bm-section__title">
        Integrantes <span v-if="members.length" class="bm-count">{{ members.length }}</span>
      </h2>
      <ul v-if="members.length" class="bm-card bm-rows">
        <li v-for="m in members" :key="m.user_id" class="bm-member" :class="`role--${m.role}`">
          <span class="bm-avatar-wrap">
            <img
              v-if="m.profile?.avatar_url && !avatarErrors.has(m.user_id)"
              :src="m.profile.avatar_url"
              class="bm-avatar"
              alt=""
              @error="hideBrokenAvatar(m.user_id)"
            >
            <span v-else class="bm-avatar bm-avatar--ph" aria-hidden="true">{{ initial(m) }}</span>
          </span>
          <span class="bm-member__info">
            <span class="bm-member__name">{{ memberName(m) }}<span v-if="isMe(m)" class="bm-member__me"> · Tú</span></span>
            <small>{{ m.user_id === band.currentBand?.owner_id ? 'Dueño de la banda' : (m.profile?.email || '') }}</small>
          </span>
          <UiSelect
            v-if="canEdit(m)"
            class="bm-role"
            :model-value="m.role"
            :options="roleOptions"
            :aria-label="`Rol de ${memberName(m)}`"
            @update:model-value="changeRole(m, $event)"
          />
          <span v-else class="bm-role bm-role--static">{{ roleIcon(m.role) }} {{ roleLabel(m.role) }}</span>
          <button v-if="canEdit(m)" class="bm-more" type="button" :aria-label="`Opciones de ${memberName(m)}`" @click="openMemberMenu(m)">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
          <span v-else class="bm-more" aria-hidden="true"></span>
        </li>
      </ul>
      <p v-else class="bm-empty">Cargando integrantes…</p>
    </section>

    <template v-if="band.can.manageBand">
      <!-- Invitaciones -->
      <section class="bm-section" aria-labelledby="bm-invites-title">
        <h2 id="bm-invites-title" class="bm-section__title">Invitaciones</h2>
        <p class="bm-hint">Genera un link y compártelo: quien lo abra entra con el rol que elijas.</p>
        <div class="bm-create">
          <UiSelect v-model="newRole" class="bm-create__role" :options="roleOptions" aria-label="Rol de la invitación" />
          <button class="btn btn-primary" :disabled="busy" @click="create">Generar link</button>
        </div>
        <ul v-if="invites.length" class="bm-card bm-rows">
          <li v-for="inv in invites" :key="inv.id" class="bm-invite" :class="`role--${inv.role}`">
            <span class="bm-role bm-role--static">{{ roleIcon(inv.role) }} {{ roleLabel(inv.role) }}</span>
            <small class="bm-invite__uses">{{ inv.uses }} uso{{ inv.uses === 1 ? '' : 's' }}</small>
            <button class="bm-text-btn" type="button" @click="copy(inv.token)">Copiar</button>
            <button class="bm-text-btn bm-text-btn--danger" type="button" @click="revoke(inv)">Revocar</button>
          </li>
        </ul>
        <p v-else class="bm-empty">No hay invitaciones activas.</p>
      </section>

      <!-- Ajustes -->
      <section class="bm-section" aria-labelledby="bm-settings-title">
        <h2 id="bm-settings-title" class="bm-section__title">Canciones</h2>
        <RouterLink class="bm-card bm-link" to="/configuracion">
          <span class="bm-link__text">
            <span>Tipos de canción</span>
            <small>Categorías para organizar el cancionero</small>
          </span>
          <span class="bm-link__arrow" aria-hidden="true">›</span>
        </RouterLink>
      </section>

      <section v-if="band.can.editBand" class="bm-danger" aria-labelledby="delete-band-title">
        <h2 id="delete-band-title">Eliminar banda</h2>
        <p>Borra para siempre sus actividades, canciones, repertorios e integrantes.</p>
        <button class="btn bm-danger__btn" :disabled="deleteBusy" @click="deleteCurrentBand">
          {{ deleteBusy ? 'Eliminando…' : 'Eliminar banda' }}
        </button>
      </section>
    </template>

    <ActionSheet ref="sheet" />
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
import ActionSheet from '../components/ActionSheet.vue'
import { useAuthStore } from '../stores/auth'

const band = useBandStore()
const auth = useAuthStore()
const sheet = ref(null)
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

function isMe(m) {
  return m.user_id === auth.user?.id
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
    await router.replace(band.currentBandId ? '/actividades' : '/practica')
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

function openMemberMenu(m) {
  sheet.value?.open({
    title: memberName(m),
    actions: [
      { label: 'Quitar de la banda', icon: 'trash', danger: true, onSelect: () => remove(m) },
    ],
  })
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
.band-manage { max-width: 640px; margin: 0 auto; padding-bottom: 24px; }

/* Roles: cada uno con su color (tokens de main.css) */
.role--leader { --role-color: var(--color-role-leader); --role-soft: var(--color-role-leader-soft); }
.role--musician { --role-color: var(--color-role-musician); --role-soft: var(--color-role-musician-soft); }
.role--singer { --role-color: var(--color-role-singer); --role-soft: var(--color-role-singer-soft); }

.bm-heading { margin: 6px 0 16px; }
.bm-eyebrow { color: var(--color-accent-hover); font-size: .7rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.bm-title { margin-top: 2px; color: var(--color-text-primary); font-family: var(--font-display); font-size: 1.5rem; line-height: 1.2; }

.bm-card { border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); }

/* Datos de la banda: imagen + nombre en una fila */
.bm-profile { display: flex; align-items: center; gap: 14px; padding: 14px; }
.bm-profile__image-wrap { position: relative; flex: 0 0 64px; width: 64px; height: 64px; }
label.bm-profile__image-wrap { cursor: pointer; }
label.bm-profile__image-wrap:focus-within { outline: 2px solid var(--color-focus); outline-offset: 3px; border-radius: 18px; }
.bm-profile__image { width: 64px; height: 64px; display: block; border: 1px solid var(--color-border); border-radius: 18px; object-fit: cover; }
.bm-profile__image--ph { display: grid; place-items: center; background: var(--color-primary-soft); color: var(--color-primary); font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; }
.bm-profile__image-action { position: absolute; right: -6px; bottom: -6px; width: 28px; height: 28px; display: grid; place-items: center; border: 2px solid var(--color-surface); border-radius: 50%; background: var(--color-primary); color: var(--color-text-on-primary); }
.bm-profile__image-action svg { width: 14px; height: 14px; }
.bm-profile__file { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.bm-profile__form { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.bm-profile__summary { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.bm-profile__summary strong { font-size: 1.05rem; }
.bm-profile__summary small { color: var(--color-text-muted); font-size: .78rem; line-height: 1.4; }
.bm-profile__save { width: 100%; margin-top: 10px; }
.bm-label { color: var(--color-text-secondary); font-size: .8rem; font-weight: 700; }

/* Secciones */
.bm-section { margin-top: 26px; }
.bm-section__title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--color-text-primary); font-size: 1rem; }
.bm-count { min-width: 24px; height: 22px; padding: 0 7px; display: inline-grid; place-items: center; border-radius: 999px; background: var(--color-primary-soft); color: var(--color-primary); font-size: .75rem; font-weight: 800; }
.bm-hint { margin: -4px 0 10px; color: var(--color-text-muted); font-size: .8rem; line-height: 1.45; }
.bm-empty { color: var(--color-text-muted); font-size: .88rem; }

/* Filas compactas (integrantes e invitaciones) */
.bm-rows { overflow: hidden; list-style: none; }
.bm-member,
.bm-invite { display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 10px 6px 10px 12px; border-bottom: 1px solid var(--color-border); }
.bm-member:last-child,
.bm-invite:last-child { border-bottom: 0; }

.bm-avatar-wrap { flex: 0 0 40px; }
.bm-avatar { width: 40px; height: 40px; display: block; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--role-soft); }
.bm-avatar--ph { display: grid; place-items: center; background: var(--role-color); color: var(--color-text-on-primary); font-family: var(--font-display); font-size: 1rem; font-weight: 700; }
.bm-member__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.bm-member__name { overflow: hidden; color: var(--color-text-primary); font-size: .92rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.bm-member__me { color: var(--color-text-muted); font-weight: 600; }
.bm-member__info small { overflow: hidden; color: var(--color-text-muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }

/* Píldora de rol: mismo aspecto editable o no */
.bm-role { flex: 0 0 auto; }
/* UiSelect ocupa el 100% por defecto: aquí mide lo que su contenido. */
.bm-member .bm-role { width: auto; }
.bm-role :deep(.ui-select__trigger) { width: auto; }
.bm-role--static,
.bm-role :deep(.ui-select__trigger) { min-height: 32px; display: inline-flex; align-items: center; gap: 5px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--role-soft); color: var(--role-color); font-size: .78rem; font-weight: 800; box-shadow: none; }
.bm-role :deep(.ui-select__leading) { color: var(--role-color); background: transparent; }
.bm-role :deep(.ui-select__chevron) { width: 12px; height: 12px; stroke: var(--role-color); }
.bm-more { flex: 0 0 40px; width: 40px; height: 40px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); cursor: pointer; }
button.bm-more:hover { background: var(--color-surface-secondary); color: var(--color-text-primary); }
.bm-more svg { width: 20px; height: 20px; }

/* Invitaciones */
.bm-create { display: flex; gap: 8px; margin-bottom: 12px; }
.bm-create__role { flex: 1; min-width: 0; }
.bm-create .btn { flex: 0 0 auto; }
.bm-invite { padding-right: 8px; }
.bm-invite__uses { flex: 1; color: var(--color-text-muted); font-size: .78rem; }
.bm-text-btn { min-height: 36px; padding: 0 10px; border: 0; border-radius: 10px; background: transparent; color: var(--color-link); font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; }
.bm-text-btn:hover { background: var(--color-surface-secondary); }
.bm-text-btn--danger { color: var(--color-danger); }

/* Ajustes */
.bm-link { display: flex; align-items: center; gap: 12px; padding: 14px 16px; color: var(--color-text-primary); text-decoration: none; }
.bm-link:hover { border-color: var(--color-primary); }
.bm-link__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-weight: 700; }
.bm-link__text small { color: var(--color-text-muted); font-size: .78rem; font-weight: 500; }
.bm-link__arrow { color: var(--color-text-muted); font-size: 1.4rem; line-height: 1; }

/* Zona de peligro: presente pero sin gritar; la confirmación protege */
.bm-danger { margin-top: 32px; padding-top: 18px; border-top: 1px solid rgba(var(--color-danger-rgb), .25); }
.bm-danger h2 { color: var(--color-danger); font-size: .95rem; }
.bm-danger p { margin: 4px 0 12px; color: var(--color-text-muted); font-size: .8rem; line-height: 1.45; }
.bm-danger__btn { width: 100%; justify-content: center; border: 1px solid var(--color-danger); background: transparent; color: var(--color-danger); }
.bm-danger__btn:hover:not(:disabled) { background: var(--color-danger-soft); }
</style>
