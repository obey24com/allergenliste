"use client";

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface LogoUploadProps {
  logoUrl: string | null;
  onLogoChange: (logo: string | null) => void;
}

export function LogoUpload({ logoUrl, onLogoChange }: LogoUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedFormats.includes(file.type)) {
      alert("Bitte verwenden Sie PNG, JPG oder WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Die Datei ist zu groß. Maximale Größe ist 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onLogoChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        <div className="flex items-center gap-4">
          <img 
            src={logoUrl} 
            alt="Restaurant Logo" 
            className="h-12 w-auto object-contain"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onLogoChange(null)}
          >
            Logo entfernen
          </Button>
        </div>
      ) : (
        <div className="flex items-center">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="logo-upload"
          />
          <label htmlFor="logo-upload">
            <Button 
              variant="outline" 
              size="sm"
              className="cursor-pointer"
              asChild
            >
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Logo hochladen
              </span>
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}