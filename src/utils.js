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
