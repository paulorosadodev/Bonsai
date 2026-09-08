"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "./cn";
import { messageTone } from "./message";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;

function pad(n: number): string {
    return n.toString().padStart(2, "0");
}

export function formatToBr(civilDate: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(civilDate)) return civilDate;
    const [year, month, day] = civilDate.split("-");
    return `${day}/${month}/${year}`;
}

function getTodayCivil(): string {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function shiftCivilDate(civilDate: string, daysOffset: number): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(civilDate)) return civilDate;
    const [y, m, d] = civilDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + daysOffset));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export type DatePickerProps = {
    id?: string;
    name?: string;
    label?: ReactNode;
    value?: string; // YYYY-MM-DD
    defaultValue?: string; // YYYY-MM-DD
    onChange?: (value: string) => void;
    error?: string;
    hint?: string;
    min?: string;
    max?: string;
    today?: string;
    disabled?: boolean;
    clearable?: boolean;
    placeholder?: string;
    className?: string;
};

export function DatePicker({ id: explicitId, name, label, value: controlledValue, defaultValue, onChange, error, hint, min, max, today: propToday, disabled = false, clearable = false, placeholder, className }: DatePickerProps) {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const today = propToday ?? getTodayCivil();
    const yesterday = shiftCivilDate(today, -1);

    const [internalValue, setInternalValue] = useState<string>(defaultValue ?? today);
    const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;

    // View state for current month in calendar
    const [viewYearMonth, setViewYearMonth] = useState<{ year: number; month: number }>(() => {
        const initial = selectedValue || today;
        if (/^\d{4}-\d{2}-\d{2}$/.test(initial)) {
            const [y, m] = initial.split("-").map(Number);
            return { year: y, month: m };
        }
        const [y, m] = today.split("-").map(Number);
        return { year: y, month: m };
    });

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    function toggleOpen() {
        if (!isOpen) {
            const initial = selectedValue || today;
            if (/^\d{4}-\d{2}-\d{2}$/.test(initial)) {
                const [y, m] = initial.split("-").map(Number);
                setViewYearMonth({ year: y, month: m });
            }
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }

    // Close on click outside and escape
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
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    function handleSelectDate(dateStr: string) {
        if (min && dateStr < min) return;
        if (max && dateStr > max) return;

        if (controlledValue === undefined) {
            setInternalValue(dateStr);
        }
        onChange?.(dateStr);
        setIsOpen(false);
        triggerRef.current?.focus();
    }

    function handleClear() {
        if (controlledValue === undefined) {
            setInternalValue("");
        }
        onChange?.("");
        setIsOpen(false);
        triggerRef.current?.focus();
    }

    function prevMonth() {
        setViewYearMonth((prev) => {
            if (prev.month === 1) {
                return { year: prev.year - 1, month: 12 };
            }
            return { year: prev.year, month: prev.month - 1 };
        });
    }

    function nextMonth() {
        setViewYearMonth((prev) => {
            if (prev.month === 12) {
                return { year: prev.year + 1, month: 1 };
            }
            return { year: prev.year, month: prev.month + 1 };
        });
    }

    // Days grid calculation
    const { year, month } = viewYearMonth;
    const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

    // Generate days cells
    const calendarDays: Array<{
        dateStr: string;
        dayNumber: number;
        isCurrentMonth: boolean;
        isSelected: boolean;
        isToday: boolean;
        isDisabled: boolean;
    }> = [];

    // Prev month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const dayNumber = daysInPrevMonth - i;
        const prevMonthVal = month === 1 ? 12 : month - 1;
        const prevYearVal = month === 1 ? year - 1 : year;
        const dateStr = `${prevYearVal}-${pad(prevMonthVal)}-${pad(dayNumber)}`;
        calendarDays.push({
            dateStr,
            dayNumber,
            isCurrentMonth: false,
            isSelected: dateStr === selectedValue,
            isToday: dateStr === today,
            isDisabled: Boolean((min && dateStr < min) || (max && dateStr > max)),
        });
    }

    // Current month days
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
        const dateStr = `${year}-${pad(month)}-${pad(dayNumber)}`;
        calendarDays.push({
            dateStr,
            dayNumber,
            isCurrentMonth: true,
            isSelected: dateStr === selectedValue,
            isToday: dateStr === today,
            isDisabled: Boolean((min && dateStr < min) || (max && dateStr > max)),
        });
    }

    // Next month leading days to complete full rows (7 cols)
    const totalCells = Math.ceil(calendarDays.length / 7) * 7;
    const remainingDays = totalCells - calendarDays.length;
    for (let dayNumber = 1; dayNumber <= remainingDays; dayNumber++) {
        const nextMonthVal = month === 12 ? 1 : month + 1;
        const nextYearVal = month === 12 ? year + 1 : year;
        const dateStr = `${nextYearVal}-${pad(nextMonthVal)}-${pad(dayNumber)}`;
        calendarDays.push({
            dateStr,
            dayNumber,
            isCurrentMonth: false,
            isSelected: dateStr === selectedValue,
            isToday: dateStr === today,
            isDisabled: Boolean((min && dateStr < min) || (max && dateStr > max)),
        });
    }

    // Relative badge for display
    let relativeLabel: string | null = null;
    if (selectedValue === today) {
        relativeLabel = "Hoje";
    } else if (selectedValue === yesterday) {
        relativeLabel = "Ontem";
    }

    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
        <div ref={containerRef} className={cn("relative flex flex-col gap-2.5", className)}>
            {label ? (
                <label htmlFor={id} className="text-sm font-medium text-text">
                    {label}
                </label>
            ) : null}

            {name ? <input type="hidden" name={name} value={selectedValue} aria-invalid={error ? true : undefined} /> : null}

            <button
                ref={triggerRef}
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-describedby={describedBy}
                onClick={toggleOpen}
                className={cn("group flex min-h-11 w-full items-center justify-between rounded-xl bg-surface px-3 py-2 text-left text-sm text-text transition-all duration-150 focus-visible:outline-2 focus-visible:outline-violet", error && "outline-2 outline-solid outline-danger", disabled && "cursor-not-allowed opacity-50", isOpen && "ring-2 ring-violet/40 bg-surface-raised")}
            >
                <div className="flex items-center gap-2.5">
                    <CalendarIcon className="size-4 shrink-0 text-orchid transition-colors group-hover:text-violet" aria-hidden />
                    <span className={cn("font-medium", !selectedValue && "text-muted")}>{selectedValue ? formatToBr(selectedValue) : (placeholder ?? "Selecionar data")}</span>
                    {relativeLabel ? <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[11px] font-semibold text-orchid border border-violet/20">{relativeLabel}</span> : null}
                </div>

                <div className="flex items-center gap-2">
                    {clearable && selectedValue && !disabled ? (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Limpar data"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleClear();
                                }
                            }}
                            className="rounded p-1 text-muted hover:bg-surface-raised hover:text-text transition-colors"
                        >
                            <X className="size-3.5" aria-hidden />
                        </span>
                    ) : null}
                    <span className="text-xs text-muted font-normal">{isOpen ? "Fechar" : "Alterar"}</span>
                </div>
            </button>

            {error ? (
                <p id={errorId} className={messageTone.danger}>
                    {error}
                </p>
            ) : null}
            {hint && !error ? (
                <p id={hintId} className="text-sm text-muted">
                    {hint}
                </p>
            ) : null}

            <AnimatePresence>
                {isOpen && (
                    <motion.div role="dialog" aria-label="Seletor de Data" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.14, ease: "easeOut" }} className="absolute left-0 top-full z-50 mt-1.5 w-70 rounded-xl border border-surface-raised bg-surface-raised/95 p-3 text-text shadow-[0_12px_32px_rgb(8_5_16/0.8)] backdrop-blur-md">
                        {/* Quick Shortcuts */}
                        <div className="mb-2 flex items-center gap-1.5 border-b border-surface/80 pb-2">
                            <span className="text-[11px] font-medium text-muted">Atalhos:</span>
                            <button type="button" onClick={() => handleSelectDate(today)} className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors", selectedValue === today ? "bg-violet text-ink font-semibold" : "bg-surface text-muted hover:bg-surface/80 hover:text-text")}>
                                Hoje
                            </button>
                            <button type="button" onClick={() => handleSelectDate(yesterday)} className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors", selectedValue === yesterday ? "bg-violet text-ink font-semibold" : "bg-surface text-muted hover:bg-surface/80 hover:text-text")}>
                                Ontem
                            </button>
                            {clearable && selectedValue ? (
                                <button type="button" onClick={handleClear} className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-medium text-danger hover:bg-danger/10 transition-colors">
                                    Limpar
                                </button>
                            ) : null}
                        </div>

                        {/* Calendar Header */}
                        <div className="mb-2 flex items-center justify-between">
                            <button type="button" aria-label="Mês anterior" onClick={prevMonth} className="inline-flex size-7 items-center justify-center rounded-lg bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95">
                                <ChevronLeft className="size-3.5" aria-hidden />
                            </button>

                            <div className="text-xs font-semibold tracking-wide text-text">
                                {MONTH_NAMES[month - 1]} <span className="text-muted">{year}</span>
                            </div>

                            <button type="button" aria-label="Próximo mês" onClick={nextMonth} className="inline-flex size-7 items-center justify-center rounded-lg bg-surface text-orchid transition-colors hover:bg-surface/80 hover:text-white active:scale-95">
                                <ChevronRight className="size-3.5" aria-hidden />
                            </button>
                        </div>

                        {/* Weekday headers */}
                        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
                            {WEEKDAYS.map((day, idx) => (
                                <div key={day} className={cn("text-[11px] font-medium py-0.5", idx === 0 || idx === 6 ? "text-muted/50" : "text-muted")}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map(({ dateStr, dayNumber, isCurrentMonth, isSelected, isToday, isDisabled }) => {
                                return (
                                    <button
                                        key={dateStr}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => handleSelectDate(dateStr)}
                                        aria-pressed={isSelected}
                                        className={cn(
                                            "group relative flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-all duration-100 active:scale-90",
                                            !isCurrentMonth && "text-muted/30 hover:text-muted/60",
                                            isCurrentMonth && !isSelected && "text-text hover:bg-surface hover:text-white",
                                            isSelected && "bg-violet text-ink font-bold shadow-[0_0_10px_rgba(167,139,250,0.4)] scale-105 z-10",
                                            isToday && !isSelected && "border border-orchid/60 text-orchid font-semibold",
                                            isDisabled && "pointer-events-none opacity-20",
                                        )}
                                    >
                                        <span>{dayNumber}</span>
                                        {isToday && !isSelected ? <span className="absolute bottom-1 size-1 rounded-full bg-orchid" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
