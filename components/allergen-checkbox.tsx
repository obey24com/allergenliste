"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface AllergenCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}

export function AllergenCheckbox({ id, label, checked, onChange }: AllergenCheckboxProps) {
  return (
    <div 
      className="flex items-center space-x-4 rounded-lg border border-input bg-card px-4 py-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors shadow-sm"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-5 rounded-md border-2"
      />
      <Label 
        htmlFor={id} 
        className="cursor-pointer flex-1 text-base"
        onClick={(e) => {
          e.preventDefault();
          onChange();
        }}
      >
        {label}
      </Label>
    </div>
  );
}