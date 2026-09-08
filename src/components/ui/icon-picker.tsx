"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { PRESET_ICONS } from "@/lib/domain/catalog";
import { DynamicIcon } from "@/components/features/transaction-visuals";

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    color?: string;
    label?: string;
    optional?: boolean;
}

export function IconPicker({ value, onChange, color = "#A78BFA", label, optional = false }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredIcons = PRESET_ICONS.filter((icon) =>
        icon.toLowerCase().includes(search.toLowerCase().trim())
    );

    return (
        <div className="flex flex-col gap-2">
            {label ? <label className="text-sm font-medium text-text">{label}</label> : null}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2.5 rounded-xl bg-surface-raised px-3 py-2 text-sm text-text transition-all hover:bg-surface-raised/80 focus-visible:outline-2 focus-visible:outline-violet active:scale-98"
                >
                    {value ? (
                        <div
                            className="flex size-8 items-center justify-center rounded-lg shadow-inner"
                            style={{ backgroundColor: `${color}25`, color }}
                        >
                            <DynamicIcon name={value} className="size-4.5" />
                        </div>
                    ) : (
                        <div className="flex size-8 items-center justify-center rounded-lg bg-surface text-muted">
                            <DynamicIcon name="Tag" className="size-4" />
                        </div>
                    )}
                    <span className="text-xs font-medium text-muted">
                        {value ? "Alterar ícone" : (optional ? "Sem ícone" : "Escolher ícone")}
                    </span>
                </button>
                {optional && value ? (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-raised hover:text-text"
                        title="Remover ícone"
                        aria-label="Remover ícone"
                    >
                        <X className="size-4" aria-hidden />
                    </button>
                ) : null}
            </div>

            {isOpen && (
                <div className="mt-1 flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-raised p-3 shadow-2xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                        <input
                            type="text"
                            placeholder="Buscar ícone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl bg-surface py-1.5 pl-9 pr-3 text-xs text-text outline-none focus:ring-1 focus:ring-violet"
                        />
                    </div>
                    <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto overscroll-contain p-1">
                        {filteredIcons.map((iconName) => {
                            const isSelected = value === iconName;
                            return (
                                <button
                                    key={iconName}
                                    type="button"
                                    title={iconName}
                                    onClick={() => {
                                        onChange(iconName);
                                        setIsOpen(false);
                                    }}
                                    className={`group flex size-10 items-center justify-center rounded-xl transition-all ${
                                        isSelected
                                            ? "bg-violet/25 ring-2 ring-violet"
                                            : "bg-surface hover:bg-surface-raised/80"
                                    }`}
                                >
                                    <DynamicIcon
                                        name={iconName}
                                        className="size-5 transition-transform group-hover:scale-110"
                                        style={{ color: isSelected ? color : "inherit" }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
