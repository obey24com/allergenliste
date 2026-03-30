"use client";

import { Card } from "@/components/ui/card";
import { HelpCircle, Upload, ListPlus, Edit2, FileDown, MousePointer2 } from "lucide-react";

export function ToolFAQ() {
  return (
    <section className="space-y-4 mt-12">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">So funktioniert es</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">1. Logo hochladen</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Klicke oben links auf Logo hochladen, um dein Firmenlogo für die PDF-Ausgabe einzufügen. 
              Unterstützt werden JPG, PNG und WEBP bis 2MB.
            </p>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ListPlus className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">2. Produkte erfassen</h3>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                Optional: Bestehende Speisekarte per CSV/Text importieren
              </li>
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                Produktname wie auf der Speisekarte eingeben
              </li>
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                Zwischen Allergene, Zusatzstoffe und Pflicht-Hinweise wechseln
              </li>
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                Zutreffende Optionen auswählen
              </li>
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                Produkt hinzufügen klicken
              </li>
            </ul>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Edit2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">3. Liste verwalten</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              In der Übersicht kannst du jedes Produkt bearbeiten (Stift-Symbol) oder 
              löschen (Papierkorb-Symbol). Änderungen werden sofort übernommen.
            </p>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileDown className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">4. Export & Fertig</h3>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                <span>
                  <strong>PDF Export:</strong> Mit Logo, Datum, Exportmodus und optionaler
                  Kürzel-Legende
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MousePointer2 className="h-4 w-4 mt-1 shrink-0" />
                <span>
                  <strong>CSV Export:</strong> Editierbare Tabelle für Excel
                </span>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-8">
        <h3 className="font-semibold text-lg mb-4">Häufige Fragen</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-medium">🔒 Werden meine Daten gespeichert?</p>
            <p className="mt-1 text-muted-foreground">
              Ja, lokal in deinem Browser. Deine Liste bleibt nach Reload/Neustart
              erhalten und kann jederzeit weiterbearbeitet werden.
            </p>
          </div>
          <div>
            <p className="font-medium">💾 Kann ich die Liste später bearbeiten?</p>
            <p className="mt-1 text-muted-foreground">
              Ja. Du kannst direkt in der App weiterarbeiten oder per CSV exportieren
              und extern bearbeiten.
            </p>
          </div>
          <div>
            <p className="font-medium">🖼️ Welche Logos kann ich verwenden?</p>
            <p className="mt-1 text-muted-foreground">
              JPG, PNG oder WEBP bis 2MB. Das Logo wird automatisch für die PDF-Ausgabe 
              optimiert.
            </p>
          </div>
          <div>
            <p className="font-medium">💰 Ist die Nutzung kostenlos?</p>
            <p className="mt-1 text-muted-foreground">
              Ja, komplett kostenlos und ohne Registrierung. Erstelle beliebig viele 
              Listen und Exporte.
            </p>
          </div>
          <div>
            <p className="font-medium">📥 Welche Importformate werden unterstützt?</p>
            <p className="mt-1 text-muted-foreground">
              CSV-Dateien mit den Spalten Name, Allergene, Zusatzstoffe,
              Pflicht-Hinweise sowie Copy-Paste aus Excel/Google Sheets.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
