import { getInvoice } from "@/lib/data/invoice";
import { CycleStrip } from "@/components/ui/cycle-strip";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedAmount } from "@/components/features/animated-amount";
import { InvoiceEntries } from "@/components/features/invoice-entries";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { currentCivilDate, formatCivilDate, parseIncludeReimbursements, parseMonthParam, searchHref } from "@/components/features/params";

export default async function InvoicePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const month = parseMonthParam(params);
    const includeReimbursements = parseIncludeReimbursements(params);
    const invoice = await getInvoice({ month, includeReimbursements });

    return (
        <div className="flex flex-col gap-4">
            <CycleStrip closingDay={invoice.settings.closingDay} dueDay={invoice.settings.dueDay} today={currentCivilDate()} />
            <MonthSwitcher month={month} hrefFor={(next) => searchHref("/invoice", { month: next, includeReimbursements })} />
            <Card className="flex flex-col gap-3">
                <p className="text-sm font-medium text-muted">Total da Fatura</p>
                <AnimatedAmount cents={invoice.totalCents} />
                <p className="text-sm text-muted">Vence em {formatCivilDate(invoice.invoiceDueDate)}</p>
            </Card>
            {invoice.entries.length === 0 ? <EmptyState title="Nenhuma parcela nesta fatura" description="Compras no cartão aparecem aqui, agrupadas pelo vencimento." /> : <InvoiceEntries entries={invoice.entries} />}
        </div>
    );
}
