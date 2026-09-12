"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, X } from "lucide-react";
import { cn } from "./cn";
import { currentMonth } from "@/components/features/params";
import { scrollBottomIntoViewIfNeeded } from "@/lib/ui/scroll";

export interface MonthCalendarPickerProps {
    value: string; // Formato YYYY-MM
    isOpen: boolean;
    onClose: () => void;
    onSelect: (month: string) => void;
    initialMode?: "months" | "years";
}

const MONTHS = [
    { number: 1, short: "Jan", full: "Janeiro", quarter: "1º Trimestre" },
    { number: 2, short: "Fev", full: "Fevereiro", quarter: "1º Trimestre" },
    { number: 3, short: "Mar", full: "Março", quarter: "1º Trimestre" },
    { number: 4, short: "Abr", full: "Abril", quarter: "2º Trimestre" },
    { number: 5, short: "Mai", full: "Maio", quarter: "2º Trimestre" },
    { number: 6, short: "Jun", full: "Junho", quarter: "2º Trimestre" },
    { number: 7, short: "Jul", full: "Julho", quarter: "3º Trimestre" },
    { number: 8, short: "Ago", full: "Agosto", quarter: "3º Trimestre" },
    { number: 9, short: "Set", full: "Setembro", quarter: "3º Trimestre" },
    { number: 10, short: "Out", full: "Outubro", quarter: "4º Trimestre" },
    { number: 11, short: "Nov", full: "Novembro", quarter: "4º Trimestre" },
    { number: 12, short: "Dez", full: "Dezembro", quarter: "4º Trimestre" },
] as const;

function pad(n: number): string {
    return n.toString().padStart(2, "0");
}

