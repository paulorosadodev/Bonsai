"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, Info, Search, X } from "lucide-react";
import { cn } from "./cn";
import { PRESET_ICONS } from "@/lib/domain/catalog";
import { DynamicIcon } from "@/components/features/transaction-visuals";

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    color?: string;
    label?: string;
    optional?: boolean;
    usedMap?: Record<string, string[]>;
}

export function IconPicker({ value, onChange, color = "#A78BFA", label, optional = false, usedMap }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredIcons = PRESET_ICONS.filter((icon) => icon.toLowerCase().includes(search.toLowerCase().trim()));
    const currentUsage = value ? usedMap?.[value.trim()] : undefined;

    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className="flex flex-col gap-2">
            {label ? <label className="text-sm font-medium text-text">{label}</label> : null}
            <div className="relative flex items-center gap-2">
                <button type="button" onClick={() => setIsOpen((prev) => !prev)} className="flex items-center gap-2.5 rounded-xl bg-surface-raised px-3 py-2 text-sm text-text transition-all hover:bg-surface-raised/80 focus-visible:outline-2 focus-visible:outline-violet active:scale-98">
                    {value ? (
                        <div className="flex size-8 items-center justify-center rounded-lg shadow-inner" style={{ backgroundColor: `${color}25`, color }}>
                            <DynamicIcon name={value} className="size-4.5" />
                        </div>
                    ) : (
                        <div className="flex size-8 items-center justify-center rounded-lg bg-surface text-muted">
                            <DynamicIcon name="Tag" className="size-4" />
                        </div>
                    )}
                    <span className="text-xs font-medium text-muted">{value ? "Alterar ícone" : optional ? "Sem ícone" : "Escolher ícone"}</span>
                    <ChevronUp className={cn("size-3.5 text-muted transition-transform duration-200", !isOpen && "rotate-180")} aria-hidden />
                </button>
                {optional && value ? (
                    <button type="button" onClick={() => onChange("")} className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-raised hover:text-text" title="Remover ícone" aria-label="Remover ícone">
                        <X className="size-4" aria-hidden />
                    </button>
                ) : null}

                {/* Popover Dropdown positioned above the trigger */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.14, ease: "easeOut" }} className="absolute bottom-full left-0 z-50 mb-2 flex w-80 max-w-[calc(100vw-3rem)] flex-col gap-3 rounded-2xl border border-white/10 bg-surface-raised/95 p-3 shadow-[0_16px_36px_rgb(8_5_16/0.85)] backdrop-blur-xl">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                                <input type="text" placeholder="Buscar ícone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl bg-surface py-1.5 pl-9 pr-3 text-xs text-text outline-none focus:ring-1 focus:ring-violet" autoFocus />
                            </div>
                            <div className="grid max-h-52 grid-cols-6 gap-2 overflow-y-auto overscroll-contain p-1">
                                {filteredIcons.map((iconName) => {
                                    const isSelected = value === iconName;
                                    const usedBy = usedMap?.[iconName];
                                    const isUsed = Boolean(usedBy && usedBy.length > 0);
                                    const titleText = isUsed ? `${iconName} (Já em uso por: ${usedBy!.join(", ")})` : iconName;

                                    return (
                                        <button
                                            key={iconName}
                                            type="button"
                                            title={titleText}
                                            onClick={() => {
                                                onChange(iconName);
                                                setIsOpen(false);
                                            }}
                                            className={`group relative flex size-10 items-center justify-center rounded-xl transition-all ${isSelected ? "bg-violet/25 ring-2 ring-violet" : "bg-surface hover:bg-surface-raised/80"}`}
                                        >
                                            <DynamicIcon name={iconName} className="size-5 transition-transform group-hover:scale-110" style={{ color: isSelected ? color : "inherit" }} />
                                            {isUsed && !isSelected ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-400/90 shadow-sm" aria-hidden /> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {currentUsage && currentUsage.length > 0 ? (
                <div className="flex items-start gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300">
                    <Info className="size-3.5 shrink-0 mt-0.5" aria-hidden />
                    <span className="leading-tight">
                        <strong className="font-semibold">Ícone já utilizado por:</strong> {currentUsage.join(", ")}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
