import { getInvoice } from "@/lib/data/invoice";
import { getCategories } from "@/lib/data/categories";
import { getGeneralTags, getSpecificTags } from "@/lib/data/tags";
import { CycleStrip } from "@/components/ui/cycle-strip";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedAmount } from "@/components/features/animated-amount";
import { MonthComparison } from "@/components/features/month-comparison";
import { InvoiceEntries } from "@/components/features/invoice-entries";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { TransactionFilters } from "@/components/features/transaction-filters";
import { currentCivilDate, formatCivilDate, parseInvoiceListParams } from "@/components/features/params";
import { formatBrl } from "@/lib/domain/money";

export default async function InvoicePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const filters = parseInvoiceListParams(params);
    const [invoice, categories, generalTags, specificTags] = await Promise.all([
        getInvoice(filters),
        getCategories(),
        getGeneralTags(),
        getSpecificTags(),
    ]);

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.category ||
        filters.generalTag ||
        filters.specificTag ||
        (filters.sort && filters.sort !== "date_desc")
    );

    return (
        <div className="flex flex-col gap-4">
            <CycleStrip month={invoice.month} closingDay={invoice.settings.closingDay} dueDay={invoice.settings.dueDay} today={currentCivilDate()} />
            <MonthSwitcher month={filters.month} />
            <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted">Total da Fatura</p>
                    <MonthComparison currentCents={invoice.totalCents} previousCents={invoice.previousMonthTotalCents} />
                </div>
                <AnimatedAmount cents={invoice.totalCents} />
                <p className="text-sm text-muted">Vence em {formatCivilDate(invoice.invoiceDueDate)}</p>
            </Card>
            <TransactionFilters
                values={filters}
                categories={categories}
                generalTags={generalTags}
                specificTags={specificTags}
                showPaymentMethod={false}
                searchPlaceholder="Buscar na fatura..."
            />
            {hasActiveFilters && invoice.entries.length > 0 ? (
                <div className="flex items-center justify-between px-1 text-xs text-muted">
                    <span>
                        {invoice.entries.length} {invoice.entries.length === 1 ? "parcela encontrada" : "parcelas encontradas"}
                    </span>
                    <span className="font-medium text-text">
                        Total filtrado: {formatBrl(invoice.filteredTotalCents)}
                    </span>
                </div>
            ) : null}
            {invoice.entries.length === 0 ? (
                <EmptyState
                    title={hasActiveFilters ? "Nenhuma parcela neste filtro" : "Nenhuma parcela nesta fatura"}
                    description={hasActiveFilters ? "Tente ajustar ou limpar os filtros para ver outras parcelas." : "Compras no cartão aparecem aqui, agrupadas pelo vencimento."}
                />
            ) : (
                <InvoiceEntries entries={invoice.entries} sort={filters.sort} />
            )}
        </div>
    );
}

