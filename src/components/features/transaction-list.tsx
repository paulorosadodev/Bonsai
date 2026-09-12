"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, CreditCard, QrCode, Repeat } from "lucide-react";
import { formatBrl } from "@/lib/domain/money";
import type { TransactionListItem } from "@/lib/data/types";
import { withReturnUrl } from "@/lib/navigation/return-url";
import { recordNavigationState, useRestoreScroll } from "@/lib/navigation/scroll-restoration";
import { cn } from "@/components/ui/cn";
import { formatDateGroupHeader, formatDayMonth } from "./params";
import { getItemVisual } from "./transaction-visuals";

function TransactionRow({ item, currentUrl, showDateInMetadata = false }: { item: TransactionListItem; currentUrl: string; showDateInMetadata?: boolean }) {
    const visual = getItemVisual(item.category);
    const CategoryIcon = visual.icon;
    const categoryColor = visual.color;

    const isPix = item.paymentMethod === "pix";
    const paymentText = isPix ? "PIX" : item.installmentCount > 1 ? `Cartão ${item.installmentCount}x` : "Cartão";

    return (
        <Link id={`tx-${item.key}`} href={withReturnUrl(item.editHref, currentUrl)} onClick={() => recordNavigationState(currentUrl, item.key)} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet">
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

                {/* Center Content: Title & Refined Metadata */}
                <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-text transition-colors group-hover:text-violet">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        {showDateInMetadata ? (
                            <>
                                <span className="tabular font-medium text-text/80">{formatDayMonth(item.purchaseDate)}</span>
                                <span className="text-muted/40">•</span>
                            </>
                        ) : null}
                        <span>{item.category.name}</span>
                        {item.specificTag ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="text-muted/90">{item.specificTag.name}</span>
                            </>
                        ) : null}

                        {/* Payment method micro-indicator */}
                        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide", isPix ? "bg-mint/10 text-mint" : "bg-sky-400/10 text-sky-300")}>
                            {isPix ? <QrCode className="size-2.5" aria-hidden /> : <CreditCard className="size-2.5" aria-hidden />}
                            <span>{paymentText}</span>
                        </span>

                        {/* Recurring micro-indicator */}
                        {item.isRecurring ? (
                            <span className="inline-flex items-center gap-1 rounded bg-orchid/10 px-1.5 py-0.5 text-[10px] font-medium text-orchid" title="Despesa recorrente">
                                <Repeat className="size-2.5" aria-hidden />
                                <span>Recorrente</span>
                            </span>
                        ) : null}

                        {/* General tags (discrete inline label) */}
                        {item.generalTags.length > 0 ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="text-muted/70">{item.generalTags.map((t) => t.name).join(", ")}</span>
                            </>
                        ) : null}

                        {/* Optional description */}
                        {item.description ? (
                            <>
                                <span className="text-muted/40">•</span>
                                <span className="truncate max-w-40 text-muted/60">{item.description}</span>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Right: Amount & Action */}
            <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end">
                    {item.grossAmountCents && item.grossAmountCents > item.amountCents ? <span className="tabular text-xs text-muted/60 line-through">{formatBrl(item.grossAmountCents)}</span> : null}
                    <p className="tabular text-sm font-semibold text-text">{formatBrl(item.amountCents)}</p>
                </div>
                <ChevronRight className="size-4 text-muted/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden />
            </div>
        </Link>
    );
}

export function TransactionList({ items }: { items: TransactionListItem[] }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();
    const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

    useRestoreScroll(currentUrl);

    const sort = searchParams.get("sort");
    const isAmountSort = sort === "amount_desc" || sort === "amount_asc";

    const groups = useMemo(() => {
        if (isAmountSort) {
            return null;
        }

        const map = new Map<string, { date: string; items: TransactionListItem[]; totalCents: number }>();
        for (const item of items) {
            const existing = map.get(item.purchaseDate);
            if (existing) {
                existing.items.push(item);
                existing.totalCents += item.amountCents;
            } else {
                map.set(item.purchaseDate, {
                    date: item.purchaseDate,
                    items: [item],
                    totalCents: item.amountCents,
                });
            }
        }
        return Array.from(map.values());
    }, [items, isAmountSort]);

    if (items.length === 0) {
        return null;
    }

    if (isAmountSort || !groups) {
        return (
            <div className="overflow-hidden rounded-2xl border border-surface-raised/40 bg-surface shadow-xs">
                <div className="divide-y divide-surface-raised/40">
                    {items.map((item) => (
                        <TransactionRow key={item.key} item={item} currentUrl={currentUrl} showDateInMetadata />
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
                            {group.items.map((item) => (
                                <TransactionRow key={item.key} item={item} currentUrl={currentUrl} />
                            ))}
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
