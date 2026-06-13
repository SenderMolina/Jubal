#!/usr/bin/env node
// =====================================================================
// Migra un export JSON del Firebase Realtime Database a Supabase.
//
//   export SUPABASE_URL="https://xxxx.supabase.co"
//   export SUPABASE_SERVICE_KEY="eyJ..."   # service_role (SOLO local)
//   node scripts/migrate-firebase-to-supabase.mjs firebase-export.json
//
// Idempotente: usa upsert por id. Ejecuta antes el esquema (supabase/schema.sql).
// =====================================================================
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env
const file = process.argv[2]

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !file) {
  console.error('Faltan SUPABASE_URL, SUPABASE_SERVICE_KEY o el archivo de export.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// El RTDB puede exportar arrays como arrays (con huecos null) o como objetos.
const toList = v => !v ? [] : (Array.isArray(v) ? v.filter(Boolean) : Object.values(v))

async function run() {
  const root = JSON.parse(readFileSync(file, 'utf8'))
  // Soporta export con o sin el nodo raíz envolviendo todo.
  const data = root.songs || root.activities || root.repertoires ? root : (Object.values(root)[0] || {})

  const songs       = toList(data.songs)
  const songTypes   = toList(data.songTypes)
  const repertoires = toList(data.repertoires)
  const activities  = toList(data.activities)
  const leaderPwd   = data.config?.leaderPassword ?? 'musicman'

  const upsert = async (table, rows) => {
    if (!rows.length) return console.log(`  ${table}: (vacío)`)
    const { error } = await supabase.from(table).upsert(rows)
    if (error) throw new Error(`${table}: ${error.message}`)
    console.log(`  ${table}: ${rows.length} filas`)
  }

  console.log('Migrando…')

  await upsert('songs', songs.map(s => ({
    id: s.id, title: s.title ?? '', author: s.author ?? '',
    key: s.key ?? '', bpm: s.bpm ?? null, lyrics: s.lyrics ?? '',
  })))

  await upsert('song_types', songTypes.map(t => ({ id: t.id, name: t.name ?? '' })))

  await upsert('activities', activities.map(a => ({
    id: a.id, title: a.title ?? '', date: a.date ?? null, time: a.time ?? null,
    description: a.description ?? '', tiempos: a.tiempos ?? [],
  })))

  await upsert('repertoires', repertoires.map(r => ({ id: r.id, name: r.name ?? '' })))

  const links = repertoires.flatMap(r =>
    toList(r.songs).map((songId, i) => ({ repertoire_id: r.id, song_id: songId, position: i }))
  )
  await upsert('repertoire_songs', links)

  await upsert('app_config', [{ key: 'leaderPassword', value: leaderPwd }])

  console.log('Listo ✅')
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
