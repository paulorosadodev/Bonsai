import { getDashboard } from "@/lib/data/dashboard";
import { getCategories } from "@/lib/data/categories";
import { getGeneralTags, getSpecificTags } from "@/lib/data/tags";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedAmount } from "@/components/features/animated-amount";
import { MonthComparison } from "@/components/features/month-comparison";
import { CategoryChart, HistoryChart } from "@/components/features/dashboard-charts";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { parseDashboardListParams } from "@/components/features/params";
import { DashboardEntriesSection } from "@/components/features/dashboard-entries-section";

export default async function ResumoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const filters = parseDashboardListParams(params);
    const [dashboard, categories, generalTags, specificTags] = await Promise.all([getDashboard(filters), getCategories(), getGeneralTags(), getSpecificTags()]);
    const monthEmpty = dashboard.totalCents === 0 && dashboard.byCategory.every((item) => item.amountCents === 0);
    const hasHistory = dashboard.history.some((item) => item.amountCents > 0);

    return (
        <div className="flex flex-col gap-4">
            <MonthSwitcher month={filters.month} />
            <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted">Gasto Pessoal</p>
                    <MonthComparison currentCents={dashboard.totalCents} previousCents={dashboard.previousMonthTotalCents} />
                </div>
                <AnimatedAmount cents={dashboard.totalCents} />
            </Card>
            {monthEmpty ? <EmptyState title="Ainda não há gastos neste mês" description="Quando as transações existirem, o resumo aparece aqui." /> : <CategoryChart items={dashboard.byCategory} selectedCategoryId={filters.category} />}
            {hasHistory ? <HistoryChart items={dashboard.history} /> : null}
            <DashboardEntriesSection entries={dashboard.entries} totalCents={dashboard.totalCents} filteredTotalCents={dashboard.filteredTotalCents} filters={filters} categories={categories} generalTags={generalTags} specificTags={specificTags} />
        </div>
    );
}
