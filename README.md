# 🏡 Corte Pintadera — Gestionale v2 (Completo)

App gestionale completa per affitti brevi. React + Vite + Supabase + Vercel.

---

## 🚀 Setup in 4 passi

### 1. Supabase — crea progetto e tabelle

1. [supabase.com](https://supabase.com) → **New project**
   - Nome: `cp-gestionale`
   - Region: **West EU (Ireland)**
   - Aspetta ~2 minuti

2. **SQL Editor** → **New query** → incolla tutto il contenuto di `supabase/schema.sql` → **Run ▶️**

3. **Settings → API** → copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon / public key` → `VITE_SUPABASE_ANON_KEY`

---

### 2. File .env (locale, NON su GitHub)

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

### 3. GitHub

```bash
git init
git add .
git commit -m "cp-gestionale v2"
git branch -M main
git remote add origin https://github.com/robnonnis/cp-gestionale.git
git push -u origin main
```

---

### 4. Vercel

1. [vercel.com](https://vercel.com) → **New Project** → importa `cp-gestionale`
2. Framework: **Vite** (auto-rilevato)
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy** → ~1 minuto → online!

---

## 📱 Installa sul telefono

**iPhone:** Safari → Condividi → Aggiungi a schermata Home
**Android:** Chrome → Menu ⋮ → Aggiungi a schermata Home

---

## 🗂 Struttura completa

```
src/
├── main.jsx          # Entry point
├── App.jsx           # UI completa (tutti gli schermi)
├── useDb.js          # Hook Supabase — tutto il CRUD
├── supabase.js       # Client Supabase
├── styles.js         # CSS completo
└── utils.js          # Helper condivisi

supabase/
└── schema.sql        # 12 tabelle + RLS + trigger + dati default
```

---

## 📋 Funzionalità v2

### 🏠 Home
- Dashboard KPI (entrate, uscite, saldo, occupazione %)
- Card "Oggi" con check-in/check-out/in corso
- Alert scadenze urgenti e bollette in scadenza
- Prossime prenotazioni + ultime transazioni

### 📅 Prenotazioni
- Calendario mensile (colori: check-in 🟥 / in corso 🟩 / check-out)
- Card prenotazione espansa con netto/commissioni
- **💬 Messaggi** — 5 template (conferma, istruzioni, benvenuto, checkout, recensione) con Copia e WhatsApp
- **🧹 Checklist pulizie** — 27 voci per area con progress bar
- **📋 Alloggiati Web** — dati strutturati + link diretto al portale PS
- Stato pagamento (da saldare / acconto / saldato)
- Import iCal Airbnb + Booking

### 💶 Finanze
- **Transazioni**: entrate/uscite per mese con commissioni scorporate
- **Bollette**: luce/acqua/internet/TARI con storico e media
- **Report**: grafico annuale mese per mese, totali, export CSV

### 💡 Prezzi
- **Tariffe**: tabella per periodo × piattaforma (Airbnb/Booking/Diretto)
- **Regole dinamiche**: weekend, last minute, anticipo, durata
- **🤖 AI Advisor**: analisi calendario + stagionalità + regole → suggerimenti concreti con numeri reali
- **Blocchi liberi**: visualizzazione giorni disponibili prossimi 90gg

### ⚙️ Gestione
- **Scadenze**: TARI, IMU, cedolare, CIN, assicurazione, estintore...
- **Manutenzioni**: log interventi con fornitore, costo, prossima revisione
- **Inventario**: dotazioni casa per categoria con stato (ok/sostituire/mancante)
- **Documenti**: archivio con scadenze e link

---

## 💾 Dati pre-caricati

Al primo avvio il database viene popolato con:
- ✅ 7 fasce di prezzo stagionali Sardegna
- ✅ 5 regole di pricing dinamico
- ✅ 27 voci checklist pulizie (per area)
- ✅ 20 elementi inventario base
- ✅ 12 scadenze annuali (TARI, IMU, cedolare, CIN, estintore...)
- ✅ 2 documenti pre-caricati (CIN, estintore)
- ✅ Link iCal Airbnb + Booking già configurati

---

## 🔑 Credenziali Corte Pintadera

Già inserite nel database:
- **CIN**: IT092090C2000U5554
- **WiFi**: FASTWEB-E3XZSC / C7RAEXHAUG
- **Check-in**: 15:00 · **Check-out**: 09:00
- **Indirizzo**: Via Cimitero 38/A, Uta (CA) 09068

---

## 🔄 Aggiornare l'app

```bash
git add . && git commit -m "update" && git push
```
Vercel fa il deploy automatico in ~60 secondi.

---

## ❓ Problemi comuni

| Problema | Soluzione |
|---|---|
| "Variabili mancanti" | Crea `.env` con le credenziali Supabase |
| Dati non si salvano | Controlla RLS in Supabase → Settings |
| AI Advisor non risponde | Verifica connessione internet |
| iCal import fallisce | Il proxy esterno può essere lento, riprova |
| App non si carica su Vercel | Controlla le Environment Variables |
