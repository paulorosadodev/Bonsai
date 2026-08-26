import type { Category, GeneralTag, PaymentMethod, SpecificTag } from "@/lib/domain/catalog";

export type CycleSettings = {
    closingDay: number;
    dueDay: number;
};

export type DashboardCategoryTotal = {
    category: Category;
    amountCents: number;
};

export type DashboardHistoryPoint = {
    month: string;
    amountCents: number;
};

export type DashboardData = {
    month: string;
    includeReimbursements: boolean;
    totalCents: number;
    byCategory: DashboardCategoryTotal[];
    history: DashboardHistoryPoint[];
    settings: CycleSettings;
};

export type InvoiceListItem = {
    id: string;
    transactionId: string;
    name: string;
    category: Category;
    specificTag: SpecificTag | null;
    generalTags: GeneralTag[];
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
    category: Category;
    generalTags: GeneralTag[];
    specificTag: SpecificTag | null;
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
    category: Category;
    generalTags: GeneralTag[];
    specificTag: SpecificTag | null;
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
    category: Category;
    generalTags: GeneralTag[];
    specificTag: SpecificTag | null;
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
