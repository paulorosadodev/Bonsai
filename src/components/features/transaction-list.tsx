"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { paymentMethodLabels } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import type { TransactionListItem } from "@/lib/data/types";
import { withReturnUrl } from "@/lib/navigation/return-url";
import { recordNavigationState, useRestoreScroll } from "@/lib/navigation/scroll-restoration";
import { formatCivilDate } from "./params";
import { getItemVisual, paymentVisuals, recurringVisual } from "./transaction-visuals";
import { VisualBadge } from "@/components/ui/visual-badge";

function paymentLabel(item: TransactionListItem) {
    if (item.paymentMethod === "pix") {
        return paymentMethodLabels.pix;
    }

    return item.installmentCount > 1 ? `${paymentMethodLabels.credit} ${item.installmentCount}x` : `${paymentMethodLabels.credit} à vista`;
}

export function TransactionList({ items }: { items: TransactionListItem[] }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();
    const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

    useRestoreScroll(currentUrl);

    return (
        <ul className="flex flex-col gap-3">
            {items.map((item) => (
                <li key={item.key}>
                    <Link id={`tx-${item.key}`} href={withReturnUrl(item.editHref, currentUrl)} onClick={() => recordNavigationState(currentUrl, item.key)} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-1">
                                <p className="font-medium text-text">{item.name}</p>
                                <p className="text-sm text-muted tabular">{formatCivilDate(item.purchaseDate)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                {item.grossAmountCents && item.grossAmountCents > item.amountCents ? (
                                    <span className="tabular text-xs text-muted/60 line-through">{formatBrl(item.grossAmountCents)}</span>
                                ) : null}
                                <p className="tabular text-text">{formatBrl(item.amountCents)}</p>
                                <ChevronRight className="size-4 text-muted" aria-hidden />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <VisualBadge visual={paymentVisuals[item.paymentMethod]}>{paymentLabel(item)}</VisualBadge>
                            <VisualBadge visual={getItemVisual(item.category)}>{item.category.name}</VisualBadge>
                            {item.specificTag ? <VisualBadge visual={getItemVisual(item.specificTag)}>{item.specificTag.name}</VisualBadge> : null}
                            {item.isRecurring ? <VisualBadge visual={recurringVisual}>Recorrente</VisualBadge> : null}
                        </div>
                        {item.generalTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {item.generalTags.map((tag) => (
                                    <VisualBadge key={tag.id} visual={getItemVisual(tag)}>
                                        {tag.name}
                                    </VisualBadge>
                                ))}
                            </div>
                        ) : null}
                    </Link>
                </li>
            ))}
        </ul>
    );
}
