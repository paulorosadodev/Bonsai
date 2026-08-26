import { categoryLabels, generalTagLabels, specificTagLabels } from "@/lib/domain/catalog";
import { formatBrl } from "@/lib/domain/money";
import { Card } from "@/components/ui/card";
import { VisualBadge } from "@/components/ui/visual-badge";
import type { InvoiceListItem } from "@/lib/data/types";
import { formatCivilDate } from "./params";
import { categoryVisuals, generalTagVisuals, recurringVisual, specificTagVisual } from "./transaction-visuals";

function groupEntries(entries: InvoiceListItem[]) {
    const byDate = new Map<string, Map<InvoiceListItem["category"], InvoiceListItem[]>>();

    for (const entry of [...entries].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate) || a.name.localeCompare(b.name))) {
        const categories = byDate.get(entry.purchaseDate) ?? new Map();
        const bucket = categories.get(entry.category) ?? [];
        bucket.push(entry);
        categories.set(entry.category, bucket);
        byDate.set(entry.purchaseDate, categories);
    }

    return [...byDate.entries()];
}

export function InvoiceEntries({ entries }: { entries: InvoiceListItem[] }) {
    return (
        <div className="flex flex-col gap-4">
            {groupEntries(entries).map(([date, categories]) => (
                <section key={date} className="flex flex-col gap-2">
                    <h2 className="text-sm font-medium text-muted tabular">{formatCivilDate(date)}</h2>
                    {[...categories.entries()].map(([category, lines]) => (
                        <div key={category} className="flex flex-col gap-2">
                            <div>
                                <VisualBadge visual={categoryVisuals[category]}>{categoryLabels[category]}</VisualBadge>
                            </div>
                            {lines.map((line) => (
                                <Card key={line.id} className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 flex-col gap-1">
                                            <p className="font-medium text-text">{line.name}</p>
                                            <p className="text-sm text-muted">{line.installmentCount > 1 ? `Parcela ${line.installmentNumber}/${line.installmentCount}` : "À vista"}</p>
                                            {line.isRecurring ? <VisualBadge visual={recurringVisual}>Recorrente</VisualBadge> : null}
                                        </div>
                                        <p className="tabular text-text">{formatBrl(line.amountCents)}</p>
                                    </div>
                                    {line.specificTag ? (
                                        <div>
                                            <VisualBadge visual={specificTagVisual(line.specificTag)}>{specificTagLabels[line.specificTag]}</VisualBadge>
                                        </div>
                                    ) : null}
                                    {line.generalTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {line.generalTags.map((tag) => (
                                                <VisualBadge key={tag} visual={generalTagVisuals[tag]}>
                                                    {generalTagLabels[tag]}
                                                </VisualBadge>
                                            ))}
                                        </div>
                                    ) : null}
                                </Card>
                            ))}
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
}
