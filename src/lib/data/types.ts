import type { PaymentMethod } from "@/lib/domain/catalog";

export type CycleSettings = {
    closingDay: number;
    dueDay: number;
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
    isRecurring: boolean;
    isForecast: boolean;
    editHref: string;
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
