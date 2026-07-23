import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export function useDb() {
  const [data, setData] = useState({
    prenotazioni: [], prenotazioniIcal: [], chiusureManuali: [], ospiti: [], finanze: [], bollette: [],
    scadenze: [], prezzi: [], regole: [], checklist: [],
    manutenzioni: [], inventario: [], documenti: [], impostazioni: {}
  })
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(navigator.onLine)

  const local = {
    save: (k, v) => { try { localStorage.setItem('cp2_'+k, JSON.stringify(v)) } catch {} },
    load: (k, fb) => { try { const d = localStorage.getItem('cp2_'+k); return d ? JSON.parse(d) : fb } catch { return fb } }
  }

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pren, prenIcal, chiu, osp, fin, boll, scad, prz, reg, chk, man, inv, doc, imp] = await Promise.all([
        supabase.from('prenotazioni').select('*').order('checkin'),
        supabase.from('prenotazioni_ical').select('*').order('data_inizio'),
        supabase.from('chiusure_manuali').select('*').order('data_inizio'),
        supabase.from('ospiti').select('*').order('nome'),
        supabase.from('finanze').select('*').order('data', { ascending: false }),
        supabase.from('bollette').select('*').order('scadenza', { ascending: false }),
        supabase.from('scadenze').select('*').order('data'),
        supabase.from('prezzi').select('*').order('data_inizio'),
        supabase.from('regole_prezzo').select('*').order('priorita'),
        supabase.from('checklist_template').select('*').order('ordine'),
        supabase.from('manutenzioni').select('*').order('data', { ascending: false }),
        supabase.from('inventario').select('*').order('categoria'),
        supabase.from('documenti').select('*').order('scadenza'),
        supabase.from('impostazioni').select('*'),
      ])
      const impostazioni = {}
      ;(imp.data || []).forEach(i => { impostazioni[i.chiave] = i.valore })
      const next = {
        prenotazioni: pren.data || [], prenotazioniIcal: prenIcal.data || [], chiusureManuali: chiu.data || [], ospiti: osp.data || [],
        finanze: fin.data || [], bollette: boll.data || [],
        scadenze: scad.data || [], prezzi: prz.data || [],
        regole: reg.data || [], checklist: chk.data || [],
        manutenzioni: man.data || [], inventario: inv.data || [],
        documenti: doc.data || [], impostazioni
      }
      setData(next)
      Object.entries(next).forEach(([k,v]) => local.save(k, v))
    } catch (e) {
      console.warn('Offline, uso cache', e)
      const keys = ['prenotazioni','prenotazioniIcal','chiusureManuali','ospiti','finanze','bollette','scadenze','prezzi','regole','checklist','manutenzioni','inventario','documenti','impostazioni']
      const cached = {}
      keys.forEach(k => { cached[k] = local.load(k, k === 'impostazioni' ? {} : []) })
      setData(cached)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Ricarica quando l'app torna in primo piano (es. riaprendo il telefono)
  // e periodicamente ogni 5 minuti, cosi' i dati restano sincronizzati con
  // il sync iCal automatico (ogni 2h) e con le modifiche fatte da altri
  // dispositivi, senza dover ricaricare manualmente la pagina.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', loadAll)
    const interval = setInterval(loadAll, 5 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', loadAll)
      clearInterval(interval)
    }
  }, [loadAll])

  // ── Generic helpers ────────────────────────────────────────────────
  const insert = async (table, stateKey, payload, sort) => {
    const { data: d, error } = await supabase.from(table).insert([payload]).select().single()
    if (error) throw error
    setData(prev => {
      const next = [...prev[stateKey], d]
      if (sort) next.sort(sort)
      local.save(stateKey, next)
      return { ...prev, [stateKey]: next }
    })
    return d
  }

  const update = async (table, stateKey, id, payload) => {
    const { data: d, error } = await supabase.from(table).update(payload).eq('id', id).select().single()
    if (error) throw error
    setData(prev => {
      const next = prev[stateKey].map(x => x.id === id ? d : x)
      local.save(stateKey, next)
      return { ...prev, [stateKey]: next }
    })
    return d
  }

  const remove = async (table, stateKey, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    setData(prev => {
      const next = prev[stateKey].filter(x => x.id !== id)
      local.save(stateKey, next)
      return { ...prev, [stateKey]: next }
    })
  }

  // ── PRENOTAZIONI ──────────────────────────────────────────────────
  const addPrenotazione = p => insert('prenotazioni', 'prenotazioni', p, (a,b)=>a.checkin.localeCompare(b.checkin))
  const updatePrenotazione = (id, p) => update('prenotazioni', 'prenotazioni', id, p)
  const deletePrenotazione = id => remove('prenotazioni', 'prenotazioni', id)

  const importPrenotazioniIcal = async (events) => {
    let imported = 0
    for (const ev of events) {
      if (!ev.checkin || !ev.checkout || ev.checkin === ev.checkout) continue
      const n = ev.nome.toLowerCase()
      if (n.includes('block') || n.includes('not available') || n.includes('chiuso')) continue
      const payload = { nome: ev.nome, checkin: ev.checkin, checkout: ev.checkout,
        ospiti_num: 1, totale: 0, piattaforma: ev.piattaforma, ical_uid: ev.uid || null, note: 'Importato iCal' }
      if (ev.uid) {
        const { error } = await supabase.from('prenotazioni').upsert(payload, { onConflict: 'ical_uid', ignoreDuplicates: true })
        if (!error) imported++
      } else {
        const { data: ex } = await supabase.from('prenotazioni').select('id').eq('checkin', ev.checkin).eq('checkout', ev.checkout).eq('piattaforma', ev.piattaforma)
        if (!ex?.length) { const { error } = await supabase.from('prenotazioni').insert([payload]); if (!error) imported++ }
      }
    }
    await loadAll()
    return imported
  }

  const toggleChiusuraIcal = async (uid, chiusura) => {
    const { data: d, error } = await supabase.from('prenotazioni_ical').update({ chiusura_manuale: chiusura }).eq('uid', uid).select().single()
    if (error) throw error
    setData(prev => {
      const next = prev.prenotazioniIcal.map(x => x.uid === uid ? d : x)
      local.save('prenotazioniIcal', next)
      return { ...prev, prenotazioniIcal: next }
    })
    return d
  }

  // Segna/rimuovi una chiusura per intervallo di date (non per uid): Booking
  // rigenera l'uid ogni volta che la chiusura viene modificata sul suo
  // calendario, cancellando il flag sulla vecchia riga — questa tabella
  // sopravvive al cambio uid perche' ricorda l'intervallo, non l'evento.
  const segnaChiusura = async (uid, checkin, checkout, chiusura) => {
    await toggleChiusuraIcal(uid, chiusura)
    if (chiusura) {
      await insert('chiusure_manuali', 'chiusureManuali', { data_inizio: checkin, data_fine: checkout }, (a,b)=>a.data_inizio.localeCompare(b.data_inizio))
    } else {
      const daRimuovere = data.chiusureManuali.filter(c => checkin<c.data_fine && checkout>c.data_inizio)
      for (const c of daRimuovere) await remove('chiusure_manuali', 'chiusureManuali', c.id)
    }
  }

  // ── OSPITI ────────────────────────────────────────────────────────
  const addOspite = o => insert('ospiti', 'ospiti', o, (a,b)=>a.nome.localeCompare(b.nome))
  const updateOspite = (id, o) => update('ospiti', 'ospiti', id, o)
  const deleteOspite = id => remove('ospiti', 'ospiti', id)

  // ── FINANZE ───────────────────────────────────────────────────────
  const addFinanza = f => insert('finanze', 'finanze', f, (a,b)=>b.data.localeCompare(a.data))
  const deleteFinanza = id => remove('finanze', 'finanze', id)

  // ── BOLLETTE ──────────────────────────────────────────────────────
  const addBolletta = b => insert('bollette', 'bollette', b)
  const updateBolletta = (id, b) => update('bollette', 'bollette', id, b)
  const deleteBolletta = id => remove('bollette', 'bollette', id)

  // ── SCADENZE ──────────────────────────────────────────────────────
  const addScadenza = s => insert('scadenze', 'scadenze', s, (a,b)=>a.data.localeCompare(b.data))
  const updateScadenza = (id, s) => update('scadenze', 'scadenze', id, s)
  const deleteScadenza = id => remove('scadenze', 'scadenze', id)

  // ── PREZZI ────────────────────────────────────────────────────────
  const addPrezzo = p => insert('prezzi', 'prezzi', p)
  const updatePrezzo = (id, p) => update('prezzi', 'prezzi', id, p)
  const deletePrezzo = id => remove('prezzi', 'prezzi', id)

  const addRegola = r => insert('regole_prezzo', 'regole', r)
  const updateRegola = (id, r) => update('regole_prezzo', 'regole', id, r)
  const deleteRegola = id => remove('regole_prezzo', 'regole', id)

  // ── CHECKLIST ─────────────────────────────────────────────────────
  const initChecklist = async (prenotazione_id) => {
    const templates = data.checklist
    if (!templates.length) return
    const existing = await supabase.from('checklist_istanze').select('template_id').eq('prenotazione_id', prenotazione_id)
    const existingIds = new Set((existing.data||[]).map(x=>x.template_id))
    const toInsert = templates.filter(t => !existingIds.has(t.id)).map(t => ({ prenotazione_id, template_id: t.id, completata: false }))
    if (toInsert.length) await supabase.from('checklist_istanze').insert(toInsert)
  }

  const getChecklist = async (prenotazione_id) => {
    const { data: d } = await supabase.from('checklist_istanze')
      .select('*, checklist_template(*)')
      .eq('prenotazione_id', prenotazione_id)
      .order('checklist_template(ordine)')
    return d || []
  }

  const toggleChecklist = async (id, completata) => {
    await supabase.from('checklist_istanze').update({ completata }).eq('id', id)
  }

  // ── MANUTENZIONI ─────────────────────────────────────────────────
  const addManutenzione = m => insert('manutenzioni', 'manutenzioni', m)
  const updateManutenzione = (id, m) => update('manutenzioni', 'manutenzioni', id, m)
  const deleteManutenzione = id => remove('manutenzioni', 'manutenzioni', id)

  // ── INVENTARIO ───────────────────────────────────────────────────
  const addInventario = i => insert('inventario', 'inventario', i)
  const updateInventario = (id, i) => update('inventario', 'inventario', id, i)
  const deleteInventario = id => remove('inventario', 'inventario', id)

  // ── DOCUMENTI ────────────────────────────────────────────────────
  const addDocumento = d => insert('documenti', 'documenti', d)
  const updateDocumento = (id, d) => update('documenti', 'documenti', id, d)
  const deleteDocumento = id => remove('documenti', 'documenti', id)

  // ── IMPOSTAZIONI ─────────────────────────────────────────────────
  const saveImpostazione = async (chiave, valore) => {
    await supabase.from('impostazioni').upsert({ chiave, valore })
    setData(prev => ({ ...prev, impostazioni: { ...prev.impostazioni, [chiave]: valore } }))
  }

  const saveIcal = async (airbnb, booking) => {
    await Promise.all([saveImpostazione('ical_airbnb', airbnb), saveImpostazione('ical_booking', booking)])
  }

  // ── ALLOGGIATI WEB ───────────────────────────────────────────────
  const generaSchedina = (prenotazione, ospite) => {
    if (!ospite) return null
    // Formato testo per Alloggiati Web (portale PS)
    const lines = [
      `STRUTTURA: Corte Pintadera`,
      `CIN: IT092090C2000U5554`,
      ``,
      `OSPITE:`,
      `Nome: ${ospite.nome} ${ospite.cognome || ''}`,
      `Data nascita: ${ospite.data_nascita || '---'}`,
      `Luogo nascita: ${ospite.luogo_nascita || '---'}`,
      `Nazionalità: ${ospite.nazionalita || 'IT'}`,
      `Tipo documento: ${ospite.tipo_documento || '---'}`,
      `N° documento: ${ospite.numero_documento || '---'}`,
      ``,
      `SOGGIORNO:`,
      `Check-in: ${prenotazione.checkin}`,
      `Check-out: ${prenotazione.checkout}`,
      `N° ospiti: ${prenotazione.ospiti_num}`,
    ]
    return lines.join('\n')
  }

  return {
    ...data, loading, online, reload: loadAll,
    addPrenotazione, updatePrenotazione, deletePrenotazione, importPrenotazioniIcal,
    addOspite, updateOspite, deleteOspite,
    addFinanza, deleteFinanza,
    addBolletta, updateBolletta, deleteBolletta,
    addScadenza, updateScadenza, deleteScadenza,
    addPrezzo, updatePrezzo, deletePrezzo,
    addRegola, updateRegola, deleteRegola,
    initChecklist, getChecklist, toggleChecklist,
    toggleChiusuraIcal, segnaChiusura,
    addManutenzione, updateManutenzione, deleteManutenzione,
    addInventario, updateInventario, deleteInventario,
    addDocumento, updateDocumento, deleteDocumento,
    saveImpostazione, saveIcal,
    generaSchedina,
  }
}
