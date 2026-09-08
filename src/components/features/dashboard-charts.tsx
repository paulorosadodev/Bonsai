"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { formatBrl } from "@/lib/domain/money";
import type { DashboardCategoryTotal, DashboardHistoryPoint } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/select";
import { formatAxisMonth, formatMonthLabel } from "./params";
import { DynamicIcon } from "./transaction-visuals";

type TooltipRow = {
    title: string;
    fill: string;
    amountCents: number;
    icon?: string;
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: TooltipRow }> }) {
    if (!active || !payload?.[0]?.payload) {
        return null;
    }

    const row = payload[0].payload;

    return (
        <div className="flex min-w-40 gap-2.5 rounded-xl border border-surface-raised bg-surface px-3 py-2 shadow-[0_12px_32px_rgb(8_5_16/0.55)]">
            {row.icon ? <DynamicIcon name={row.icon} className="mt-0.5 size-4 shrink-0" style={{ color: row.fill }} /> : <span className="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: row.fill }} aria-hidden />}
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-xs font-medium text-muted">{row.title}</p>
                <p className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</p>
            </div>
        </div>
    );
}

const tooltipWrapperStyle = { outline: "none", zIndex: 20 };
const tooltipContentStyle = { background: "transparent", border: "none", padding: 0, boxShadow: "none" };
const tooltipCursor = { fill: "rgba(167, 139, 250, 0.12)" };

function ChartViewport({ className, height, width, children }: { className: string; height?: number; width?: string; children: ReactNode }) {
    const ready = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    return (
        <div className={className} style={{ height, width }} aria-hidden>
            {ready ? children : null}
        </div>
    );
}

export function CategoryChart({ items }: { items: DashboardCategoryTotal[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();
    const rows = items
        .filter((item) => item.amountCents > 0)
        .map((item) => ({
            ...item,
            label: item.name,
            title: item.name,
            fill: item.color,
        }))
        .sort((a, b) => b.amountCents - a.amountCents);

    if (rows.length === 0) {
        return (
            <Card>
                <p className="text-sm text-muted">Nenhum gasto por categoria neste mês.</p>
            </Card>
        );
    }

    return (
        <Card
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsOpen((prev) => !prev);
                }
            }}
            className="flex flex-col gap-3 cursor-pointer select-none transition-colors hover:bg-surface-raised/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-text">Por Categoria</h2>
                <ChevronDown className={cn("size-4 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
            </div>

            <ChartViewport className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" width={92} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />
                        <Bar dataKey="amountCents" radius={[0, 8, 8, 0]} isAnimationActive={!reduce} maxBarSize={22}>
                            {rows.map((row) => (
                                <Cell key={row.categoryId} fill={row.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartViewport>

            {isOpen ? (
                <ul className="flex flex-col gap-1.5 border-t border-surface-raised/70 pt-3">
                    {rows.map((row) => (
                        <CategoryLegendItem key={row.categoryId} row={row} />
                    ))}
                </ul>
            ) : null}
        </Card>
    );
}

function CategoryLegendItem({ row }: { row: { categoryId: string; label: string; fill: string; icon: string; amountCents: number } }) {
    return (
        <li className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 text-muted">
                <DynamicIcon name={row.icon} className="size-4" style={{ color: row.fill }} />
                {row.label}
            </span>
            <span className="tabular text-text">{formatBrl(row.amountCents)}</span>
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

export function HistoryChart({ items }: { items: DashboardHistoryPoint[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const reduce = useReducedMotion();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<HistoryRange>(DEFAULT_HISTORY_RANGE);
    const rows = visibleHistory(items, range).map((item) => ({
        ...item,
        label: formatAxisMonth(item.month),
        title: formatMonthLabel(item.month),
        fill: "var(--violet)",
    }));

    useEffect(() => {
        const node = scrollerRef.current;

        if (node) {
            node.scrollLeft = node.scrollWidth;
        }
    }, [range, rows.length]);

    if (items.every((item) => item.amountCents <= 0)) {
        return null;
    }

    return (
        <Card
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsOpen((prev) => !prev);
                }
            }}
            className="flex flex-col gap-3 cursor-pointer select-none transition-colors hover:bg-surface-raised/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-text">Histórico Mensal</h2>
                <div className="flex items-center gap-2">
                    <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                    <ChevronDown className={cn("size-4 text-muted transition-transform duration-200", isOpen && "rotate-180 text-violet")} aria-hidden />
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-muted">Ainda não há histórico mensal.</p>
            ) : (
                <>
                    <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain">
                        <ChartViewport className="h-48 min-w-full" width={`max(100%, ${rows.length * HISTORY_COLUMN_WIDTH}px)`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                                    <XAxis dataKey="label" interval={0} tick={{ fill: "var(--muted)", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} wrapperStyle={tooltipWrapperStyle} contentStyle={tooltipContentStyle} />
                                    <Bar dataKey="amountCents" fill="var(--violet)" radius={[8, 8, 0, 0]} isAnimationActive={!reduce} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartViewport>
                    </div>

                    {isOpen ? (
                        <ol className="flex flex-col gap-2 border-t border-surface-raised/70 pt-3">
                            {rows.map((row) => (
                                <li key={row.month} className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-text">{row.title}</span>
                                    <span className="tabular text-sm font-semibold text-text">{formatBrl(row.amountCents)}</span>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                </>
            )}
        </Card>
    );
}
