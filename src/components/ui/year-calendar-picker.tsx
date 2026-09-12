"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, X } from "lucide-react";
import { cn } from "./cn";
import { currentYear } from "@/components/features/params";

export interface YearCalendarPickerProps {
    year: number;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (year: number) => void;
}

export function YearCalendarPicker({ year, isOpen, onClose, onSelect }: YearCalendarPickerProps) {
    const todayY = currentYear();
    const [customDecadeOffset, setCustomDecadeOffset] = useState<{ baseYear: number; offset: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calcular o início da década exibida (12 anos por página)
    const baseDecadeStart = Math.floor(year / 12) * 12;
    const decadeStart = customDecadeOffset && customDecadeOffset.baseYear === year ? baseDecadeStart + customDecadeOffset.offset : baseDecadeStart;

    const decadeYears = Array.from({ length: 12 }, (_, i) => decadeStart + i);

    const shiftDecade = (delta: number) => {
        setCustomDecadeOffset((prev) => {
            const currentOffset = prev && prev.baseYear === year ? prev.offset : 0;
            return { baseYear: year, offset: currentOffset + delta };
        });
    };

    // Fechar ao pressionar Escape ou clicar fora
    useEffect(() => {
        if (!isOpen) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        }

        function handleClickOutside(e: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleSelect = (selectedYear: number) => {
        onSelect(selectedYear);
        onClose();
    };

    const isCurrentYearToday = year === todayY;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop translúcido */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="fixed inset-0 z-40 bg-ink/65 backdrop-blur-[2px]" aria-hidden="true" />

                    {/* Popover Flutuante */}
                    <motion.div
                        ref={containerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Seletor de ano"
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-1/2 top-full z-50 mt-2.5 w-[min(calc(100vw-2rem),360px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-surface-raised/95 p-4 text-text shadow-[0_24px_50px_rgba(8,5,16,0.85)] backdrop-blur-xl"
                    >
                        {/* Barra Superior */}
                        <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2.5">
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="size-4 text-orchid" aria-hidden="true" />
                                <span className="text-xs font-semibold tracking-wide text-muted">Ano de Referência</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => handleSelect(todayY)} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-95", isCurrentYearToday ? "bg-violet text-ink shadow-[0_0_10px_rgba(167,139,250,0.4)]" : "border border-white/5 bg-surface text-orchid hover:bg-surface/80 hover:text-white")} title="Ir para o ano atual">
                                    <Sparkles className="size-3" aria-hidden="true" />
                                    <span>Ano Atual</span>
                                </button>

                                <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-surface hover:text-text active:scale-95" aria-label="Fechar seletor">
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {/* Navegação entre Décadas */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => shiftDecade(-24)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Voltar 24 anos" aria-label="Voltar 24 anos">
                                    <ChevronsLeft className="size-4" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => shiftDecade(-12)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Década anterior" aria-label="Década anterior">
                                    <ChevronLeft className="size-4" aria-hidden="true" />
                                </button>
                            </div>

                            <span className="tabular text-sm font-bold tracking-tight text-text">
                                {decadeStart} – {decadeStart + 11}
                            </span>

                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => shiftDecade(12)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Próxima década" aria-label="Próxima década">
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => shiftDecade(24)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Avançar 24 anos" aria-label="Avançar 24 anos">
                                    <ChevronsRight className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {/* Grade de 12 Anos */}
                        <div className="grid grid-cols-3 gap-2">
                            {decadeYears.map((yr) => {
                                const isSelected = yr === year;
                                const isRealWorldYear = yr === todayY;

                                return (
                                    <button
                                        key={yr}
                                        type="button"
                                        onClick={() => handleSelect(yr)}
                                        className={cn(
                                            "group relative flex flex-col items-center justify-center rounded-xl px-2 py-3 transition-all duration-150 active:scale-95",
                                            isSelected ? "z-10 scale-[1.02] border border-violet bg-violet font-bold text-ink shadow-[0_0_14px_rgba(167,139,250,0.5)]" : isRealWorldYear ? "border border-orchid/50 bg-surface/90 font-semibold text-orchid hover:bg-surface-raised hover:text-white" : "border border-white/5 bg-surface text-text hover:border-violet/30 hover:bg-surface-raised hover:text-white",
                                        )}
                                        aria-pressed={isSelected}
                                        aria-label={`Ano ${yr}`}
                                    >
                                        <span className="tabular text-sm font-bold tracking-tight">{yr}</span>

                                        {isRealWorldYear && !isSelected && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-orchid shadow-[0_0_4px_var(--orchid)]" title="Ano atual" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Rodapé */}
                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-muted">
                            <span>Selecione um ano para o resumo anual</span>
                            <span className="tabular font-medium text-text/80">{year}</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
