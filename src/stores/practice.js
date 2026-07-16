import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { sectionsToPracticeParts } from '../utils/sections'
import { progressFromSessions, stableBpm } from '../utils/skills'

// Store del espacio personal: skills, partes y sesiones de práctica.
// Todo va acotado al usuario por RLS (user_id = auth.uid()), sin filtros extra.
export const usePracticeStore = defineStore('practice', () => {
  const skills  = ref([])   // [{ ...skill, parts: [...] }]
  const ready   = ref(false)
  const routines = ref([])  // rutinas del usuario, cada una con sections[] e items[]
  const routine = ref(null) // rutina seleccionada en el constructor
  const routineError = ref('')
  const routineRuns = ref([])

  async function loadSkills() {
    const { data, error } = await supabase
      .from('skills')
      .select('*, song:songs(id,title,author,key,bpm,lyrics,band_id), parts:skill_parts(*)')
      .order('created_at', { ascending: false })
    if (error) { console.error('Error cargando skills:', error); return }
    skills.value = (data || []).map(s => ({
      ...s,
      parts: (s.parts || []).sort((a, b) => a.position - b.position),
    }))
    ready.value = true
  }

  async function createSkill({ name, type, target_bpm = null, song_id = null, parts = [] }) {
    const { data, error } = await supabase
      .from('skills')
      .insert({ name, type, target_bpm, song_id })
      .select('*, song:songs(id,title,author,key,bpm,lyrics,band_id), parts:skill_parts(*)')
      .single()
    if (error) throw error
    const skill = { ...data, parts: [] }
    skills.value.unshift(skill)
    try {
      if (parts.length) {
        const rows = parts.map((part, position) => ({
          skill_id: data.id,
          name: typeof part === 'string' ? part : part.name,
          position,
          source_section_index: typeof part === 'string' ? null : (part.source_section_index ?? null),
        }))
        const { data: createdParts, error: partsError } = await supabase
          .from('skill_parts').insert(rows).select()
        if (partsError) throw partsError
        skill.parts = (createdParts || []).sort((a, b) => a.position - b.position)
      }
      return skill
    } catch (reason) {
      await supabase.from('skills').delete().eq('id', data.id)
      skills.value = skills.value.filter(item => item.id !== data.id)
      throw reason
    }
  }

  function partsFromSong(song) {
    return sectionsToPracticeParts(song?.lyrics)
  }

  async function createSkillFromSong(song) {
    if (!ready.value) await loadSkills()
    const existing = skills.value.find(skill => Number(skill.song_id) === Number(song.id))
    if (existing) return existing
    return createSkill({
      name: song.title,
      type: 'song',
      song_id: song.id,
      target_bpm: song.bpm || null,
      parts: partsFromSong(song),
    })
  }

  async function syncSongParts(skillId) {
    const skill = skills.value.find(item => item.id === skillId)
    if (!skill?.song) return []
    const sourceParts = partsFromSong(skill.song)
    const changed = []
    for (const source of sourceParts) {
      const existing = skill.parts.find(part => part.source_section_index === source.source_section_index)
      if (!existing) changed.push(await addPart(skillId, source))
      else if (existing.name !== source.name) {
        await updatePart(skillId, existing.id, { name: source.name })
        changed.push(existing)
      }
    }
    return changed
  }

  async function updateSkill(id, patch) {
    const { error } = await supabase.from('skills').update(patch).eq('id', id)
    if (error) throw error
    const s = skills.value.find(x => x.id === id)
    if (s) Object.assign(s, patch)
  }

  async function deleteSkill(id) {
    const { error } = await supabase.from('skills').delete().eq('id', id)
    if (error) throw error
    skills.value = skills.value.filter(s => s.id !== id)
  }

  // ---------- Partes ----------
  async function addPart(skillId, value) {
    const s = skills.value.find(x => x.id === skillId)
    const position = s ? s.parts.length : 0
    const part = typeof value === 'string' ? { name: value } : value
    const { data, error } = await supabase
      .from('skill_parts')
      .insert({ skill_id: skillId, name: part.name, position, source_section_index: part.source_section_index ?? null })
      .select()
      .single()
    if (error) throw error
    if (s) s.parts.push(data)
    return data
  }

  async function updatePart(skillId, partId, patch) {
    const { error } = await supabase.from('skill_parts').update(patch).eq('id', partId)
    if (error) throw error
    const s = skills.value.find(x => x.id === skillId)
    const p = s?.parts.find(x => x.id === partId)
    if (p) Object.assign(p, patch)
  }

  async function deletePart(skillId, partId) {
    const { error } = await supabase.from('skill_parts').delete().eq('id', partId)
    if (error) throw error
    const s = skills.value.find(x => x.id === skillId)
    if (s) s.parts = s.parts.filter(p => p.id !== partId)
  }

  // ---------- Sesiones de práctica ----------
  async function loadSessions(skillId) {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('skill_id', skillId)
      .order('practiced_at', { ascending: false })
    if (error) { console.error('Error cargando sesiones:', error); return [] }
    return data || []
  }

  // Todas las sesiones del usuario (para estadísticas)
  async function loadAllSessions() {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('id, skill_id, part_id, bpm, duration_seconds, quality, practiced_at, routine_run_item_id')
      .order('practiced_at', { ascending: false })
    if (error) { console.error('Error cargando sesiones:', error); return [] }
    return data || []
  }

  // Hitos de XP ganados (ledger, no se pierden al borrar skills). Devuelve
  // null si la migración phase8 no está aplicada → el caller usa el fallback.
  async function loadXpEvents() {
    const { data, error } = await supabase
      .from('xp_events')
      .select('amount, reason, ref_name, created_at')
    if (error) {
      const missing = ['PGRST204', 'PGRST205', '42P01', '42703'].includes(error.code)
      if (!missing) console.error('Error cargando eventos de XP:', error)
      return null
    }
    return data || []
  }

  // Guarda una sesión y actualiza el bpm de la skill; si alcanzó la meta,
  // la marca como dominada.
  async function logSession({ skill_id, part_id = null, bpm = null, duration_seconds, routine_run_item_id = null, quality = 3 }) {
    const { error } = await supabase
      .from('practice_sessions')
      .insert({ skill_id, part_id, bpm, duration_seconds, routine_run_item_id, quality })
    if (error) throw error

    const s = skills.value.find(x => x.id === skill_id)
    if (s && part_id) {
      const { data: partSessions, error: partError } = await supabase
        .from('practice_sessions')
        .select('bpm, duration_seconds, quality')
        .eq('skill_id', skill_id)
        .eq('part_id', part_id)
        .order('practiced_at', { ascending: false })
        .limit(20)
      if (partError) throw partError
      const part = s.parts.find(item => item.id === part_id)
      if (part) {
        const partPatch = {}
        const evidence = progressFromSessions(partSessions || [], part.target_bpm || s.target_bpm)
        if (evidence > Number(part.progress || 0)) partPatch.progress = evidence
        const partBpm = stableBpm(partSessions || [])
        if (partBpm && partBpm !== part.current_bpm) partPatch.current_bpm = partBpm
        if (Object.keys(partPatch).length) await updatePart(skill_id, part_id, partPatch)
      }
    }

    if (s) {
      const patch = {}
      if (s.status !== 'mastered' && Number(duration_seconds) >= 10) patch.status = 'practicing'
      if (bpm) {
        const { data: recent, error: recentError } = await supabase
          .from('practice_sessions')
          .select('bpm, duration_seconds, quality')
          .eq('skill_id', skill_id)
          .not('bpm', 'is', null)
          .order('practiced_at', { ascending: false })
          .limit(5)
        if (recentError) throw recentError
        const reliable = (recent || []).filter(item => Number(item.duration_seconds) >= 60 && (item.quality || 3) >= 3)
        patch.current_bpm = stableBpm(recent || []) || bpm
        const qualifying = s.target_bpm
          ? reliable.filter(item => Number(item.bpm) >= s.target_bpm).length
          : 0
        if (s.target_bpm && qualifying >= 3) patch.status = 'mastered'
      }
      if (!s.target_bpm && s.parts.length && s.parts.every(part => Number(part.progress) >= 100)) patch.status = 'mastered'
      if (Object.keys(patch).length) await updateSkill(skill_id, patch)
    }
  }

  // ---------- Constructor de rutinas ----------
  function normalizeRoutine(value) {
    const sections = (value.sections || [])
      .sort((a, b) => a.position - b.position)
      .map(section => ({
        ...section,
        items: (section.items || []).sort((a, b) => a.position - b.position),
      }))
    return { ...value, sections, items: sections.flatMap(section => section.items) }
  }

  function syncRoutineItems(value) {
    if (value) value.items = value.sections.flatMap(section => section.items)
  }

  async function loadRoutines() {
    if (routines.value.length) return routines.value
    routineError.value = ''
    const [routineResult, sectionResult, itemResult] = await Promise.all([
      supabase.from('routines').select('*').order('name'),
      supabase.from('routine_sections').select('*').order('position'),
      supabase.from('routine_items').select('*').order('position'),
    ])
    const error = routineResult.error || sectionResult.error || itemResult.error
    if (error) {
      const migrationMissing = ['PGRST200', 'PGRST204', 'PGRST205', '42P01', '42703'].includes(error.code)
      routineError.value = migrationMissing
        ? 'Falta actualizar la base de datos para habilitar secciones y descansos.'
        : (error.message || 'No se pudieron cargar las rutinas.')
      console.error('Error cargando rutinas:', error)
      return []
    }
    if (routineResult.data?.length) {
      const sections = (sectionResult.data || []).map(section => ({
        ...section,
        items: (itemResult.data || []).filter(item => item.section_id === section.id),
      }))
      routines.value = routineResult.data.map(value => normalizeRoutine({
        ...value,
        sections: sections.filter(section => section.routine_id === value.id),
      }))
      routine.value = routines.value[0]
    } else {
      await createRoutine('Mi primera rutina')
    }
    return routines.value
  }

  // Alias conservado para las vistas que solo necesitan asegurar la carga.
  const loadRoutine = loadRoutines

  function selectRoutine(id) {
    routine.value = routines.value.find(item => item.id === id) || routines.value[0] || null
  }

  async function createRoutine(name) {
    const { data: created, error } = await supabase
      .from('routines').insert({ name, days: [] }).select().single()
    if (error) throw error
    const { data: section, error: sectionError } = await supabase
      .from('routine_sections')
      .insert({ routine_id: created.id, name: 'Calentamiento', position: 0 })
      .select().single()
    if (sectionError) throw sectionError
    const value = normalizeRoutine({ ...created, sections: [{ ...section, items: [] }] })
    routines.value.push(value)
    routine.value = value
    return value
  }

  async function updateRoutine(id, patch) {
    const { error } = await supabase.from('routines').update(patch).eq('id', id)
    if (error) throw error
    const target = routines.value.find(item => item.id === id)
    if (target) Object.assign(target, patch)
  }

  async function deleteRoutine(id) {
    if (routines.value.length <= 1) throw new Error('Debes conservar al menos una rutina')
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) throw error
    routines.value = routines.value.filter(item => item.id !== id)
    if (routine.value?.id === id) routine.value = routines.value[0] || null
  }

  async function updateRoutineDays(days, routineId = routine.value?.id) {
    if (!routineId) return
    const { error } = await supabase.from('routines').update({ days }).eq('id', routineId)
    if (error) throw error
    const target = routines.value.find(item => item.id === routineId)
    if (target) target.days = days
  }

  async function addRoutineSection(name) {
    const { data, error } = await supabase.from('routine_sections').insert({
      routine_id: routine.value.id,
      name,
      position: routine.value.sections.length,
    }).select().single()
    if (error) throw error
    const section = { ...data, items: [] }
    routine.value.sections.push(section)
    syncRoutineItems(routine.value)
    return section
  }

  async function updateRoutineSection(id, patch) {
    const { error } = await supabase.from('routine_sections').update(patch).eq('id', id)
    if (error) throw error
    const section = routine.value?.sections.find(item => item.id === id)
    if (section) Object.assign(section, patch)
  }

  async function removeRoutineSection(id) {
    if (routine.value.sections.length <= 1) throw new Error('La rutina necesita al menos una sección')
    const { error } = await supabase.from('routine_sections').delete().eq('id', id)
    if (error) throw error
    routine.value.sections = routine.value.sections.filter(item => item.id !== id)
    syncRoutineItems(routine.value)
  }

  async function addRoutineItem({ section_id = routine.value?.sections[0]?.id, skill_id, part_id = null, planned_minutes = 10, target_bpm = null }) {
    const section = routine.value?.sections.find(item => item.id === section_id)
    if (!section) throw new Error('Selecciona una sección')
    const { data, error } = await supabase.from('routine_items').insert({
      routine_id: routine.value.id,
      section_id, skill_id, part_id, planned_minutes, target_bpm,
      break_after_minutes: 0,
      position: section.items.length,
    }).select().single()
    if (error) throw error
    section.items.push(data)
    syncRoutineItems(routine.value)
    return data
  }

  async function updateRoutineItem(id, patch) {
    const { error } = await supabase.from('routine_items').update(patch).eq('id', id)
    if (error) throw error
    const item = routine.value?.sections.flatMap(section => section.items).find(child => child.id === id)
    if (item) Object.assign(item, patch)
    syncRoutineItems(routine.value)
  }

  async function removeRoutineItem(id) {
    const { error } = await supabase.from('routine_items').delete().eq('id', id)
    if (error) throw error
    for (const section of routine.value.sections) {
      section.items = section.items.filter(item => item.id !== id)
    }
    syncRoutineItems(routine.value)
  }

  async function moveRoutineItem(id, dir, sectionId = null) {
    const section = sectionId
      ? routine.value.sections.find(item => item.id === sectionId)
      : routine.value.sections.find(item => item.items.some(child => child.id === id))
    if (!section) return
    const items = section.items
    const i = items.findIndex(item => item.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= items.length) return
    ;[items[i], items[j]] = [items[j], items[i]]
    await Promise.all(items.map((item, index) =>
      item.position !== index ? updateRoutineItem(item.id, { position: index }) : null))
  }

  // ---------- Ejecución guiada de rutinas ----------
  async function loadRoutineRuns({ limit = 120 } = {}) {
    const { data, error } = await supabase
      .from('practice_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) {
      const missing = ['PGRST204', 'PGRST205', '42P01', '42703'].includes(error.code)
      if (!missing) console.error('Error cargando ejecuciones:', error)
      return []
    }
    routineRuns.value = data || []
    return routineRuns.value
  }

  async function loadPracticeRun(runId) {
    const [runResult, itemsResult] = await Promise.all([
      supabase.from('practice_runs').select('*').eq('id', runId).single(),
      supabase.from('practice_run_items').select('*').eq('run_id', runId).order('position'),
    ])
    const error = runResult.error || itemsResult.error
    if (error) throw error
    return { ...runResult.data, items: itemsResult.data || [] }
  }

  async function startRoutineRun(routineId) {
    await loadRoutines()
    const source = routines.value.find(item => item.id === routineId)
    if (!source?.items.length) throw new Error('Agrega habilidades antes de iniciar la misión')

    const { data: active, error: activeError } = await supabase
      .from('practice_runs')
      .select('id')
      .eq('routine_id', routineId)
      .eq('status', 'active')
      .maybeSingle()
    if (activeError) throw activeError
    if (active) return loadPracticeRun(active.id)

    const plannedSeconds = source.items.reduce((total, item) => total
      + (Number(item.planned_minutes) || 10) * 60
      + (Number(item.break_after_minutes) || 0) * 60, 0)
    const { data: run, error } = await supabase.from('practice_runs').insert({
      routine_id: source.id,
      routine_name: source.name,
      planned_seconds: plannedSeconds,
      total_items: source.items.length,
    }).select().single()
    if (error) throw error

    let position = 0
    const snapshots = source.sections.flatMap(section => section.items.map(item => {
      const selectedSkill = skills.value.find(skill => skill.id === item.skill_id)
      const selectedPart = selectedSkill?.parts.find(part => part.id === item.part_id)
      return {
        run_id: run.id,
        routine_item_id: item.id,
        skill_id: item.skill_id,
        part_id: item.part_id || null,
        part_name: selectedPart?.name || null,
        section_name: section.name,
        skill_name: selectedSkill?.name || 'Habilidad',
        position: position++,
        planned_seconds: (Number(item.planned_minutes) || 10) * 60,
        target_bpm: item.target_bpm || selectedSkill?.target_bpm || null,
        break_seconds: (Number(item.break_after_minutes) || 0) * 60,
      }
    }))
    const { data: runItems, error: itemsError } = await supabase
      .from('practice_run_items').insert(snapshots).select().order('position')
    if (itemsError) {
      await supabase.from('practice_runs').delete().eq('id', run.id)
      throw itemsError
    }
    routineRuns.value.unshift(run)
    return { ...run, items: runItems || [] }
  }

  async function updatePracticeRun(runId, patch) {
    const { data, error } = await supabase
      .from('practice_runs').update(patch).eq('id', runId).select().single()
    if (error) throw error
    const cached = routineRuns.value.find(item => item.id === runId)
    if (cached) Object.assign(cached, data)
    return data
  }

  async function updatePracticeRunItem(itemId, patch) {
    const { data, error } = await supabase
      .from('practice_run_items').update(patch).eq('id', itemId).select().single()
    if (error) throw error
    return data
  }

  async function finishPracticeRun(runId) {
    return updatePracticeRun(runId, { status: 'completed', completed_at: new Date().toISOString() })
  }

  function reset() {
    skills.value = []
    ready.value = false
    routines.value = []
    routine.value = null
    routineError.value = ''
    routineRuns.value = []
  }

  return {
    skills, ready, routines, routine, routineError, routineRuns,
    loadSkills, createSkill, createSkillFromSong, syncSongParts, updateSkill, deleteSkill,
    addPart, updatePart, deletePart,
    loadSessions, loadAllSessions, loadXpEvents, logSession,
    loadRoutine, loadRoutines, selectRoutine, createRoutine, updateRoutine, deleteRoutine,
    updateRoutineDays, addRoutineSection, updateRoutineSection, removeRoutineSection,
    addRoutineItem, updateRoutineItem, removeRoutineItem, moveRoutineItem,
    loadRoutineRuns, loadPracticeRun, startRoutineRun, updatePracticeRun,
    updatePracticeRunItem, finishPracticeRun,
    reset,
  }
})