export function MonthCalendarPicker({ value, isOpen, onClose, onSelect, initialMode = "months" }: MonthCalendarPickerProps) {
    const [parsedYear, parsedMonth] = value && /^\d{4}-\d{2}$/.test(value) ? value.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];

    const todayStr = currentMonth();
    const [todayYear, todayMonthNum] = todayStr.split("-").map(Number);

    const [customYear, setCustomYear] = useState<{ baseValue: string; year: number } | null>(null);
    const [customMode, setCustomMode] = useState<"months" | "years" | null>(null);
    const [, startTransition] = useTransition();
    const containerRef = useRef<HTMLDivElement>(null);

    const viewYear = customYear && customYear.baseValue === value ? customYear.year : parsedYear;
    const mode = customMode ?? initialMode;

    const setViewYear = (updater: number | ((prev: number) => number)) => {
        setCustomYear((prev) => {
            const currentY = prev && prev.baseValue === value ? prev.year : parsedYear;
            const nextY = typeof updater === "function" ? updater(currentY) : updater;
            return { baseValue: value, year: nextY };
        });
    };

    const setMode = (updater: "months" | "years" | ((prev: "months" | "years") => "months" | "years")) => {
        setCustomMode((prev) => {
            const currentM = prev ?? initialMode;
            return typeof updater === "function" ? updater(currentM) : updater;
        });
    };

    // Fechar ao pressionar Escape ou clicar fora, e garantir que o calendário não seja cortado pelo viewport
    useEffect(() => {
        if (!isOpen) return;

        scrollBottomIntoViewIfNeeded(() => containerRef.current);

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
    }, [isOpen, onClose, mode]);

    // Cálculo da grade de anos (década com 12 slots para grade 3x4 equilibrada)
    const decadeStart = Math.floor(viewYear / 12) * 12;
    const decadeYears = Array.from({ length: 12 }, (_, i) => decadeStart + i);

    const handleSelectMonth = (monthNumber: number) => {
        const targetMonth = `${viewYear}-${pad(monthNumber)}`;
        onSelect(targetMonth);
        onClose();
    };

    const handleSelectYear = (year: number) => {
        setViewYear(year);
        // Transição fluida para a escolha do mês no ano selecionado
        startTransition(() => {
            setMode("months");
        });
    };

    const handleQuickToday = () => {
        onSelect(todayStr);
        onClose();
    };

    const isCurrentCompetenceToday = value === todayStr;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop sutil com leve desfoque */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="fixed inset-0 z-40 bg-ink/65 backdrop-blur-[2px]" aria-hidden="true" />

                    {/* Card Flutuante do Calendário */}
                    <motion.div
                        ref={containerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Calendário de seleção de competência"
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-1/2 top-full z-50 mt-2.5 w-[min(calc(100vw-2rem),380px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-surface-raised/95 p-4 text-text shadow-[0_24px_50px_rgba(8,5,16,0.85)] backdrop-blur-xl"
                    >
                        {/* Barra Superior com Atalhos Rápidos */}
                        <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2.5">
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="size-4 text-orchid" aria-hidden="true" />
                                <span className="text-xs font-semibold tracking-wide text-muted">Competência</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={handleQuickToday} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-95", isCurrentCompetenceToday ? "bg-violet text-ink shadow-[0_0_10px_rgba(167,139,250,0.4)]" : "bg-surface text-orchid hover:bg-surface/80 hover:text-white border border-white/5")} title="Ir para o mês atual">
                                    <Sparkles className="size-3" aria-hidden="true" />
                                    <span>Mês Atual</span>
                                </button>

                                <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-surface hover:text-text active:scale-95" aria-label="Fechar calendário">
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {/* Cabeçalho de Navegação de Ano / Década */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                {mode === "months" ? (
                                    <>
                                        <button type="button" onClick={() => setViewYear((y) => y - 5)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Recuar 5 anos" aria-label="Recuar 5 anos">
                                            <ChevronsLeft className="size-4" aria-hidden="true" />
                                        </button>
                                        <button type="button" onClick={() => setViewYear((y) => y - 1)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Ano anterior" aria-label="Ano anterior">
                                            <ChevronLeft className="size-4" aria-hidden="true" />
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" onClick={() => setViewYear((y) => y - 12)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Década anterior" aria-label="Década anterior">
                                        <ChevronLeft className="size-4" aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            {/* Botão de Alternância entre Mês e Ano */}
                            <button type="button" onClick={() => setMode((m) => (m === "months" ? "years" : "months"))} className="group flex items-center gap-1.5 rounded-xl border border-white/5 bg-surface px-3 py-1.5 text-sm font-bold text-text transition-all duration-150 hover:border-violet/40 hover:bg-surface-raised hover:text-white active:scale-95" aria-label={mode === "months" ? `Ano ${viewYear}. Clique para alternar para visualização de anos` : "Clique para voltar à seleção de meses"}>
                                <span className="tabular tracking-tight">{mode === "months" ? viewYear : `${decadeStart} – ${decadeStart + 11}`}</span>
                                <ChevronDown className={cn("size-3.5 text-orchid transition-transform duration-200 group-hover:text-violet", mode === "years" && "rotate-180")} aria-hidden="true" />
                            </button>

                            <div className="flex items-center gap-1">
                                {mode === "months" ? (
                                    <>
                                        <button type="button" onClick={() => setViewYear((y) => y + 1)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Próximo ano" aria-label="Próximo ano">
                                            <ChevronRight className="size-4" aria-hidden="true" />
                                        </button>
                                        <button type="button" onClick={() => setViewYear((y) => y + 5)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Avançar 5 anos" aria-label="Avançar 5 anos">
                                            <ChevronsRight className="size-4" aria-hidden="true" />
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" onClick={() => setViewYear((y) => y + 12)} className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95" title="Próxima década" aria-label="Próxima década">
                                        <ChevronRight className="size-4" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Corpo do Calendário: Grade de Meses ou Grade de Anos */}
                        <div className="min-h-50">
                            {mode === "months" ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {MONTHS.map((m) => {
                                        const isSelected = viewYear === parsedYear && m.number === parsedMonth;
                                        const isRealWorldToday = viewYear === todayYear && m.number === todayMonthNum;

                                        return (
                                            <button
                                                key={m.number}
                                                type="button"
                                                onClick={() => handleSelectMonth(m.number)}
                                                className={cn(
                                                    "group relative flex flex-col items-center justify-center rounded-xl py-2.5 px-2 transition-all duration-150 active:scale-95",
                                                    isSelected ? "bg-violet text-ink font-bold shadow-[0_0_14px_rgba(167,139,250,0.5)] scale-[1.02] border border-violet z-10" : isRealWorldToday ? "border border-orchid/50 bg-surface/90 text-orchid font-semibold hover:bg-surface-raised hover:text-white" : "border border-white/5 bg-surface text-text hover:border-violet/30 hover:bg-surface-raised hover:text-white",
                                                )}
                                                aria-pressed={isSelected}
                                                aria-label={`${m.full} de ${viewYear}`}
                                            >
                                                <span className="text-sm font-bold tracking-tight">{m.short}</span>
                                                <span className={cn("text-[10px] tracking-wide transition-colors", isSelected ? "text-ink/80 font-medium" : isRealWorldToday ? "text-orchid/80" : "text-muted group-hover:text-muted/90")}>{m.full}</span>

                                                {/* Ponto indicador de Hoje / Mês Civil Real */}
                                                {isRealWorldToday && !isSelected && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-orchid shadow-[0_0_4px_var(--orchid)]" title="Mês atual" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {decadeYears.map((yr) => {
                                        const isSelected = yr === viewYear;
                                        const isRealWorldYear = yr === todayYear;

                                        return (
                                            <button
                                                key={yr}
                                                type="button"
                                                onClick={() => handleSelectYear(yr)}
                                                className={cn(
                                                    "group relative flex flex-col items-center justify-center rounded-xl py-3 px-2 transition-all duration-150 active:scale-95",
                                                    isSelected ? "bg-violet text-ink font-bold shadow-[0_0_14px_rgba(167,139,250,0.5)] scale-[1.02] border border-violet z-10" : isRealWorldYear ? "border border-orchid/50 bg-surface/90 text-orchid font-semibold hover:bg-surface-raised hover:text-white" : "border border-white/5 bg-surface text-text hover:border-violet/30 hover:bg-surface-raised hover:text-white",
                                                )}
                                                aria-pressed={isSelected}
                                                aria-label={`Ano ${yr}`}
                                            >
                                                <span className="tabular text-sm font-bold tracking-tight">{yr}</span>

                                                {isRealWorldYear && !isSelected && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-orchid shadow-[0_0_4px_var(--orchid)]" title="Ano atual" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Rodapé Informativo e Contextual */}
                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-muted">
                            <span className="truncate">{mode === "months" ? `Selecionando mês de ${viewYear}` : "Clique em um ano para ver seus meses"}</span>
                            <span className="tabular font-medium text-text/80">
                                {MONTHS[parsedMonth - 1]?.short}/{String(parsedYear).slice(2)}
                            </span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
