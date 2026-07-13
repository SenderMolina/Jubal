import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

// Store del espacio personal: skills, partes y sesiones de práctica.
// Todo va acotado al usuario por RLS (user_id = auth.uid()), sin filtros extra.
export const usePracticeStore = defineStore('practice', () => {
  const skills = ref([])   // [{ ...skill, parts: [...] }]
  const ready  = ref(false)

  async function loadSkills() {
    const { data, error } = await supabase
      .from('skills')
      .select('*, parts:skill_parts(*)')
      .order('created_at', { ascending: false })
    if (error) { console.error('Error cargando skills:', error); return }
    skills.value = (data || []).map(s => ({
      ...s,
      parts: (s.parts || []).sort((a, b) => a.position - b.position),
    }))
    ready.value = true
  }

  async function createSkill({ name, type, target_bpm = null, song_id = null }) {
    const { data, error } = await supabase
      .from('skills')
      .insert({ name, type, target_bpm, song_id })
      .select('*, parts:skill_parts(*)')
      .single()
    if (error) throw error
    skills.value.unshift({ ...data, parts: [] })
    return data
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
  async function addPart(skillId, name) {
    const s = skills.value.find(x => x.id === skillId)
    const position = s ? s.parts.length : 0
    const { data, error } = await supabase
      .from('skill_parts')
      .insert({ skill_id: skillId, name, position })
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

  // Guarda una sesión y actualiza el bpm de la skill; si alcanzó la meta,
  // la marca como dominada.
  async function logSession({ skill_id, part_id = null, bpm = null, duration_seconds }) {
    const { error } = await supabase
      .from('practice_sessions')
      .insert({ skill_id, part_id, bpm, duration_seconds })
    if (error) throw error

    const s = skills.value.find(x => x.id === skill_id)
    if (s && bpm) {
      const patch = { current_bpm: Math.max(bpm, s.current_bpm || 0) }
      if (s.target_bpm && bpm >= s.target_bpm) patch.status = 'mastered'
      else if (s.status === 'learning') patch.status = 'practicing'
      await updateSkill(skill_id, patch)
    }
  }

  function reset() {
    skills.value = []
    ready.value = false
  }

  return {
    skills, ready,
    loadSkills, createSkill, updateSkill, deleteSkill,
    addPart, updatePart, deletePart,
    loadSessions, logSession,
    reset,
  }
})
