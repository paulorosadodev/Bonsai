"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { ChevronDown, ChevronRight, PieChart as PieChartIcon, TrendingUp, X } from "lucide-react";
import { formatBrl, formatChartValue } from "@/lib/domain/money";
import type { DashboardCategoryTotal, DashboardHistoryPoint } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/select";
import { useFinancePending } from "@/components/layout/finance-pending";
import { currentMonth, formatAxisMonth, formatMonthLabel, shiftMonth } from "./params";
import { DynamicIcon } from "./transaction-visuals";
import { scrollBottomIntoViewIfNeeded } from "@/lib/ui/scroll";

type TooltipRow = {
    title: string;
    fill: string;
    amountCents: number;
    icon?: string;
    percentage?: number;
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: TooltipRow }> }) {
    if (!active || !payload?.[0]?.payload) {
        return null;
    }

    const row = payload[0].payload;

    return (
        <div className="flex min-w-40 gap-2.5 rounded-xl border border-surface-raised bg-surface px-3 py-2 shadow-[0_12px_32px_rgb(8_5_16/0.55)]">
            {row.icon ? <DynamicIcon name={row.icon} className="mt-0.5 size-4 shrink-0" style={{ color: row.fill }} /> : <span className="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: row.fill }} aria-hidden />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted">{row.title}</p>
                    {typeof row.percentage === "number" ? <span className="text-[10px] font-semibold text-violet">{row.percentage}%</span> : null}
                </div>
                <p className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</p>
            </div>
        </div>
    );
}

const tooltipWrapperStyle = { outline: "none", zIndex: 20 };
const tooltipContentStyle = { background: "transparent", border: "none", padding: 0, boxShadow: "none" };
const tooltipCursor = { fill: "rgba(167, 139, 250, 0.08)", radius: 6 };

function formatYAxisTick(cents: number) {
    if (cents <= 0) return "0";
    const reais = cents / 100;
    if (reais >= 1000) {
        const k = reais / 1000;
        return `R$ ${k % 1 === 0 ? k : k.toFixed(1).replace(".", ",")}k`;
    }
    return `R$ ${reais}`;
}

function ChartViewport({ className, height, width, clickable = false, children }: { className: string; height?: number; width?: string; clickable?: boolean; children: ReactNode }) {
    const ready = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    return (
        <div className={cn("outline-none", clickable && "cursor-pointer", className)} style={{ height, width }} aria-hidden>
            {ready ? children : null}
        </div>
    );
}

export function CategoryChart({ items, selectedCategoryId }: { items: DashboardCategoryTotal[]; selectedCategoryId?: string }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const handleToggle = useCallback(() => {
        setIsOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(cardRef.current);
            }
            return next;
        });
    }, []);

    const totalMonthCents = items.reduce((sum, item) => sum + item.amountCents, 0);

    const rows = items
        .filter((item) => item.amountCents > 0)
        .map((item) => ({
            ...item,
            label: item.name,
            title: item.name,
            fill: item.color,
            percentage: totalMonthCents > 0 ? Math.round((item.amountCents / totalMonthCents) * 100) : 0,
        }))
        .sort((a, b) => b.amountCents - a.amountCents);

    const selectedRow = selectedCategoryId ? rows.find((r) => r.categoryId === selectedCategoryId) : null;

    const handleSelectCategory = useCallback(
        (categoryId: string) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            const isCurrentlySelected = selectedCategoryId === categoryId;

            if (isCurrentlySelected) {
                nextParams.delete("category");
            } else {
                nextParams.set("category", categoryId);
            }

            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;

            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        },
        [pathname, router, searchParams, selectedCategoryId, startTransition],
    );

    const renderCategoryBarLabel = (props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }) => {
        const x = Number(props.x ?? 0);
        const y = Number(props.y ?? 0);
        const width = Number(props.width ?? 0);
        const height = Number(props.height ?? 0);
        const value = typeof props.value === "number" ? props.value : 0;
        const index = props.index ?? 0;
        const row = rows[index];
        const isSelected = selectedCategoryId === row?.categoryId;

        return (
            <text x={x + width + 6} y={y + height / 2 + 4} textAnchor="start" fill={isSelected ? "var(--orchid)" : "var(--muted)"} fontSize={11} fontWeight={isSelected ? 700 : 500} className="select-none pointer-events-none tabular">
                {formatChartValue(value)}
            </text>
        );
    };

    if (rows.length === 0) {
        return (
            <Card>
                <p className="text-sm text-muted">Nenhum gasto por categoria neste mês.</p>
            </Card>
        );
    }

    const chartHeight = Math.max(224, rows.length * 28);

    return (
        <Card ref={cardRef} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <button type="button" aria-expanded={isOpen} onClick={handleToggle} className="flex flex-1 items-center justify-between gap-3 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <PieChartIcon className="size-5 text-violet shrink-0" aria-hidden />
                        <h2 className="text-lg font-bold text-text">Por Categoria</h2>
                        {selectedRow ? (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectCategory(selectedRow.categoryId);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.stopPropagation();
                                        handleSelectCategory(selectedRow.categoryId);
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-violet/15 px-2.5 py-0.5 text-xs font-medium text-violet border border-violet/30 hover:bg-violet/25 transition-colors cursor-pointer ml-1"
                                title="Remover filtro de categoria"
                            >
                                <span className="size-2 rounded-full shrink-0" style={{ background: selectedRow.fill }} />
                                <span className="truncate max-w-28">{selectedRow.name}</span>
                                <X className="size-3 shrink-0" />
                            </span>
                        ) : null}
                    </div>
                    <ChevronDown className={cn("size-5 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
                </button>
            </div>

            <ChartViewport className="w-full" height={chartHeight} clickable>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        layout="vertical"
                        style={{ cursor: "pointer" }}
                        margin={{ top: 4, right: 65, left: 4, bottom: 0 }}
                        onClick={(state, event) => {
                            event?.stopPropagation?.();
                            const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : typeof state?.activeIndex === "number" ? state.activeIndex : -1;
                            if (index >= 0 && rows[index]) {
                                handleSelectCategory(rows[index].categoryId);
                            } else if (state?.activeLabel) {
                                const row = rows.find((r) => r.label === state.activeLabel);
                                if (row) {
                                    handleSelectCategory(row.categoryId);
                                }
                            }
                        }}
                    >
                        <XAxis type="number" hide domain={[0, (dataMax: number) => (dataMax > 0 ? Math.round(dataMax * 1.25) : 1000)]} />
                        <YAxis type="category" dataKey="label" width={92} interval={0} tick={{ fill: "var(--muted)", fontSize: 12, cursor: "pointer" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />
                        <Bar dataKey="amountCents" radius={[0, 8, 8, 0]} isAnimationActive={!reduce} maxBarSize={22} cursor="pointer" label={renderCategoryBarLabel}>
                            {rows.map((row) => {
                                const isSelected = selectedCategoryId === row.categoryId;
                                const isDimmed = Boolean(selectedCategoryId && !isSelected);

                                return (
                                    <Cell
                                        key={row.categoryId}
                                        fill={row.fill}
                                        cursor="pointer"
                                        opacity={isDimmed ? 0.35 : 1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategory(row.categoryId);
                                        }}
                                        style={{
                                            transition: "opacity 200ms ease, filter 200ms ease",
                                            filter: isSelected ? "drop-shadow(0 0 6px rgba(167, 139, 250, 0.45))" : undefined,
                                        }}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartViewport>

            {isOpen ? (
                <ul className="flex flex-col gap-1 border-t border-surface-raised/70 pt-3">
                    {rows.map((row) => (
                        <CategoryLegendItem key={row.categoryId} row={row} isSelected={row.categoryId === selectedCategoryId} onSelect={() => handleSelectCategory(row.categoryId)} />
                    ))}
                </ul>
            ) : null}
        </Card>
    );
}

function CategoryLegendItem({ row, isSelected, onSelect }: { row: { categoryId: string; label: string; fill: string; icon: string; amountCents: number; percentage: number }; isSelected: boolean; onSelect: () => void }) {
    return (
        <li>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
                className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-all text-left outline-none focus-visible:ring-1 focus-visible:ring-violet", isSelected ? "bg-surface-raised font-medium ring-1 ring-violet/50" : "hover:bg-surface-raised/50")}
            >
                <span className={cn("inline-flex items-center gap-2", isSelected ? "text-text font-medium" : "text-muted")}>
                    <DynamicIcon name={row.icon} className="size-4" style={{ color: row.fill }} />
                    <span>{row.label}</span>
                    <span className="text-[11px] text-muted/70">({row.percentage}%)</span>
                </span>
                <div className="flex items-center gap-2">
                    <span className="tabular text-text">{formatBrl(row.amountCents)}</span>
                    {isSelected ? <span className="text-[11px] font-semibold text-violet bg-violet/10 px-1.5 py-0.5 rounded-md">Ativo</span> : null}
                </div>
            </button>
        </li>
    );
}

const HISTORY_RANGES = [
    { value: "6", label: "6 meses" },
    { value: "12", label: "12 meses" },
    { value: "24", label: "24 meses" },
    { value: "all", label: "Todos" },
] as const;

type HistoryRange = (typeof HISTORY_RANGES)[number]["value"];
const DEFAULT_HISTORY_RANGE: HistoryRange = "6";
const HISTORY_COLUMN_WIDTH = 52;

function isHistoryRange(value: string): value is HistoryRange {
    return HISTORY_RANGES.some((option) => option.value === value);
}

function visibleHistory(items: DashboardHistoryPoint[], range: HistoryRange) {
    const rows = items.filter((item) => item.amountCents > 0).toSorted((a, b) => a.month.localeCompare(b.month));

    if (range === "all") {
        return rows;
    }

    return rows.slice(-Number(range));
}

function useIsDesktop(query = "(min-width: 768px)") {
    return useSyncExternalStore(
        (notify) => {
            if (typeof window === "undefined") return () => {};
            const media = window.matchMedia(query);
            media.addEventListener("change", notify);
            return () => media.removeEventListener("change", notify);
        },
        () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
        () => false,
    );
}

export function HistoryChart({ items, selectedMonth, centered = false }: { items: DashboardHistoryPoint[]; selectedMonth?: string; centered?: boolean }) {
    const isDesktop = useIsDesktop();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { start } = useFinancePending();
    const cardRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<HistoryRange>(DEFAULT_HISTORY_RANGE);

    const handleToggle = useCallback(() => {
        setIsOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(cardRef.current);
            }
            return next;
        });
    }, []);

    const handleSelectMonth = useCallback(
        (targetMonth: string) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set("month", targetMonth);
            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;

            start(() => {
                router.push(href, { scroll: false });
            }, "month");
        },
        [pathname, router, searchParams, start],
    );

    const targetMonth = selectedMonth ?? currentMonth();
    const centeredMonths = isDesktop ? [shiftMonth(targetMonth, -3), shiftMonth(targetMonth, -2), shiftMonth(targetMonth, -1), targetMonth, shiftMonth(targetMonth, 1), shiftMonth(targetMonth, 2), shiftMonth(targetMonth, 3)] : [shiftMonth(targetMonth, -2), shiftMonth(targetMonth, -1), targetMonth, shiftMonth(targetMonth, 1), shiftMonth(targetMonth, 2)];

    const itemsMap = new Map(items.map((item) => [item.month, item.amountCents]));

    const rows = centered
        ? centeredMonths.map((m) => {
              const amountCents = itemsMap.get(m) ?? 0;
              const isCurrent = m === targetMonth;
              return {
                  month: m,
                  amountCents,
                  label: formatAxisMonth(m),
                  title: formatMonthLabel(m),
                  isCurrent,
              };
          })
        : visibleHistory(items, range).map((item) => {
              const isCurrent = item.month === targetMonth;
              return {
                  ...item,
                  label: formatAxisMonth(item.month),
                  title: formatMonthLabel(item.month),
                  isCurrent,
              };
          });

    const renderBarLabel = (props: { x?: number | string; y?: number | string; width?: number | string; value?: unknown; index?: number }) => {
        const x = Number(props.x ?? 0);
        const y = Number(props.y ?? 0);
        const width = Number(props.width ?? 0);
        const value = typeof props.value === "number" ? props.value : 0;
        const index = props.index ?? 0;
        const row = rows[index];
        const isCurrent = row?.isCurrent;

        if (value <= 0) return null;

        return (
            <text x={x + width / 2} y={Math.max(y - 8, 14)} textAnchor="middle" fill={isCurrent ? "var(--orchid)" : "var(--muted)"} fontSize={centered ? (isDesktop ? 11 : 9.5) : 9.5} fontWeight={isCurrent ? 700 : 500} className="select-none pointer-events-none tabular" style={{ opacity: isCurrent ? 1 : 0.85 }}>
                {formatChartValue(value)}
            </text>
        );
    };

    useEffect(() => {
        if (centered) return;
        const node = scrollerRef.current;

        if (node) {
            node.scrollLeft = node.scrollWidth;
        }
    }, [centered, range, rows.length]);

    if (!centered && items.every((item) => item.amountCents <= 0)) {
        return null;
    }

    return (
        <Card ref={cardRef} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button type="button" aria-expanded={isOpen} onClick={handleToggle} className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                        <TrendingUp className="size-5 text-mint shrink-0" aria-hidden />
                        <h2 className="text-lg font-bold text-text whitespace-nowrap">Histórico Mensal</h2>
                    </button>
                    {!centered ? (
                        <div className="w-28 shrink-0">
                            <Select
                                id="historyRange"
                                aria-label="Meses"
                                value={range}
                                size="sm"
                                onChange={(value) => {
                                    if (isHistoryRange(value)) {
                                        setRange(value);
                                    }
                                }}
                                triggerClassName="bg-surface-raised py-1 text-xs"
                            >
                                {HISTORY_RANGES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    ) : null}
                </div>
                <button type="button" aria-expanded={isOpen} onClick={handleToggle} className="flex flex-1 items-center justify-end self-stretch py-1 -mr-1 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg group" aria-label={isOpen ? "Recolher histórico mensal" : "Expandir histórico mensal"}>
                    <ChevronDown className={cn("size-5 text-muted group-hover:text-text transition-all duration-200", isOpen && "rotate-180 text-violet group-hover:text-violet")} aria-hidden />
                </button>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-muted">Ainda não há histórico mensal.</p>
            ) : (
                <>
                    <div ref={centered ? undefined : scrollerRef} className={centered ? "w-full" : "overflow-x-auto overscroll-x-contain"}>
                        <ChartViewport className="h-60 min-w-full" clickable width={centered ? "100%" : `max(100%, ${rows.length * HISTORY_COLUMN_WIDTH}px)`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={rows}
                                    style={{ cursor: "pointer" }}
                                    margin={{ top: 24, right: 10, left: -6, bottom: 6 }}
                                    onClick={(state, event) => {
                                        event?.stopPropagation?.();
                                        const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : typeof state?.activeIndex === "number" ? state.activeIndex : -1;
                                        if (index >= 0 && rows[index]) {
                                            handleSelectMonth(rows[index].month);
                                        } else if (state?.activeLabel) {
                                            const found = rows.find((r) => r.label === state.activeLabel);
                                            if (found) {
                                                handleSelectMonth(found.month);
                                            }
                                        }
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="monthlyActiveBar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f5e8ff" stopOpacity={1} />
                                            <stop offset="35%" stopColor="var(--orchid)" stopOpacity={0.95} />
                                            <stop offset="100%" stopColor="var(--violet)" stopOpacity={0.75} />
                                        </linearGradient>
                                        <linearGradient id="monthlyStandardBar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.55} />
                                            <stop offset="100%" stopColor="var(--surface-raised)" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        interval={0}
                                        tick={({ x, y, payload }) => {
                                            const row = rows.find((r) => r.label === payload.value);
                                            const isCurrent = row?.isCurrent;
                                            return (
                                                <g>
                                                    <text x={x} y={Number(y) + 14} textAnchor="middle" fill={isCurrent ? "var(--orchid)" : "rgba(163, 152, 181, 0.7)"} fontSize={isCurrent ? 11.5 : 11} fontWeight={isCurrent ? 700 : 500} cursor="pointer">
                                                        {payload.value}
                                                    </text>
                                                    {isCurrent ? <circle cx={x} cy={Number(y) + 24} r={2} fill="var(--orchid)" /> : null}
                                                </g>
                                            );
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tickCount={4} domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil((dataMax * 1.25) / 50000) * 50000 : 100000)]} tick={{ fill: "rgba(163, 152, 181, 0.55)", fontSize: 10, fontFamily: "var(--font-sans)" }} tickFormatter={formatYAxisTick} width={44} />
                                    <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />
                                    <Bar dataKey="amountCents" radius={[6, 6, 2, 2]} isAnimationActive={!reduce} maxBarSize={centered ? (isDesktop ? 22 : 16) : 18} cursor="pointer" label={renderBarLabel} background={{ fill: "rgba(255, 255, 255, 0.03)", radius: 6 }}>
                                        {rows.map((row) => {
                                            const isCurrent = row.isCurrent;
                                            const isZero = row.amountCents === 0;

                                            return (
                                                <Cell
                                                    key={row.month}
                                                    fill={isZero ? "transparent" : isCurrent ? "url(#monthlyActiveBar)" : "url(#monthlyStandardBar)"}
                                                    stroke="none"
                                                    strokeWidth={0}
                                                    cursor="pointer"
                                                    style={{
                                                        transition: "filter 200ms ease, opacity 200ms ease",
                                                        filter: isCurrent && !isZero ? "drop-shadow(0 0 10px rgba(216, 180, 254, 0.45))" : undefined,
                                                    }}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartViewport>
                    </div>

                    {isOpen ? (
                        <ol className="flex flex-col gap-1 border-t border-surface-raised/70 pt-3">
                            {rows.map((row) => (
                                <li key={row.month}>
                                    <button type="button" onClick={() => handleSelectMonth(row.month)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-surface-raised cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-violet", row.isCurrent && "bg-surface-raised/60 font-medium")}>
                                        <span className={cn("text-sm transition-colors inline-flex items-center gap-2", row.isCurrent ? "font-semibold text-orchid" : "text-text group-hover:text-orchid")}>
                                            <span>{row.title}</span>
                                            {row.isCurrent ? <span className="text-[10px] font-semibold text-orchid bg-orchid/15 px-1.5 py-0.5 rounded-md">Atual</span> : null}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn("tabular text-sm font-semibold", row.isCurrent ? "text-orchid" : "text-text")}>{formatBrl(row.amountCents)}</span>
                                            <ChevronRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-orchid" />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                </>
            )}
        </Card>
    );
}
