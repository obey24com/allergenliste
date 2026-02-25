"use client";

import { Rocket, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingBannerProps {
  onLoadDemoProducts: () => void;
  onDismiss: () => void;
}

export function OnboardingBanner({
  onLoadDemoProducts,
  onDismiss,
}: OnboardingBannerProps) {
  return (
    <section className="rounded-lg border bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Rocket className="h-4 w-4" />
            Schnellstart
          </p>
          <h2 className="text-base font-semibold sm:text-lg">In 3 Schritten zur fertigen Liste</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Produktnamen eingeben oder Liste importieren</li>
            <li>Allergene und Zusatzstoffe auswählen (oder KI-Vorschlag nutzen)</li>
            <li>Als PDF oder CSV exportieren</li>
          </ol>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onLoadDemoProducts}>
            <Wand2 className="mr-2 h-4 w-4" />
            Beispieldaten laden
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            Schließen
          </Button>
        </div>
      </div>
    </section>
  );
}
