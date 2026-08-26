import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import { requireUser } from "@/lib/supabase/server";
import { hasReimbursement } from "./entries";
import { currentMonth, monthEnd, monthStart } from "./month";
import { earliestSeriesStart, loadRecurrenceState, projectLoadedRecurrences } from "./recurrences";
import { getSettings } from "./settings";
import type { Category } from "@/lib/domain/catalog";
import type { DashboardData } from "./types";

type EntryRow = {
    amount_cents: number;
    competence_date: string;
    transactions: {
        category: Category;
        general_tags: string[];
    } | null;
};

type DashboardLine = {
    amountCents: number;
    competenceDate: string;
    category: Category | undefined;
    generalTags: string[];
    isForecast: boolean;
};

export async function getDashboard(params: { month?: string; includeReimbursements?: boolean } = {}): Promise<DashboardData> {
    const parsed = transactionFiltersSchema.pick({ month: true, includeReimbursements: true }).parse({
        ...(params.month ? { month: params.month } : {}),
        ...(params.includeReimbursements !== undefined ? { includeReimbursements: params.includeReimbursements } : {}),
    });
    const month = parsed.month ?? currentMonth();
    const includeReimbursements = parsed.includeReimbursements;
    const competence = monthStart(month);
    const today = toSaoPauloCivilDate(new Date());
    const { supabase } = await requireUser();

    const [settings, entriesResult, recurrence] = await Promise.all([getSettings(), supabase.from("transaction_entries").select("amount_cents, competence_date, transactions!inner(category, general_tags)").order("competence_date", { ascending: true }), loadRecurrenceState()]);

    if (entriesResult.error) {
        throw new Error("Não foi possível carregar o resumo");
    }

    const origin = earliestSeriesStart(recurrence) ?? competence;
    const projected = projectLoadedRecurrences(recurrence, origin, monthEnd(month), today, settings);
    const lines: DashboardLine[] = [
        ...(entriesResult.data as EntryRow[]).map((row) => ({
            amountCents: row.amount_cents,
            competenceDate: row.competence_date,
            category: row.transactions?.category,
            generalTags: row.transactions?.general_tags ?? [],
            isForecast: false,
        })),
        ...projected.map((occurrence) => ({
            amountCents: occurrence.entry.amountCents,
            competenceDate: occurrence.entry.competenceDate,
            category: occurrence.category,
            generalTags: occurrence.generalTags,
            isForecast: occurrence.isForecast,
        })),
    ].filter((line) => includeReimbursements || !hasReimbursement(line.generalTags));

    const monthRows = lines.filter((line) => line.competenceDate === competence);
    const byCategoryMap = new Map<Category, number>();
    const historyMap = new Map<string, number>();

    for (const row of monthRows) {
        if (!row.category) {
            continue;
        }

        byCategoryMap.set(row.category, (byCategoryMap.get(row.category) ?? 0) + row.amountCents);
    }

    for (const row of lines) {
        if (row.isForecast && row.competenceDate > competence) {
            continue;
        }

        const key = row.competenceDate.slice(0, 7);
        historyMap.set(key, (historyMap.get(key) ?? 0) + row.amountCents);
    }

    return {
        month,
        includeReimbursements,
        totalCents: monthRows.reduce((sum, row) => sum + row.amountCents, 0),
        byCategory: [...byCategoryMap.entries()].map(([category, amountCents]) => ({ category, amountCents })).sort((a, b) => b.amountCents - a.amountCents),
        history: [...historyMap.entries()]
            .map(([historyMonth, amountCents]) => ({ month: historyMonth, amountCents }))
            .filter((item) => item.month <= month)
            .sort((a, b) => a.month.localeCompare(b.month)),
        settings,
    };
}
