"use client";

import { Check } from "lucide-react";
import { PRESET_COLORS } from "@/lib/domain/catalog";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    id?: string;
    label?: string;
}

export function ColorPicker({ value, onChange, id, label }: ColorPickerProps) {
    return (
        <div className="flex flex-col gap-2">
            {label ? (
                <label htmlFor={id} className="text-sm font-medium text-text">
                    {label}
                </label>
            ) : null}
            <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => {
                    const isSelected = value.toLowerCase() === color.value.toLowerCase();
                    return (
                        <button key={color.value} type="button" title={color.label} onClick={() => onChange(color.value)} className={`group relative flex size-8 items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95 ${isSelected ? "ring-2 ring-violet ring-offset-2 ring-offset-surface" : ""}`} style={{ backgroundColor: color.value }} aria-label={`Selecionar cor ${color.label}`}>
                            {isSelected ? <Check className="size-4 text-background" strokeWidth={3} aria-hidden /> : null}
                        </button>
                    );
                })}
            </div>
            <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted">Personalizada:</span>
                <input type="color" id={id} value={value || "#A78BFA"} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-0" title="Escolher cor personalizada" />
                <span className="font-mono text-xs uppercase text-muted">{value}</span>
            </div>
        </div>
    );
}
