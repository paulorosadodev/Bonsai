import { getDashboard } from "@/lib/data/dashboard";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedAmount } from "@/components/features/animated-amount";
import { CategoryChart, HistoryChart } from "@/components/features/dashboard-charts";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { parseIncludeReimbursements, parseMonthParam, searchHref } from "@/components/features/params";

export default async function ResumoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const month = parseMonthParam(params);
    const includeReimbursements = parseIncludeReimbursements(params);
    const dashboard = await getDashboard({ month, includeReimbursements });
    const monthEmpty = dashboard.totalCents === 0 && dashboard.byCategory.every((item) => item.amountCents === 0);
    const hasHistory = dashboard.history.some((item) => item.amountCents > 0);

    return (
        <div className="flex flex-col gap-4">
            <MonthSwitcher month={month} hrefFor={(next) => searchHref("/", { month: next, includeReimbursements })} />
            <Card className="flex flex-col gap-3">
                <p className="text-sm font-medium text-muted">Gasto Pessoal</p>
                <AnimatedAmount cents={dashboard.totalCents} />
            </Card>
            {monthEmpty ? (
                <EmptyState title="Ainda não há gastos neste mês" description="Quando as transações existirem, o resumo aparece aqui." />
            ) : (
                <Card className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold">Por Categoria</h2>
                    <CategoryChart items={dashboard.byCategory} />
                </Card>
            )}
            {hasHistory ? (
                <Card>
                    <HistoryChart items={dashboard.history} />
                </Card>
            ) : null}
        </div>
    );
}
