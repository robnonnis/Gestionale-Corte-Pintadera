-- ============================================================
-- CORTE PINTADERA — Schema Supabase v2 (completo)
-- Esegui nell'SQL Editor di Supabase
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- OSPITI (anagrafica)
-- ============================================================
create table if not exists ospiti (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  cognome         text,
  email           text,
  telefono        text,
  nazionalita     text default 'IT',
  tipo_documento  text,             -- CI | Passaporto | Patente
  numero_documento text,
  data_nascita    date,
  luogo_nascita   text,
  note            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- PRENOTAZIONI
-- ============================================================
create table if not exists prenotazioni (
  id              uuid primary key default gen_random_uuid(),
  ospite_id       uuid references ospiti(id) on delete set null,
  nome            text not null,         -- nome visualizzato (può essere diverso da ospiti)
  checkin         date not null,
  checkout        date not null,
  ospiti_num      integer default 1,
  totale          numeric(10,2) default 0,
  acconto         numeric(10,2) default 0,
  commissione     numeric(10,2) default 0,  -- commissione piattaforma
  netto           numeric(10,2) generated always as (totale - commissione) stored,
  piattaforma     text default 'diretto',
  stato           text default 'confermata',  -- confermata | checkin | checkout | cancellata
  stato_pagamento text default 'da_saldare',  -- da_saldare | acconto | saldato
  note            text,
  ical_uid        text unique,
  alloggiati_inviato boolean default false,
  checklist_ok    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- FINANZE
-- ============================================================
create table if not exists finanze (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('entrata','uscita')),
  descrizione   text not null,
  importo       numeric(10,2) not null,
  data          date not null,
  categoria     text not null,
  piattaforma   text,
  prenotazione_id uuid references prenotazioni(id) on delete set null,
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- BOLLETTE
-- ============================================================
create table if not exists bollette (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null,
  numero          text,
  data            date,
  scadenza        date not null,
  periodo         text,
  importo         numeric(10,2) not null,
  fornitore       text,
  stato           text default 'da-pagare' check (stato in ('da-pagare','pagata')),
  data_pagamento  date,
  note            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- SCADENZE
-- ============================================================
create table if not exists scadenze (
  id          uuid primary key default gen_random_uuid(),
  titolo      text not null,
  data        date not null,
  importo     numeric(10,2),
  categoria   text not null,
  ricorrenza  text default 'una-tantum',
  note        text,
  completata  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- PREZZI (tariffe per periodo e piattaforma)
-- ============================================================
create table if not exists prezzi (
  id              uuid primary key default gen_random_uuid(),
  nome_periodo    text not null,          -- es. "Alta stagione", "Luglio/Agosto"
  data_inizio     date,
  data_fine       date,
  tipo_periodo    text not null,          -- bassa | media | alta | picco
  prezzo_airbnb   numeric(10,2),
  prezzo_booking  numeric(10,2),
  prezzo_diretto  numeric(10,2),
  soggiorno_min   integer default 1,
  note            text,
  attivo          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- REGOLE PREZZO (dinamiche)
-- ============================================================
create table if not exists regole_prezzo (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  tipo        text not null,   -- weekend | last_minute | advance | evento | occupazione
  condizione  jsonb,           -- es. {"giorni_anticipo": {"max": 7}, "occupazione": {"min": 0.8}}
  modifica    text not null,   -- "+20" | "-15" | "+10%"
  attiva      boolean default true,
  priorita    integer default 1,
  created_at  timestamptz default now()
);

-- ============================================================
-- CHECKLIST PULIZIE
-- ============================================================
create table if not exists checklist_template (
  id       uuid primary key default gen_random_uuid(),
  area     text not null,      -- Cucina | Camera | Bagno | Soggiorno | Veranda | Generale
  voce     text not null,
  ordine   integer default 0
);

create table if not exists checklist_istanze (
  id              uuid primary key default gen_random_uuid(),
  prenotazione_id uuid references prenotazioni(id) on delete cascade,
  template_id     uuid references checklist_template(id) on delete cascade,
  completata      boolean default false,
  note            text,
  updated_at      timestamptz default now()
);

-- ============================================================
-- MANUTENZIONI
-- ============================================================
create table if not exists manutenzioni (
  id              uuid primary key default gen_random_uuid(),
  titolo          text not null,
  tipo            text not null,   -- ordinaria | straordinaria | ispezione
  data            date not null,
  costo           numeric(10,2),
  fornitore       text,
  telefono        text,
  stato           text default 'completato',  -- pianificato | in_corso | completato
  prossima_data   date,
  note            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- INVENTARIO
-- ============================================================
create table if not exists inventario (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  categoria   text not null,   -- Cucina | Camera | Bagno | Elettrodomestici | Sicurezza | Altro
  quantita    integer default 1,
  stato       text default 'ok',  -- ok | da_sostituire | mancante
  note        text,
  updated_at  timestamptz default now()
);

-- ============================================================
-- DOCUMENTI
-- ============================================================
create table if not exists documenti (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  tipo        text not null,   -- CIN | Assicurazione | Contratto | Licenza | Altro
  scadenza    date,
  numero      text,
  fornitore   text,
  url         text,
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- IMPOSTAZIONI
-- ============================================================
create table if not exists impostazioni (
  chiave      text primary key,
  valore      text,
  updated_at  timestamptz default now()
);

-- ============================================================
-- DATI DEFAULT
-- ============================================================

-- iCal links
insert into impostazioni (chiave, valore) values
  ('ical_airbnb',  'https://www.airbnb.it/calendar/ical/1716862452089388498.ics?t=80897cbf7cba488aaf88023cc50e0563'),
  ('ical_booking', 'https://ical.booking.com/v1/export?t=3804983e-73cf-4d73-94ba-7f9a0cfeccce'),
  ('checkin_ora',  '15:00'),
  ('checkout_ora', '09:00'),
  ('nome_struttura', 'Corte Pintadera'),
  ('indirizzo', 'Via Cimitero 38/A, Uta (CA) 09068'),
  ('cin', 'IT092090C2000U5554'),
  ('wifi_nome', 'FASTWEB-E3XZSC'),
  ('wifi_password', 'C7RAEXHAUG'),
  ('host_nome', 'Roberta e Alessandro'),
  ('host_telefono', '')
on conflict (chiave) do nothing;

-- Prezzi stagionali Sardegna
insert into prezzi (nome_periodo, tipo_periodo, data_inizio, data_fine, prezzo_airbnb, prezzo_booking, prezzo_diretto, soggiorno_min, note) values
  ('Bassa stagione',      'bassa', '2026-01-01', '2026-05-31', 65,  62,  58, 2, 'Gen–Mag'),
  ('Media stagione',      'media', '2026-06-01', '2026-06-30', 85,  82,  78, 3, 'Giugno'),
  ('Alta stagione',       'alta',  '2026-07-01', '2026-08-31', 110, 105, 98, 4, 'Luglio–Agosto'),
  ('Media stagione fine', 'media', '2026-09-01', '2026-09-30', 85,  82,  78, 3, 'Settembre'),
  ('Bassa stagione fine', 'bassa', '2026-10-01', '2026-12-31', 65,  62,  58, 2, 'Ott–Dic'),
  ('Capodanno',           'picco', '2026-12-27', '2027-01-03', 130, 125, 115, 4, 'Capodanno'),
  ('Pasqua',              'alta',  '2027-04-17', '2027-04-21', 100, 95,  88, 3, 'Pasqua 2027')
on conflict do nothing;

-- Regole prezzo
insert into regole_prezzo (nome, tipo, condizione, modifica, attiva, priorita) values
  ('Weekend alta stagione', 'weekend',     '{"mesi": [6,7,8,9], "giorni": ["sabato","domenica"]}', '+15%', true, 1),
  ('Last minute 3 giorni',  'last_minute', '{"giorni_anticipo": {"max": 3}}',                       '-10%', true, 2),
  ('Last minute 7 giorni',  'last_minute', '{"giorni_anticipo": {"max": 7}}',                       '-5%',  true, 3),
  ('Anticipo 30+ giorni',   'advance',     '{"giorni_anticipo": {"min": 30}}',                      '+5%',  true, 4),
  ('Soggiorno 7+ notti',    'durata',      '{"notti_min": 7}',                                      '-8%',  true, 5)
on conflict do nothing;

-- Checklist pulizie template
insert into checklist_template (area, voce, ordine) values
  ('Generale',  'Apri finestre e ventila', 1),
  ('Generale',  'Controlla danni o anomalie', 2),
  ('Camera',    'Cambia lenzuola e federe', 3),
  ('Camera',    'Rifai il letto', 4),
  ('Camera',    'Pulisci specchi', 5),
  ('Camera',    'Aspira e lava il pavimento', 6),
  ('Camera',    'Svuota cestini', 7),
  ('Bagno',     'Pulisci sanitari (WC, lavandino, doccia)', 8),
  ('Bagno',     'Cambia asciugamani', 9),
  ('Bagno',     'Rifornisci sapone, shampoo, carta igienica', 10),
  ('Bagno',     'Pulisci specchio', 11),
  ('Bagno',     'Lava pavimento', 12),
  ('Cucina',    'Lava stoviglie o avvia lavastoviglie', 13),
  ('Cucina',    'Pulisci piano cottura e forno', 14),
  ('Cucina',    'Pulisci piano lavoro e tavolo', 15),
  ('Cucina',    'Controlla e pulisci frigorifero', 16),
  ('Cucina',    'Svuota pattumiera e ricarica sacchi', 17),
  ('Cucina',    'Rifornisci caffè, zucchero, kit benvenuto', 18),
  ('Soggiorno', 'Riordina cuscini e divano', 19),
  ('Soggiorno', 'Pulisci superfici e tavolo', 20),
  ('Soggiorno', 'Aspira e lava il pavimento', 21),
  ('Veranda',   'Pulisci tavolo e sedie', 22),
  ('Veranda',   'Spazza pavimento veranda', 23),
  ('Generale',  'Controlla funzionamento climatizzatori', 24),
  ('Generale',  'Controlla Wi-Fi e elettrodomestici', 25),
  ('Generale',  'Lascia manuale ospite sul tavolo', 26),
  ('Generale',  'Scatta foto finali per documentazione', 27)
on conflict do nothing;

-- Inventario base
insert into inventario (nome, categoria, quantita, stato) values
  ('Lenzuola matrimoniale',    'Camera',           2, 'ok'),
  ('Federe',                   'Camera',           4, 'ok'),
  ('Copriletto',               'Camera',           1, 'ok'),
  ('Asciugamani grandi',       'Bagno',            4, 'ok'),
  ('Asciugamani piccoli',      'Bagno',            4, 'ok'),
  ('Telo bagno',               'Bagno',            2, 'ok'),
  ('Pentole set',              'Cucina',           1, 'ok'),
  ('Piatti (set 4)',           'Cucina',           1, 'ok'),
  ('Bicchieri (set 4)',        'Cucina',           1, 'ok'),
  ('Posate (set 4)',           'Cucina',           1, 'ok'),
  ('Moka caffè',               'Cucina',           1, 'ok'),
  ('Frigorifero',              'Elettrodomestici', 1, 'ok'),
  ('Microonde',                'Elettrodomestici', 1, 'ok'),
  ('Lavatrice',                'Elettrodomestici', 1, 'ok'),
  ('Climatizzatore soggiorno', 'Elettrodomestici', 1, 'ok'),
  ('Climatizzatore camera',    'Elettrodomestici', 1, 'ok'),
  ('Smart TV',                 'Elettrodomestici', 1, 'ok'),
  ('Estintore 6kg ABC',        'Sicurezza',        1, 'ok'),
  ('Kit pronto soccorso',      'Sicurezza',        1, 'ok'),
  ('Router Fastweb',           'Elettrodomestici', 1, 'ok')
on conflict do nothing;

-- Documenti
insert into documenti (nome, tipo, numero, scadenza, note) values
  ('CIN Corte Pintadera', 'CIN', 'IT092090C2000U5554', '2027-12-31', 'Portale BDSR'),
  ('Estintore — verifica annuale', 'Licenza', null, '2027-06-01', 'Revisione tecnico abilitato')
on conflict do nothing;

-- Scadenze default
insert into scadenze (titolo, data, importo, categoria, ricorrenza, note, completata) values
  ('⚡ Bolletta luce — ENEL',              '2026-08-15', 60,   'bolletta',     'bimestrale',  'Bimestrale.',             false),
  ('💧 Bolletta acqua — ABBANOA',          '2026-08-30', 25,   'bolletta',     'bimestrale',  'Bimestrale.',             false),
  ('📡 Fibra Fastweb',                     '2026-07-20', 28,   'bolletta',     'mensile',     'Mensile.',                false),
  ('🗑 TARI — 1ª rata Comune di Uta',     '2026-07-31', null, 'tassa',        'annuale',     'Verifica Comune di Uta.', false),
  ('🗑 TARI — 2ª rata Comune di Uta',     '2026-10-31', null, 'tassa',        'annuale',     'Seconda rata TARI.',      false),
  ('🏛 IMU — Verifica esenzione',          '2026-12-16', null, 'tassa',        'annuale',     'Seconda rata 16 dic.',    false),
  ('📋 Verifica CIN',                      '2026-12-31', null, 'licenza',      'annuale',     'Portale BDSR.',           false),
  ('🛡 Assicurazione affitti brevi',       '2026-09-30', null, 'assicurazione','annuale',     'RC ospiti + danni.',      false),
  ('🧹 Revisione scorte pulizie',          '2026-07-15', null, 'reminder',     'mensile',     'Detersivi, carta, etc.',  false),
  ('🧯 Verifica estintore 6kg ABC',        '2027-06-01', 20,   'manutenzione', 'annuale',     'Revisione obbligatoria.', false),
  ('💶 Cedolare secca — acconto novembre', '2026-11-30', null, 'tassa',        'annuale',     'Acconto 26%.',            false),
  ('💶 Cedolare secca — saldo giugno',     '2027-06-30', null, 'tassa',        'annuale',     'Saldo anno precedente.',  false)
on conflict do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
do $$ declare t text; begin
  foreach t in array array['ospiti','prenotazioni','finanze','bollette','scadenze',
    'prezzi','regole_prezzo','checklist_template','checklist_istanze',
    'manutenzioni','inventario','documenti','impostazioni']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('
      do $inner$ begin
        if not exists (select 1 from pg_policies where tablename = %L and policyname = %L) then
          execute format(''create policy "anon_all" on %I for all using (true) with check (true)'', %L);
        end if;
      end $inner$
    ', t, 'anon_all', t, t);
  end loop;
end $$;

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$ declare t text; begin
  foreach t in array array['ospiti','prenotazioni','finanze','bollette','scadenze',
    'prezzi','manutenzioni','inventario','documenti','checklist_istanze']
  loop
    execute format('
      drop trigger if exists trg_%s_updated on %I;
      create trigger trg_%s_updated before update on %I
      for each row execute function set_updated_at()', t, t, t, t);
  end loop;
end $$;
