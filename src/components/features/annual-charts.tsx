"use client";

import { useCallback, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Area, Bar, BarChart, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { BarChart3, ChevronDown, ChevronRight, PieChart as PieChartIcon, Sparkles, TrendingUp, X } from "lucide-react";
import { formatBrl, formatChartValue } from "@/lib/domain/money";
import type { AnnualMonthPoint, AnnualYearPoint, DashboardCategoryTotal } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { useFinancePending } from "@/components/layout/finance-pending";
import { DynamicIcon } from "./transaction-visuals";
import { scrollBottomIntoViewIfNeeded } from "@/lib/ui/scroll";

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

const tooltipWrapperStyle = { outline: "none", zIndex: 20 };
const tooltipContentStyle = { background: "transparent", border: "none", padding: 0, boxShadow: "none" };
const tooltipCursor = { stroke: "rgba(167, 139, 250, 0.2)", strokeDasharray: "4 4" };

type AnnualLineTooltipPayload = {
    payload?: {
        label: string;
        fullLabel: string;
        realAmountCents: number;
        forecastAmountCents: number;
        totalAmountCents: number;
        isFuture: boolean;
        year: number;
    };
};

function AnnualLineTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<AnnualLineTooltipPayload> }) {
    if (!active || !payload?.[0]?.payload) {
        return null;
    }

    const item = payload[0].payload;
    const currentVal = item.totalAmountCents;

    return (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-surface-raised bg-surface/95 px-3.5 py-2.5 shadow-[0_12px_32px_rgb(8_5_16/0.75)] backdrop-blur-md min-w-40">
            <p className="text-xs font-semibold text-muted">{item.fullLabel}</p>

            <div className="flex items-center justify-between gap-3 text-xs border-t border-surface-raised/80 pt-1.5">
                <span className="flex items-center gap-1.5 text-text font-medium">
                    <span className="size-2 rounded-full bg-orchid" />
                    Gasto
                    {item.isFuture ? <span className="text-[10px] text-orchid/80 bg-orchid/10 px-1 rounded">Previsto</span> : null}
                </span>
                <span className="tabular font-semibold text-text">{formatBrl(currentVal)}</span>
            </div>
        </div>
    );
}

