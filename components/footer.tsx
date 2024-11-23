"use client";

import { ExternalLink, MessageSquare } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col sm:flex-row items-center justify-between py-4 text-sm text-muted-foreground max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <span>powered by</span>
          <a 
            href="https://obey24.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            Obey24.com
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <nav className="flex flex-wrap justify-center gap-4">
          <a 
            href="https://obey24.com/impressum" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Impressum
          </a>
          <a 
            href="https://obey24.com/cookie-richtlinie" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Cookies
          </a>
          <a 
            href="https://obey24.com/datenschutz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Datenschutz
          </a>
          <a 
            href="https://obey24.com/agbs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            AGBs
          </a>
          <a 
            href="mailto:allergenfeedback@obey24.com"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Feedback
          </a>
        </nav>
      </div>
    </footer>
  );
}