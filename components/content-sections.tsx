"use client";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, AlertTriangle, Shield, FileCheck, HelpCircle, BookOpen, CheckSquare, List } from "lucide-react";

export function ContentSections() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-8 py-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Allergene und Zusatzstoffe: Was du wissen musst</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Allergene und Zusatzstoffe sind wichtige Themen in der Lebensmittelindustrie. Allergene können bei empfindlichen Personen allergische Reaktionen wie Hautausschläge, Atemprobleme oder Magen-Darm-Beschwerden auslösen. Zusatzstoffe hingegen werden verwendet, um die Haltbarkeit, den Geschmack oder das Aussehen von Lebensmitteln zu verbessern.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Für Unternehmen und Konsumenten ist es essenziell, Allergene und Zusatzstoffe zu kennen und korrekt zu kennzeichnen. Eine transparente Allergenkennzeichnung schützt Verbraucher und schafft Vertrauen.
            </p>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Die 14 Hauptallergene im Überblick</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Gemäß der Lebensmittel-Informationsverordnung (LMIV) müssen 14 Allergene gekennzeichnet werden. Hier die wichtigsten im Überblick:
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Glutenhaltiges Getreide (z. B. Weizen, Roggen, Gerste)</li>
              <li>Krebstiere</li>
              <li>Eier</li>
              <li>Fisch</li>
              <li>Erdnüsse</li>
              <li>Sojabohnen</li>
              <li>Milch (einschließlich Laktose)</li>
              <li>Schalenfrüchte (z. B. Mandeln, Haselnüsse, Walnüsse)</li>
              <li>Sellerie</li>
              <li>Senf</li>
              <li>Sesamsamen</li>
              <li>Schwefeldioxid und Sulfite (über 10 mg/kg)</li>
              <li>Lupinen</li>
              <li>Weichtiere</li>
            </ul>
            <p className="mt-4 text-muted-foreground">Diese Liste bietet eine Grundlage für eine sichere und transparente Allergenkennzeichnung.</p>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Warum ist die Kennzeichnung von Allergenen so wichtig?</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Lebensmittelallergien betreffen Millionen von Menschen weltweit. Die korrekte Kennzeichnung schützt nicht nur Allergiker, sondern auch die Hersteller vor rechtlichen Konsequenzen.
            </p>
            <h3 className="mt-4 font-semibold">Hauptgründe für eine Allergenkennzeichnung:</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Verbraucherschutz: Menschen mit Allergien können sich sicher fühlen.</li>
              <li>Rechtliche Anforderungen: Unternehmen vermeiden Bußgelder und schaffen Vertrauen.</li>
              <li>Transparenz: Kunden wissen genau, was sie konsumieren.</li>
            </ul>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Was sind Zusatzstoffe und wofür werden sie verwendet?</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Zusatzstoffe sind Substanzen, die Lebensmitteln zugesetzt werden, um bestimmte Eigenschaften zu erzielen. Sie sind in der EU genau reguliert und werden meist durch E-Nummern gekennzeichnet.
            </p>
            <h3 className="mt-4 font-semibold">Beispiele für Zusatzstoffe:</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Konservierungsstoffe: Verlängern die Haltbarkeit (z. B. E200 – Sorbinsäure)</li>
              <li>Farbstoffe: Verleihen Lebensmitteln eine ansprechende Farbe (z. B. E160a – Beta-Carotin)</li>
              <li>Geschmacksverstärker: Intensivieren den Geschmack (z. B. E621 – Glutamat)</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Auch wenn Zusatzstoffe oft kritisch gesehen werden, sind viele von ihnen sicher und nützlich, wenn sie korrekt verwendet werden.
            </p>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Rechtliche Vorschriften zur Allergenkennzeichnung</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Die Kennzeichnung von Allergenen ist durch die LMIV geregelt. Diese Vorschriften sind für alle Unternehmen, die Lebensmittel herstellen oder verkaufen, bindend.
            </p>
            <h3 className="mt-4 font-semibold">Wichtige Vorgaben:</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Allergene müssen in der Zutatenliste hervorgehoben werden, z. B. durch Fettdruck.</li>
              <li>Für unverpackte Lebensmittel, z. B. in Restaurants, muss eine schriftliche oder mündliche Information bereitgestellt werden.</li>
              <li>Auch Zusatzstoffe müssen klar gekennzeichnet sein, inkl. ihrer E-Nummer.</li>
            </ul>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">So erstellst du eine Allergen- und Zusatzstoffliste</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Mit unserem benutzerfreundlichen Tool kannst du ganz einfach eine Allergen- und Zusatzstoffliste erstellen.
            </p>
            <h3 className="mt-4 font-semibold">So funktioniert es:</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Wähle die verwendeten Lebensmittel aus.</li>
              <li>Ergänze Allergene und Zusatzstoffe aus der vorgegebenen Auswahl.</li>
              <li>Lade die fertige Liste als PDF herunter und teile sie mit deinem Team oder deinen Kunden.</li>
            </ul>
            <h3 className="mt-4 font-semibold">Vorteile unseres Tools:</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Zeitersparnis durch einfache Bedienung.</li>
              <li>Immer aktuelle und vollständige Listen.</li>
              <li>Professionelles Design für den sofortigen Einsatz.</li>
            </ul>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Häufig gestellte Fragen zu Allergenen und Zusatzstoffen</h2>
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">1. Was passiert, wenn Allergene nicht korrekt deklariert werden?</h3>
                <p className="mt-2 text-muted-foreground">Das kann rechtliche Konsequenzen nach sich ziehen und die Gesundheit deiner Kunden gefährden.</p>
              </div>
              <div>
                <h3 className="font-semibold">2. Wie erkenne ich Zusatzstoffe auf Verpackungen?</h3>
                <p className="mt-2 text-muted-foreground">Zusatzstoffe werden mit ihrem Klassennamen und einer E-Nummer angegeben, z. B. „Antioxidationsmittel: E300".</p>
              </div>
              <div>
                <h3 className="font-semibold">3. Kann ich eine Allergenliste auch für Restaurants verwenden?</h3>
                <p className="mt-2 text-muted-foreground">Ja, unser Tool ist für verschiedene Anwendungen geeignet – von Restaurants bis hin zur Lebensmittelproduktion.</p>
              </div>
            </div>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Tipps für ein effektives Allergenmanagement</h2>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Ein gutes Allergenmanagement schützt nicht nur Kunden, sondern auch dein Unternehmen.
            </p>
            <h3 className="mt-4 font-semibold">Maßnahmen für Unternehmen:</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Risikobewertung: Identifiziere potenzielle Kreuzkontaminationen.</li>
              <li>Schulung des Personals: Mitarbeiter müssen Allergene erkennen und richtig handhaben können.</li>
              <li>Regelmäßige Kontrollen: Stelle sicher, dass alle Prozesse eingehalten werden.</li>
            </ul>
            <p className="mt-4 text-muted-foreground">Mit einem strukturierten Ansatz bist du auf der sicheren Seite.</p>
          </Card>
        </section>
      </div>
    </ScrollArea>
  );
}