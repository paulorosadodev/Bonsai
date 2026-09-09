import type { PaymentMethod } from "@/lib/domain/catalog";

export type CycleSettings = {
    closingDay: number;
    dueDay: number;
    monthlyBudgetCents?: number | null;
};

export type BurnRateKpi = {
    dailyAverageCents: number;
    projectedEndCents: number;
    daysElapsed: number;
    daysRemaining: number;
    totalDays: number;
    isCurrentPeriod: boolean;
    periodKind: "month" | "year";
};

export type BudgetKpi = {
    budgetCents: number | null;
    spentCents: number;
    remainingCents: number | null;
    percentage: number | null;
    isExceeded: boolean;
    periodKind: "month" | "year";
};

export type FixedVsVariableKpi = {
    fixedCents: number;
    fixedPercentage: number;
    variableCents: number;
    variablePercentage: number;
};

export type PaymentDistributionKpi = {
    pixCents: number;
    pixPercentage: number;
    creditCents: number;
    creditPercentage: number;
    creditSingleCents: number;
    creditSinglePercentage: number;
    creditInstallmentsCents: number;
    creditInstallmentsPercentage: number;
};

export type LargestExpenseItem = {
    name: string;
    amountCents: number;
    date: string;
    categoryName: string;
    categoryColor: string;
    paymentMethod: PaymentMethod;
    badgeLabel?: string;
    editHref?: string;
};

export type LargestExpenseKpi = LargestExpenseItem | null;

export type DashboardSpecificTagTotal = {
    tagId: string;
    name: string;
    color: string;
    icon: string | null;
    amountCents: number;
    percentage: number;
};

export type DashboardTopDestination = {
    locationId: string;
    name: string;
    amountCents: number;
    count: number;
    percentage: number;
};

export type DashboardKpis = {
    burnRate: BurnRateKpi;
    budget: BudgetKpi;
    fixedVsVariable: FixedVsVariableKpi;
    paymentDistribution: PaymentDistributionKpi;
    largestExpense: LargestExpenseKpi;
    largestExpenses: LargestExpenseItem[];
    bySpecificTag: DashboardSpecificTagTotal[];
    topDestinations: DashboardTopDestination[];
};

export type CategoryInfo = {
    id: string;
    name: string;
    color: string;
    icon: string;
};

export type TagInfo = {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    categoryId?: string;
};

export type LocationInfo = {
    id: string;
    name: string;
};

export function formatTransactionName(name: string, location?: { name: string } | null): string {
    if (location?.name) {
        if (name.toLowerCase() === "uber") {
            return `Uber - ${location.name}`;
        }
        return `${name} - ${location.name}`;
    }
    return name;
}

export type DashboardCategoryTotal = {
    categoryId: string;
    name: string;
    color: string;
    icon: string;
    amountCents: number;
};

export type DashboardHistoryPoint = {
    month: string;
    amountCents: number;
};

export type DashboardSubEntry = {
    id: string;
    label: string;
    month: string;
    amountCents: number;
    isForecast?: boolean;
    editHref: string;
    paymentMethod?: PaymentMethod;
    purchaseDate?: string;
    description?: string | null;
};

export type DashboardEntryItem = {
    id: string;
    transactionId: string;
    name: string;
    description: string | null;
    amountCents: number;
    purchaseDate: string;
    competenceDate: string;
    paymentMethod: PaymentMethod;
    installmentNumber: number;
    installmentCount: number;
    categoryId: string;
    category: CategoryInfo;
    specificTagId: string | null;
    specificTag: TagInfo | null;
    generalTagIds: string[];
    generalTags: TagInfo[];
    locationId?: string | null;
    location?: LocationInfo | null;
    isRecurring: boolean;
    isForecast: boolean;
    editHref: string;
    subEntries?: DashboardSubEntry[];
    consolidatedBadge?: string;
    dateRangeLabel?: string;
    isMixedPayment?: boolean;
};