export function AnnualLineChart({ items, year }: { items: AnnualMonthPoint[]; year: number }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { start } = useFinancePending();
    const cardRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();

    const handleToggle = useCallback(() => {
        setIsOpen((prev) => {
            const next = !prev;
            if (next) {
                scrollBottomIntoViewIfNeeded(cardRef.current);
            }
            return next;
        });
    }, []);

    const handleNavigateMonth = useCallback(
        (targetMonth: string) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete("view");
            nextParams.delete("year");
            nextParams.set("month", targetMonth);
            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;

            start(() => {
                router.push(href, { scroll: false });
            }, "month");
        },
        [pathname, router, searchParams, start],
    );

    // Build chart rows with connecting points between realized and projected
    const chartData = items.map((pt, idx) => {
        const nextPt = items[idx + 1];
        const isCurrentTransition = !pt.isFuture && nextPt?.isFuture;

        return {
            ...pt,
            year,
            // Realized line displays for all non-future months
            realized: !pt.isFuture ? pt.totalAmountCents : null,
            // Projected line starts at transition month so it connects continuously
            projected: pt.isFuture || isCurrentTransition ? pt.totalAmountCents : null,
        };
    });

    const hasAnySpending = items.some((item) => item.totalAmountCents > 0);

    if (!hasAnySpending) {
        return (
            <Card>
                <p className="text-sm text-muted">Nenhum gasto registrado em {year}.</p>
            </Card>
        );
    }

    return (
        <Card ref={cardRef} className="flex flex-col gap-3">
            <button type="button" aria-expanded={isOpen} onClick={handleToggle} className="flex items-center justify-between gap-3 w-full cursor-pointer select-none text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet py-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <TrendingUp className="size-5 text-violet shrink-0" aria-hidden />
                    <h2 className="text-lg font-bold text-text">Evolução Mensal</h2>
                </div>
                <ChevronDown className={cn("size-5 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
            </button>

            <ChartViewport className="h-56 w-full" clickable>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        style={{ cursor: "pointer" }}
                        margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
                        onClick={(state) => {
                            const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : -1;
                            if (index >= 0 && chartData[index]) {
                                handleNavigateMonth(chartData[index].month);
                            } else if (state?.activeLabel) {
                                const found = chartData.find((d) => d.label === state.activeLabel);
                                if (found) {
                                    handleNavigateMonth(found.month);
                                }
                            }
                        }}
                    >
                        <defs>
                            <linearGradient id="annualLineFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--orchid)" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="var(--orchid)" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="label" interval={0} tick={{ fill: "var(--muted)", fontSize: 11, fontWeight: 500, cursor: "pointer" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip cursor={tooltipCursor} content={<AnnualLineTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />

                        {/* Realized Area Fill */}
                        <Area type="monotone" dataKey="realized" stroke="none" fill="url(#annualLineFill)" isAnimationActive={!reduce} />

                        {/* Realized Spending Line */}
                        <Line type="monotone" dataKey="realized" stroke="var(--orchid)" strokeWidth={2.5} dot={{ fill: "var(--surface)", stroke: "var(--orchid)", strokeWidth: 2, r: 3 }} activeDot={{ r: 6, fill: "var(--orchid)", stroke: "var(--surface)", strokeWidth: 2, cursor: "pointer" }} isAnimationActive={!reduce} />

                        {/* Projected Spending Line (Dashed) */}
                        <Line type="monotone" dataKey="projected" stroke="var(--orchid)" strokeWidth={2} strokeDasharray="4 4" strokeOpacity={0.6} dot={{ fill: "var(--surface)", stroke: "var(--orchid)", strokeWidth: 1.5, r: 3, strokeDasharray: "2 2" }} activeDot={{ r: 6, fill: "var(--orchid)", stroke: "var(--surface)", strokeWidth: 2, cursor: "pointer" }} isAnimationActive={!reduce} />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartViewport>

            {isOpen ? (
                <ol className="flex flex-col gap-1 border-t border-surface-raised/70 pt-3">
                    {items.map((row) => (
                        <li key={row.month}>
                            <button type="button" onClick={() => handleNavigateMonth(row.month)} className="flex w-full items-center justify-between gap-3 text-sm py-1 px-2 -mx-2 rounded-xl transition-colors hover:bg-surface-raised cursor-pointer group text-left outline-none focus-visible:ring-2 focus-visible:ring-violet">
                                <span className="flex items-center gap-2">
                                    <span className={cn("text-sm transition-colors group-hover:text-orchid", row.isFuture ? "text-muted" : "text-text font-medium")}>{row.fullLabel}</span>
                                    {row.isFuture ? <span className="text-[10px] font-medium text-orchid bg-orchid/10 px-1.5 py-0.5 rounded-md">Previsto</span> : null}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="tabular font-semibold text-text">{formatBrl(row.totalAmountCents)}</span>
                                    <ChevronRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-orchid" />
                                </div>
                            </button>
                        </li>
                    ))}
                </ol>
            ) : null}
        </Card>
    );
}

export function AnnualCategoryChart({ items, selectedCategoryId, totalYearCents }: { items: DashboardCategoryTotal[]; selectedCategoryId?: string; totalYearCents: number }) {
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

    const rows = items
        .filter((item) => item.amountCents > 0)
        .map((item) => ({
            ...item,
            label: item.name,
            title: item.name,
            fill: item.color,
            percentage: totalYearCents > 0 ? Math.round((item.amountCents / totalYearCents) * 100) : 0,
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

    const renderAnnualCategoryBarLabel = (props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }) => {
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
                <p className="text-sm text-muted">Nenhum gasto por categoria neste ano.</p>
            </Card>
        );
    }

    const chartHeight = Math.max(224, rows.length * 28);

    return (
        <Card ref={cardRef} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <button type="button" aria-expanded={isOpen} onClick={handleToggle} className="flex flex-1 items-center justify-between gap-3 text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-lg py-0.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <PieChartIcon className="size-5 text-orchid shrink-0" aria-hidden />
                        <h2 className="text-lg font-bold text-text">Categorias no Ano</h2>
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
                        <Tooltip
                            cursor={{ fill: "rgba(167, 139, 250, 0.12)" }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.[0]?.payload) return null;
                                const row = payload[0].payload as (typeof rows)[0];
                                return (
                                    <div className="flex min-w-40 gap-2.5 rounded-xl border border-surface-raised bg-surface px-3 py-2 shadow-[0_12px_32px_rgb(8_5_16/0.55)]">
                                        <DynamicIcon name={row.icon} className="mt-0.5 size-4 shrink-0" style={{ color: row.fill }} />
                                        <div className="flex min-w-0 flex-col gap-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-medium text-muted">{row.name}</p>
                                                <span className="text-[10px] font-semibold text-violet">{row.percentage}%</span>
                                            </div>
                                            <p className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</p>
                                        </div>
                                    </div>
                                );
                            }}
                            wrapperStyle={tooltipWrapperStyle}
                            contentStyle={tooltipContentStyle}
                        />
                        <Bar dataKey="amountCents" radius={[0, 8, 8, 0]} isAnimationActive={!reduce} maxBarSize={22} cursor="pointer" label={renderAnnualCategoryBarLabel}>
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
                        <li key={row.categoryId}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectCategory(row.categoryId);
                                }}
                                className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-all text-left outline-none focus-visible:ring-1 focus-visible:ring-violet", row.categoryId === selectedCategoryId ? "bg-surface-raised font-medium ring-1 ring-violet/50" : "hover:bg-surface-raised/50")}
                            >
                                <span className={cn("inline-flex items-center gap-2", row.categoryId === selectedCategoryId ? "text-text font-medium" : "text-muted")}>
                                    <DynamicIcon name={row.icon} className="size-4" style={{ color: row.fill }} />
                                    <span>{row.label}</span>
                                    <span className="text-[11px] text-muted/70">({row.percentage}%)</span>
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="tabular text-text">{formatBrl(row.amountCents)}</span>
                                    {row.categoryId === selectedCategoryId ? <span className="text-[11px] font-semibold text-violet bg-violet/10 px-1.5 py-0.5 rounded-md">Ativo</span> : null}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </Card>
    );
}

export function AnnualHistoryChart({ items, selectedYear }: { items: AnnualYearPoint[]; selectedYear: number }) {
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

    const handleSelectYear = useCallback(
        (targetYear: number) => {
            if (targetYear === selectedYear) return;
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set("view", "annual");
            nextParams.set("year", String(targetYear));
            nextParams.delete("month");
            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;

            startTransition(() => {
                router.push(href, { scroll: false });
            });
        },
        [pathname, router, searchParams, selectedYear, startTransition],
    );

    const rows = items.map((item) => ({
        ...item,
        label: String(item.year),
        isSelected: item.year === selectedYear,
    }));

    const renderAnnualHistoryBarLabel = (props: { x?: number | string; y?: number | string; width?: number | string; value?: unknown; index?: number }) => {
        const x = Number(props.x ?? 0);
        const y = Number(props.y ?? 0);
        const width = Number(props.width ?? 0);
        const value = typeof props.value === "number" ? props.value : 0;
        const index = props.index ?? 0;
        const row = rows[index];
        const isSelected = row?.isSelected;

        return (
            <text x={x + width / 2} y={Math.max(y - 6, 12)} textAnchor="middle" fill={isSelected ? "var(--orchid)" : "var(--muted)"} fontSize={11} fontWeight={isSelected ? 700 : 500} className="select-none pointer-events-none tabular">
                {formatChartValue(value)}
            </text>
        );
    };

    if (items.length <= 1 && items.every((i) => i.amountCents <= 0)) {
        return null;
    }

    return (
        <Card ref={cardRef} className="flex flex-col gap-3">
            <button type="button" aria-expanded={isOpen} onClick={handleToggle} className="flex items-center justify-between gap-3 w-full cursor-pointer select-none text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet py-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <BarChart3 className="size-5 text-mint shrink-0" aria-hidden />
                    <h2 className="text-lg font-bold text-text">Histórico Anual</h2>
                </div>
                <ChevronDown className={cn("size-5 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
            </button>

            <ChartViewport className="h-52 w-full" clickable>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        style={{ cursor: "pointer" }}
                        margin={{ top: 22, right: 8, left: 4, bottom: 0 }}
                        onClick={(state, event) => {
                            event?.stopPropagation?.();
                            const index = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : typeof state?.activeIndex === "number" ? state.activeIndex : -1;
                            if (index >= 0 && rows[index]) {
                                handleSelectYear(rows[index].year);
                            } else if (state?.activeLabel) {
                                const yr = Number(state.activeLabel);
                                if (!Number.isNaN(yr)) {
                                    handleSelectYear(yr);
                                }
                            }
                        }}
                    >
                        <XAxis dataKey="label" interval={0} tick={{ fill: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, (dataMax: number) => (dataMax > 0 ? Math.round(dataMax * 1.25) : 1000)]} />
                        <Tooltip
                            cursor={{ fill: "rgba(167, 139, 250, 0.12)" }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.[0]?.payload) return null;
                                const row = payload[0].payload as (typeof rows)[0];
                                return (
                                    <div className="flex min-w-36 flex-col gap-1 rounded-xl border border-surface-raised bg-surface px-3 py-2 shadow-[0_12px_32px_rgb(8_5_16/0.55)]">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-muted">{row.year}</p>
                                            {row.isCurrentYear ? <span className="text-[10px] text-mint bg-mint/10 px-1.5 py-0.5 rounded-md font-medium">Em curso</span> : null}
                                        </div>
                                        <p className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</p>
                                        <p className="text-[10px] text-muted">Clique para ver este ano</p>
                                    </div>
                                );
                            }}
                            wrapperStyle={tooltipWrapperStyle}
                            contentStyle={tooltipContentStyle}
                        />
                        <Bar dataKey="amountCents" radius={[6, 6, 2, 2]} isAnimationActive={!reduce} maxBarSize={28} cursor="pointer" label={renderAnnualHistoryBarLabel} background={{ fill: "rgba(255, 255, 255, 0.03)", radius: 6 }}>
                            {rows.map((row) => {
                                const isSelected = row.year === selectedYear;
                                return (
                                    <Cell
                                        key={row.year}
                                        fill={isSelected ? "var(--orchid)" : "var(--surface-raised)"}
                                        cursor="pointer"
                                        stroke="none"
                                        strokeWidth={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectYear(row.year);
                                        }}
                                        style={{
                                            transition: "filter 200ms ease, fill 200ms ease",
                                            filter: isSelected ? "drop-shadow(0 0 10px rgba(216, 180, 254, 0.45))" : undefined,
                                        }}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartViewport>

            {isOpen ? (
                <ol className="flex flex-col gap-1.5 border-t border-surface-raised/70 pt-3">
                    {rows.map((row) => (
                        <li key={row.year}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectYear(row.year);
                                }}
                                className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-all text-left outline-none focus-visible:ring-1 focus-visible:ring-violet cursor-pointer", row.isSelected ? "bg-surface-raised font-medium ring-1 ring-violet/50" : "hover:bg-surface-raised/50")}
                            >
                                <span className="flex items-center gap-2">
                                    <span className={cn(row.isSelected ? "text-text font-bold" : "text-muted")}>{row.year}</span>
                                    {row.isCurrentYear ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-mint bg-mint/10 px-1.5 py-0.5 rounded-md">
                                            <Sparkles className="size-3" />
                                            Em andamento
                                        </span>
                                    ) : null}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="tabular text-text font-semibold">{formatBrl(row.amountCents)}</span>
                                    {row.isSelected ? <span className="text-[11px] font-semibold text-violet bg-violet/10 px-1.5 py-0.5 rounded-md">Selecionado</span> : null}
                                </div>
                            </button>
                        </li>
                    ))}
                </ol>
            ) : null}
        </Card>
    );
}
