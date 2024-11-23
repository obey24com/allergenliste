"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DismissibleTitle() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 mb-6">
      <h1 className="text-2xl font-bold text-primary">Kostenlos Allergenliste erstellen</h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(false)}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}