export type DashboardData = {
    month: string;
    includeReimbursements: boolean;
    totalCents: number;
    previousMonthTotalCents: number;
    filteredTotalCents: number;
    entries: DashboardEntryItem[];
    byCategory: DashboardCategoryTotal[];
    history: DashboardHistoryPoint[];
    settings: CycleSettings;
    kpis: DashboardKpis;
};

export type AnnualMonthPoint = {
    month: string;
    monthIndex: number;
    label: string;
    fullLabel: string;
    realAmountCents: number;
    forecastAmountCents: number;
    totalAmountCents: number;
    isFuture: boolean;
    prevYearAmountCents: number;
};

export type AnnualYearPoint = {
    year: number;
    amountCents: number;
    isCurrentYear: boolean;
    hasForecast: boolean;
};

export type AnnualDashboardData = {
    year: number;
    includeReimbursements: boolean;
    totalCents: number;
    previousYearTotalCents: number;
    monthlyAverageCents: number;
    filteredTotalCents: number;
    entries: DashboardEntryItem[];
    byCategory: DashboardCategoryTotal[];
    monthlyPoints: AnnualMonthPoint[];
    annualHistory: AnnualYearPoint[];
    settings: CycleSettings;
    kpis: DashboardKpis;
};

export type InvoiceListItem = {
    id: string;
    transactionId: string;
    name: string;
    categoryId: string;
    category: CategoryInfo;
    specificTagId: string | null;
    specificTag: TagInfo | null;
    generalTagIds: string[];
    generalTags: TagInfo[];
    locationId?: string | null;
    location?: LocationInfo | null;
    installmentNumber: number;
    installmentCount: number;
    amountCents: number;
    competenceDate: string;
    invoiceDueDate: string;
    purchaseDate: string;
    isRecurring: boolean;
    isForecast: boolean;
};

export type InvoiceData = {
    month: string;
    invoiceDueDate: string;
    totalCents: number;
    previousMonthTotalCents: number;
    filteredTotalCents: number;
    entries: InvoiceListItem[];
    settings: CycleSettings;
    history: DashboardHistoryPoint[];
};

export type TransactionRecord = {
    id: string;
    name: string;
    description: string | null;
    amountCents: number;
    purchaseDate: string;
    paymentMethod: PaymentMethod;
    installmentCount: number;
    categoryId: string;
    category: CategoryInfo;
    generalTagIds: string[];
    generalTags: TagInfo[];
    specificTagId: string | null;
    specificTag: TagInfo | null;
    locationId?: string | null;
    location?: LocationInfo | null;
    createdAt: string;
    updatedAt: string;
};

export type TransactionListItem = {
    key: string;
    name: string;
    description: string | null;
    amountCents: number;
    purchaseDate: string;
    paymentMethod: PaymentMethod;
    installmentCount: number;
    categoryId: string;
    category: CategoryInfo;
    generalTagIds: string[];
    generalTags: TagInfo[];
    specificTagId: string | null;
    specificTag: TagInfo | null;
    locationId?: string | null;
    location?: LocationInfo | null;
    isRecurring: boolean;
    isForecast: boolean;
    editHref: string;
    deleteKind: "transaction" | "recurrence";
    deleteId: string;
    occurrenceDate?: string;
};

export type RecurringOccurrenceDetail = {
    seriesId: string;
    occurrenceDate: string;
    startsOn: string;
    endsBefore: string | null;
    monthlyDay: number;
    effectFrom: string;
    name: string;
    description: string | null;
    amountCents: number;
    paymentMethod: PaymentMethod;
    categoryId: string;
    category: CategoryInfo;
    generalTagIds: string[];
    generalTags: TagInfo[];
    specificTagId: string | null;
    specificTag: TagInfo | null;
    isForecast: boolean;
};

export type TransactionListData = {
    items: TransactionListItem[];
};

export type TransactionEntryRecord = {
    id: string;
    transactionId: string;
    installmentNumber: number;
    installmentCount: number;
    amountCents: number;
    competenceDate: string;
    invoiceDueDate: string | null;
};

export type TransactionDetail = TransactionRecord & {
    entries: TransactionEntryRecord[];
};
