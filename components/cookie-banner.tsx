"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { initializeAnalytics } from "@/lib/analytics";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    } else if (consent === "accepted") {
      initializeAnalytics();
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
    initializeAnalytics();
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm">
      <Card className="max-w-5xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold">Diese Website verwendet Cookies</h3>
            <p className="text-sm text-muted-foreground">
              Wir nutzen Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. 
              Diese beinhalten notwendige Cookies für den Betrieb der Seite sowie Analyse-Cookies 
              (Google Analytics), die uns helfen, unsere Website zu verbessern. Detaillierte 
              Informationen finden Sie in unserer{" "}
              <a 
                href="https://obey24.com/datenschutz" 
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Datenschutzerklärung
              </a>.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={declineCookies}
            >
              Ablehnen
            </Button>
            <Button
              onClick={acceptCookies}
            >
              Akzeptieren
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
