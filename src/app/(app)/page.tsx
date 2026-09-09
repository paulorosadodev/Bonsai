import { getDashboard, getAnnualDashboard } from "@/lib/data/dashboard";
import { getCategories } from "@/lib/data/categories";
import { getGeneralTags, getSpecificTags } from "@/lib/data/tags";
import { formatBrl } from "@/lib/domain/money";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedAmount } from "@/components/features/animated-amount";
import { MonthComparison } from "@/components/features/month-comparison";
import { CategoryChart, HistoryChart } from "@/components/features/dashboard-charts";
import { AnnualCategoryChart, AnnualHistoryChart, AnnualLineChart } from "@/components/features/annual-charts";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { YearSwitcher } from "@/components/features/year-switcher";
import { ViewModeToggle } from "@/components/features/view-mode-toggle";
import { parseDashboardListParams } from "@/components/features/params";
import { DashboardEntriesSection } from "@/components/features/dashboard-entries-section";
import { BudgetBar, DashboardKpisSection } from "@/components/features/dashboard-kpis";

export default async function ResumoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const filters = parseDashboardListParams(params);
    const isAnnual = filters.view === "annual";

    if (isAnnual) {
        const [categories, generalTags, specificTags, annualData] = await Promise.all([getCategories(), getGeneralTags(), getSpecificTags(), getAnnualDashboard(filters)]);
        const yearEmpty = annualData.totalCents === 0 && annualData.byCategory.every((item) => item.amountCents === 0);

        return (
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-x-6 lg:gap-y-4 lg:items-start">
                <div className="flex flex-col gap-4 lg:col-span-2">
                    <ViewModeToggle view="annual" currentYearValue={annualData.year} />
                    <YearSwitcher year={annualData.year} />
                </div>
                <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
                    <Card className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-muted">Gasto Anual ({annualData.year})</p>
                            <MonthComparison currentCents={annualData.totalCents} previousCents={annualData.previousYearTotalCents} periodTitle="ano anterior" />
                        </div>
                        <AnimatedAmount cents={annualData.totalCents} />
                        <div className="flex items-center justify-between border-t border-surface-raised/70 pt-2 text-xs text-muted">
                            <span>Média mensal</span>
                            <span className="tabular font-semibold text-text">{formatBrl(annualData.monthlyAverageCents)}/mês</span>
                        </div>
                        <BudgetBar budget={annualData.kpis.budget} periodKind="year" />
                    </Card>
                    {yearEmpty ? (
                        <EmptyState title="Ainda não há gastos neste ano" description="Quando as transações existirem, o resumo anual aparece aqui." />
                    ) : (
                        <>
                            <AnnualLineChart items={annualData.monthlyPoints} year={annualData.year} />
                            <AnnualCategoryChart items={annualData.byCategory} selectedCategoryId={filters.category} totalYearCents={annualData.totalCents} />
                            <AnnualHistoryChart items={annualData.annualHistory} selectedYear={annualData.year} />
                        </>
                    )}
                </div>
                <DashboardKpisSection kpis={annualData.kpis} periodKind="year" specificTags={specificTags} className="lg:col-start-2 lg:row-start-2 lg:row-span-2" />
                <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-3">
                    <DashboardEntriesSection entries={annualData.entries} totalCents={annualData.totalCents} filteredTotalCents={annualData.filteredTotalCents} filters={filters} categories={categories} generalTags={generalTags} specificTags={specificTags} periodKind="year" />
                </div>
            </div>
        );
    }

    const [categories, generalTags, specificTags, dashboard] = await Promise.all([getCategories(), getGeneralTags(), getSpecificTags(), getDashboard(filters)]);
    const monthEmpty = dashboard.totalCents === 0 && dashboard.byCategory.every((item) => item.amountCents === 0);
    const hasHistory = dashboard.history.some((item) => item.amountCents > 0);

    return (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-x-6 lg:gap-y-4 lg:items-start">
            <div className="flex flex-col gap-4 lg:col-span-2">
                <ViewModeToggle view="monthly" currentYearValue={filters.year} />
                <MonthSwitcher month={filters.month} />
            </div>
            <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
                <Card className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-muted">Gasto Pessoal</p>
                        <MonthComparison currentCents={dashboard.totalCents} previousCents={dashboard.previousMonthTotalCents} />
                    </div>
                    <AnimatedAmount cents={dashboard.totalCents} />
                    <BudgetBar budget={dashboard.kpis.budget} periodKind="month" />
                </Card>
                {monthEmpty ? <EmptyState title="Ainda não há gastos neste mês" description="Quando as transações existirem, o resumo aparece aqui." /> : <CategoryChart items={dashboard.byCategory} selectedCategoryId={filters.category} />}
                {hasHistory ? <HistoryChart items={dashboard.history} /> : null}
            </div>
            <DashboardKpisSection kpis={dashboard.kpis} periodKind="month" specificTags={specificTags} className="lg:col-start-2 lg:row-start-2 lg:row-span-2" />
            <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-3">
                <DashboardEntriesSection entries={dashboard.entries} totalCents={dashboard.totalCents} filteredTotalCents={dashboard.filteredTotalCents} filters={filters} categories={categories} generalTags={generalTags} specificTags={specificTags} periodKind="month" />
            </div>
        </div>
    );
}
