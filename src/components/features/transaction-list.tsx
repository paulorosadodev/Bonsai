import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { categoryLabels, generalTagLabels, paymentMethodLabels, specificTagLabels } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import type { TransactionListItem } from "@/lib/data/types";
import { formatCivilDate } from "./params";
import { categoryVisuals, generalTagVisuals, paymentVisuals, recurringVisual, specificTagVisual } from "./transaction-visuals";
import { VisualBadge } from "@/components/ui/visual-badge";

function paymentLabel(item: TransactionListItem) {
    if (item.paymentMethod === "pix") {
        return paymentMethodLabels.pix;
    }

    return item.installmentCount > 1 ? `${paymentMethodLabels.credit} ${item.installmentCount}x` : `${paymentMethodLabels.credit} à vista`;
}

export function TransactionList({ items }: { items: TransactionListItem[] }) {
    return (
        <ul className="flex flex-col gap-3">
            {items.map((item) => (
                <li key={item.key}>
                    <Link href={item.editHref} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-1">
                                <p className="font-medium text-text">{item.name}</p>
                                <p className="text-sm text-muted tabular">{formatCivilDate(item.purchaseDate)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <p className="tabular text-text">{formatBrl(item.amountCents)}</p>
                                <ChevronRight className="size-4 text-muted" aria-hidden />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <VisualBadge visual={paymentVisuals[item.paymentMethod]}>{paymentLabel(item)}</VisualBadge>
                            <VisualBadge visual={categoryVisuals[item.category]}>{categoryLabels[item.category]}</VisualBadge>
                            {item.specificTag ? <VisualBadge visual={specificTagVisual(item.specificTag)}>{specificTagLabels[item.specificTag]}</VisualBadge> : null}
                            {item.isRecurring ? <VisualBadge visual={recurringVisual}>Recorrente</VisualBadge> : null}
                        </div>
                        {item.generalTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {item.generalTags.map((tag) => (
                                    <VisualBadge key={tag} visual={generalTagVisuals[tag]}>
                                        {generalTagLabels[tag]}
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
