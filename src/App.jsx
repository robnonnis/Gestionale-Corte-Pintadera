import { useState, useCallback, useEffect } from 'react'
import { useDb } from './useDb'
import { css } from './styles'
import logoImg from './assets/logo.jpg'
import {
  MESI, GIORNI_BREVI, GIORNI_SETT, today, diffDays,
  fmt, fmtFull, fmtDate, monthKey,
  getUrgenza, CAT_ICON, BOLL_TIPI, PERIODO_COLOR,
  piattaformaLabel, piattaformaBadge, REGOLA_TIPO_LABEL,
  buildOccupancy, occupancyLabel, occupancyColorClass,
  prezzoMinimo, scomponi, aggregaPrenotazioni, occupancyRate
} from './utils'

// ── Logo ─────────────────────────────────────────────────────────────────
const Logo = () => <img src={logoImg} alt="Corte Pintadera" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>

// ── Modal ─────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null
  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" style={wide?{maxHeight:'95vh'}:{}} onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        {title && <div className="mtitle">{title}</div>}
        {children}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('')
  const [v, setV] = useState(false)
  const show = useCallback(m => { setMsg(m); setV(true); setTimeout(()=>setV(false),2600) }, [])
  return { msg, v, show }
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const db = useDb()
  const toast = useToast()
  const [screen, setScreen] = useState('home')
  const [modal, setModal] = useState(null)
  const [subModal, setSubModal] = useState(null)
  const [finMonth, setFinMonth] = useState(new Date())
  const [calMonth, setCalMonth] = useState(new Date())
  const [openMonths, setOpenMonths] = useState(new Set())
  const [finTab, setFinTab] = useState('transazioni')
  const [bollTipo, setBollTipo] = useState('luce')
  const [bollFilter, setBollFilter] = useState('tutte')
  const [scadTab, setScadTab] = useState('attive')
  const [gestTab, setGestTab] = useState('manutenzioni')
  const [prezziTab, setPrezziTab] = useState('tariffe')
  const [selectedPren, setSelectedPren] = useState(null)
  const [checklistData, setChecklistData] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState('')
  const [icalStatus, setIcalStatus] = useState('')

  // Form states
  const emptyFin = { tipo:'entrata', descrizione:'', importo:'', data:today(), categoria:'prenotazione', piattaforma:'diretto', note:'' }
  const emptyPren = { nome:'', checkin:'', checkout:'', ospiti_num:2, totale:'', acconto:'', commissione:'', piattaforma:'diretto', stato_pagamento:'da_saldare', note:'', ospite_id:'', ical_uid:'', recensione_voto:'', recensione_testo:'' }
  const emptyScad = { titolo:'', data:'', importo:'', categoria:'bolletta', ricorrenza:'una-tantum', note:'' }
  const emptyBoll = { tipo:'luce', numero:'', data:today(), scadenza:'', periodo:'', importo:'', fornitore:'', stato:'da-pagare', data_pagamento:'', note:'' }
  const emptyMan = { titolo:'', tipo:'ordinaria', data:today(), costo:'', fornitore:'', telefono:'', stato:'completato', prossima_data:'', note:'' }
  const emptyInv = { nome:'', categoria:'Cucina', quantita:1, stato:'ok', note:'' }
  const emptyDoc = { nome:'', tipo:'Licenza', scadenza:'', numero:'', fornitore:'', url:'', note:'' }
  const emptyPrz = { nome_periodo:'', tipo_periodo:'media', data_inizio:'', data_fine:'', prezzo_airbnb:'', prezzo_booking:'', prezzo_diretto:'', soggiorno_min:2, note:'' }
  const emptyOspite = { nome:'', cognome:'', email:'', telefono:'', nazionalita:'IT', tipo_documento:'CI', numero_documento:'', data_nascita:'', luogo_nascita:'', note:'' }

  const [finForm, setFinForm] = useState(emptyFin)
  const [prenForm, setPrenForm] = useState(emptyPren)
  const [scadForm, setScadForm] = useState(emptyScad)
  const [bollForm, setBollForm] = useState(emptyBoll)
  const [manForm, setManForm] = useState(emptyMan)
  const [invForm, setInvForm] = useState(emptyInv)
  const [docForm, setDocForm] = useState(emptyDoc)
  const [przForm, setPrzForm] = useState(emptyPrz)
  const [ospForm, setOspForm] = useState(emptyOspite)

  // ── Date ────────────────────────────────────────────────────────────
  const now = new Date()
  const giornoNum = now.getDate()
  const giornoLbl = GIORNI_SETT[now.getDay()].slice(0,3).toUpperCase() + ' · ' + now.toLocaleDateString('it-IT',{month:'short',year:'2-digit'}).toUpperCase()

  // ── Occupazione unificata (prenotazioni manuali + eventi iCal) ────────
  const occ = buildOccupancy(db.prenotazioni, db.prenotazioniIcal, db.chiusureManuali)

  // ── KPI ─────────────────────────────────────────────────────────────
  const mk = monthKey(now)
  const finMese = db.finanze.filter(f=>f.data.slice(0,7)===mk)
  // Incassi: dalla tabella prenotazioni (somma totale), non dalle finanze —
  // le finanze non vengono compilate per ogni prenotazione importata da iCal.
  const prenMeseHome = db.prenotazioni.filter(p=>p.checkin.slice(0,7)===mk)
  const aggMeseHome = aggregaPrenotazioni(prenMeseHome, db.impostazioni)
  const entrMese = aggMeseHome.lordo
  const nettoMese = aggMeseHome.netto
  const uscMese  = finMese.filter(f=>f.tipo==='uscita').reduce((s,f)=>s+Number(f.importo),0)
  const todayStr = today()
  const prenFuture = db.prenotazioni.filter(p=>p.checkout>=todayStr).sort((a,b)=>a.checkin.localeCompare(b.checkin))
  // Prenotazioni + eventi iCal non abbinati, in un unico ordine cronologico
  const occFuture = occ.items.filter(it=>it.checkout>=todayStr)
  // Solo le occupazioni che ricadono nel mese mostrato dal mini-calendario
  const calMk = monthKey(calMonth)
  const calMonthStart = calMk+'-01'
  const calMonthEnd = new Date(Date.UTC(calMonth.getFullYear(), calMonth.getMonth()+1, 0)).toISOString().slice(0,10)
  const occMese = occ.items.filter(it=>it.checkin<=calMonthEnd && it.checkout>calMonthStart).sort((a,b)=>a.checkin.localeCompare(b.checkin))
  // Riepilogo economico per ogni mese della stagione (passato e futuro),
  // usato dall'accordion "Riepilogo per mese" — espandibile per vedere il
  // dettaglio senza dover navigare il mini-calendario mese per mese.
  const mesiStagione = (() => {
    const byMonth = {}
    occ.items.forEach(it => { (byMonth[it.checkin.slice(0,7)] ||= []).push(it) })
    return Object.keys(byMonth).sort().map(mk => {
      const items = byMonth[mk].sort((a,b)=>a.checkin.localeCompare(b.checkin))
      const prenMese = db.prenotazioni.filter(p=>p.checkin.slice(0,7)===mk)
      return { mk, items, agg: aggregaPrenotazioni(prenMese, db.impostazioni) }
    })
  })()
  const prenOggiCI = db.prenotazioni.filter(p=>p.checkin===todayStr)
  const prenOggiCO = db.prenotazioni.filter(p=>p.checkout===todayStr)
  const prenInCorso = db.prenotazioni.filter(p=>p.checkin<=todayStr&&p.checkout>todayStr)

  // ── Dati per la sezione Analisi (grafici): stessa base di mesiStagione,
  // con in piu' occupazione % (stessa formula del KPI Home/Prenotazioni:
  // giorni occupati/giorni del mese, blocco/ferie inclusi) e ADR (lordo/notti).
  const mesiAnalisi = mesiStagione.map(({mk, agg}) => {
    const [y,m] = mk.split('-')
    return {
      mk, label: MESI[Number(m)-1].slice(0,3)+' '+y.slice(2),
      lordo: agg.lordo, netto: agg.netto, notti: agg.notti,
      occPerc: occupancyRate(occ.dayMap, Number(y), Number(m)),
      adr: agg.notti>0 ? agg.lordo/agg.notti : 0,
      adrNetto: agg.notti>0 ? agg.netto/agg.notti : 0,
    }
  })
  const platformTotali = (() => {
    const t = { airbnb:{lordo:0,count:0}, booking:{lordo:0,count:0}, diretto:{lordo:0,count:0} }
    db.prenotazioni.forEach(p => {
      const k = t[p.piattaforma] ? p.piattaforma : 'diretto'
      t[k].lordo += Number(p.totale)||0
      t[k].count += 1
    })
    return [
      { label:'Airbnb', color:'#C0392B', value:t.airbnb.lordo, sub:`${fmt(t.airbnb.lordo)} · ${t.airbnb.count} pren.` },
      { label:'Booking', color:'#003B95', value:t.booking.lordo, sub:`${fmt(t.booking.lordo)} · ${t.booking.count} pren.` },
      { label:'Diretto', color:'#4A6741', value:t.diretto.lordo, sub:`${fmt(t.diretto.lordo)} · ${t.diretto.count} pren.` },
    ]
  })()

  // Occupazione mese corrente (manuali + iCal, chiusure escluse)
  const occPerc = occupancyRate(occ.dayMap, now.getFullYear(), now.getMonth()+1)

  const scadUrgenti = db.scadenze.filter(s=>!s.completata&&['scaduto','oggi'].includes(getUrgenza(s.data)))
  const bollUrgenti = db.bollette.filter(b=>b.stato!=='pagata'&&diffDays(b.scadenza,todayStr)<=7)

  // Trova un'occupazione (manuale o iCal) che si sovrappone alle date date,
  // escludendo eventualmente la prenotazione che si sta modificando
  const trovaSovrapposizione = (checkin, checkout, excludeId, excludeIcalUid) => {
    if (!checkin || !checkout || checkout<=checkin) return null
    return occ.items.find(it => {
      if (excludeId && it.kind==='manuale' && it.ref.id===excludeId) return false
      if (excludeIcalUid && it.kind==='ical' && it.ref.uid===excludeIcalUid) return false
      return checkin<it.checkout && checkout>it.checkin
    }) || null
  }

  // ── SAVE handlers ────────────────────────────────────────────────────
  const salvaFinanza = async () => {
    if (!finForm.descrizione || !finForm.importo || !finForm.data) { toast.show('Compila i campi obbligatori'); return }
    try { await db.addFinanza({...finForm, importo:parseFloat(finForm.importo)}); toast.show('✅ Salvata'); setModal(null); setFinForm(emptyFin) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const toggleMonth = mk => setOpenMonths(s => { const n = new Set(s); n.has(mk) ? n.delete(mk) : n.add(mk); return n })
  const apriModificaPrenotazione = (p) => {
    setPrenForm({
      id:p.id, nome:p.nome, checkin:p.checkin, checkout:p.checkout, ospiti_num:p.ospiti_num||1,
      totale:p.totale||'', acconto:p.acconto||'', commissione:p.commissione||'', piattaforma:p.piattaforma||'diretto',
      stato_pagamento:p.stato_pagamento||'da_saldare', note:p.note||'', ospite_id:p.ospite_id||'', ical_uid:p.ical_uid||'',
      recensione_voto:p.recensione_voto??'', recensione_testo:p.recensione_testo||''
    })
    setModal('modal-prenotazione')
  }
  // "Promuove" un evento iCal senza prenotazione manuale (es. Booking, che non
  // ha mai nome/importo) a prenotazione modificabile, collegandola tramite
  // ical_uid cosi' che non compaia piu' come voce "fantasma" separata.
  const apriDaIcal = (it) => {
    setPrenForm({...emptyPren, checkin:it.checkin, checkout:it.checkout, piattaforma:it.piattaforma, ical_uid:it.ref.uid})
    setModal('modal-prenotazione')
  }
  const salvaPrenotazione = async () => {
    if (!prenForm.nome||!prenForm.checkin||!prenForm.checkout) { toast.show('Nome e date obbligatori'); return }
    if (prenForm.checkout<=prenForm.checkin) { toast.show('Check-out deve essere dopo check-in'); return }
    try {
      const payload = {nome:prenForm.nome, checkin:prenForm.checkin, checkout:prenForm.checkout,
        ospiti_num:parseInt(prenForm.ospiti_num)||1, totale:parseFloat(prenForm.totale)||0,
        acconto:parseFloat(prenForm.acconto)||0, commissione:parseFloat(prenForm.commissione)||0,
        piattaforma:prenForm.piattaforma, stato_pagamento:prenForm.stato_pagamento, note:prenForm.note,
        ospite_id:prenForm.ospite_id||null, ical_uid:prenForm.ical_uid||null,
        recensione_voto:prenForm.recensione_voto!==''?parseFloat(prenForm.recensione_voto):null,
        recensione_testo:prenForm.recensione_testo||null}
      if (prenForm.id) await db.updatePrenotazione(prenForm.id, payload)
      else await db.addPrenotazione(payload)
      toast.show('✅ Prenotazione salvata'); setModal(null); setPrenForm(emptyPren)
    } catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaScadenza = async () => {
    if (!scadForm.titolo||!scadForm.data) { toast.show('Titolo e data obbligatori'); return }
    try { await db.addScadenza({...scadForm, importo:scadForm.importo?parseFloat(scadForm.importo):null, completata:false}); toast.show('✅ Scadenza salvata'); setModal(null); setScadForm(emptyScad) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaBolletta = async () => {
    if (!bollForm.importo||!bollForm.scadenza) { toast.show('Importo e scadenza obbligatori'); return }
    try { await db.addBolletta({...bollForm, importo:parseFloat(bollForm.importo)}); toast.show('✅ Bolletta salvata'); setModal(null); setBollForm(emptyBoll) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaManutenzione = async () => {
    if (!manForm.titolo||!manForm.data) { toast.show('Titolo e data obbligatori'); return }
    try { await db.addManutenzione({...manForm, costo:manForm.costo?parseFloat(manForm.costo):null}); toast.show('✅ Salvata'); setModal(null); setManForm(emptyMan) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaInventario = async () => {
    if (!invForm.nome) { toast.show('Nome obbligatorio'); return }
    try { await db.addInventario(invForm); toast.show('✅ Salvato'); setModal(null); setInvForm(emptyInv) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaDocumento = async () => {
    if (!docForm.nome) { toast.show('Nome obbligatorio'); return }
    try { await db.addDocumento(docForm); toast.show('✅ Salvato'); setModal(null); setDocForm(emptyDoc) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaPrezzo = async () => {
    if (!przForm.nome_periodo) { toast.show('Nome periodo obbligatorio'); return }
    try { await db.addPrezzo({...przForm, prezzo_airbnb:parseFloat(przForm.prezzo_airbnb)||null, prezzo_booking:parseFloat(przForm.prezzo_booking)||null, prezzo_diretto:parseFloat(przForm.prezzo_diretto)||null, soggiorno_min:parseInt(przForm.soggiorno_min)||1}); toast.show('✅ Tariffa salvata'); setModal(null); setPrzForm(emptyPrz) }
    catch(e) { toast.show('❌ '+e.message) }
  }
  const salvaOspite = async () => {
    if (!ospForm.nome) { toast.show('Nome obbligatorio'); return }
    try { await db.addOspite(ospForm); toast.show('✅ Ospite salvato'); setModal(null); setOspForm(emptyOspite) }
    catch(e) { toast.show('❌ '+e.message) }
  }

  // ── CHECKLIST ────────────────────────────────────────────────────────
  const openChecklist = async (pren) => {
    setSelectedPren(pren)
    await db.initChecklist(pren.id)
    const items = await db.getChecklist(pren.id)
    setChecklistData(items)
    setModal('checklist')
  }
  const toggleItem = async (id, done) => {
    await db.toggleChecklist(id, done)
    setChecklistData(prev => prev.map(x => x.id===id ? {...x, completata:done} : x))
  }
  const checklistDone = checklistData.filter(x=>x.completata).length
  const checklistTotal = checklistData.length

  // ── AI PRICING ───────────────────────────────────────────────────────
  const runAiPricing = async () => {
    setAiLoading(true); setAiText('')
    const now2 = new Date()
    const prossime = db.prenotazioni.filter(p=>p.checkout>=todayStr).slice(0,5)
    const liberiProssimiMesi = []
    for (let i=0; i<90; i++) {
      const d = new Date(now2.getTime() + i*86400000)
      const ds = d.toISOString().slice(0,10)
      if (!db.prenotazioni.some(p=>p.checkin<=ds&&p.checkout>ds)) liberiProssimiMesi.push(ds)
    }
    const blocchiLiberi = []
    let blocco = []
    liberiProssimiMesi.forEach((d,i) => {
      blocco.push(d)
      if (i===liberiProssimiMesi.length-1||diffDays(liberiProssimiMesi[i+1],d)>1) {
        if (blocco.length>=2) blocchiLiberi.push({da:blocco[0], a:blocco[blocco.length-1], giorni:blocco.length})
        blocco=[]
      }
    })

    const prompt = `Sei un esperto di revenue management per affitti brevi in Sardegna.

STRUTTURA: Corte Pintadera, appartamento 50mq, Uta (CA), 15km da Cagliari, 10km aeroporto.
DATA OGGI: ${todayStr}
OCCUPAZIONE MESE CORRENTE: ${occPerc}%

TARIFFE ATTUALI:
${db.prezzi.map(p=>`- ${p.nome_periodo} (${p.tipo_periodo}): Airbnb €${p.prezzo_airbnb} / Booking €${p.prezzo_booking} / Diretto €${p.prezzo_diretto} — min ${p.soggiorno_min} notti`).join('\n')}

REGOLA DI MARGINE (obbligatoria): l'utile netto minimo desiderato è ${fmt(parseFloat(db.impostazioni.utile_min_giorno||50))}/notte dopo commissione OTA + cedolare secca.
Taglio combinato attuale: Diretto ${db.impostazioni.taglio_diretto_pct||21}% (solo cedolare) · Booking ${db.impostazioni.taglio_booking_pct||39}% · Airbnb ${db.impostazioni.taglio_airbnb_prima_pct||24}% fino al ${fmtDate(db.impostazioni.data_cambio_airbnb||'2026-10-13')}, poi ${db.impostazioni.taglio_airbnb_dopo_pct||36.5}% (nuova fee unica host-only 15,5% + cedolare).
Ogni prezzo suggerito deve garantire questo utile minimo: prezzo_minimo = utile_min / (1 - taglio%).

PRENOTAZIONI CONFERMATE PROSSIME:
${prossime.map(p=>`- ${p.nome}: ${p.checkin} → ${p.checkout} (${diffDays(p.checkout,p.checkin)} notti, ${p.piattaforma}, €${p.totale})`).join('\n')||'Nessuna'}

BLOCCHI LIBERI PROSSIMI 90 GIORNI (≥2 giorni consecutivi):
${blocchiLiberi.slice(0,8).map(b=>`- Dal ${b.da} al ${b.a} (${b.giorni} giorni liberi)`).join('\n')||'Calendario pieno'}

STAGIONALITÀ SARDEGNA:
- Luglio–Agosto: altissima domanda, prezzi picco
- Giugno e Settembre: alta domanda
- Ottobre–Maggio: bassa domanda, turismo leisure ridotto
- Weekend Cagliari e Uta: sagre estive, eventi culturali

Analizza la situazione e fornisci:
1. ANALISI BREVE (2-3 righe): valutazione generale di prezzi e occupazione
2. SUGGERIMENTI CONCRETI: 3-5 azioni specifiche con i numeri esatti (es. "Abbassa il prezzo di luglio da €110 a €95 per i 5 giorni liberi dal 18 al 22 luglio")
3. REGOLE CONSIGLIATE: 2-3 regole automatiche da applicare
4. ALERT: eventuali date critiche da presidiare

Sii diretto, concreto, usa i dati reali. Rispondi in italiano, formato leggibile su mobile.`

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const d = await resp.json()
      setAiText(d.content?.[0]?.text || 'Risposta non disponibile')
    } catch(e) {
      setAiText('Errore connessione AI. Riprova.')
    }
    setAiLoading(false)
  }

  // Fix: remove space in variable name
  const blocchiLiberi = []
  {
    const liberiProssimiMesi = []
    for (let i=0; i<90; i++) {
      const d = new Date(new Date().getTime() + i*86400000)
      const ds = d.toISOString().slice(0,10)
      if (!db.prenotazioni.some(p=>p.checkin<=ds&&p.checkout>ds)) liberiProssimiMesi.push(ds)
    }
    let blocco = []
    liberiProssimiMesi.forEach((d,i) => {
      blocco.push(d)
      if (i===liberiProssimiMesi.length-1||diffDays(liberiProssimiMesi[i+1],d)>1) {
        if (blocco.length>=2) blocchiLiberi.push({da:blocco[0],a:blocco[blocco.length-1],giorni:blocco.length})
        blocco=[]
      }
    })
  }

  // ── MESSAGGI ─────────────────────────────────────────────────────────
  const MSGS = (p) => {
    const nome = p.nome.split(' ')[0]
    const nights = diffDays(p.checkout, p.checkin)
    const platL = piattaformaLabel(p.piattaforma)
    return {
      conferma:    { t:'✅ Conferma', msg:`Ciao ${nome}! 😊\n\nGrazie per aver scelto Corte Pintadera. Prenotazione confermata:\n\n📅 Check-in: ${fmtDate(p.checkin)} ore 15:00\n📅 Check-out: ${fmtDate(p.checkout)} ore 09:00\n🌙 ${nights} notti · 👥 ${p.ospiti_num} ospiti\n\nSaremo ad accoglierti personalmente.\nRoberta e Alessandro 🏡` },
      istruzioni:  { t:'🗝 Istruzioni', msg:`Ciao ${nome}! Ecco come raggiungerci 👇\n\n📍 Via Cimitero 38/A, Uta (CA) 09068\n🚗 Da Cagliari ~20 min · Da Aeroporto ~10 min\n🕒 Check-in dalle 15:00\n\n📶 Wi-Fi: FASTWEB-E3XZSC\n🔑 Password: C7RAEXHAUG\n🚗 Parcheggio gratuito su Via Cimitero\n\nA presto!\nRoberta e Alessandro 🏡` },
      benvenuto:   { t:'👋 Benvenuto', msg:`Benvenuto/a a Corte Pintadera, ${nome}! 🏡\n\nSe manca qualcosa faccelo sapere subito.\n\n🌡 Climatizzatori: telecomando sul tavolo\n☕ Caffè e kit benvenuto in cucina\n🗑 Raccolta differenziata: istruzioni sulla porta\n🕓 Silenzio dalle 23:30 alle 08:00\n\nBuona permanenza! 😊\nRoberta e Alessandro` },
      checkout:    { t:'🧳 Check-out', msg:`Ciao ${nome}! Domani è il giorno del check-out.\n\n🕘 Entro le ore 09:00\n\nPrima di partire:\n🔑 Chiavi sul tavolo soggiorno\n🌡 Spegni i climatizzatori\n💡 Spegni le luci\n🚪 Chiudi la veranda\n\nGrazie e a presto! 🏡\nRoberta e Alessandro` },
      recensione:  { t:'⭐ Recensione', msg:`Ciao ${nome}! 😊\n\nSperiamo che il soggiorno a Corte Pintadera sia stato piacevole.\n\nUna tua recensione su ${platL} ci aiuterebbe tantissimo! 🙏\n\nGrazie di cuore!\nRoberta e Alessandro 🏡` },
    }
  }

  // ── IMPORT ICAL ───────────────────────────────────────────────────────
  const importIcal = async () => {
    setIcalStatus('⏳ Importazione...')
    const parse = (text, piattaforma) => {
      const events=[]; const blocks=text.split('BEGIN:VEVENT'); blocks.shift()
      for (const block of blocks) {
        const get=k=>{const m=block.match(new RegExp(k+'[^:]*:([^\\r\\n]+)'));return m?m[1].trim():''}
        const ds=get('DTSTART'); const de=get('DTEND')
        const pD=d=>{const s=d.replace(/T.*/,'');return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)}
        if(ds&&de) events.push({uid:get('UID'),checkin:pD(ds),checkout:pD(de),nome:get('SUMMARY')||piattaforma,piattaforma:piattaforma==='Airbnb'?'airbnb':'booking'})
      }
      return events
    }
    const fetch2=async(url,plat)=>{
      for(const px of[`https://corsproxy.io/?${encodeURIComponent(url)}`,`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`]){
        try{const r=await fetch(px,{signal:AbortSignal.timeout(8000)});if(r.ok){const t=await r.text();if(t.includes('BEGIN:VCALENDAR'))return parse(t,plat)}}catch{}
      }
      return null
    }
    let tot=0; const errs=[]
    const air=db.impostazioni.ical_airbnb; const bk=db.impostazioni.ical_booking
    if(air){const evs=await fetch2(air,'Airbnb');if(evs)tot+=await db.importPrenotazioniIcal(evs);else errs.push('Airbnb')}
    if(bk){const evs=await fetch2(bk,'Booking');if(evs)tot+=await db.importPrenotazioniIcal(evs);else errs.push('Booking')}
    if(errs.length&&!tot) setIcalStatus('⚠️ Errore: '+errs.join(', '))
    else if(tot>0){setIcalStatus(`✅ ${tot} importate`);toast.show(`✅ ${tot} prenotazioni importate`)}
    else setIcalStatus('Nessuna nuova prenotazione')
  }

  // ── Calendar grid ─────────────────────────────────────────────────────
  const CalGrid = () => {
    const y=calMonth.getFullYear(), m=calMonth.getMonth()
    const first=(new Date(y,m,1).getDay()+6)%7
    const dim=new Date(y,m+1,0).getDate()
    const days=[]
    GIORNI_BREVI.forEach((g,i)=>days.push(<div key={'h'+i} className="cdn">{g}</div>))
    for(let i=0;i<first;i++) days.push(<div key={'e'+i}/>)
    for(let day=1;day<=dim;day++){
      const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0')
      const it=occ.dayMap[ds]; const isToday=ds===todayStr
      const isTurnover=occ.turnoverDates.has(ds)
      let cls='cd'
      if(isToday) cls+=' today'
      else if(it){
        cls+=' occ-'+occupancyColorClass(it)
        if(it.checkin===ds) cls+=' occ-start'
        const dsNext=new Date(new Date(ds).getTime()+86400000).toISOString().slice(0,10)
        if(it.checkout===dsNext) cls+=' occ-end'
      }
      if(isTurnover) cls+=' occ-turnover'
      const onClick = it ? () => {
        if (it.kind==='manuale') apriModificaPrenotazione(it.ref)
        else if (it.tipo!=='blocco') apriDaIcal(it)
      } : undefined
      let tag=''
      if(it && it.checkin===ds){
        if(it.tipo==='blocco') tag='Ferie'
        else if(it.kind==='manuale'){
          const parts=(it.nome||'').trim().split(/\s+/).filter(Boolean)
          tag = parts.length>1 ? `${parts[0]} ${parts[1][0]}.` : (parts[0]||'')
        } else tag=`${piattaformaLabel(it.piattaforma)} ${diffDays(it.checkout,it.checkin)}n`
      }
      days.push(<div key={day} className={cls} style={onClick?{cursor:'pointer'}:{}} title={it?(occupancyLabel(it)+(isTurnover?' · turnover':'')):''} onClick={onClick}>
        <span>{day}</span>{tag&&<span className="cd-tag">{tag}</span>}{isTurnover&&<span className="cd-turn">⇄</span>}
      </div>)
    }
    return <div className="cal-grid">{days}</div>
  }

  // ── Booking card ─────────────────────────────────────────────────────
  const BkCard = ({p, compact=false}) => {
    const nights=diffDays(p.checkout,p.checkin)
    const platCls=p.piattaforma==='airbnb'?'airbnb':p.piattaforma==='booking'?'booking-com':'diretto'
    const platL=piattaformaLabel(p.piattaforma)
    const platB=piattaformaBadge(p.piattaforma)
    const isCI=p.checkin===todayStr, isCO=p.checkout===todayStr, isIn=p.checkin<todayStr&&p.checkout>todayStr
    let statusChip
    if(p.checkout<todayStr) statusChip=<span className="badge pill">Concluso</span>
    else if(isCI) statusChip=<span className="badge" style={{background:'rgba(184,92,56,.15)',color:'var(--terracotta)'}}>Check-in oggi 🏠</span>
    else if(isCO) statusChip=<span className="badge b-oggi">Check-out oggi</span>
    else if(isIn) statusChip=<span className="badge b-ok">In corso 🟢</span>
    else{const d=diffDays(p.checkin,todayStr);statusChip=<span className="badge b-presto">Tra {d}g</span>}
    if(compact) return(
      <div className={`bkc ${platCls}`} style={{cursor:'pointer'}} onClick={()=>apriModificaPrenotazione(p)}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
          <div style={{fontWeight:600,fontSize:13}}>{p.nome}</div>
          <div style={{display:'flex',gap:5,alignItems:'center'}}>{statusChip}<button className="del" onClick={e=>{e.stopPropagation();db.deletePrenotazione(p.id)}}>🗑</button></div>
        </div>
        <div style={{fontSize:11,color:'var(--grigio)',marginTop:3}}>📅 {fmtDate(p.checkin)} → {fmtDate(p.checkout)} · {nights}n · {p.ospiti_num} ospiti</div>
        <div style={{display:'flex',gap:5,marginTop:5,alignItems:'center',flexWrap:'wrap'}}>
          <span className={`badge ${platB}`}>{platL}</span>
          {p.totale>0&&<span style={{fontFamily:'Cormorant Garamond,serif',fontSize:14,fontWeight:600,color:'var(--verde)'}}>{fmtFull(p.totale)}</span>}
          {p.stato_pagamento==='saldato'?<span className="badge b-ok">Saldato</span>:p.stato_pagamento==='acconto'?<span className="badge b-oggi">Acconto</span>:<span className="badge b-scaduto">Da saldare</span>}
          {p.recensione_voto!=null&&<span className="badge" style={{background:'rgba(201,168,76,.2)',color:'#7a5c10'}}>⭐ {p.recensione_voto}/10</span>}
        </div>
        <div style={{display:'flex',gap:5,marginTop:8}}>
          <button className="btn bp bsm" onClick={e=>{e.stopPropagation();apriModificaPrenotazione(p)}}>✏️ Modifica</button>
          <button className="btn bs bsm" style={{flex:1}} onClick={e=>{e.stopPropagation();setSelectedPren(p);setModal('messaggi')}}>💬 Messaggi</button>
          <button className="btn bs bsm" style={{flex:1}} onClick={e=>{e.stopPropagation();openChecklist(p)}}>🧹 Checklist</button>
          <button className="btn bs bsm" onClick={e=>{e.stopPropagation();setSelectedPren(p);setModal('alloggiati')}}>📋 Allog.</button>
        </div>
      </div>
    )
    const ospiteCollegato = p.ospite_id ? db.ospiti.find(o=>o.id===p.ospite_id) : null
    return(
      <div className={`bkc ${platCls}`} style={{marginBottom:10,cursor:'pointer'}} onClick={()=>apriModificaPrenotazione(p)}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:7}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>{p.nome}</div>
            <div style={{marginTop:4,display:'flex',gap:5,flexWrap:'wrap'}}>{statusChip}<span className={`badge ${platB}`}>{platL}</span>{ospiteCollegato&&<span className="pill">{ospiteCollegato.nazionalita||'—'}</span>}{p.recensione_voto!=null&&<span className="badge" style={{background:'rgba(201,168,76,.2)',color:'#7a5c10'}}>⭐ {p.recensione_voto}/10</span>}</div>
          </div>
          <button className="del" onClick={e=>{e.stopPropagation();db.deletePrenotazione(p.id)}}>🗑</button>
        </div>
        <div style={{marginTop:9,display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
          {[['Check-in',p.checkin,'15:00'],['Check-out',p.checkout,'09:00']].map(([l,d,ora])=>(
            <div key={l} style={{background:'var(--sabbia)',borderRadius:7,padding:'7px 9px'}}>
              <div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:600}}>{l}</div>
              <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:14,fontWeight:600,marginTop:2}}>📅 {fmtDate(d)}</div>
              <div style={{fontSize:10,color:'var(--grigio)'}}>ore {ora}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginTop:7,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:11,color:'var(--grigio)'}}>🌙 {nights} notti · 👥 {p.ospiti_num}</span>
          {p.totale>0&&<span style={{fontFamily:'Cormorant Garamond,serif',fontSize:15,fontWeight:600,color:'var(--verde)',marginLeft:'auto'}}>{fmtFull(p.totale)}</span>}
        </div>
        {p.netto>0&&p.commissione>0&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>Commissione: {fmtFull(p.commissione)} · Netto: {fmtFull(p.netto)}</div>}
        {p.note&&<div style={{fontSize:11,color:'var(--grigio)',marginTop:5,paddingTop:5,borderTop:'1px solid var(--sabbia-scura)'}}>📝 {p.note}</div>}
        {p.recensione_testo&&<div style={{fontSize:11,color:'var(--grigio)',marginTop:3,fontStyle:'italic'}}>⭐ "{p.recensione_testo}"</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5,marginTop:10,paddingTop:8,borderTop:'1px solid var(--sabbia-scura)'}}>
          <button className="btn bp bsm bfull" onClick={e=>{e.stopPropagation();apriModificaPrenotazione(p)}}>✏️ Modifica</button>
          <button className="btn bs bsm bfull" onClick={e=>{e.stopPropagation();setSelectedPren(p);setModal('messaggi')}}>💬 Messaggi</button>
          <button className="btn bs bsm bfull" onClick={e=>{e.stopPropagation();openChecklist(p)}}>🧹 Pulizie</button>
          <button className="btn bs bsm bfull" onClick={e=>{e.stopPropagation();setSelectedPren(p);setModal('alloggiati')}}>📋 Allog.</button>
        </div>
      </div>
    )
  }

  // ── Card evento iCal (senza prenotazione manuale collegata) ───────────
  const IcalCard = ({it, compact=false}) => {
    const nights=diffDays(it.checkout,it.checkin)
    const platCls=it.piattaforma==='airbnb'?'airbnb':it.piattaforma==='booking'?'booking-com':'diretto'
    const isBlocco=it.tipo==='blocco'
    return (
      <div className={`bkc ${platCls}`} style={{marginBottom:compact?7:10, opacity:isBlocco?0.75:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:7}}>
          <div>
            <div style={{fontSize:compact?13:15,fontWeight:700}}>{occupancyLabel(it)}</div>
            <div style={{marginTop:4,display:'flex',gap:5,flexWrap:'wrap'}}>
              <span className={`badge ${piattaformaBadge(it.piattaforma)}`}>{piattaformaLabel(it.piattaforma)}</span>
              {isBlocco&&<span className="pill">Blocco/Ferie</span>}
            </div>
          </div>
        </div>
        <div style={{fontSize:11,color:'var(--grigio)',marginTop:7}}>📅 {fmtDate(it.checkin)} → {fmtDate(it.checkout)} · {nights}n</div>
        <div style={{display:'flex',gap:5,marginTop:8}}>
          {!isBlocco&&<button className="btn bp bsm" style={{flex:1,justifyContent:'center'}} onClick={()=>apriDaIcal(it)}>✏️ Aggiungi dettagli</button>}
          <button className="btn bs bsm" style={{flex:1,justifyContent:'center'}} onClick={()=>db.segnaChiusura(it.ref.uid, it.checkin, it.checkout, !isBlocco)}>
            {isBlocco?'↩ Segna come prenotazione':'🚫 Segna come chiusura'}
          </button>
        </div>
      </div>
    )
  }

  const OccCard = ({it, compact=false}) => it.kind==='manuale' ? <BkCard p={it.ref} compact={compact}/> : <IcalCard it={it} compact={compact}/>

  // Percorso di una barra con angoli arrotondati solo in alto (ancorata alla base)
  const barPath = (x,y,w,h,r) => {
    const rr = Math.max(0, Math.min(r, h/2, w/2))
    return `M${x},${y+h} L${x},${y+rr} Q${x},${y} ${x+rr},${y} L${x+w-rr},${y} Q${x+w},${y} ${x+w},${y+rr} L${x+w},${y+h} Z`
  }

  // ── Grafico a barre Lordo/Netto per mese (Analisi) ────────────────────
  const MonthlyBarChart = ({dati}) => {
    if (dati.length===0) return <div className="empty" style={{padding:16}}><div className="emi">📊</div><p>Nessun dato</p></div>
    const max = Math.max(1, ...dati.map(d=>d.lordo))
    const W=320, H=120, gap=10, padTop=16
    const usableH = H-padTop
    const gw = W/dati.length
    return <div>
      <div style={{display:'flex',gap:14,fontSize:10,color:'var(--grigio)',marginBottom:8}}>
        <span><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'var(--terracotta-light)',marginRight:4}}/>Lordo</span>
        <span><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'var(--terracotta)',marginRight:4}}/>Netto</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H+16}`} style={{width:'100%',height:'auto'}}>
        {dati.map((d,i)=>{
          const bw=(gw-gap)/2
          const hL=Math.max(2,d.lordo/max*usableH), hN=Math.max(2,d.netto/max*usableH)
          const x0=i*gw+gap/2
          return <g key={d.mk}>
            <title>{d.label}: Lordo {fmtFull(d.lordo)} · Netto {fmtFull(d.netto)}</title>
            <text x={x0+bw/2} y={H-hL-4} fontSize="8" fill="var(--grigio)" textAnchor="middle">{fmt(d.lordo)}</text>
            <path d={barPath(x0,H-hL,bw,hL,3)} fill="var(--terracotta-light)"/>
            <text x={x0+bw+2+bw/2} y={H-hN-4} fontSize="8" fill="var(--grigio)" textAnchor="middle">{fmt(d.netto)}</text>
            <path d={barPath(x0+bw+2,H-hN,bw,hN,3)} fill="var(--terracotta)"/>
            <text x={x0+bw} y={H+13} fontSize="8" fill="var(--grigio)" textAnchor="middle">{d.label}</text>
          </g>
        })}
      </svg>
    </div>
  }

  // ── Grafico a linea, una o piu' serie (Analisi: occupazione o ADR) ────
  const MonthlyLineChart = ({dati, series, fmtVal, domain}) => {
    if (dati.length===0) return <div className="empty" style={{padding:16}}><div className="emi">📈</div><p>Nessun dato</p></div>
    const allVals = series.flatMap(s=>dati.map(d=>d[s.key]))
    const lo = domain ? domain[0] : Math.min(...allVals)
    const hi = domain ? domain[1] : Math.max(...allVals)
    const range = Math.max(1e-6, hi-lo)
    const W=320, H=110, padTop=16, padBot=16
    const n=dati.length
    const x = i => n<=1 ? W/2 : i/(n-1)*W
    const y = v => padTop + (1-(v-lo)/range)*(H-padTop-padBot)
    return <div>
      {series.length>1 && <div style={{display:'flex',gap:14,fontSize:10,color:'var(--grigio)',marginBottom:8}}>
        {series.map(s=><span key={s.key}><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:s.color,marginRight:4}}/>{s.label}</span>)}
      </div>}
      <svg viewBox={`0 0 ${W} ${H+16}`} style={{width:'100%',height:'auto'}}>
        {series.map(s=>{
          const pts = dati.map((d,i)=>`${x(i)},${y(d[s.key])}`).join(' ')
          return <g key={s.key}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2"/>
            {dati.map((d,i)=>(
              <g key={s.key+d.mk}>
                <title>{d.label} — {s.label}: {fmtVal(d[s.key])}</title>
                <circle cx={x(i)} cy={y(d[s.key])} r="4" fill={s.color}/>
                <text x={x(i)} y={y(d[s.key])-8} fontSize="8" fill="var(--grigio)" textAnchor="middle">{fmtVal(d[s.key])}</text>
              </g>
            ))}
          </g>
        })}
        {dati.map((d,i)=><text key={'lbl-'+d.mk} x={x(i)} y={H+13} fontSize="8" fill="var(--grigio)" textAnchor="middle">{d.label}</text>)}
      </svg>
    </div>
  }

  // ── Barre orizzontali per piattaforma (Analisi) ───────────────────────
  const PlatformBarChart = ({dati}) => {
    const max = Math.max(1, ...dati.map(d=>d.value))
    return <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {dati.map(d=>(
        <div key={d.label}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
            <span style={{color:d.color,fontWeight:600}}>{d.label}</span>
            <span style={{color:'var(--grigio)'}}>{d.sub}</span>
          </div>
          <div style={{background:'var(--sabbia)',borderRadius:6,height:10,overflow:'hidden'}}>
            <div style={{width:`${Math.max(2,d.value/max*100)}%`,height:'100%',background:d.color,borderRadius:6}}/>
          </div>
        </div>
      ))}
    </div>
  }

  // ── Riepilogo economico condiviso (Lordo/Commissioni/Cedolare/Netto) ──
  // Un solo posto che disegna questo blocco: usato in Prenotazioni, Finanze
  // e nel dettaglio entrate, cosi' non e' ripetuto in 3 varianti leggermente diverse.
  const RiepilogoEconomico = ({agg, titoloNetto='Netto', obiettivo}) => {
    const okTarget = obiettivo==null || agg.netto>=obiettivo
    return <div style={{borderTop:'1px solid var(--sabbia-scura)',paddingTop:8}}>
      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12,borderBottom:'1px dashed var(--sabbia-scura)'}}><span>Lordo</span><strong>{fmtFull(agg.lordo)}</strong></div>
      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12,borderBottom:'1px dashed var(--sabbia-scura)',color:'var(--grigio)'}}><span>Commissioni piattaforme</span><span>−{fmtFull(agg.commissione)}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12,borderBottom:'1px dashed var(--sabbia-scura)',color:'var(--grigio)'}}><span>Cedolare secca ({parseFloat(db.impostazioni.taglio_diretto_pct||21)}%)</span><span>−{fmtFull(agg.cedolare)}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0 0',fontSize:14,fontWeight:700}}><span>{titoloNetto}</span><strong style={{color:okTarget?'var(--verde)':'var(--rosso)'}}>{fmtFull(agg.netto)}</strong></div>
      {obiettivo!=null&&<div style={{fontSize:10,color:okTarget?'var(--verde)':'var(--rosso)',marginTop:8,textAlign:'center'}}>
        {okTarget?'✅':'⚠️'} Obiettivo {fmt(obiettivo)} ({fmt(parseFloat(db.impostazioni.utile_min_giorno||50))}/notte) — {okTarget?'raggiunto':'non raggiunto'}
      </div>}
    </div>
  }

  // ── Finanze mese ─────────────────────────────────────────────────────
  const finMk2 = monthKey(finMonth)
  const finItems2 = db.finanze.filter(f=>f.data.slice(0,7)===finMk2)
  // Entrate del mese: transazioni manuali + prenotazioni (che nessuno registra
  // a mano in finanze) cosi' la lista non resta vuota/ferma.
  const prenItems2 = db.prenotazioni.filter(p=>p.checkin.slice(0,7)===finMk2)
  const finE2 = finItems2.filter(f=>f.tipo==='entrata').reduce((s,f)=>s+Number(f.importo),0)
    + prenItems2.reduce((s,p)=>s+Number(p.totale||0),0)
  const finU2 = finItems2.filter(f=>f.tipo==='uscita').reduce((s,f)=>s+Number(f.importo),0)
  const finS2 = finE2-finU2

  // ── Report annuale ───────────────────────────────────────────────────
  const annoCorrente = now.getFullYear()
  const reportMesi = MESI.map((nome,i)=>{
    const mk3=annoCorrente+'-'+String(i+1).padStart(2,'0')
    const mf=db.finanze.filter(f=>f.data.slice(0,7)===mk3)
    const mp=db.prenotazioni.filter(p=>p.checkin.slice(0,7)===mk3)
    const agg=aggregaPrenotazioni(mp, db.impostazioni)
    return { nome:nome.slice(0,3), e:agg.lordo, commissione:agg.commissione, cedolare:agg.cedolare, netto:agg.netto, prenotazioni:agg.count, notti:agg.notti,
      u:mf.filter(f=>f.tipo==='uscita').reduce((s,f)=>s+Number(f.importo),0) }
  })
  const maxR = Math.max(...reportMesi.map(m=>Math.max(m.e,m.u)),1)

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className={`toast${toast.v?' show':''}`}>{toast.msg}</div>
      <div className={`ob ${db.online?'on':'off'}`}>{db.online?'● Online':'● Offline'}</div>

      {/* Header */}
      <header className="hdr">
        <div className="hdr-inner">
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div className="hdr-logo"><Logo/></div>
            <div><div className="hdr-title">Corte Pintadera</div><div className="hdr-sub">Gestionale · Uta</div></div>
          </div>
          <div><div className="hdr-day">{giornoNum}</div><div className="hdr-lbl">{giornoLbl}</div></div>
        </div>
      </header>

      <main className="main">
        {db.loading && <div className="empty"><div className="emi">⏳</div><p>Caricamento...</p></div>}

        {/* ── HOME ─────────────────────────────────────────────── */}
        {!db.loading && screen==='home' && <>
          {scadUrgenti.length>0 && <div className="alert">⚠️ {scadUrgenti.length} scadenza{scadUrgenti.length>1?'e':''} urgente — controlla Gestione</div>}
          {bollUrgenti.length>0 && <div className="alert alert-oro">🧾 {bollUrgenti.length} bolletta{bollUrgenti.length>1?'e':''} in scadenza</div>}

          {/* Oggi */}
          {(prenOggiCI.length>0||prenOggiCO.length>0||prenInCorso.length>0) && (
            <div className="card" style={{borderLeft:'4px solid var(--terracotta)',marginBottom:9}}>
              <div className="card-title"><span className="dot"/>Oggi</div>
              {prenOggiCI.map(p=><div key={p.id} className="ir"><div className="iico v">🏠</div><div className="ibody"><div className="iname">Check-in: {p.nome}</div><div className="imeta">ore 15:00 · {p.ospiti_num} ospiti</div></div><button className="btn bs bsm" onClick={()=>{setSelectedPren(p);setModal('messaggi')}}>💬</button></div>)}
              {prenOggiCO.map(p=><div key={p.id} className="ir"><div className="iico r">🧳</div><div className="ibody"><div className="iname">Check-out: {p.nome}</div><div className="imeta">entro le 09:00</div></div><button className="btn bs bsm" onClick={()=>openChecklist(p)}>🧹</button></div>)}
              {prenInCorso.map(p=><div key={p.id} className="ir"><div className="iico c">🟢</div><div className="ibody"><div className="iname">In casa: {p.nome}</div><div className="imeta">fino al {fmtDate(p.checkout)}</div></div></div>)}
            </div>
          )}

          <div className="kpi-strip k4">
            <div className="kpi v" style={{cursor:'pointer'}} onClick={()=>setModal('dettaglio-entrate')}><div className="kv">{fmt(entrMese)}</div><div className="kl">Entrate lorde</div><div style={{fontSize:8,color:'var(--grigio)',marginTop:2}}>netto {fmt(nettoMese)}</div></div>
            <div className="kpi r"><div className="kv">{fmt(uscMese)}</div><div className="kl">Uscite</div></div>
            <div className="kpi o"><div className="kv" style={{color:entrMese-uscMese>=0?'var(--verde)':'var(--rosso)'}}>{fmt(entrMese-uscMese)}</div><div className="kl">Saldo</div></div>
            <div className="kpi c"><div className="kv">{occPerc}%</div><div className="kl">Occup.</div></div>
          </div>

          <div className="stitle">Prossime prenotazioni</div>
          {occFuture.slice(0,2).length===0
            ? <div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:14,marginBottom:9}}><div className="emi">📅</div><p>Nessuna prenotazione</p></div>
            : occFuture.slice(0,2).map(it=><OccCard key={it.id} it={it} compact/>)}

          <div className="stitle">Scadenze imminenti</div>
          <div className="card">
            {db.scadenze.filter(s=>!s.completata&&diffDays(s.data,todayStr)<=14).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,4).length===0
              ? <div className="empty" style={{padding:12}}><div className="emi">✅</div><p>Nessuna scadenza urgente</p></div>
              : db.scadenze.filter(s=>!s.completata&&diffDays(s.data,todayStr)<=14).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,4).map(s=>{
                const urg=getUrgenza(s.data); const d=diffDays(s.data,todayStr)
                return <div key={s.id} className="ir">
                  <div className="iico c">{CAT_ICON[s.categoria]||'🔔'}</div>
                  <div className="ibody"><div className="iname">{s.titolo}</div><div className="imeta">{fmtDate(s.data)}</div></div>
                  <span className={`badge b-${urg}`}>{d<0?'Scaduta':d===0?'Oggi':d+'g'}</span>
                </div>
              })}
          </div>

          <div className="stitle">Ultime transazioni</div>
          <div className="card">
            {db.finanze.slice(0,5).length===0
              ? <div className="empty" style={{padding:12}}><div className="emi">💶</div><p>Nessuna transazione</p></div>
              : db.finanze.slice(0,5).map(f=>(
                <div key={f.id} className="ir">
                  <div className={`iico ${f.tipo==='entrata'?'v':'r'}`}>{CAT_ICON[f.categoria]||'💶'}</div>
                  <div className="ibody"><div className="iname">{f.descrizione}</div><div className="imeta">{fmtDate(f.data)}</div></div>
                  <div className={`iamt ${f.tipo==='entrata'?'v':'r'}`}>{f.tipo==='entrata'?'+':'-'}{fmtFull(f.importo)}</div>
                </div>
              ))}
          </div>
        </>}

        {/* ── PRENOTAZIONI ──────────────────────────────────────── */}
        {!db.loading && screen==='prenotazioni' && <>
          <div className="card">
            <div className="cal-hdr">
              <button className="cal-nav" onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1))}>‹</button>
              <div className="cal-m">{MESI[calMonth.getMonth()]} {calMonth.getFullYear()}</div>
              <button className="cal-nav" onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1))}>›</button>
            </div>
            <CalGrid/>
            <div style={{display:'flex',gap:8,marginTop:9,fontSize:10,color:'var(--grigio)',flexWrap:'wrap'}}>
              <span style={{color:'#C02228'}}>🔴 Airbnb</span>
              <span style={{color:'#003B95'}}>🔵 Booking</span>
              <span style={{color:'var(--verde)'}}>🟢 Diretto</span>
              <span>▦ Blocco/Ferie</span>
              <span>⇄ Turnover</span>
              <span style={{color:'var(--grigio)'}}>⬜ Libero</span>
            </div>
          </div>

          {/* ── Proiezione utili (tutte le prenotazioni future, non solo il mese visualizzato) ────────────────── */}
          {(() => {
            const prenStagione = db.prenotazioni.filter(p=>p.checkout>=todayStr)
            if (prenStagione.length===0) return null
            const agg = aggregaPrenotazioni(prenStagione, db.impostazioni)
            const obiettivo = agg.notti*parseFloat(db.impostazioni.utile_min_giorno||50)
            return <div className="card" style={{marginBottom:9}}>
              <div className="card-title"><span className="dot"/>Proiezione utili — prossime prenotazioni</div>
              <div style={{display:'flex',justifyContent:'space-around',textAlign:'center',marginBottom:10}}>
                <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>{agg.count}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Prenotaz.</div></div>
                <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>{agg.notti}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Notti</div></div>
              </div>
              <RiepilogoEconomico agg={agg} titoloNetto="Netto stagione" obiettivo={obiettivo}/>
            </div>
          })()}

          <div style={{display:'flex',gap:6,marginBottom:9}}>
            <button className="btn bs bsm" style={{flex:1}} onClick={importIcal}>🔄 Importa iCal</button>
            <button className="btn bp bsm" onClick={()=>{setPrenForm(emptyPren);setModal('modal-prenotazione')}}>+ Prenotazione</button>
          </div>
          {icalStatus&&<div style={{fontSize:10,color:'var(--grigio)',marginBottom:8,textAlign:'center'}}>{icalStatus}</div>}
          <div className="stitle">Dettaglio prenotazioni — {MESI[calMonth.getMonth()]}</div>
          {occMese.length===0
            ? <div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20}}><div className="emi">📅</div><p>Nessuna prenotazione questo mese</p></div>
            : occMese.map(it=><OccCard key={it.id} it={it} compact/>)}
          {(() => {
            const recensite = db.prenotazioni.filter(p=>p.recensione_voto!=null)
            if (recensite.length===0) return null
            const media = recensite.reduce((s,p)=>s+Number(p.recensione_voto),0)/recensite.length
            return <div className="card" style={{marginBottom:9,display:'flex',justifyContent:'space-around',textAlign:'center'}}>
              <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>⭐ {media.toFixed(1)}/10</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Media recensioni</div></div>
              <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>{recensite.length}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Recensioni</div></div>
            </div>
          })()}

          <div className="stitle">Riepilogo per mese</div>
          {mesiStagione.length===0
            ? <div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20}}><div className="emi">🗓</div><p>Nessuna prenotazione</p></div>
            : mesiStagione.map(({mk,items,agg})=>{
              const [y,m] = mk.split('-')
              const isOpen = openMonths.has(mk)
              return <div key={mk} className="card" style={{marginBottom:9}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>toggleMonth(mk)}>
                  <div className="card-title" style={{marginBottom:0}}><span className="dot"/>{MESI[Number(m)-1]} {y}</div>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:11,color:'var(--grigio)'}}>{items.length} pren.</span>
                    <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:14,fontWeight:600,color:'var(--verde)'}}>{fmt(agg.netto)}</span>
                    <span style={{fontSize:12,color:'var(--grigio)'}}>{isOpen?'▲':'▼'}</span>
                  </div>
                </div>
                {isOpen && <div style={{marginTop:10}}>
                  <RiepilogoEconomico agg={agg} titoloNetto="Netto mese"/>
                  <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:7}}>
                    {items.map(it=><OccCard key={it.id} it={it} compact/>)}
                  </div>
                </div>}
              </div>
            })}
        </>}

        {/* ── FINANZE ───────────────────────────────────────────── */}
        {!db.loading && screen==='finanze' && <>
          <div className="tabs">
            {['transazioni','bollette','report'].map(t=><button key={t} className={`tab${finTab===t?' active':''}`} onClick={()=>setFinTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
          </div>

          {finTab==='transazioni'&&<>
            <div className="msw">
              <button className="mbtn" onClick={()=>setFinMonth(new Date(finMonth.getFullYear(),finMonth.getMonth()-1,1))}>‹</button>
              <div className="mlbl">{MESI[finMonth.getMonth()]} {finMonth.getFullYear()}</div>
              <button className="mbtn" onClick={()=>setFinMonth(new Date(finMonth.getFullYear(),finMonth.getMonth()+1,1))}>›</button>
            </div>
            <div className="kpi-strip k3">
              <div className="kpi v"><div className="kv">{fmt(finE2)}</div><div className="kl">Entrate</div></div>
              <div className="kpi r"><div className="kv">{fmt(finU2)}</div><div className="kl">Uscite</div></div>
              <div className="kpi o"><div className="kv" style={{color:finS2>=0?'var(--verde)':'var(--rosso)'}}>{fmt(finS2)}</div><div className="kl">Saldo</div></div>
            </div>
            <div className="card">
              {finItems2.length===0 && prenItems2.length===0
                ? <div className="empty" style={{padding:12}}><div className="emi">💶</div><p>Nessuna transazione</p></div>
                : <>
                  {[...prenItems2].sort((a,b)=>b.checkin.localeCompare(a.checkin)).map(p=>(
                    <div key={'p-'+p.id} className="ir" style={{cursor:'pointer'}} onClick={()=>apriModificaPrenotazione(p)}>
                      <div className="iico v">🏠</div>
                      <div className="ibody"><div className="iname">{p.nome}</div><div className="imeta">{fmtDate(p.checkin)} · <span className="pill">prenotazione</span> · <span className={`badge ${piattaformaBadge(p.piattaforma)}`}>{piattaformaLabel(p.piattaforma)}</span></div></div>
                      <div className="iamt v">+{fmtFull(p.totale)}</div>
                    </div>
                  ))}
                  {[...finItems2].sort((a,b)=>b.data.localeCompare(a.data)).map(f=>(
                    <div key={f.id} className="ir">
                      <div className={`iico ${f.tipo==='entrata'?'v':'r'}`}>{CAT_ICON[f.categoria]||'💶'}</div>
                      <div className="ibody"><div className="iname">{f.descrizione}</div><div className="imeta">{fmtDate(f.data)} · <span className="pill">{f.categoria}</span></div></div>
                      <div className={`iamt ${f.tipo==='entrata'?'v':'r'}`}>{f.tipo==='entrata'?'+':'-'}{fmtFull(f.importo)}</div>
                      <button className="del" onClick={()=>db.deleteFinanza(f.id)}>🗑</button>
                    </div>
                  ))}
                </>}
            </div>
            {prenItems2.length>0&&<div style={{fontSize:9,color:'var(--grigio)',textAlign:'center',marginTop:6}}>🏠 = entrata da prenotazione (tocca per modificarla)</div>}
          </>}

          {finTab==='bollette'&&<>
            <div className="tabs">
              {Object.entries(BOLL_TIPI).map(([k,v])=><button key={k} className={`tab${bollTipo===k?' active':''}`} onClick={()=>{setBollTipo(k);setBollFilter('tutte')}}>{v.i} {v.l}</button>)}
            </div>
            {(() => {
              const items=db.bollette.filter(b=>b.tipo===bollTipo)
              const filtered=bollFilter==='tutte'?items:bollFilter==='da-pagare'?items.filter(b=>b.stato!=='pagata'):items.filter(b=>b.stato==='pagata')
              const sorted=[...filtered].sort((a,b)=>b.scadenza.localeCompare(a.scadenza))
              const pagate=items.filter(b=>b.stato==='pagata')
              const tot=pagate.reduce((s,b)=>s+Number(b.importo),0)
              const bt=BOLL_TIPI[bollTipo]||BOLL_TIPI.altro
              return <>
                <div className="kpi-strip k2">
                  <div className="kpi r"><div className="kv">{items.filter(b=>b.stato!=='pagata').length}</div><div className="kl">Da pagare</div></div>
                  <div className="kpi v"><div className="kv">{pagate.length}</div><div className="kl">Pagate</div></div>
                </div>
                <div style={{display:'flex',gap:5,marginBottom:9}}>
                  {['tutte','da-pagare','pagate'].map(f=><button key={f} className={`btn bsm${bollFilter===f?' bp':' bs'}`} onClick={()=>setBollFilter(f)}>{f==='tutte'?'Tutte':f==='da-pagare'?'Da pagare':'Pagate'}</button>)}
                </div>
                {sorted.length===0
                  ? <div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20}}><div className="emi">{bt.i}</div><p>Nessuna bolletta {bt.l.toLowerCase()}</p></div>
                  : sorted.map(b=>{
                    const ip=b.stato==='pagata'; const urg=ip?'ok':getUrgenza(b.scadenza)
                    const dd=diffDays(b.scadenza,todayStr)
                    const ss=ip?`Pagata ${fmtDate(b.data_pagamento)}`:dd<0?`Scaduta ${Math.abs(dd)}g fa`:dd===0?'Oggi!':'Tra '+dd+'g'
                    return <div key={b.id} className="card" style={{borderLeft:`3px solid ${ip?'var(--verde)':urg==='scaduto'?'var(--rosso)':bt.c}`,marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                            <span>{bt.i}</span>
                            <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:16,fontWeight:600}}>{fmtFull(b.importo)}</span>
                            <span className={`badge b-${ip?'ok':urg}`}>{ip?'✅ Pagata':'⏳ Da pagare'}</span>
                          </div>
                          {b.numero&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>📄 N° {b.numero}</div>}
                          {b.periodo&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:1}}>📅 {b.periodo}</div>}
                          <div style={{fontSize:10,color:'var(--grigio)',marginTop:1}}>{fmtDate(b.data)} → scad. <strong>{fmtDate(b.scadenza)}</strong></div>
                          <div style={{fontSize:10,fontWeight:500,marginTop:2,color:ip?'var(--verde)':urg==='scaduto'?'var(--rosso)':'var(--grigio)'}}>{ss}</div>
                        </div>
                        <button className="del" onClick={()=>db.deleteBolletta(b.id)}>🗑</button>
                      </div>
                      <button className="btn bsm" style={{marginTop:9,width:'100%',justifyContent:'center',background:ip?'rgba(192,57,43,.08)':'rgba(74,103,65,.1)',color:ip?'var(--rosso)':'var(--verde)',border:`1px solid ${ip?'rgba(192,57,43,.2)':'rgba(74,103,65,.25)'}`}} onClick={()=>db.updateBolletta(b.id,{stato:ip?'da-pagare':'pagata',data_pagamento:ip?null:todayStr})}>
                        {ip?'↩ Segna da pagare':'✅ Segna come pagata'}
                      </button>
                    </div>
                  })}
                <div className="card" style={{marginTop:4}}>
                  <div className="card-title"><span className="dot"/>Storico {bt.l}</div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.06em'}}>Totale pagato</div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:22,fontWeight:600}}>{fmtFull(tot)}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.06em'}}>Media</div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:20,fontWeight:600,color:'var(--grigio)'}}>{fmtFull(pagate.length?tot/pagate.length:0)}</div></div>
                  </div>
                </div>
              </>
            })()}
          </>}

          {finTab==='report'&&<>
            <div className="card">
              <div className="card-title"><span className="dot"/>Anno {annoCorrente}</div>
              {reportMesi.map((m,i)=>(
                <div key={i} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
                    <span>{m.nome}</span>
                    <span><span style={{color:'var(--verde)'}}>{fmt(m.e)}</span> <span style={{color:'var(--rosso)'}}>-{fmt(m.u)}</span></span>
                  </div>
                  <div className="rb"><div className="rbf" style={{width:`${Math.round(m.e/maxR*100)}%`,background:'var(--verde)'}}/></div>
                  <div className="rb" style={{marginTop:1}}><div className="rbf" style={{width:`${Math.round(m.u/maxR*100)}%`,background:'var(--rosso)'}}/></div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title"><span className="dot"/>Totale {annoCorrente}</div>
              {(() => {
                const totE=reportMesi.reduce((s,m)=>s+m.e,0), totU=reportMesi.reduce((s,m)=>s+m.u,0)
                return <div style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
                  <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:22,fontWeight:600,color:'var(--verde)'}}>{fmt(totE)}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.06em'}}>Entrate</div></div>
                  <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:22,fontWeight:600,color:'var(--rosso)'}}>{fmt(totU)}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.06em'}}>Uscite</div></div>
                  <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:22,fontWeight:600,color:totE-totU>=0?'var(--verde)':'var(--rosso)'}}>{fmt(totE-totU)}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.06em'}}>Saldo</div></div>
                </div>
              })()}
            </div>

            {/* ── Analisi stagione: lordo/commissioni/cedolare/netto da prenotazioni ── */}
            {(() => {
              const agg = { lordo:reportMesi.reduce((s,m)=>s+m.e,0), commissione:reportMesi.reduce((s,m)=>s+m.commissione,0),
                cedolare:reportMesi.reduce((s,m)=>s+m.cedolare,0), netto:reportMesi.reduce((s,m)=>s+m.netto,0),
                notti:reportMesi.reduce((s,m)=>s+m.notti,0), count:reportMesi.reduce((s,m)=>s+m.prenotazioni,0) }
              if (agg.count===0) return null
              return <div className="card">
                <div className="card-title"><span className="dot"/>Analisi prenotazioni {annoCorrente}</div>
                <div style={{display:'flex',justifyContent:'space-around',textAlign:'center',marginBottom:10}}>
                  <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>{agg.count}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Prenotaz.</div></div>
                  <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>{agg.notti}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Notti</div></div>
                  <div><div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600}}>{fmtFull(agg.notti?agg.lordo/agg.notti:0)}</div><div style={{fontSize:9,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.05em'}}>Media/notte</div></div>
                </div>
                <RiepilogoEconomico agg={agg} titoloNetto="Netto prenotazioni"/>
              </div>
            })()}
            <div style={{marginTop:4}}>
              <button className="btn bs bfull" onClick={()=>{
                let csv='Tipo,Descrizione,Importo,Data,Categoria\n'
                db.finanze.forEach(f=>{csv+=`${f.tipo},"${f.descrizione}",${f.importo},${f.data},${f.categoria}\n`})
                const b=new Blob([csv],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='cp-finanze.csv'; a.click()
              }}>⬇ Esporta CSV</button>
            </div>
          </>}
        </>}

        {/* ── PREZZI ────────────────────────────────────────────── */}
        {!db.loading && screen==='prezzi' && <>
          <div className="tabs">
            {['tariffe','regole','advisor'].map(t=><button key={t} className={`tab${prezziTab===t?' active':''}`} onClick={()=>setPrezziTab(t)}>
              {t==='tariffe'?'📊 Tariffe':t==='regole'?'⚙️ Regole':'🤖 AI Advisor'}
            </button>)}
          </div>

          {prezziTab==='tariffe'&&<>
            <div className="infobox">
              <strong>💡 Obiettivo: almeno {fmt(parseFloat(db.impostazioni.utile_min_giorno||50))} di utile netto a notte</strong>
              Sotto ogni prezzo trovi il minimo che serve per garantirlo, dopo commissione della piattaforma e cedolare secca (21%, sempre sul prezzo intero). <strong>Diretto</strong>: nessuna commissione, solo cedolare. <strong>Booking</strong>: commissione 18%. <strong>Airbnb</strong>: 3% fino al {fmtDate(db.impostazioni.data_cambio_airbnb||'2026-10-13')}, poi <strong>15,5%</strong> (nuova fee unica a carico host, sostituisce il vecchio 3%+service fee ospite).
            </div>
            {db.prezzi.filter(p=>p.attivo).map(p=>{
              const pc=PERIODO_COLOR[p.tipo_periodo]||PERIODO_COLOR.bassa
              const refDate=p.data_inizio||todayStr
              const piattaforme=[
                {k:'airbnb', label:'Airbnb', color:'#C02228', prezzo:p.prezzo_airbnb},
                {k:'booking', label:'Booking', color:'#003B95', prezzo:p.prezzo_booking},
                {k:'diretto', label:'Diretto', color:'var(--verde)', prezzo:p.prezzo_diretto},
              ]
              return <div key={p.id} className="card" style={{marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--pietra)'}}>{p.nome_periodo}</div>
                <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                  <span className="badge" style={{background:pc.bg,color:pc.c}}>{pc.label}</span>
                  {p.soggiorno_min>1&&<span className="pill">min {p.soggiorno_min} notti</span>}
                  {p.data_inizio&&<span className="pill">{fmtDate(p.data_inizio)} → {fmtDate(p.data_fine)}</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:10}}>
                  {piattaforme.map(pl=>{
                    const min=prezzoMinimo(pl.k,refDate,db.impostazioni)
                    const sotto=pl.prezzo && pl.prezzo<min
                    return <div key={pl.k} style={{textAlign:'center',background:'var(--sabbia)',borderRadius:7,padding:'8px 4px'}}>
                      <div style={{fontSize:9,color:pl.color,fontWeight:700,textTransform:'uppercase',letterSpacing:'.03em'}}>{pl.label}</div>
                      <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontWeight:600,color:pl.prezzo?pl.color:'var(--grigio)',marginTop:2}}>{pl.prezzo?`€${pl.prezzo}`:'—'}</div>
                      <div style={{fontSize:8,color:sotto?'var(--rosso)':'var(--grigio)',marginTop:3,fontWeight:sotto?700:400}}>{sotto?`⚠️ min €${min.toFixed(0)}`:`min €${min.toFixed(0)}`}</div>
                    </div>
                  })}
                </div>
              </div>
            })}
            {db.prezzi.filter(p=>p.attivo).length===0&&<div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20}}><div className="emi">📊</div><p>Nessuna tariffa</p></div>}
            <button className="btn bp bfull" style={{marginTop:6}} onClick={()=>setModal('modal-prezzo')}>+ Nuova tariffa</button>

            <div className="stitle">Blocchi liberi prossimi 90gg</div>
            {blocchiLiberi.length===0
              ? <div className="card"><div className="empty" style={{padding:12}}><div className="emi">📅</div><p>Calendario pieno nei prossimi 90 giorni!</p></div></div>
              : blocchiLiberi.slice(0,6).map((b,i)=>(
                <div key={i} className="card" style={{marginBottom:7,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600}}>📅 {fmtDate(b.da)} → {fmtDate(b.a)}</div>
                    <div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>{b.giorni} giorni liberi consecutivi</div>
                  </div>
                  <span className={`badge ${b.giorni>=7?'b-ok':b.giorni>=3?'b-presto':'b-scaduto'}`}>{b.giorni}g</span>
                </div>
              ))}
          </>}

          {prezziTab==='regole'&&<>
            {db.regole.length===0
              ? <div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20,marginBottom:9}}><div className="emi">⚙️</div><p>Nessuna regola dinamica</p></div>
              : db.regole.map(r=>(
                <div key={r.id} className="card" style={{marginBottom:8,borderLeft:`3px solid ${r.attiva?'var(--verde)':'var(--grigio)'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{r.nome}</div>
                      <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap'}}>
                        <span className="pill">{REGOLA_TIPO_LABEL[r.tipo]||r.tipo}</span>
                        <span className="badge" style={{background:r.modifica.startsWith('+')?'rgba(74,103,65,.12)':'rgba(192,57,43,.1)',color:r.modifica.startsWith('+')?'var(--verde)':'var(--rosso)',fontSize:11,padding:'2px 8px'}}>{r.modifica}</span>
                        {r.attiva?<span className="badge b-ok">Attiva</span>:<span className="badge pill">Inattiva</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn bs bsm" onClick={()=>db.updateRegola(r.id,{attiva:!r.attiva})}>{r.attiva?'Disattiva':'Attiva'}</button>
                      <button className="del" onClick={()=>db.deleteRegola(r.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            <div className="infobox">
              <strong>ℹ️ Come funzionano le regole</strong>
              Le regole vengono considerate dall'AI Advisor per suggerire modifiche ai prezzi. Non modificano automaticamente le piattaforme — le modifiche vanno applicate manualmente su Airbnb e Booking.
            </div>
          </>}

          {prezziTab==='advisor'&&<>
            <div className="ai-bubble">
              <div className="ai-header">
                <div className="ai-icon">🤖</div>
                <div>
                  <div className="ai-title">AI Pricing Advisor</div>
                  <div className="ai-sub">Analisi calendario + stagionalità + regole</div>
                </div>
              </div>
              {aiLoading
                ? <div className="ai-loading"><div className="ai-dots"><span>●</span><span>●</span><span>●</span></div> Analisi in corso...</div>
                : aiText
                  ? <div className="ai-body">{aiText}</div>
                  : <div style={{fontSize:12,color:'var(--grigio)',lineHeight:1.6}}>
                      Premi il pulsante per ottenere suggerimenti personalizzati sui prezzi basati su:<br/>
                      📅 Il tuo calendario prenotazioni<br/>
                      📈 Stagionalità Sardegna<br/>
                      ⚙️ Le tue regole di pricing<br/>
                      🏖 Domanda nel periodo
                    </div>
              }
            </div>
            <button className={`btn ${aiLoading?'bs':'bp'} bfull`} onClick={runAiPricing} disabled={aiLoading}>
              {aiLoading?'⏳ Analisi...':'🤖 Analizza e suggerisci prezzi'}
            </button>
            {aiText&&<button className="btn bs bfull" style={{marginTop:6}} onClick={()=>setAiText('')}>↺ Nuova analisi</button>}

            <div className="stitle">Il tuo calendario</div>
            <div className="kpi-strip k3">
              <div className="kpi c"><div className="kv">{occPerc}%</div><div className="kl">Occup. mese</div></div>
              <div className="kpi v"><div className="kv">{prenFuture.length}</div><div className="kl">Pren. future</div></div>
              <div className="kpi o"><div className="kv">{blocchiLiberi.length}</div><div className="kl">Blocchi liberi</div></div>
            </div>
          </>}
        </>}

        {/* ── GESTIONE ──────────────────────────────────────────── */}
        {!db.loading && screen==='gestione' && <>
          <div className="tabs">
            {['scadenze','manutenzioni','inventario','documenti','ospiti'].map(t=><button key={t} className={`tab${gestTab===t?' active':''}`} onClick={()=>setGestTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
          </div>

          {gestTab==='scadenze'&&<>
            <div className="tabs" style={{marginBottom:8}}>
              <button className={`tab${scadTab==='attive'?' active':''}`} onClick={()=>setScadTab('attive')}>Attive</button>
              <button className={`tab${scadTab==='completate'?' active':''}`} onClick={()=>setScadTab('completate')}>Completate</button>
            </div>
            {db.scadenze.filter(s=>scadTab==='attive'?!s.completata:s.completata).sort((a,b)=>a.data.localeCompare(b.data)).map(s=>{
              const urg=getUrgenza(s.data); const d=diffDays(s.data,todayStr)
              return <div key={s.id} className="card" style={{marginBottom:8}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                  <div className="iico c" style={{marginTop:2}}>{CAT_ICON[s.categoria]||'🔔'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:6}}>
                      <div style={{fontSize:12,fontWeight:600}}>{s.titolo}</div>
                      {s.importo&&<div style={{fontFamily:'Cormorant Garamond,serif',fontSize:14,fontWeight:600,flexShrink:0}}>{fmtFull(s.importo)}</div>}
                    </div>
                    <div style={{fontSize:10,color:'var(--grigio)',marginTop:3}}>{fmtDate(s.data)} · <span className={`badge b-${urg}`}>{d<0?`Scaduta ${Math.abs(d)}g fa`:d===0?'Oggi!':d+'g'}</span></div>
                    {s.ricorrenza!=='una-tantum'&&<div style={{fontSize:9,color:'var(--grigio)',marginTop:2}}>🔄 {s.ricorrenza}</div>}
                    {s.note&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>📝 {s.note}</div>}
                    <div className={`ub ${urg}`}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,marginTop:9}}>
                  <button className="btn bs bsm" style={{flex:1}} onClick={()=>db.updateScadenza(s.id,{completata:!s.completata})}>{s.completata?'↩ Riattiva':'✓ Fatto'}</button>
                  <button className="del" onClick={()=>db.deleteScadenza(s.id)}>🗑</button>
                </div>
              </div>
            })}
            {db.scadenze.filter(s=>scadTab==='attive'?!s.completata:s.completata).length===0&&<div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20}}><div className="emi">✅</div><p>Nessuna scadenza {scadTab}</p></div>}
          </>}

          {gestTab==='manutenzioni'&&<>
            {db.manutenzioni.map(m=>(
              <div key={m.id} className="card" style={{marginBottom:8,borderLeft:`3px solid ${m.stato==='completato'?'var(--verde)':m.stato==='in_corso'?'var(--oro)':'var(--cielo)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{m.titolo}</div>
                    <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap'}}>
                      <span className="pill">{m.tipo}</span>
                      <span className={`badge ${m.stato==='completato'?'b-ok':m.stato==='in_corso'?'b-oggi':'b-presto'}`}>{m.stato.replace('_',' ')}</span>
                    </div>
                    <div style={{fontSize:10,color:'var(--grigio)',marginTop:3}}>📅 {fmtDate(m.data)}{m.costo&&` · ${fmtFull(m.costo)}`}{m.fornitore&&` · ${m.fornitore}`}</div>
                    {m.prossima_data&&<div style={{fontSize:10,color:'var(--oro)',marginTop:2}}>🔁 Prossima: {fmtDate(m.prossima_data)}</div>}
                    {m.note&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>📝 {m.note}</div>}
                  </div>
                  <button className="del" onClick={()=>db.deleteManutenzione(m.id)}>🗑</button>
                </div>
              </div>
            ))}
            {db.manutenzioni.length===0&&<div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20,marginBottom:9}}><div className="emi">🔧</div><p>Nessuna manutenzione</p></div>}
          </>}

          {gestTab==='inventario'&&<>
            {['Cucina','Camera','Bagno','Elettrodomestici','Sicurezza','Altro'].map(cat=>{
              const items=db.inventario.filter(i=>i.categoria===cat)
              if(!items.length) return null
              return <div key={cat}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--grigio)',textTransform:'uppercase',letterSpacing:'.07em',margin:'12px 0 5px',paddingBottom:4,borderBottom:'1px solid var(--sabbia-scura)'}}>{cat}</div>
                {items.map(inv=>(
                  <div key={inv.id} className="ir">
                    <div className="iico c">📦</div>
                    <div className="ibody">
                      <div className="iname">{inv.nome}</div>
                      <div className="imeta">Qta: {inv.quantita}</div>
                    </div>
                    <div style={{display:'flex',gap:5,alignItems:'center'}}>
                      <span className={`badge ${inv.stato==='ok'?'b-ok':inv.stato==='da_sostituire'?'b-oggi':'b-scaduto'}`}>
                        {inv.stato==='ok'?'✅ Ok':inv.stato==='da_sostituire'?'⚠️ Sostit.':'❌ Mancante'}
                      </span>
                      <button className="del" onClick={()=>db.deleteInventario(inv.id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            })}
          </>}

          {gestTab==='documenti'&&<>
            {db.documenti.map(d=>{
              const urg=d.scadenza?getUrgenza(d.scadenza):'ok'
              return <div key={d.id} className="card" style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{d.nome}</div>
                    <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap'}}>
                      <span className="pill">{d.tipo}</span>
                      {d.numero&&<span className="pill">N° {d.numero}</span>}
                    </div>
                    {d.scadenza&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:3}}>📅 Scadenza: {fmtDate(d.scadenza)} <span className={`badge b-${urg}`}>{urg==='ok'?'Valido':urg==='presto'?'In scadenza':'Scaduto'}</span></div>}
                    {d.fornitore&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>🏢 {d.fornitore}</div>}
                    {d.note&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>📝 {d.note}</div>}
                    {d.url&&<a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:10,color:'var(--cielo)',display:'block',marginTop:3}}>🔗 Apri documento</a>}
                  </div>
                  <button className="del" onClick={()=>db.deleteDocumento(d.id)}>🗑</button>
                </div>
              </div>
            })}
            {db.documenti.length===0&&<div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20,marginBottom:9}}><div className="emi">📁</div><p>Nessun documento</p></div>}
          </>}

          {gestTab==='ospiti'&&(() => {
            const pren = db.prenotazioni.filter(p=>p.ospite_id)
            const incassoOspiti = pren.reduce((s,p)=>s+Number(p.totale||0),0)
            const nazBreak = {}
            db.ospiti.forEach(o=>{ const n=o.nazionalita||'—'; nazBreak[n]=(nazBreak[n]||0)+1 })
            const nazSorted = Object.entries(nazBreak).sort((a,b)=>b[1]-a[1])
            return <>
              <div className="kpi-strip k3">
                <div className="kpi c"><div className="kv">{db.ospiti.length}</div><div className="kl">Ospiti</div></div>
                <div className="kpi v"><div className="kv">{fmt(incassoOspiti)}</div><div className="kl">Incasso collegato</div></div>
                <div className="kpi o"><div className="kv">{nazSorted.length}</div><div className="kl">Nazionalità</div></div>
              </div>
              {nazSorted.length>0&&<div className="card">
                <div className="card-title"><span className="dot"/>Nazionalità</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {nazSorted.map(([n,c])=><span key={n} className="pill">{n} · {c}</span>)}
                </div>
              </div>}
              <button className="btn bp bfull" style={{marginBottom:9}} onClick={()=>setModal('modal-ospite')}>+ Nuovo ospite</button>
              {db.ospiti.map(o=>{
                const prenOspite = db.prenotazioni.filter(p=>p.ospite_id===o.id).sort((a,b)=>b.checkin.localeCompare(a.checkin))
                const totOspite = prenOspite.reduce((s,p)=>s+Number(p.totale||0),0)
                return <div key={o.id} className="card" style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{o.nome} {o.cognome||''}</div>
                      <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap'}}>
                        <span className="pill">{o.nazionalita||'—'}</span>
                        {o.tipo_documento&&<span className="pill">{o.tipo_documento}{o.numero_documento?' '+o.numero_documento:''}</span>}
                      </div>
                      {(o.email||o.telefono)&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:3}}>{o.email}{o.email&&o.telefono?' · ':''}{o.telefono}</div>}
                      {o.data_nascita&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>🎂 {fmtDate(o.data_nascita)}{o.luogo_nascita?' · '+o.luogo_nascita:''}</div>}
                      {o.note&&<div style={{fontSize:10,color:'var(--grigio)',marginTop:2}}>📝 {o.note}</div>}
                    </div>
                    <button className="del" onClick={()=>db.deleteOspite(o.id)}>🗑</button>
                  </div>
                  {prenOspite.length>0&&<div style={{marginTop:9,paddingTop:8,borderTop:'1px solid var(--sabbia-scura)'}}>
                    {prenOspite.map(p=>(
                      <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,padding:'4px 0'}}>
                        <span>📅 {fmtDate(p.checkin)} → {fmtDate(p.checkout)} · <span className={`badge ${piattaformaBadge(p.piattaforma)}`}>{piattaformaLabel(p.piattaforma)}</span></span>
                        <span style={{fontFamily:'Cormorant Garamond,serif',fontWeight:600,color:'var(--verde)'}}>{fmtFull(p.totale)}</span>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:'var(--grigio)',marginTop:4,textAlign:'right'}}>Totale: <strong>{fmtFull(totOspite)}</strong></div>
                  </div>}
                </div>
              })}
              {db.ospiti.length===0&&<div className="empty" style={{background:'var(--bianco)',borderRadius:'var(--r)',padding:20}}><div className="emi">👤</div><p>Nessun ospite registrato</p></div>}
            </>
          })()}
        </>}

        {/* ── ANALISI ───────────────────────────────────────────── */}
        {!db.loading && screen==='analisi' && <>
          <div className="card" style={{marginBottom:9}}>
            <div className="card-title"><span className="dot"/>Entrate per mese</div>
            <MonthlyBarChart dati={mesiAnalisi}/>
          </div>
          <div className="card" style={{marginBottom:9}}>
            <div className="card-title"><span className="dot"/>Occupazione</div>
            <div style={{fontSize:10,color:'var(--grigio)',marginBottom:6}}>Chiusure per pulizie escluse, sia dalle notti vendute che da quelle disponibili</div>
            <MonthlyLineChart dati={mesiAnalisi.map(d=>({mk:d.mk,label:d.label,value:d.occPerc}))} series={[{key:'value',label:'Occupazione',color:'var(--terracotta)'}]} fmtVal={v=>v+'%'} domain={[0,100]}/>
          </div>
          <div className="card" style={{marginBottom:9}}>
            <div className="card-title"><span className="dot"/>Prezzo medio a notte (ADR)</div>
            <MonthlyLineChart dati={mesiAnalisi.map(d=>({mk:d.mk,label:d.label,adr:d.adr,adrNetto:d.adrNetto}))} series={[{key:'adr',label:'ADR lordo',color:'var(--terracotta-light)'},{key:'adrNetto',label:'ADR netto',color:'var(--terracotta)'}]} fmtVal={v=>fmt(v)}/>
          </div>
          <div className="card">
            <div className="card-title"><span className="dot"/>Ripartizione per piattaforma</div>
            <PlatformBarChart dati={platformTotali}/>
          </div>
        </>}
      </main>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="nav">
        {[
          ['home','Home',<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>],
          ['prenotazioni','Prenotaz.',<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>],
          ['finanze','Finanze',<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>],
          ['prezzi','Prezzi',<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>],
          ['analisi','Analisi',<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>],
          ['gestione','Gestione',<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>],
        ].map(([id,lbl,icon])=>(
          <button key={id} className={`nb${screen===id?' active':''}`} onClick={()=>setScreen(id)}>
            {icon}<span className="nb-lbl">{lbl}</span>
            {id==='gestione'&&scadUrgenti.length>0&&<div className="nb-dot"/>}
          </button>
        ))}
      </nav>

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <button className="fab" onClick={()=>setModal('fab')}>+</button>

      {/* ── MODALS ───────────────────────────────────────────────── */}

      {/* FAB menu */}
      <Modal open={modal==='fab'} onClose={()=>setModal(null)}>
        <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:4}}>
          {[['modal-prenotazione','📅','Nuova prenotazione','bp'],['modal-finanza','💶','Nuova transazione','bp'],['modal-bolletta','🧾','Nuova bolletta','bs'],['modal-scadenza','🔔','Nuova scadenza','bs'],['modal-manutenzione','🔧','Nuova manutenzione','bs'],['modal-inventario','📦','Nuovo inventario','bs'],['modal-documento','📁','Nuovo documento','bs'],['modal-prezzo','📊','Nuova tariffa','bs'],['modal-ospite','👤','Nuovo ospite','bs'],].map(([m,ic,lbl,cls])=>(
            <button key={m} className={`btn ${cls} bfull`} style={{justifyContent:'flex-start',gap:12,padding:'12px 14px',fontSize:14}} onClick={()=>{if(m==='modal-prenotazione')setPrenForm(emptyPren);setModal(m)}}><span style={{fontSize:18}}>{ic}</span>{lbl}</button>
          ))}
        </div>
      </Modal>

      {/* Prenotazione */}
      <Modal open={modal==='modal-prenotazione'} onClose={()=>setModal(null)} title={prenForm.id?'Modifica prenotazione':prenForm.ical_uid?'Completa prenotazione (da iCal)':'Nuova prenotazione'}>
        <div className="fg"><label className="fl">Nome ospite</label><input className="fi" value={prenForm.nome} onChange={e=>setPrenForm(f=>({...f,nome:e.target.value}))} placeholder="Nome Cognome"/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Check-in</label><input type="date" className="fi" value={prenForm.checkin} onChange={e=>setPrenForm(f=>({...f,checkin:e.target.value}))}/></div>
          <div className="fg"><label className="fl">Check-out</label><input type="date" className="fi" value={prenForm.checkout} onChange={e=>setPrenForm(f=>({...f,checkout:e.target.value}))}/></div>
        </div>
        <div className="fg">
          <label className="fl">Notti</label>
          <input type="number" min="1" className="fi" style={{maxWidth:100}}
            value={prenForm.checkin&&prenForm.checkout&&prenForm.checkout>prenForm.checkin ? diffDays(prenForm.checkout,prenForm.checkin) : ''}
            placeholder="—"
            onChange={e=>{
              const n=parseInt(e.target.value)||1
              const base=prenForm.checkin||todayStr
              const co=new Date(new Date(base).getTime()+n*86400000).toISOString().slice(0,10)
              setPrenForm(f=>({...f, checkin:base, checkout:co}))
            }}/>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Ospiti</label><input type="number" className="fi" value={prenForm.ospiti_num} onChange={e=>setPrenForm(f=>({...f,ospiti_num:e.target.value}))} min="1"/></div>
          <div className="fg"><label className="fl">Lordo / Totale (€)</label><input type="number" className="fi" value={prenForm.totale} onChange={e=>setPrenForm(f=>({...f,totale:e.target.value}))} step="0.01"/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Acconto (€)</label><input type="number" className="fi" value={prenForm.acconto} onChange={e=>setPrenForm(f=>({...f,acconto:e.target.value}))} step="0.01"/></div>
          <div className="fg"><label className="fl">Commissione (€)</label><input type="number" className="fi" value={prenForm.commissione} onChange={e=>setPrenForm(f=>({...f,commissione:e.target.value}))} step="0.01"/></div>
        </div>
        {prenForm.totale&&(() => {
          const notti = (prenForm.checkin&&prenForm.checkout&&prenForm.checkout>prenForm.checkin) ? diffDays(prenForm.checkout,prenForm.checkin) : 0
          const {lordo, commissione, cedolare, netto, stimata} = scomponi(prenForm.piattaforma, prenForm.checkin||todayStr, prenForm.totale, prenForm.commissione, db.impostazioni)
          const nettoNotte = notti>0 ? netto/notti : null
          const target = parseFloat(db.impostazioni.utile_min_giorno||50)
          const sottoSoglia = nettoNotte!==null && nettoNotte<target
          return <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:10,color:'var(--grigio)',marginTop:-6,marginBottom:8}}>
              <div>{stimata?'Commissione stimata':'Commissione'}: <strong>{fmtFull(commissione)}</strong></div>
              <div>Cedolare secca ({parseFloat(db.impostazioni.taglio_diretto_pct||21)}%): <strong>{fmtFull(cedolare)}</strong></div>
            </div>
            <div className="fg">
              <label className="fl">Netto (€){stimata?' — stimato':''}</label>
              <input type="number" className="fi" step="0.01" value={netto.toFixed(2)}
                style={sottoSoglia?{borderColor:'var(--rosso)',color:'var(--rosso)'}:{color:'var(--verde)'}}
                onChange={e=>{
                  const newNetto=parseFloat(e.target.value)||0
                  setPrenForm(f=>({...f, commissione:(lordo-cedolare-newNetto).toFixed(2)}))
                }}/>
              {nettoNotte!==null&&<div style={{fontSize:10,color:sottoSoglia?'var(--rosso)':'var(--grigio)',marginTop:4}}>
                {fmtFull(nettoNotte)}/notte{sottoSoglia&&<> ⚠️ sotto i {fmt(target)}/notte</>}
              </div>}
            </div>
          </>
        })()}
        <div className="frow">
          <div className="fg"><label className="fl">Piattaforma</label><select className="fs" value={prenForm.piattaforma} onChange={e=>setPrenForm(f=>({...f,piattaforma:e.target.value}))}><option value="diretto">Diretto</option><option value="airbnb">Airbnb</option><option value="booking">Booking.com</option><option value="altro">Altro</option></select></div>
          <div className="fg"><label className="fl">Pagamento</label><select className="fs" value={prenForm.stato_pagamento} onChange={e=>setPrenForm(f=>({...f,stato_pagamento:e.target.value}))}><option value="da_saldare">Da saldare</option><option value="acconto">Acconto</option><option value="saldato">Saldato</option></select></div>
        </div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={prenForm.note} onChange={e=>setPrenForm(f=>({...f,note:e.target.value}))} placeholder="Telefono, richieste..."/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Recensione ricevuta (0-10)</label><input type="number" min="0" max="10" step="0.5" className="fi" value={prenForm.recensione_voto} onChange={e=>setPrenForm(f=>({...f,recensione_voto:e.target.value}))} placeholder="es. 10"/></div>
          <div className="fg"><label className="fl">Commento recensione</label><input className="fi" value={prenForm.recensione_testo} onChange={e=>setPrenForm(f=>({...f,recensione_testo:e.target.value}))} placeholder="opz."/></div>
        </div>
        <div className="fg">
          <label className="fl">Ospite collegato (nazionalità, documento...)</label>
          <select className="fs" value={prenForm.ospite_id} onChange={e=>setPrenForm(f=>({...f,ospite_id:e.target.value}))}>
            <option value="">— Nessuno —</option>
            {db.ospiti.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome||''} ({o.nazionalita||'—'})</option>)}
          </select>
          {db.ospiti.length===0&&<div style={{fontSize:9,color:'var(--grigio)',marginTop:4}}>Nessun ospite salvato — crealo da Gestione → Ospiti per aggiungere nazionalità e documento.</div>}
        </div>
        {(() => {
          const overlap = trovaSovrapposizione(prenForm.checkin, prenForm.checkout, prenForm.id, prenForm.ical_uid)
          return <>
            {overlap&&<div className="alert">⚠️ Date sovrapposte con {occupancyLabel(overlap)||'un\'altra prenotazione'} ({fmtDate(overlap.checkin)} → {fmtDate(overlap.checkout)}) — puoi salvare comunque.</div>}
            <button className={`btn ${overlap?'bd':'bp'} bfull`} onClick={salvaPrenotazione}>{overlap?'Salva comunque':'Salva prenotazione'}</button>
          </>
        })()}
      </Modal>

      {/* Dettaglio entrate */}
      <Modal open={modal==='dettaglio-entrate'} onClose={()=>setModal(null)} title="💶 Entrate del mese" wide>
        {(() => {
          const voci = db.prenotazioni.filter(p=>p.checkin.slice(0,7)===mk).sort((a,b)=>a.checkin.localeCompare(b.checkin))
          return voci.length===0
            ? <div className="empty" style={{padding:12}}><div className="emi">💶</div><p>Nessuna entrata questo mese</p></div>
            : <>
              {voci.map(p=>{
                const notti = diffDays(p.checkout,p.checkin)
                const s = scomponi(p.piattaforma, p.checkin, p.totale, p.commissione, db.impostazioni)
                return <div key={p.id} className="ir" style={{flexWrap:'wrap'}}>
                  <div className={`iico ${p.piattaforma==='airbnb'?'r':p.piattaforma==='booking'?'c':'v'}`}>🏠</div>
                  <div className="ibody">
                    <div className="iname">{p.nome}</div>
                    <div className="imeta">{fmtDate(p.checkin)} → {fmtDate(p.checkout)} · {notti}n · <span className={`badge ${piattaformaBadge(p.piattaforma)}`}>{piattaformaLabel(p.piattaforma)}</span></div>
                    <div style={{fontSize:9,color:'var(--grigio)',marginTop:3}}>Comm. {fmtFull(s.commissione)} · Cedolare {fmtFull(s.cedolare)}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                    <span className="iamt v">{fmtFull(p.totale)}</span>
                    <span style={{fontSize:9,color:'var(--grigio)'}}>netto {fmtFull(s.netto)}</span>
                  </div>
                </div>
              })}
              <div style={{marginTop:10}}><RiepilogoEconomico agg={aggregaPrenotazioni(voci, db.impostazioni)} titoloNetto="Netto"/></div>
            </>
        })()}
      </Modal>

      {/* Ospite */}
      <Modal open={modal==='modal-ospite'} onClose={()=>setModal(null)} title="Nuovo ospite">
        <div className="frow">
          <div className="fg"><label className="fl">Nome</label><input className="fi" value={ospForm.nome} onChange={e=>setOspForm(f=>({...f,nome:e.target.value}))} placeholder="Nome"/></div>
          <div className="fg"><label className="fl">Cognome</label><input className="fi" value={ospForm.cognome} onChange={e=>setOspForm(f=>({...f,cognome:e.target.value}))} placeholder="Cognome"/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={ospForm.email} onChange={e=>setOspForm(f=>({...f,email:e.target.value}))}/></div>
          <div className="fg"><label className="fl">Telefono</label><input type="tel" className="fi" value={ospForm.telefono} onChange={e=>setOspForm(f=>({...f,telefono:e.target.value}))}/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Nazionalità</label><input className="fi" value={ospForm.nazionalita} onChange={e=>setOspForm(f=>({...f,nazionalita:e.target.value}))} placeholder="IT"/></div>
          <div className="fg"><label className="fl">Data nascita</label><input type="date" className="fi" value={ospForm.data_nascita} onChange={e=>setOspForm(f=>({...f,data_nascita:e.target.value}))}/></div>
        </div>
        <div className="fg"><label className="fl">Luogo di nascita</label><input className="fi" value={ospForm.luogo_nascita} onChange={e=>setOspForm(f=>({...f,luogo_nascita:e.target.value}))}/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Tipo documento</label><select className="fs" value={ospForm.tipo_documento} onChange={e=>setOspForm(f=>({...f,tipo_documento:e.target.value}))}>{['CI','Passaporto','Patente'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fg"><label className="fl">N° documento</label><input className="fi" value={ospForm.numero_documento} onChange={e=>setOspForm(f=>({...f,numero_documento:e.target.value}))}/></div>
        </div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={ospForm.note} onChange={e=>setOspForm(f=>({...f,note:e.target.value}))}/></div>
        <button className="btn bp bfull" onClick={salvaOspite}>Salva ospite</button>
      </Modal>

      {/* Finanza */}
      <Modal open={modal==='modal-finanza'} onClose={()=>setModal(null)} title="Nuova transazione">
        <div className="seg">
          <button className={`segb${finForm.tipo==='entrata'?' ent':''}`} onClick={()=>setFinForm(f=>({...f,tipo:'entrata'}))}>↑ Entrata</button>
          <button className={`segb${finForm.tipo==='uscita'?' usc':''}`} onClick={()=>setFinForm(f=>({...f,tipo:'uscita'}))}>↓ Uscita</button>
        </div>
        <div className="fg"><label className="fl">Descrizione</label><input className="fi" value={finForm.descrizione} onChange={e=>setFinForm(f=>({...f,descrizione:e.target.value}))} placeholder="es. Affitto luglio..."/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Importo (€)</label><input type="number" className="fi" value={finForm.importo} onChange={e=>setFinForm(f=>({...f,importo:e.target.value}))} step="0.01"/></div>
          <div className="fg"><label className="fl">Data</label><input type="date" className="fi" value={finForm.data} onChange={e=>setFinForm(f=>({...f,data:e.target.value}))}/></div>
        </div>
        <div className="fg"><label className="fl">Categoria</label>
          <select className="fs" value={finForm.categoria} onChange={e=>setFinForm(f=>({...f,categoria:e.target.value}))}>
            {['prenotazione','pulizie','manutenzione','bolletta-luce','bolletta-acqua','bolletta-internet','spesa','tassa','assicurazione','commissione','altro'].map(c=><option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={finForm.note} onChange={e=>setFinForm(f=>({...f,note:e.target.value}))} placeholder=""/></div>
        <button className="btn bp bfull" onClick={salvaFinanza}>Salva</button>
      </Modal>

      {/* Bolletta */}
      <Modal open={modal==='modal-bolletta'} onClose={()=>setModal(null)} title="Nuova bolletta">
        <div className="fg"><label className="fl">Tipo</label><select className="fs" value={bollForm.tipo} onChange={e=>setBollForm(f=>({...f,tipo:e.target.value}))}>{Object.entries(BOLL_TIPI).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</select></div>
        <div className="fg"><label className="fl">N° bolletta</label><input className="fi" value={bollForm.numero} onChange={e=>setBollForm(f=>({...f,numero:e.target.value}))} placeholder="es. FT/2026/00123"/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Data emissione</label><input type="date" className="fi" value={bollForm.data} onChange={e=>setBollForm(f=>({...f,data:e.target.value}))}/></div>
          <div className="fg"><label className="fl">Scadenza</label><input type="date" className="fi" value={bollForm.scadenza} onChange={e=>setBollForm(f=>({...f,scadenza:e.target.value}))}/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Periodo</label><input className="fi" value={bollForm.periodo} onChange={e=>setBollForm(f=>({...f,periodo:e.target.value}))} placeholder="Lug–Ago 2026"/></div>
          <div className="fg"><label className="fl">Importo (€)</label><input type="number" className="fi" value={bollForm.importo} onChange={e=>setBollForm(f=>({...f,importo:e.target.value}))} step="0.01"/></div>
        </div>
        <div className="fg"><label className="fl">Fornitore</label><input className="fi" value={bollForm.fornitore} onChange={e=>setBollForm(f=>({...f,fornitore:e.target.value}))} placeholder="ENEL, ABBANOA..."/></div>
        <div className="fg"><label className="fl">Stato</label>
          <div className="seg">
            <button className={`segb${bollForm.stato==='da-pagare'?' dpag':''}`} onClick={()=>setBollForm(f=>({...f,stato:'da-pagare',data_pagamento:''}))}>⏳ Da pagare</button>
            <button className={`segb${bollForm.stato==='pagata'?' pag':''}`} onClick={()=>setBollForm(f=>({...f,stato:'pagata',data_pagamento:todayStr}))}>✅ Pagata</button>
          </div>
        </div>
        {bollForm.stato==='pagata'&&<div className="fg"><label className="fl">Data pagamento</label><input type="date" className="fi" value={bollForm.data_pagamento} onChange={e=>setBollForm(f=>({...f,data_pagamento:e.target.value}))}/></div>}
        <button className="btn bp bfull" onClick={salvaBolletta}>Salva</button>
      </Modal>

      {/* Scadenza */}
      <Modal open={modal==='modal-scadenza'} onClose={()=>setModal(null)} title="Nuova scadenza">
        <div className="fg"><label className="fl">Titolo</label><input className="fi" value={scadForm.titolo} onChange={e=>setScadForm(f=>({...f,titolo:e.target.value}))} placeholder="es. Pagamento IMU..."/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Data</label><input type="date" className="fi" value={scadForm.data} onChange={e=>setScadForm(f=>({...f,data:e.target.value}))}/></div>
          <div className="fg"><label className="fl">Importo (€)</label><input type="number" className="fi" value={scadForm.importo} onChange={e=>setScadForm(f=>({...f,importo:e.target.value}))} placeholder="opz." step="0.01"/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Categoria</label><select className="fs" value={scadForm.categoria} onChange={e=>setScadForm(f=>({...f,categoria:e.target.value}))}>{['bolletta','tassa','manutenzione','assicurazione','licenza','reminder'].map(c=><option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}</select></div>
          <div className="fg"><label className="fl">Ricorrenza</label><select className="fs" value={scadForm.ricorrenza} onChange={e=>setScadForm(f=>({...f,ricorrenza:e.target.value}))}>{['una-tantum','mensile','bimestrale','trimestrale','semestrale','annuale'].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
        </div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={scadForm.note} onChange={e=>setScadForm(f=>({...f,note:e.target.value}))} placeholder=""/></div>
        <button className="btn bp bfull" onClick={salvaScadenza}>Salva</button>
      </Modal>

      {/* Manutenzione */}
      <Modal open={modal==='modal-manutenzione'} onClose={()=>setModal(null)} title="Nuova manutenzione">
        <div className="fg"><label className="fl">Titolo</label><input className="fi" value={manForm.titolo} onChange={e=>setManForm(f=>({...f,titolo:e.target.value}))} placeholder="es. Pulizia climatizzatori"/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Tipo</label><select className="fs" value={manForm.tipo} onChange={e=>setManForm(f=>({...f,tipo:e.target.value}))}>{['ordinaria','straordinaria','ispezione'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fg"><label className="fl">Stato</label><select className="fs" value={manForm.stato} onChange={e=>setManForm(f=>({...f,stato:e.target.value}))}>{['pianificato','in_corso','completato'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Data</label><input type="date" className="fi" value={manForm.data} onChange={e=>setManForm(f=>({...f,data:e.target.value}))}/></div>
          <div className="fg"><label className="fl">Costo (€)</label><input type="number" className="fi" value={manForm.costo} onChange={e=>setManForm(f=>({...f,costo:e.target.value}))} placeholder="opz." step="0.01"/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Fornitore</label><input className="fi" value={manForm.fornitore} onChange={e=>setManForm(f=>({...f,fornitore:e.target.value}))} placeholder="es. Idraulico Rossi"/></div>
          <div className="fg"><label className="fl">Telefono</label><input type="tel" className="fi" value={manForm.telefono} onChange={e=>setManForm(f=>({...f,telefono:e.target.value}))}/></div>
        </div>
        <div className="fg"><label className="fl">Prossima revisione</label><input type="date" className="fi" value={manForm.prossima_data} onChange={e=>setManForm(f=>({...f,prossima_data:e.target.value}))}/></div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={manForm.note} onChange={e=>setManForm(f=>({...f,note:e.target.value}))} placeholder=""/></div>
        <button className="btn bp bfull" onClick={salvaManutenzione}>Salva</button>
      </Modal>

      {/* Inventario */}
      <Modal open={modal==='modal-inventario'} onClose={()=>setModal(null)} title="Nuovo elemento inventario">
        <div className="fg"><label className="fl">Nome</label><input className="fi" value={invForm.nome} onChange={e=>setInvForm(f=>({...f,nome:e.target.value}))} placeholder="es. Asciugamani grandi"/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Categoria</label><select className="fs" value={invForm.categoria} onChange={e=>setInvForm(f=>({...f,categoria:e.target.value}))}>{['Cucina','Camera','Bagno','Elettrodomestici','Sicurezza','Altro'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="fg"><label className="fl">Quantità</label><input type="number" className="fi" value={invForm.quantita} onChange={e=>setInvForm(f=>({...f,quantita:e.target.value}))} min="0"/></div>
        </div>
        <div className="fg"><label className="fl">Stato</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
            {[['ok','✅ Ok'],['da_sostituire','⚠️ Sostituire'],['mancante','❌ Mancante']].map(([v,l])=>(
              <button key={v} className={`segb${invForm.stato===v?' pag':''}`} style={invForm.stato===v&&v!=='ok'?{borderColor:'var(--rosso)',background:'rgba(192,57,43,.08)',color:'var(--rosso)'}:{}} onClick={()=>setInvForm(f=>({...f,stato:v}))}>{l}</button>
            ))}
          </div>
        </div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={invForm.note} onChange={e=>setInvForm(f=>({...f,note:e.target.value}))} placeholder=""/></div>
        <button className="btn bp bfull" onClick={salvaInventario}>Salva</button>
      </Modal>

      {/* Documento */}
      <Modal open={modal==='modal-documento'} onClose={()=>setModal(null)} title="Nuovo documento">
        <div className="fg"><label className="fl">Nome</label><input className="fi" value={docForm.nome} onChange={e=>setDocForm(f=>({...f,nome:e.target.value}))} placeholder="es. CIN Corte Pintadera"/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Tipo</label><select className="fs" value={docForm.tipo} onChange={e=>setDocForm(f=>({...f,tipo:e.target.value}))}>{['CIN','Assicurazione','Contratto','Licenza','Fiscale','Altro'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fg"><label className="fl">Scadenza</label><input type="date" className="fi" value={docForm.scadenza} onChange={e=>setDocForm(f=>({...f,scadenza:e.target.value}))}/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Numero</label><input className="fi" value={docForm.numero} onChange={e=>setDocForm(f=>({...f,numero:e.target.value}))} placeholder="opz."/></div>
          <div className="fg"><label className="fl">Fornitore</label><input className="fi" value={docForm.fornitore} onChange={e=>setDocForm(f=>({...f,fornitore:e.target.value}))} placeholder="opz."/></div>
        </div>
        <div className="fg"><label className="fl">Link URL</label><input type="url" className="fi" value={docForm.url} onChange={e=>setDocForm(f=>({...f,url:e.target.value}))} placeholder="https://..."/></div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={docForm.note} onChange={e=>setDocForm(f=>({...f,note:e.target.value}))} placeholder=""/></div>
        <button className="btn bp bfull" onClick={salvaDocumento}>Salva</button>
      </Modal>

      {/* Prezzo */}
      <Modal open={modal==='modal-prezzo'} onClose={()=>setModal(null)} title="Nuova tariffa">
        <div className="fg"><label className="fl">Nome periodo</label><input className="fi" value={przForm.nome_periodo} onChange={e=>setPrzForm(f=>({...f,nome_periodo:e.target.value}))} placeholder="es. Alta stagione Luglio"/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Tipo</label><select className="fs" value={przForm.tipo_periodo} onChange={e=>setPrzForm(f=>({...f,tipo_periodo:e.target.value}))}>{['bassa','media','alta','picco'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fg"><label className="fl">Min notti</label><input type="number" className="fi" value={przForm.soggiorno_min} onChange={e=>setPrzForm(f=>({...f,soggiorno_min:e.target.value}))} min="1"/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Da</label><input type="date" className="fi" value={przForm.data_inizio} onChange={e=>setPrzForm(f=>({...f,data_inizio:e.target.value}))}/></div>
          <div className="fg"><label className="fl">A</label><input type="date" className="fi" value={przForm.data_fine} onChange={e=>setPrzForm(f=>({...f,data_fine:e.target.value}))}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <div className="fg"><label className="fl" style={{color:'#C02228'}}>Airbnb (€)</label><input type="number" className="fi" value={przForm.prezzo_airbnb} onChange={e=>setPrzForm(f=>({...f,prezzo_airbnb:e.target.value}))} step="0.01"/></div>
          <div className="fg"><label className="fl" style={{color:'#003B95'}}>Booking (€)</label><input type="number" className="fi" value={przForm.prezzo_booking} onChange={e=>setPrzForm(f=>({...f,prezzo_booking:e.target.value}))} step="0.01"/></div>
          <div className="fg"><label className="fl" style={{color:'var(--verde)'}}>Diretto (€)</label><input type="number" className="fi" value={przForm.prezzo_diretto} onChange={e=>setPrzForm(f=>({...f,prezzo_diretto:e.target.value}))} step="0.01"/></div>
        </div>
        <div className="fg"><label className="fl">Note</label><input className="fi" value={przForm.note} onChange={e=>setPrzForm(f=>({...f,note:e.target.value}))} placeholder=""/></div>
        <button className="btn bp bfull" onClick={salvaPrezzo}>Salva tariffa</button>
      </Modal>

      {/* Messaggi */}
      <Modal open={modal==='messaggi'} onClose={()=>setModal(null)} title="💬 Messaggi ospite" wide>
        {selectedPren&&(()=>{
          const msgs=MSGS(selectedPren)
          return <>
            <div style={{background:'var(--sabbia)',borderRadius:'var(--rsm)',padding:'8px 11px',marginBottom:12}}>
              <div style={{fontWeight:600,fontSize:12}}>{selectedPren.nome}</div>
              <div style={{fontSize:10,color:'var(--grigio)'}}>{fmtDate(selectedPren.checkin)} → {fmtDate(selectedPren.checkout)} · {diffDays(selectedPren.checkout,selectedPren.checkin)} notti</div>
            </div>
            {Object.entries(msgs).map(([k,m])=>(
              <div key={k} style={{marginBottom:13}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>{m.t}</div>
                <div className="msgbox">{m.msg}</div>
                <div style={{display:'flex',gap:6,marginTop:6}}>
                  <button className="btn bs bsm" style={{flex:1}} onClick={()=>{navigator.clipboard.writeText(m.msg);toast.show('📋 Copiato!')}}>📋 Copia</button>
                  <button className="btn bs bsm" style={{flex:1}} onClick={()=>window.open('https://wa.me/?text='+encodeURIComponent(m.msg),'_blank')}>💚 WhatsApp</button>
                </div>
              </div>
            ))}
          </>
        })()}
      </Modal>

      {/* Checklist */}
      <Modal open={modal==='checklist'} onClose={()=>setModal(null)} title="🧹 Checklist pulizie" wide>
        {selectedPren&&<>
          <div style={{background:'var(--sabbia)',borderRadius:'var(--rsm)',padding:'8px 11px',marginBottom:10}}>
            <div style={{fontWeight:600,fontSize:12}}>Check-out: {selectedPren.nome}</div>
            <div className="prog" style={{marginTop:6}}>
              <div className="prog-bar"><div className="prog-fill" style={{width:checklistTotal?`${Math.round(checklistDone/checklistTotal*100)}%`:'0%'}}/></div>
              <span style={{fontSize:10,color:'var(--grigio)',flexShrink:0}}>{checklistDone}/{checklistTotal}</span>
            </div>
          </div>
          {['Generale','Camera','Bagno','Cucina','Soggiorno','Veranda'].map(area=>{
            const items=checklistData.filter(x=>x.checklist_template?.area===area)
            if(!items.length) return null
            return <div key={area}>
              <div className="cl-area">{area}</div>
              {items.map(item=>(
                <div key={item.id} className="cl-item">
                  <div className={`cl-check${item.completata?' done':''}`} onClick={()=>toggleItem(item.id,!item.completata)}>
                    {item.completata&&'✓'}
                  </div>
                  <div className={`cl-text${item.completata?' done':''}`}>{item.checklist_template?.voce}</div>
                </div>
              ))}
            </div>
          })}
          {checklistDone===checklistTotal&&checklistTotal>0&&<>
            <div style={{background:'rgba(74,103,65,.1)',border:'1px solid rgba(74,103,65,.25)',borderRadius:'var(--rsm)',padding:'10px 12px',marginTop:12,textAlign:'center',fontSize:12,color:'var(--verde)',fontWeight:600}}>
              ✅ Checklist completata! Appartamento pronto.
            </div>
            <button className="btn bp bfull" style={{marginTop:8}} onClick={()=>{db.updatePrenotazione(selectedPren.id,{checklist_ok:true});toast.show('✅ Checklist salvata');setModal(null)}}>Segna come pronto</button>
          </>}
        </>}
      </Modal>

      {/* Alloggiati Web */}
      <Modal open={modal==='alloggiati'} onClose={()=>setModal(null)} title="📋 Alloggiati Web">
        {selectedPren&&<>
          <div className="infobox">
            <strong>Portale Alloggiati Web — Polizia di Stato</strong>
            Devi caricare la schedina su <a href="https://alloggiatiweb.poliziadistato.it" target="_blank" rel="noreferrer" style={{color:'var(--cielo)'}}>alloggiatiweb.poliziadistato.it</a> entro 24h dal check-in.
          </div>
          <div className="allog-box">{db.generaSchedina(selectedPren, db.ospiti.find(o=>o.id===selectedPren.ospite_id)) || `STRUTTURA: Corte Pintadera
CIN: IT092090C2000U5554
Via Cimitero 38/A — Uta (CA) 09068

OSPITE: ${selectedPren.nome}
Check-in: ${selectedPren.checkin}
Check-out: ${selectedPren.checkout}
N° ospiti: ${selectedPren.ospiti_num}

⚠️ Completa i dati ospite (documento, nazionalità, 
data nascita) nella scheda ospite per generare 
la schedina completa.`}</div>
          <div style={{display:'flex',gap:6,marginTop:10}}>
            <button className="btn bs bsm" style={{flex:1}} onClick={()=>{
              const txt=`Struttura: Corte Pintadera\nCIN: IT092090C2000U5554\nOspite: ${selectedPren.nome}\nCheck-in: ${selectedPren.checkin}\nCheck-out: ${selectedPren.checkout}\nOspiti: ${selectedPren.ospiti_num}`
              navigator.clipboard.writeText(txt); toast.show('📋 Dati copiati')
            }}>📋 Copia dati</button>
            <button className="btn bp bsm" style={{flex:1}} onClick={()=>window.open('https://alloggiatiweb.poliziadistato.it','_blank')}>🔗 Apri portale</button>
          </div>
          <button className="btn bs bfull" style={{marginTop:7}} onClick={()=>{db.updatePrenotazione(selectedPren.id,{alloggiati_inviato:true});toast.show('✅ Segnato come inviato');setModal(null)}}>✅ Segna come inviato</button>
        </>}
      </Modal>
    </>
  )
}
