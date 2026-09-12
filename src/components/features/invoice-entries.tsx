"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, CreditCard, Repeat } from "lucide-react";
import { formatBrl } from "@/lib/domain/money";
import type { InvoiceListItem } from "@/lib/data/types";
import { occurrenceEditHref } from "@/lib/domain/recurrence";
import type { CivilDate } from "@/lib/domain/billing-cycle";
import { withReturnUrl } from "@/lib/navigation/return-url";
import { recordNavigationState, useRestoreScroll } from "@/lib/navigation/scroll-restoration";
import { formatDateGroupHeader, formatDayMonth } from "./params";
import { getItemVisual } from "./transaction-visuals";
import type { TransactionSort } from "@/lib/domain/schemas";

function InvoiceRow({ line, currentUrl, showDateInMetadata = false }: { line: InvoiceListItem; currentUrl: string; showDateInMetadata?: boolean }) {
    const visual = getItemVisual(line.category);
    const CategoryIcon = visual.icon;
    const categoryColor = visual.color;

    const installmentText = line.installmentCount > 1 ? `Parcela ${line.installmentNumber}/${line.installmentCount}` : "À vista";

    const editHref = line.isRecurring ? occurrenceEditHref(line.transactionId, line.purchaseDate as CivilDate) : `/transacoes/${line.transactionId}/editar`;

    return (
        <Link id={`inv-${line.id}`} href={withReturnUrl(editHref, currentUrl)} onClick={() => recordNavigationState(currentUrl, line.id)} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet">
            <div className="flex min-w-0 items-center gap-3">
                {/* Left Anchor: Category Avatar */}
                <div
                    className="relative flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${categoryColor} 14%, var(--surface-raised))`,
                        color: categoryColor,
                        border: `1px solid color-mix(in srgb, ${categoryColor} 25%, transparent)`,
                    }}
                >
                    <CategoryIcon className="size-5" aria-hidden />
                </div>

                {/* Center Content */}
                <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-text transition-colors group-hover:text-violet">{line.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        {showDateInMetadata ? (
                            <>
                                <span className="tabular font-medium text-text/80">{formatDayMonth(line.purchaseDate)}</span>
                                <span className="text-muted/40">•</span>
                            </>
                        ) : null}
                        <span>{line.category.name}</span>
                        {line.specificTag ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="text-muted/90">{line.specificTag.name}</span>
                            </>
                        ) : null}

                        {/* Installment micro-indicator */}
                        <span className="inline-flex items-center gap-1 rounded bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 tracking-wide">
                            <CreditCard className="size-2.5" aria-hidden />
                            <span>{installmentText}</span>
                        </span>

                        {/* Recurring micro-indicator */}
                        {line.isRecurring ? (
                            <span className="inline-flex items-center gap-1 rounded bg-orchid/10 px-1.5 py-0.5 text-[10px] font-medium text-orchid" title="Despesa recorrente">
                                <Repeat className="size-2.5" aria-hidden />
                                <span>Recorrente</span>
                            </span>
                        ) : null}

                        {/* General tags */}
                        {line.generalTags.length > 0 ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="text-muted/70">{line.generalTags.map((t) => t.name).join(", ")}</span>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Right: Amount & Action */}
            <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end">
                    {line.grossAmountCents && line.grossAmountCents > line.amountCents ? <span className="tabular text-xs text-muted/60 line-through">{formatBrl(line.grossAmountCents)}</span> : null}
                    <p className="tabular text-sm font-semibold text-text">{formatBrl(line.amountCents)}</p>
                </div>
                <ChevronRight className="size-4 text-muted/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden />
            </div>
        </Link>
    );
}

export function InvoiceEntries({ entries, sort = "date_desc" }: { entries: InvoiceListItem[]; sort?: TransactionSort }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();
    const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

    useRestoreScroll(currentUrl);

    const isAmountSort = sort === "amount_desc" || sort === "amount_asc";

    const groups = useMemo(() => {
        if (isAmountSort) {
            return null;
        }

        const map = new Map<string, { date: string; lines: InvoiceListItem[]; totalCents: number }>();
        for (const line of entries) {
            const existing = map.get(line.purchaseDate);
            if (existing) {
                existing.lines.push(line);
                existing.totalCents += line.amountCents;
            } else {
                map.set(line.purchaseDate, {
                    date: line.purchaseDate,
                    lines: [line],
                    totalCents: line.amountCents,
                });
            }
        }
        return Array.from(map.values());
    }, [entries, isAmountSort]);

    if (entries.length === 0) {
        return null;
    }

    if (isAmountSort || !groups) {
        return (
            <div className="overflow-hidden rounded-2xl border border-surface-raised/40 bg-surface shadow-xs">
                <div className="divide-y divide-surface-raised/40">
                    {entries.map((line) => (
                        <InvoiceRow key={line.id} line={line} currentUrl={currentUrl} showDateInMetadata />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {groups.map((group) => (
                <section key={group.date} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-1 text-xs font-semibold tracking-wide uppercase text-muted">
                        <span>{formatDateGroupHeader(group.date)}</span>
                        <span className="tabular font-normal text-muted/80">{formatBrl(group.totalCents)}</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-surface-raised/40 bg-surface shadow-xs">
                        <div className="divide-y divide-surface-raised/40">
                            {group.lines.map((line) => (
                                <InvoiceRow key={line.id} line={line} currentUrl={currentUrl} />
                            ))}
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
