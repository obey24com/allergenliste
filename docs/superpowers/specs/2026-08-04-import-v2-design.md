# Speisekarten-Import v2 — Design

Datum: 2026-08-04 · Status: vom Nutzer freigegeben

## Ziele

1. KI-Import ist der Standard-Importweg (statt CSV) und leicht zu finden.
2. Passwort-Gate entfällt; stattdessen 3 KI-Analysen pro Tag und IP, mit sichtbarem Kontingent.
3. Höhere Erkennungsgenauigkeit bei Bildern und PDFs.

## 1. Import-Seitenpanel (Sheet statt Dialog)

- `components/import-products.tsx` rendert ein shadcn `Sheet` (side="right", breit),
  die Produktliste bleibt sichtbar.
- Reihenfolge im Panel: **KI-Import zuerst** (Drag-&-Drop-Zone für mehrere
  Bilder/PDFs + Textfeld), darunter Quota-Anzeige („Noch X von 3 Analysen heute"),
  am Ende CSV-Datei und Copy-Paste als Accordion (Sekundär-Optionen).
- Passwort-Gate (States, Dialog, `app/api/verify-import-password`) wird gelöscht.
- Vorschau-/Korrektur-UI (Produkt-Checkboxen, Code-Toggles, Legende) bleibt unverändert.

## 2. Tageslimit 3×/IP (Upstash Redis)

- Upstash Redis via Vercel Marketplace; Key `ai-quota:{ip}:{YYYY-MM-DD}` (Europe/Berlin),
  TTL bis Tagesende.
- Neues Modul `lib/ai-quota.ts`: `peekQuota(ip)`, `consumeQuota(ip)`.
  Ohne Redis-Env (lokale Entwicklung) In-Memory-Fallback; in Produktion ist Redis Pflicht.
- `POST /api/parse-menu`: Kontingent wird nur bei erfolgreicher Analyse verbraucht;
  Antwort enthält `remaining`, `limit`, `resetsAt`. Bei aufgebrauchtem Kontingent 429
  mit deutscher Meldung.
- `GET /api/parse-menu`: liefert Kontingent ohne Verbrauch (für die Panel-Anzeige).
- Bestehender In-Memory-Burst-Schutz (15/min) bleibt als zweite Schicht.

## 3. Genauere Analyse

- **Einstufig**: Bilder gehen direkt als Vision-Input (`image_url`-Parts) an das
  Parse-Modell mit Structured Output. Der separate OCR-Schritt entfällt.
- **Gescannte PDFs**: Liefert die pdf.js-Textextraktion zu wenig Text
  (< ~200 Zeichen/Seite), werden die Seiten im Browser als Bilder gerendert
  (max. 10 Seiten, Hinweis an den Nutzer) und als Bilder analysiert.
- **Mehrfach-Upload**: mehrere Bilder/Seiten in einem Modell-Aufruf; zählt als
  eine Analyse. Bilder werden clientseitig wie bisher komprimiert (~3,8 MB/Bild).

## Verifikation

`npm run build` grün + Dev-Server-Test (Panel öffnen, Quota-Anzeige, Analyse mit Bild,
CSV-Accordion, 4. Analyse → 429-Meldung).

## Nebenbefund

`app/page 2.tsx`, `components/* 2.tsx`, `lib/ai-schemas 2.ts`, `types/product 2.ts`
sind Google-Drive-Duplikate (untracked, ungenutzt) — Empfehlung: löschen. Wird hier
nicht angefasst.
