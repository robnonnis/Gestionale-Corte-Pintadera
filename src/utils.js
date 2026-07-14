export const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
export const GIORNI_BREVI = ['L','M','M','G','V','S','D']
export const GIORNI_SETT = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

export const today = () => new Date().toISOString().slice(0,10)
export const diffDays = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000)
export const fmt = n => '€' + Number(n||0).toLocaleString('it-IT', { minimumFractionDigits:0, maximumFractionDigits:0 })
export const fmtFull = n => '€' + Number(n||0).toLocaleString('it-IT', { minimumFractionDigits:2, maximumFractionDigits:2 })
export const fmtDate = d => { if (!d) return ''; const s=d.slice(0,10); const [y,m,g]=s.split('-'); return `${g}/${m}/${y}` }
export const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`

export const getUrgenza = data => {
  const d = diffDays(data, today())
  if (d < 0) return 'scaduto'
  if (d === 0) return 'oggi'
  if (d <= 7) return 'presto'
  return 'ok'
}

export const CAT_ICON = {
  prenotazione:'🏠', pulizie:'🧹', manutenzione:'🔧',
  'bolletta-luce':'⚡', 'bolletta-acqua':'💧', 'bolletta-internet':'📡',
  spesa:'🛒', tassa:'🏛', assicurazione:'🛡', commissione:'💳',
  bolletta:'⚡', licenza:'📋', reminder:'🔔', altro:'📦'
}

export const BOLL_TIPI = {
  luce:    { l:'Luce',     i:'⚡', c:'var(--oro)' },
  acqua:   { l:'Acqua',    i:'💧', c:'var(--cielo)' },
  internet:{ l:'Internet', i:'📡', c:'var(--verde)' },
  tari:    { l:'TARI',     i:'🗑', c:'var(--grigio)' },
  altro:   { l:'Altro',    i:'📦', c:'var(--terracotta)' },
}

export const PERIODO_COLOR = {
  bassa: { bg:'rgba(139,115,85,.12)', c:'var(--grigio)',      label:'Bassa' },
  media: { bg:'rgba(123,167,188,.2)', c:'#2a5566',            label:'Media' },
  alta:  { bg:'rgba(74,103,65,.15)',  c:'var(--verde)',        label:'Alta'  },
  picco: { bg:'rgba(184,92,56,.15)',  c:'var(--terracotta)',   label:'Picco' },
}

export const piattaformaLabel = p => p==='airbnb'?'Airbnb':p==='booking'?'Booking':'Diretto'
export const piattaformaBadge = p => p==='airbnb'?'badge-airbnb':p==='booking'?'badge-booking':'badge-diretto'

// ── Occupazione calendario (prenotazioni manuali + eventi iCal) ──────────
// Unisce le prenotazioni inserite a mano con gli eventi importati da
// Airbnb/Booking (tabella prenotazioni_ical), evitando i duplicati: se un
// evento iCal coincide (per ical_uid o per date+piattaforma) con una riga
// di `prenotazioni`, vince quella manuale perché ha nome e importo.
export function buildOccupancy(prenotazioni, prenotazioniIcal) {
  const matchedUids = new Set(prenotazioni.filter(p=>p.ical_uid).map(p=>p.ical_uid))
  const icalOnly = (prenotazioniIcal||[]).filter(ev => {
    if (matchedUids.has(ev.uid)) return false
    const dup = prenotazioni.some(p=>p.checkin===ev.data_inizio && p.checkout===ev.data_fine && p.piattaforma===ev.source)
    return !dup
  })
  const items = [
    ...prenotazioni.map(p => ({
      id:'m-'+p.id, kind:'manuale', checkin:p.checkin, checkout:p.checkout,
      piattaforma:p.piattaforma||'diretto', nome:p.nome, totale:p.totale, tipo:'prenotazione', ref:p
    })),
    ...icalOnly.map(ev => ({
      id:'i-'+ev.uid, kind:'ical', checkin:ev.data_inizio, checkout:ev.data_fine,
      piattaforma:ev.source, nome:null, totale:null,
      tipo: ev.chiusura_manuale ? 'blocco' : ev.tipo, ref:ev
    })),
  ].sort((a,b)=>a.checkin.localeCompare(b.checkin))

  const dayMap = {}
  items.forEach(it => {
    let d = new Date(it.checkin); const end = new Date(it.checkout)
    while (d < end) {
      const k = d.toISOString().slice(0,10)
      if (!dayMap[k] || it.kind==='manuale') dayMap[k] = it
      d = new Date(d.getTime()+86400000)
    }
  })
  return { items, dayMap }
}

export const occupancyLabel = it => {
  if (it.kind==='manuale') return it.nome
  if (it.tipo==='blocco') return 'Blocco / Ferie'
  return it.piattaforma==='booking' ? 'Ospite Booking' : 'Ospite Airbnb'
}

export const occupancyColorClass = it => {
  if (it.tipo==='blocco') return 'blocco'
  if (it.piattaforma==='airbnb') return 'airbnb'
  if (it.piattaforma==='booking') return 'booking'
  return 'diretto'
}

// ── Pricing: taglio combinato (commissione OTA + cedolare) e prezzo minimo ─
// Dal 13/10/2026 Airbnb allinea le commissioni a Booking: le percentuali sono
// lette da `impostazioni` (taglio_diretto_pct, taglio_booking_pct,
// taglio_airbnb_prima_pct, taglio_airbnb_dopo_pct, data_cambio_airbnb,
// utile_min_giorno) cosi' da poterle correggere senza toccare il codice.
export function taglioPiattaforma(piattaforma, dataRif, impostazioni) {
  const pct = k => parseFloat(impostazioni?.[k] ?? '0') || 0
  if (piattaforma === 'booking') return pct('taglio_booking_pct')
  if (piattaforma === 'airbnb') {
    const cambio = impostazioni?.data_cambio_airbnb
    return (cambio && dataRif >= cambio) ? pct('taglio_airbnb_dopo_pct') : pct('taglio_airbnb_prima_pct')
  }
  return pct('taglio_diretto_pct')
}

export function prezzoMinimo(piattaforma, dataRif, impostazioni) {
  const taglio = taglioPiattaforma(piattaforma, dataRif, impostazioni)
  const utileMin = parseFloat(impostazioni?.utile_min_giorno ?? '50') || 0
  if (taglio >= 100) return Infinity
  return utileMin / (1 - taglio/100)
}
