"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DismissibleTitle() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative flex items-center justify-center rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-primary">Kostenlos Allergenliste erstellen</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="h-8 w-8 hover:bg-transparent p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
