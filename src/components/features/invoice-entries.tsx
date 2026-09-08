import { formatBrl } from "@/lib/domain/money";
import { Card } from "@/components/ui/card";
import { VisualBadge } from "@/components/ui/visual-badge";
import type { CategoryInfo, InvoiceListItem } from "@/lib/data/types";
import { formatCivilDate } from "./params";
import { getItemVisual, recurringVisual } from "./transaction-visuals";

import type { TransactionSort } from "@/lib/domain/schemas";

type CategoryGroup = {
    category: CategoryInfo;
    lines: InvoiceListItem[];
};

function groupEntries(entries: InvoiceListItem[]) {
    const byDate = new Map<string, Map<string, CategoryGroup>>();

    for (const entry of entries) {
        const categories = byDate.get(entry.purchaseDate) ?? new Map<string, CategoryGroup>();
        const group = categories.get(entry.categoryId) ?? { category: entry.category, lines: [] };
        group.lines.push(entry);
        categories.set(entry.categoryId, group);
        byDate.set(entry.purchaseDate, categories);
    }

    return [...byDate.entries()];
}

export function InvoiceEntries({ entries, sort = "date_desc" }: { entries: InvoiceListItem[]; sort?: TransactionSort }) {
    if (sort === "amount_desc" || sort === "amount_asc") {
        return (
            <div className="flex flex-col gap-3">
                {entries.map((line) => (
                    <Card key={line.id} className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-1">
                                <p className="font-medium text-text">{line.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted">
                                    <span className="tabular">{formatCivilDate(line.purchaseDate)}</span>
                                    <span>•</span>
                                    <span>{line.installmentCount > 1 ? `Parcela ${line.installmentNumber}/${line.installmentCount}` : "À vista"}</span>
                                </div>
                                {line.isRecurring ? <VisualBadge visual={recurringVisual}>Recorrente</VisualBadge> : null}
                            </div>
                            <p className="tabular text-text">{formatBrl(line.amountCents)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <VisualBadge visual={getItemVisual(line.category)}>{line.category.name}</VisualBadge>
                            {line.specificTag ? <VisualBadge visual={getItemVisual(line.specificTag)}>{line.specificTag.name}</VisualBadge> : null}
                            {line.generalTags.map((tag) => (
                                <VisualBadge key={tag.id} visual={getItemVisual(tag)}>
                                    {tag.name}
                                </VisualBadge>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-4">
            {groupEntries(entries).map(([date, categories]) => (
                <section key={date} className="flex flex-col gap-2">
                    <h2 className="text-sm font-medium text-muted tabular">{formatCivilDate(date)}</h2>
                    {[...categories.values()].map(({ category, lines }) => (
                        <div key={category.id} className="flex flex-col gap-2">
                            <div>
                                <VisualBadge visual={getItemVisual(category)}>{category.name}</VisualBadge>
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
                                            <VisualBadge visual={getItemVisual(line.specificTag)}>{line.specificTag.name}</VisualBadge>
                                        </div>
                                    ) : null}
                                    {line.generalTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {line.generalTags.map((tag) => (
                                                <VisualBadge key={tag.id} visual={getItemVisual(tag)}>
                                                    {tag.name}
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
