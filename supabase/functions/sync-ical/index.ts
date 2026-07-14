// Edge Function: sync-ical (versione corretta)
// Importa TUTTI gli eventi dai feed iCal di Airbnb e Booking.
// Nota: Booking non include mai i nomi ospiti nell'iCal (privacy),
// quindi gli eventi "CLOSED - Not available" SONO le prenotazioni/blocchi
// e vanno importati, non scartati.

import { createClient } from "npm:@supabase/supabase-js@2";

const FEEDS = [
  {
    source: "airbnb",
    url: "https://www.airbnb.it/calendar/ical/1716862452089388498.ics?t=80897cbf7cba488aaf88023cc50e0563",
  },
  {
    source: "booking",
    url: "https://ical.booking.com/v1/export?t=3804983e-73cf-4d73-94ba-7f9a0cfeccce",
  },
];

// User-Agent da browser: senza, Airbnb rifiuta la richiesta
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type Evento = {
  uid: string;
  source: string;
  data_inizio: string; // YYYY-MM-DD
  data_fine: string;   // YYYY-MM-DD (esclusa, standard iCal)
  summary: string;
  tipo: "prenotazione" | "blocco";
};

function parseIcsDate(v: string): string {
  // "20260628" o "20260628T140000Z" -> "2026-06-28"
  const d = v.trim().replace(/^.*:/, "");
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function parseIcs(ics: string, source: string): Evento[] {
  // unfold: le righe iCal possono andare a capo con spazio iniziale
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const eventi: Evento[] = [];
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);

  for (const b of blocks) {
    const body = b.split("END:VEVENT")[0];
    const get = (key: string) => {
      const m = body.match(new RegExp(`^${key}[^:\\n]*:(.*)$`, "m"));
      return m ? m[1].trim() : "";
    };

    const uid = get("UID");
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    if (!uid || !dtstart || !dtend) continue;

    const summary = get("SUMMARY") || "(senza titolo)";

    // Airbnb: "Reserved" = prenotazione, "Airbnb (Not available)" = blocco.
    // Booking: tutto arriva come "CLOSED - Not available" -> lo trattiamo
    // come prenotazione/occupato (i nomi non vengono mai esposti).
    const isBlocco =
      source === "airbnb" && /not available/i.test(summary);

    eventi.push({
      uid,
      source,
      data_inizio: parseIcsDate(dtstart),
      data_fine: parseIcsDate(dtend),
      summary,
      tipo: isBlocco ? "blocco" : "prenotazione",
    });
  }
  return eventi;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const risultato: Record<string, unknown> = { ok: true, errori: [] as string[] };
  let totale = 0;

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": UA, Accept: "text/calendar,*/*" },
      });
      if (!res.ok) {
        (risultato.errori as string[]).push(
          `${feed.source}: HTTP ${res.status}`,
        );
        risultato[feed.source] = 0;
        continue;
      }
      const ics = await res.text();
      const eventi = parseIcs(ics, feed.source);

      if (eventi.length > 0) {
        const { error } = await supabase
          .from("prenotazioni_ical")
          .upsert(
            eventi.map((e) => ({ ...e, aggiornato_il: new Date().toISOString() })),
            { onConflict: "uid" },
          );
        if (error) {
          (risultato.errori as string[]).push(`${feed.source}: ${error.message}`);
        }
      }

      // rimuovi eventi futuri spariti dal feed (cancellazioni)
      const uids = eventi.map((e) => e.uid);
      const oggi = new Date().toISOString().slice(0, 10);
      let del = supabase
        .from("prenotazioni_ical")
        .delete()
        .eq("source", feed.source)
        .gte("data_inizio", oggi);
      if (uids.length > 0) {
        del = del.not("uid", "in", `(${uids.map((u) => `"${u}"`).join(",")})`);
      }
      await del;

      risultato[feed.source] = eventi.length;
      totale += eventi.length;
    } catch (e) {
      (risultato.errori as string[]).push(`${feed.source}: ${String(e)}`);
      risultato[feed.source] = 0;
    }
  }

  risultato.totale = totale;
  return new Response(JSON.stringify(risultato), {
    headers: { "Content-Type": "application/json" },
  });
});
