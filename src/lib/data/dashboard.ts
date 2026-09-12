import type { z } from "zod";
import type { PaymentMethod } from "@/lib/domain/catalog";
import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import { occurrenceEditHref, occurrenceKey } from "@/lib/domain/recurrence";
import { requireUser } from "@/lib/supabase/server";
import { getUserCategoriesMap } from "./categories";
import { getUserGeneralTagsMap, getUserSpecificTagsMap } from "./tags";
import { getUserLocationsMap } from "./locations";
import { hasReimbursement } from "./entries";
import { currentMonth, monthEnd, monthStart, shiftCalendarMonth } from "./month";
import { earliestSeriesStart, loadRecurrenceStateFrom, projectLoadedRecurrences } from "./recurrences";
import { getSettings, getEffectiveMonthlyBudget, getAnnualMonthlyBudgets } from "./settings";
import { formatTransactionName, type AnnualDashboardData, type AnnualMonthPoint, type AnnualYearPoint, type BudgetKpi, type BurnRateKpi, type DashboardCategoryTotal, type DashboardData, type DashboardEntryItem, type DashboardKpis, type DashboardSpecificTagTotal, type DashboardSubEntry, type DashboardTopDestination, type FixedVsVariableKpi, type LargestExpenseItem, type LargestExpenseKpi, type PaymentDistributionKpi, type TagInfo } from "./types";

function normalizeSearchText(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizeNameForGrouping(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function formatCivilDateDisplay(value: string) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

type EntryRow = {
    amount_cents: number;
    competence_date: string;
    transactions: {
        category_id: string;
        general_tag_ids: string[];
        reimbursed_amount_cents: number | null;
    } | null;
};

type DetailedEntryRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    competence_date: string;
    invoice_due_date: string | null;
    transactions: {
        id: string;
        name: string;
        description: string | null;
        category_id: string;
        specific_tag_id: string | null;
        general_tag_ids: string[];
        location_id: string | null;
        purchase_date: string;
        payment_method: PaymentMethod;
        reimbursed_amount_cents: number | null;
    } | null;
};

type DashboardLine = {
    amountCents: number;
    competenceDate: string;
    categoryId: string | undefined;
    generalTagIds: string[];
    isForecast: boolean;
};

export async function getDashboard(params: z.input<typeof transactionFiltersSchema> = {}): Promise<DashboardData> {
    const parsed = transactionFiltersSchema.parse(params);
    const month = parsed.month ?? currentMonth();
    const prevMonth = shiftCalendarMonth(month, -1);
    const includeReimbursements = parsed.includeReimbursements;
    const competence = monthStart(month);
    const prevCompetence = monthStart(prevMonth);
    const today = toSaoPauloCivilDate(new Date());
    const { supabase, user } = await requireUser();

    const [settings, budgetCents, entriesResult, detailedEntriesResult, recurrence, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([
        getSettings(),
        getEffectiveMonthlyBudget(supabase, user.id, month),
        supabase
            .from("transaction_entries")
            .select("amount_cents, competence_date, transactions!inner(category_id, general_tag_ids, reimbursed_amount_cents)")
            .gte("competence_date", monthStart(shiftCalendarMonth(month, -36)))
            .lte("competence_date", monthEnd(month))
            .order("competence_date", { ascending: true }),
        supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date, transactions!inner(id, name, description, category_id, specific_tag_id, general_tag_ids, location_id, purchase_date, payment_method, reimbursed_amount_cents)").eq("competence_date", competence).order("competence_date", { ascending: false }),
        loadRecurrenceStateFrom(supabase),
        getUserCategoriesMap(supabase, user.id),
        getUserGeneralTagsMap(supabase, user.id),
        getUserSpecificTagsMap(supabase, user.id),
        getUserLocationsMap(supabase, user.id),
    ]);

    if (entriesResult.error || detailedEntriesResult.error) {
        console.error("Dashboard error loading entries:", entriesResult.error ?? detailedEntriesResult.error);
        throw new Error("Não foi possível carregar o resumo");
    }

    const origin = earliestSeriesStart(recurrence) ?? prevCompetence;
    const projected = projectLoadedRecurrences(recurrence, origin, monthEnd(month), today, settings);

    const lines: DashboardLine[] = [
        ...(entriesResult.data as EntryRow[]).flatMap((row) => {
            const tx = row.transactions;
            const reimbursedCents = tx?.reimbursed_amount_cents;
            const tags = (tx?.general_tag_ids ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            const isReimbursed = hasReimbursement(tags as Array<{ name?: string }>);

            if (!includeReimbursements) {
                if (isReimbursed && (!reimbursedCents || reimbursedCents <= 0)) {
                    return [];
                }
            }

            const effectiveAmountCents = (!includeReimbursements && reimbursedCents && reimbursedCents > 0)
                ? Math.max(0, row.amount_cents - reimbursedCents)
                : row.amount_cents;

            return [{
                amountCents: effectiveAmountCents,
                competenceDate: row.competence_date,
                categoryId: tx?.category_id,
                generalTagIds: tx?.general_tag_ids ?? [],
                isForecast: false,
            }];
        }),
        ...projected
            .filter((occurrence) => {
                if (includeReimbursements) return true;
                const tags = (occurrence.generalTagIds ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
                return !hasReimbursement(tags as Array<{ name?: string }>);
            })
            .map((occurrence) => ({
                amountCents: occurrence.entry.amountCents,
                competenceDate: occurrence.entry.competenceDate,
                categoryId: occurrence.categoryId,
                generalTagIds: occurrence.generalTagIds ?? [],
                isForecast: occurrence.isForecast,
            })),
    ];

    const monthRows = lines.filter((line) => line.competenceDate === competence);
    const prevMonthRows = lines.filter((line) => line.competenceDate === prevCompetence);
    const byCategoryMap = new Map<string, number>();
    const historyMap = new Map<string, number>();

    for (const row of monthRows) {
        if (!row.categoryId) {
            continue;
        }

        byCategoryMap.set(row.categoryId, (byCategoryMap.get(row.categoryId) ?? 0) + row.amountCents);
    }

    for (const row of lines) {
        if (row.isForecast && row.competenceDate > competence) {
            continue;
        }

        const key = row.competenceDate.slice(0, 7);
        historyMap.set(key, (historyMap.get(key) ?? 0) + row.amountCents);
    }

    const byCategory: DashboardCategoryTotal[] = [...byCategoryMap.entries()]
        .map(([categoryId, amountCents]) => {
            const cat = categoriesMap.get(categoryId);
            return {
                categoryId,
                name: cat?.name ?? "Outros",
                color: cat?.color ?? "#94A3B8",
                icon: cat?.icon ?? "Tag",
                amountCents,
            };
        })
        .sort((a, b) => b.amountCents - a.amountCents);

    const realEntries: DashboardEntryItem[] = (detailedEntriesResult.data as DetailedEntryRow[])
        .filter((row) => {
            if (!row.transactions) return false;
            if (includeReimbursements) return true;
            const reimbursedCents = row.transactions.reimbursed_amount_cents;
            if (reimbursedCents && reimbursedCents > 0) return true;
            const tags = (row.transactions.general_tag_ids ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            return !hasReimbursement(tags as Array<{ name?: string }>);
        })
        .map((row) => {
            const tx = row.transactions!;
            const reimbursedCents = tx.reimbursed_amount_cents;
            const hasPartial = (!includeReimbursements && Boolean(reimbursedCents && reimbursedCents > 0));
            const effectiveAmountCents = hasPartial
                ? Math.max(0, row.amount_cents - reimbursedCents!)
                : row.amount_cents;
            const cat = categoriesMap.get(tx.category_id) ?? {
                id: tx.category_id,
                name: "Categoria",
                color: "#94A3B8",
                icon: "Tag",
            };

            const generalTags: TagInfo[] = (tx.general_tag_ids ?? [])
                .map((tagId) => generalTagsMap.get(tagId))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

            const spec = tx.specific_tag_id ? specificTagsMap.get(tx.specific_tag_id) : null;
            const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;
            const loc = tx.location_id ? (locationsMap.get(tx.location_id) ?? null) : null;

            return {
                id: row.id,
                transactionId: tx.id,
                name: formatTransactionName(tx.name, loc),
                description: tx.description,
                amountCents: effectiveAmountCents,
                grossAmountCents: hasPartial ? row.amount_cents : null,
                reimbursedAmountCents: reimbursedCents,
                purchaseDate: tx.purchase_date,
                competenceDate: row.competence_date,
                paymentMethod: tx.payment_method,
                installmentNumber: row.installment_number,
                installmentCount: row.installment_count,
                categoryId: tx.category_id,
                category: cat,
                specificTagId: tx.specific_tag_id,
                specificTag,
                generalTagIds: tx.general_tag_ids ?? [],
                generalTags,
                locationId: tx.location_id,
                location: loc,
                isRecurring: false,
                isForecast: false,
                editHref: `/transactions/${tx.id}/edit`,
            };
        });

    const projectedEntries: DashboardEntryItem[] = projected
        .filter((occurrence) => occurrence.entry.competenceDate === competence)
        .filter((occurrence) => {
            if (includeReimbursements) return true;
            const tags = (occurrence.generalTagIds ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            return !hasReimbursement(tags as Array<{ name?: string }>);
        })
        .map((occurrence) => {
            const cat = categoriesMap.get(occurrence.categoryId) ?? {
                id: occurrence.categoryId,
                name: "Categoria",
                color: "#94A3B8",
                icon: "Tag",
            };

            const generalTags: TagInfo[] = (occurrence.generalTagIds ?? [])
                .map((tagId) => generalTagsMap.get(tagId))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

            const spec = occurrence.specificTagId ? specificTagsMap.get(occurrence.specificTagId) : null;
            const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;

            return {
                id: occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate),
                transactionId: occurrence.seriesId,
                name: occurrence.name,
                description: occurrence.description,
                amountCents: occurrence.entry.amountCents,
                purchaseDate: occurrence.occurrenceDate,
                competenceDate: occurrence.entry.competenceDate,
                paymentMethod: occurrence.paymentMethod,
                installmentNumber: 1,
                installmentCount: 1,
                categoryId: occurrence.categoryId,
                category: cat,
                specificTagId: occurrence.specificTagId,
                specificTag,
                generalTagIds: occurrence.generalTagIds ?? [],
                generalTags,
                isRecurring: true,
                isForecast: occurrence.isForecast,
                editHref: occurrenceEditHref(occurrence.seriesId, occurrence.occurrenceDate),
            };
        });

    const allMonthEntries = [...realEntries, ...projectedEntries];

    let filteredEntries = [...allMonthEntries];

    if (parsed.category) {
        filteredEntries = filteredEntries.filter((entry) => entry.categoryId === parsed.category);
    }

    if (parsed.paymentMethod) {
        filteredEntries = filteredEntries.filter((entry) => entry.paymentMethod === parsed.paymentMethod);
    }

    if (parsed.generalTag) {
        filteredEntries = filteredEntries.filter((entry) => entry.generalTagIds.includes(parsed.generalTag!));
    }

    if (parsed.specificTag) {
        filteredEntries = filteredEntries.filter((entry) => entry.specificTagId === parsed.specificTag);
    }

    if (parsed.search) {
        const query = normalizeSearchText(parsed.search);
        filteredEntries = filteredEntries.filter((entry) => {
            const nameMatch = normalizeSearchText(entry.name).includes(query);
            const descMatch = entry.description ? normalizeSearchText(entry.description).includes(query) : false;
            const catMatch = normalizeSearchText(entry.category.name).includes(query);
            const specMatch = entry.specificTag ? normalizeSearchText(entry.specificTag.name).includes(query) : false;
            const generalMatch = entry.generalTags.some((tag) => normalizeSearchText(tag.name).includes(query));
            return nameMatch || descMatch || catMatch || specMatch || generalMatch;
        });
    }

    const sort = parsed.sort ?? "date_desc";
    filteredEntries.sort((a, b) => {
        switch (sort) {
            case "date_asc":
                return a.purchaseDate.localeCompare(b.purchaseDate) || a.name.localeCompare(b.name);
            case "amount_desc":
                return b.amountCents - a.amountCents || b.purchaseDate.localeCompare(a.purchaseDate);
            case "amount_asc":
                return a.amountCents - b.amountCents || b.purchaseDate.localeCompare(a.purchaseDate);
            case "date_desc":
            default:
                return b.purchaseDate.localeCompare(a.purchaseDate) || a.name.localeCompare(b.name);
        }
    });

    const filteredTotalCents = filteredEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
    const totalCents = monthRows.reduce((sum, row) => sum + row.amountCents, 0);

    // 1. Média Diária e Burn Rate (apenas compras pontuais)
    const [yrStr, moStr] = month.split("-");
    const totalDaysInMonth = new Date(Number(yrStr), Number(moStr), 0).getDate();
    const currentMonthPrefix = today.slice(0, 7);
    const isCurrentMonth = month === currentMonthPrefix;
    const isPastMonth = month < currentMonthPrefix;

    const discretionaryEntries = allMonthEntries.filter((entry) => {
        const isFixedCat = entry.categoryId === "fixed_expenses" || entry.category.name.toLowerCase() === "contas fixas";
        return !entry.isRecurring && entry.installmentCount <= 1 && !isFixedCat;
    });
    const discretionarySpentCents = discretionaryEntries.reduce((sum, e) => sum + e.amountCents, 0);

    let daysElapsed = totalDaysInMonth;
    let daysRemaining = 0;
    let dailyAverageCents = 0;
    let projectedEndCents = totalCents;

    if (isCurrentMonth) {
        const currentDay = Math.min(totalDaysInMonth, Math.max(1, Number(today.slice(8, 10))));
        daysElapsed = currentDay;
        daysRemaining = Math.max(0, totalDaysInMonth - currentDay);
        dailyAverageCents = Math.round(discretionarySpentCents / daysElapsed);
        projectedEndCents = totalCents + Math.round(dailyAverageCents * daysRemaining);
    } else if (isPastMonth) {
        daysElapsed = totalDaysInMonth;
        daysRemaining = 0;
        dailyAverageCents = Math.round(discretionarySpentCents / totalDaysInMonth);
        projectedEndCents = totalCents;
    } else {
        daysElapsed = 0;
        daysRemaining = totalDaysInMonth;
        dailyAverageCents = 0;
        projectedEndCents = totalCents;
    }

    const burnRate: BurnRateKpi = {
        dailyAverageCents,
        projectedEndCents,
        daysElapsed,
        daysRemaining,
        totalDays: totalDaysInMonth,
        isCurrentPeriod: isCurrentMonth,
        periodKind: "month",
    };

    // 2. Orçamento Mensal
    const budget: BudgetKpi = {
        budgetCents,
        spentCents: totalCents,
        remainingCents: budgetCents !== null ? budgetCents - totalCents : null,
        percentage: budgetCents !== null && budgetCents > 0 ? Math.round((totalCents / budgetCents) * 100) : null,
        isExceeded: budgetCents !== null && totalCents > budgetCents,
        periodKind: "month",
    };

    // 3. Fixos vs Variáveis
    let fixedCents = 0;
    let variableCents = 0;
    for (const entry of allMonthEntries) {
        const isFixedCat = entry.categoryId === "fixed_expenses" || entry.category.name.toLowerCase() === "contas fixas";
        const isFixed = entry.isRecurring || entry.installmentCount > 1 || isFixedCat;
        if (isFixed) {
            fixedCents += entry.amountCents;
        } else {
            variableCents += entry.amountCents;
        }
    }
    const fvTotal = fixedCents + variableCents;
    const fixedPercentage = fvTotal > 0 ? Math.round((fixedCents / fvTotal) * 100) : 0;
    const variablePercentage = fvTotal > 0 ? 100 - fixedPercentage : 0;

    const fixedVsVariable: FixedVsVariableKpi = {
        fixedCents,
        fixedPercentage,
        variableCents,
        variablePercentage,
    };

    // 4. Meio de Pagamento
    let pixCents = 0;
    let creditSingleCents = 0;
    let creditInstallmentsCents = 0;
    for (const entry of allMonthEntries) {
        if (entry.paymentMethod === "pix") {
            pixCents += entry.amountCents;
        } else {
            if (entry.installmentCount > 1 || entry.isRecurring) {
                creditInstallmentsCents += entry.amountCents;
            } else {
                creditSingleCents += entry.amountCents;
            }
        }
    }
    const creditCents = creditSingleCents + creditInstallmentsCents;
    const payTotal = pixCents + creditCents;
    const pixPercentage = payTotal > 0 ? Math.round((pixCents / payTotal) * 100) : 0;
    const creditPercentage = payTotal > 0 ? 100 - pixPercentage : 0;
    const creditSinglePercentage = creditCents > 0 ? Math.round((creditSingleCents / creditCents) * 100) : 0;
    const creditInstallmentsPercentage = creditCents > 0 ? 100 - creditSinglePercentage : 0;

    const paymentDistribution: PaymentDistributionKpi = {
        pixCents,
        pixPercentage,
        creditCents,
        creditPercentage,
        creditSingleCents,
        creditSinglePercentage,
        creditInstallmentsCents,
        creditInstallmentsPercentage,
    };

    // 5. Maiores Despesas do Mês (Top 5)
    const sortedMonthEntries = [...allMonthEntries].filter((entry) => entry.amountCents > 0).sort((a, b) => b.amountCents - a.amountCents);

    const largestExpenses: LargestExpenseItem[] = sortedMonthEntries.slice(0, 5).map((entry) => ({
        name: entry.name,
        amountCents: entry.amountCents,
        date: entry.purchaseDate,
        categoryName: entry.category.name,
        categoryColor: entry.category.color,
        paymentMethod: entry.paymentMethod,
        badgeLabel: entry.installmentCount > 1 ? `Parcela ${entry.installmentNumber}/${entry.installmentCount}` : entry.isRecurring ? "Recorrente" : undefined,
        editHref: entry.editHref,
    }));
    const largestExpense: LargestExpenseKpi = largestExpenses[0] ?? null;

    // 6. Tags Específicas do Mês
    const specificTagMap = new Map<string, { tag: TagInfo; amountCents: number }>();
    let totalSpecificTagCents = 0;

    for (const entry of allMonthEntries) {
        if (entry.specificTag && entry.amountCents > 0) {
            totalSpecificTagCents += entry.amountCents;
            const existing = specificTagMap.get(entry.specificTag.id);
            if (existing) {
                existing.amountCents += entry.amountCents;
            } else {
                specificTagMap.set(entry.specificTag.id, {
                    tag: entry.specificTag,
                    amountCents: entry.amountCents,
                });
            }
        }
    }

    const bySpecificTag: DashboardSpecificTagTotal[] = [...specificTagMap.values()]
        .map(({ tag, amountCents }) => ({
            tagId: tag.id,
            name: tag.name,
            color: tag.color,
            icon: tag.icon,
            amountCents,
            percentage: totalSpecificTagCents > 0 ? Math.round((amountCents / totalSpecificTagCents) * 100) : 0,
        }))
        .sort((a, b) => b.amountCents - a.amountCents);

    const destinationMap = new Map<string, { locationId: string; name: string; amountCents: number; count: number }>();
    let totalUberDestinationCents = 0;

    for (const entry of allMonthEntries) {
        if (entry.amountCents <= 0) continue;

        let locId: string | null = null;
        let locName: string | null = null;

        if (entry.location) {
            locId = entry.location.id;
            locName = entry.location.name;
        } else if (entry.name.toLowerCase().startsWith("uber - ")) {
            locName = entry.name.slice(7).trim();
            locId = `name_${locName.toLowerCase()}`;
        }

        if (locId && locName) {
            totalUberDestinationCents += entry.amountCents;
            const existing = destinationMap.get(locId);
            if (existing) {
                existing.amountCents += entry.amountCents;
                existing.count += 1;
            } else {
                destinationMap.set(locId, {
                    locationId: locId,
                    name: locName,
                    amountCents: entry.amountCents,
                    count: 1,
                });
            }
        }
    }

    const topDestinations: DashboardTopDestination[] = [...destinationMap.values()]
        .map((dest) => ({
            ...dest,
            percentage: totalUberDestinationCents > 0 ? Math.round((dest.amountCents / totalUberDestinationCents) * 100) : 0,
        }))
        .sort((a, b) => b.amountCents - a.amountCents)
        .slice(0, 5);

    const kpis: DashboardKpis = {
        burnRate,
        budget,
        fixedVsVariable,
        paymentDistribution,
        largestExpense,
        largestExpenses,
        bySpecificTag,
        topDestinations,
    };

    return {
        month,
        includeReimbursements,
        totalCents,
        previousMonthTotalCents: prevMonthRows.reduce((sum, row) => sum + row.amountCents, 0),
        filteredTotalCents,
        entries: filteredEntries,
        byCategory,
        history: [...historyMap.entries()]
            .map(([historyMonth, amountCents]) => ({ month: historyMonth, amountCents }))
            .filter((item) => item.month <= month)
            .sort((a, b) => a.month.localeCompare(b.month)),
        settings,
        kpis,
    };
}

export async function getAnnualDashboard(params: z.input<typeof transactionFiltersSchema> = {}): Promise<AnnualDashboardData> {
    const parsed = transactionFiltersSchema.parse(params);
    const today = toSaoPauloCivilDate(new Date());
    const currentYr = Number(today.slice(0, 4));
    const currentMo = today.slice(0, 7);
    const year = parsed.year ?? currentYr;
    const prevYear = year - 1;
    const includeReimbursements = parsed.includeReimbursements;
    const { supabase, user } = await requireUser();

    const yearStartStr = `${year}-01-01`;
    const yearEndStr = `${year}-12-31`;

    const [settings, annualBudgetsResult, entriesResult, detailedEntriesResult, recurrence, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([
        getSettings(),
        getAnnualMonthlyBudgets(supabase, user.id, year),
        supabase.from("transaction_entries").select("amount_cents, competence_date, transactions!inner(category_id, general_tag_ids, reimbursed_amount_cents)").lte("competence_date", yearEndStr).order("competence_date", { ascending: true }),
        supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date, transactions!inner(id, name, description, category_id, specific_tag_id, general_tag_ids, location_id, purchase_date, payment_method, reimbursed_amount_cents)").gte("competence_date", yearStartStr).lte("competence_date", yearEndStr).order("competence_date", { ascending: false }),
        loadRecurrenceStateFrom(supabase),
        getUserCategoriesMap(supabase, user.id),
        getUserGeneralTagsMap(supabase, user.id),
        getUserSpecificTagsMap(supabase, user.id),
        getUserLocationsMap(supabase, user.id),
    ]);

    if (entriesResult.error || detailedEntriesResult.error) {
        console.error("Annual dashboard error loading entries:", entriesResult.error ?? detailedEntriesResult.error);
        throw new Error("Não foi possível carregar o resumo anual");
    }

    const origin = earliestSeriesStart(recurrence) ?? `${prevYear}-01-01`;
    const projected = projectLoadedRecurrences(recurrence, origin, `${year}-12-31`, today, settings);

    const lines: DashboardLine[] = [
        ...(entriesResult.data as EntryRow[]).flatMap((row) => {
            const tx = row.transactions;
            const reimbursedCents = tx?.reimbursed_amount_cents;
            const tags = (tx?.general_tag_ids ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            const isReimbursed = hasReimbursement(tags as Array<{ name?: string }>);

            if (!includeReimbursements) {
                if (isReimbursed && (!reimbursedCents || reimbursedCents <= 0)) {
                    return [];
                }
            }

            const effectiveAmountCents = (!includeReimbursements && reimbursedCents && reimbursedCents > 0)
                ? Math.max(0, row.amount_cents - reimbursedCents)
                : row.amount_cents;

            return [{
                amountCents: effectiveAmountCents,
                competenceDate: row.competence_date,
                categoryId: tx?.category_id,
                generalTagIds: tx?.general_tag_ids ?? [],
                isForecast: false,
            }];
        }),
        ...projected
            .filter((occurrence) => {
                if (includeReimbursements) return true;
                const tags = (occurrence.generalTagIds ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
                return !hasReimbursement(tags as Array<{ name?: string }>);
            })
            .map((occurrence) => ({
                amountCents: occurrence.entry.amountCents,
                competenceDate: occurrence.entry.competenceDate,
                categoryId: occurrence.categoryId,
                generalTagIds: occurrence.generalTagIds ?? [],
                isForecast: occurrence.isForecast,
            })),
    ];

    const annualHistoryMap = new Map<number, number>();
    for (const row of lines) {
        if (row.competenceDate > `${year}-12-31`) {
            continue;
        }
        const y = Number(row.competenceDate.slice(0, 4));
        if (y >= 2000 && y <= 2100) {
            annualHistoryMap.set(y, (annualHistoryMap.get(y) ?? 0) + row.amountCents);
        }
    }
    if (!annualHistoryMap.has(year)) annualHistoryMap.set(year, 0);
    if (!annualHistoryMap.has(prevYear)) annualHistoryMap.set(prevYear, 0);

    const annualHistory: AnnualYearPoint[] = [...annualHistoryMap.entries()]
        .filter(([y]) => y <= year)
        .filter(([y, cents]) => cents > 0 || y === year || y === prevYear)
        .sort(([a], [b]) => a - b)
        .map(([y, amountCents]) => ({
            year: y,
            amountCents,
            isCurrentYear: y === currentYr,
            hasForecast: y >= currentYr,
        }));

    const monthShortLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthFullLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const monthlyPoints: AnnualMonthPoint[] = Array.from({ length: 12 }, (_, i) => {
        const monthNumStr = String(i + 1).padStart(2, "0");
        const monthKey = `${year}-${monthNumStr}`;
        const prevMonthKey = `${prevYear}-${monthNumStr}`;
        const isFuture = monthKey > currentMo;

        let realAmountCents = 0;
        let forecastAmountCents = 0;
        let prevYearAmountCents = 0;

        for (const row of lines) {
            const mKey = row.competenceDate.slice(0, 7);
            if (mKey === monthKey) {
                if (row.isForecast) {
                    forecastAmountCents += row.amountCents;
                } else {
                    realAmountCents += row.amountCents;
                }
            } else if (mKey === prevMonthKey) {
                if (!row.isForecast) {
                    prevYearAmountCents += row.amountCents;
                }
            }
        }

        const totalAmountCents = realAmountCents + forecastAmountCents;

        return {
            month: monthKey,
            monthIndex: i,
            label: monthShortLabels[i],
            fullLabel: `${monthFullLabels[i]} de ${year}`,
            realAmountCents,
            forecastAmountCents,
            totalAmountCents,
            isFuture,
            prevYearAmountCents,
        };
    });

    const byCategoryMap = new Map<string, number>();
    for (const row of lines) {
        if (row.competenceDate.startsWith(`${year}-`) && row.categoryId) {
            byCategoryMap.set(row.categoryId, (byCategoryMap.get(row.categoryId) ?? 0) + row.amountCents);
        }
    }

    const byCategory: DashboardCategoryTotal[] = [...byCategoryMap.entries()]
        .map(([categoryId, amountCents]) => {
            const cat = categoriesMap.get(categoryId);
            return {
                categoryId,
                name: cat?.name ?? "Outros",
                color: cat?.color ?? "#94A3B8",
                icon: cat?.icon ?? "Tag",
                amountCents,
            };
        })
        .sort((a, b) => b.amountCents - a.amountCents);

    const realEntries: DashboardEntryItem[] = (detailedEntriesResult.data as DetailedEntryRow[])
        .filter((row) => {
            if (!row.transactions) return false;
            if (includeReimbursements) return true;
            const reimbursedCents = row.transactions.reimbursed_amount_cents;
            if (reimbursedCents && reimbursedCents > 0) return true;
            const tags = (row.transactions.general_tag_ids ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            return !hasReimbursement(tags as Array<{ name?: string }>);
        })
        .map((row) => {
            const tx = row.transactions!;
            const reimbursedCents = tx.reimbursed_amount_cents;
            const hasPartial = (!includeReimbursements && Boolean(reimbursedCents && reimbursedCents > 0));
            const effectiveAmountCents = hasPartial
                ? Math.max(0, row.amount_cents - reimbursedCents!)
                : row.amount_cents;
            const cat = categoriesMap.get(tx.category_id) ?? {
                id: tx.category_id,
                name: "Categoria",
                color: "#94A3B8",
                icon: "Tag",
            };

            const generalTags: TagInfo[] = (tx.general_tag_ids ?? [])
                .map((tagId) => generalTagsMap.get(tagId))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

            const spec = tx.specific_tag_id ? specificTagsMap.get(tx.specific_tag_id) : null;
            const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;
            const loc = tx.location_id ? (locationsMap.get(tx.location_id) ?? null) : null;

            return {
                id: row.id,
                transactionId: tx.id,
                name: formatTransactionName(tx.name, loc),
                description: tx.description,
                amountCents: effectiveAmountCents,
                grossAmountCents: hasPartial ? row.amount_cents : null,
                reimbursedAmountCents: reimbursedCents,
                purchaseDate: tx.purchase_date,
                competenceDate: row.competence_date,
                paymentMethod: tx.payment_method,
                installmentNumber: row.installment_number,
                installmentCount: row.installment_count,
                categoryId: tx.category_id,
                category: cat,
                specificTagId: tx.specific_tag_id,
                specificTag,
                generalTagIds: tx.general_tag_ids ?? [],
                generalTags,
                locationId: tx.location_id,
                location: loc,
                isRecurring: false,
                isForecast: false,
                editHref: `/transactions/${tx.id}/edit`,
            };
        });

    const projectedEntries: DashboardEntryItem[] = projected
        .filter((occurrence) => occurrence.entry.competenceDate.startsWith(`${year}-`))
        .filter((occurrence) => {
            if (includeReimbursements) return true;
            const tags = (occurrence.generalTagIds ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            return !hasReimbursement(tags as Array<{ name?: string }>);
        })
        .map((occurrence) => {
            const cat = categoriesMap.get(occurrence.categoryId) ?? {
                id: occurrence.categoryId,
                name: "Categoria",
                color: "#94A3B8",
                icon: "Tag",
            };

            const generalTags: TagInfo[] = (occurrence.generalTagIds ?? [])
                .map((tagId) => generalTagsMap.get(tagId))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

            const spec = occurrence.specificTagId ? specificTagsMap.get(occurrence.specificTagId) : null;
            const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;

            return {
                id: occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate),
                transactionId: occurrence.seriesId,
                name: occurrence.name,
                description: occurrence.description,
                amountCents: occurrence.entry.amountCents,
                purchaseDate: occurrence.occurrenceDate,
                competenceDate: occurrence.entry.competenceDate,
                paymentMethod: occurrence.paymentMethod,
                installmentNumber: 1,
                installmentCount: 1,
                categoryId: occurrence.categoryId,
                category: cat,
                specificTagId: occurrence.specificTagId,
                specificTag,
                generalTagIds: occurrence.generalTagIds ?? [],
                generalTags,
                isRecurring: true,
                isForecast: occurrence.isForecast,
                editHref: occurrenceEditHref(occurrence.seriesId, occurrence.occurrenceDate),
            };
        });

    const allYearEntries = [...realEntries, ...projectedEntries];

    // Consolidate entries for annual view (group recurrences, installments, and same-name standalone purchases)
    const consolidatedMap = new Map<string, DashboardEntryItem>();

    for (const entry of allYearEntries) {
        let groupKey: string;

        if (entry.isRecurring) {
            groupKey = `recurring-${entry.transactionId}`;
        } else if (entry.installmentCount > 1) {
            groupKey = `installment-${entry.transactionId}`;
        } else {
            const normName = normalizeNameForGrouping(entry.name);
            const sortedGenTags = [...entry.generalTagIds].sort().join(",");
            const specTag = entry.specificTagId ?? "none";
            groupKey = `name-${normName}|${entry.categoryId}|${specTag}|${sortedGenTags}`;
        }

        const existing = consolidatedMap.get(groupKey);

        const subItem: DashboardSubEntry = {
            id: entry.id,
            label: entry.isRecurring ? `${monthFullLabels[Number(entry.competenceDate.slice(5, 7)) - 1]} de ${year}` : entry.installmentCount > 1 ? `Parcela ${entry.installmentNumber}/${entry.installmentCount} • ${monthShortLabels[Number(entry.competenceDate.slice(5, 7)) - 1]}/${year.toString().slice(2)}` : formatCivilDateDisplay(entry.purchaseDate),
            month: entry.competenceDate.slice(0, 7),
            amountCents: entry.amountCents,
            grossAmountCents: entry.grossAmountCents,
            isForecast: entry.isForecast,
            editHref: entry.editHref,
            paymentMethod: entry.paymentMethod,
            purchaseDate: entry.purchaseDate,
            description: entry.description,
        };

        if (!existing) {
            consolidatedMap.set(groupKey, {
                ...entry,
                subEntries: [subItem],
            });
        } else {
            existing.amountCents += entry.amountCents;
            if (entry.purchaseDate > existing.purchaseDate) {
                existing.purchaseDate = entry.purchaseDate;
                existing.competenceDate = entry.competenceDate;
            }
            if (entry.paymentMethod !== existing.paymentMethod) {
                existing.isMixedPayment = true;
            }
            existing.subEntries!.push(subItem);
        }
    }

    const consolidatedEntries: DashboardEntryItem[] = [...consolidatedMap.values()].map((item) => {
        if (!item.subEntries || item.subEntries.length <= 1) {
            return {
                ...item,
                subEntries: undefined,
                isMixedPayment: false,
            };
        }

        item.subEntries.sort((a, b) => {
            if (a.purchaseDate && b.purchaseDate) {
                return a.purchaseDate.localeCompare(b.purchaseDate);
            }
            return a.month.localeCompare(b.month);
        });

        if (item.isRecurring) {
            const count = item.subEntries.length;
            const firstMonthNum = Number(item.subEntries[0].month.slice(5, 7));
            const lastMonthNum = Number(item.subEntries[count - 1].month.slice(5, 7));
            const firstLabel = monthShortLabels[firstMonthNum - 1];
            const lastLabel = monthShortLabels[lastMonthNum - 1];
            const shortYear = year.toString().slice(2);

            const dateRangeLabel = firstMonthNum === lastMonthNum ? `${firstLabel}/${shortYear}` : `${firstLabel} - ${lastLabel}/${shortYear}`;

            return {
                ...item,
                consolidatedBadge: `Recorrente • ${count}x no ano`,
                dateRangeLabel,
            };
        }

        if (item.installmentCount > 1) {
            const count = item.subEntries.length;
            const badge = count === item.installmentCount ? `Parcelado ${item.installmentCount}x` : `${count} parcelas em ${year} (de ${item.installmentCount}x)`;

            return {
                ...item,
                consolidatedBadge: badge,
            };
        }

        const count = item.subEntries.length;
        const firstMonthNum = Number(item.subEntries[0].month.slice(5, 7));
        const lastMonthNum = Number(item.subEntries[count - 1].month.slice(5, 7));
        const firstLabel = monthShortLabels[firstMonthNum - 1];
        const lastLabel = monthShortLabels[lastMonthNum - 1];
        const shortYear = year.toString().slice(2);

        const dateRangeLabel = firstMonthNum === lastMonthNum ? `${firstLabel}/${shortYear}` : `${firstLabel} - ${lastLabel}/${shortYear}`;

        return {
            ...item,
            description: null,
            dateRangeLabel,
            consolidatedBadge: `${count} compras no ano`,
        };
    });

    let filteredEntries = [...consolidatedEntries];

    if (parsed.category) {
        filteredEntries = filteredEntries.filter((entry) => entry.categoryId === parsed.category);
    }

    if (parsed.paymentMethod) {
        filteredEntries = filteredEntries.filter((entry) => entry.paymentMethod === parsed.paymentMethod);
    }

    if (parsed.generalTag) {
        filteredEntries = filteredEntries.filter((entry) => entry.generalTagIds.includes(parsed.generalTag!));
    }

    if (parsed.specificTag) {
        filteredEntries = filteredEntries.filter((entry) => entry.specificTagId === parsed.specificTag);
    }

    if (parsed.search) {
        const query = normalizeSearchText(parsed.search);
        filteredEntries = filteredEntries.filter((entry) => {
            const nameMatch = normalizeSearchText(entry.name).includes(query);
            const descMatch = entry.description ? normalizeSearchText(entry.description).includes(query) : false;
            const catMatch = normalizeSearchText(entry.category.name).includes(query);
            const specMatch = entry.specificTag ? normalizeSearchText(entry.specificTag.name).includes(query) : false;
            const generalMatch = entry.generalTags.some((tag) => normalizeSearchText(tag.name).includes(query));
            return nameMatch || descMatch || catMatch || specMatch || generalMatch;
        });
    }

    const sort = parsed.sort ?? "date_desc";
    filteredEntries.sort((a, b) => {
        switch (sort) {
            case "date_asc":
                return a.purchaseDate.localeCompare(b.purchaseDate) || a.name.localeCompare(b.name);
            case "amount_desc":
                return b.amountCents - a.amountCents || b.purchaseDate.localeCompare(a.purchaseDate);
            case "amount_asc":
                return a.amountCents - b.amountCents || b.purchaseDate.localeCompare(a.purchaseDate);
            case "date_desc":
            default:
                return b.purchaseDate.localeCompare(a.purchaseDate) || a.name.localeCompare(b.name);
        }
    });

    const filteredTotalCents = filteredEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
    const totalCents = monthlyPoints.reduce((sum, pt) => sum + pt.totalAmountCents, 0);
    const previousYearTotalCents = monthlyPoints.reduce((sum, pt) => sum + pt.prevYearAmountCents, 0);

    const elapsedMonths = year === currentYr ? Math.max(1, Number(currentMo.slice(5, 7))) : 12;
    const monthlyAverageCents = Math.round(totalCents / elapsedMonths);

    const { totalAnnualBudgetCents } = annualBudgetsResult;

    // 1. Burn Rate Anual & Média Diária (apenas compras pontuais)
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDaysInYear = isLeapYear ? 366 : 365;
    const isCurrentYear = year === currentYr;
    const isPastYear = year < currentYr;

    const discretionaryYearEntries = allYearEntries.filter((entry) => {
        const isFixedCat = entry.categoryId === "fixed_expenses" || entry.category.name.toLowerCase() === "contas fixas";
        return !entry.isRecurring && entry.installmentCount <= 1 && !isFixedCat;
    });
    const discretionarySpentYearCents = discretionaryYearEntries.reduce((sum, e) => sum + e.amountCents, 0);

    let annualDaysElapsed = totalDaysInYear;
    let annualDaysRemaining = 0;
    let annualDailyAverageCents = 0;
    let annualProjectedEndCents = totalCents;

    if (isCurrentYear) {
        const startOfYear = new Date(year, 0, 1).getTime();
        const [curY, curM, curD] = today.split("-").map(Number);
        const todayDate = new Date(curY, curM - 1, curD).getTime();
        const dayOfYear = Math.min(totalDaysInYear, Math.max(1, Math.floor((todayDate - startOfYear) / 86400000) + 1));

        annualDaysElapsed = dayOfYear;
        annualDaysRemaining = Math.max(0, totalDaysInYear - dayOfYear);
        annualDailyAverageCents = Math.round(discretionarySpentYearCents / annualDaysElapsed);
        annualProjectedEndCents = totalCents + Math.round(annualDailyAverageCents * annualDaysRemaining);
    } else if (isPastYear) {
        annualDaysElapsed = totalDaysInYear;
        annualDaysRemaining = 0;
        annualDailyAverageCents = Math.round(discretionarySpentYearCents / totalDaysInYear);
        annualProjectedEndCents = totalCents;
    } else {
        annualDaysElapsed = 0;
        annualDaysRemaining = totalDaysInYear;
        annualDailyAverageCents = 0;
        annualProjectedEndCents = totalCents;
    }

    const burnRate: BurnRateKpi = {
        dailyAverageCents: annualDailyAverageCents,
        projectedEndCents: annualProjectedEndCents,
        daysElapsed: annualDaysElapsed,
        daysRemaining: annualDaysRemaining,
        totalDays: totalDaysInYear,
        isCurrentPeriod: isCurrentYear,
        periodKind: "year",
    };

    // 2. Orçamento Anual
    const budget: BudgetKpi = {
        budgetCents: totalAnnualBudgetCents,
        spentCents: totalCents,
        remainingCents: totalAnnualBudgetCents !== null ? totalAnnualBudgetCents - totalCents : null,
        percentage: totalAnnualBudgetCents !== null && totalAnnualBudgetCents > 0 ? Math.round((totalCents / totalAnnualBudgetCents) * 100) : null,
        isExceeded: totalAnnualBudgetCents !== null && totalCents > totalAnnualBudgetCents,
        periodKind: "year",
    };

    // 3. Fixos vs Variáveis Anual
    let annualFixedCents = 0;
    let annualVariableCents = 0;
    for (const entry of allYearEntries) {
        const isFixedCat = entry.categoryId === "fixed_expenses" || entry.category.name.toLowerCase() === "contas fixas";
        const isFixed = entry.isRecurring || entry.installmentCount > 1 || isFixedCat;
        if (isFixed) {
            annualFixedCents += entry.amountCents;
        } else {
            annualVariableCents += entry.amountCents;
        }
    }
    const annualFvTotal = annualFixedCents + annualVariableCents;
    const annualFixedPct = annualFvTotal > 0 ? Math.round((annualFixedCents / annualFvTotal) * 100) : 0;
    const annualVarPct = annualFvTotal > 0 ? 100 - annualFixedPct : 0;

    const fixedVsVariable: FixedVsVariableKpi = {
        fixedCents: annualFixedCents,
        fixedPercentage: annualFixedPct,
        variableCents: annualVariableCents,
        variablePercentage: annualVarPct,
    };

    // 4. Meio de Pagamento Anual
    let annualPixCents = 0;
    let annualCreditSingleCents = 0;
    let annualCreditInstallmentsCents = 0;
    for (const entry of allYearEntries) {
        if (entry.paymentMethod === "pix") {
            annualPixCents += entry.amountCents;
        } else {
            if (entry.installmentCount > 1 || entry.isRecurring) {
                annualCreditInstallmentsCents += entry.amountCents;
            } else {
                annualCreditSingleCents += entry.amountCents;
            }
        }
    }
    const annualCreditCents = annualCreditSingleCents + annualCreditInstallmentsCents;
    const annualPayTotal = annualPixCents + annualCreditCents;
    const annualPixPct = annualPayTotal > 0 ? Math.round((annualPixCents / annualPayTotal) * 100) : 0;
    const annualCreditPct = annualPayTotal > 0 ? 100 - annualPixPct : 0;
    const annualCreditSinglePct = annualCreditCents > 0 ? Math.round((annualCreditSingleCents / annualCreditCents) * 100) : 0;
    const annualCreditInstallmentsPct = annualCreditCents > 0 ? 100 - annualCreditSinglePct : 0;

    const paymentDistribution: PaymentDistributionKpi = {
        pixCents: annualPixCents,
        pixPercentage: annualPixPct,
        creditCents: annualCreditCents,
        creditPercentage: annualCreditPct,
        creditSingleCents: annualCreditSingleCents,
        creditSinglePercentage: annualCreditSinglePct,
        creditInstallmentsCents: annualCreditInstallmentsCents,
        creditInstallmentsPercentage: annualCreditInstallmentsPct,
    };

    // 5. Maior Despesa do Ano (com lançamento unitário somando parcelas)
    type UnitExpense = {
        name: string;
        amountCents: number;
        date: string;
        categoryName: string;
        categoryColor: string;
        paymentMethod: PaymentMethod;
        badgeLabel?: string;
        editHref?: string;
    };
    const unitExpenseMap = new Map<string, UnitExpense>();

    for (const entry of allYearEntries) {
        const isInstallment = entry.installmentCount > 1;
        const key = isInstallment ? `tx-${entry.transactionId}` : entry.id;
        const existing = unitExpenseMap.get(key);

        if (!existing) {
            unitExpenseMap.set(key, {
                name: entry.name,
                amountCents: entry.amountCents,
                date: entry.purchaseDate,
                categoryName: entry.category.name,
                categoryColor: entry.category.color,
                paymentMethod: entry.paymentMethod,
                badgeLabel: isInstallment ? `Parcelado ${entry.installmentCount}x` : entry.isRecurring ? "Recorrente" : undefined,
                editHref: entry.editHref,
            });
        } else {
            existing.amountCents += entry.amountCents;
            if (entry.purchaseDate < existing.date) {
                existing.date = entry.purchaseDate;
            }
        }
    }

    // 5. Maiores Despesas do Ano (Top 5)
    const sortedExpenses = [...unitExpenseMap.values()].filter((item) => item.amountCents > 0).sort((a, b) => b.amountCents - a.amountCents);

    const largestExpenses: LargestExpenseItem[] = sortedExpenses.slice(0, 5);
    const largestExpense: LargestExpenseKpi = largestExpenses[0] ?? null;

    // 6. Tags Específicas do Ano
    const specificTagMap = new Map<string, { tag: TagInfo; amountCents: number }>();
    let totalSpecificTagCents = 0;

    for (const entry of allYearEntries) {
        if (entry.specificTag && entry.amountCents > 0) {
            totalSpecificTagCents += entry.amountCents;
            const existing = specificTagMap.get(entry.specificTag.id);
            if (existing) {
                existing.amountCents += entry.amountCents;
            } else {
                specificTagMap.set(entry.specificTag.id, {
                    tag: entry.specificTag,
                    amountCents: entry.amountCents,
                });
            }
        }
    }

    const bySpecificTag: DashboardSpecificTagTotal[] = [...specificTagMap.values()]
        .map(({ tag, amountCents }) => ({
            tagId: tag.id,
            name: tag.name,
            color: tag.color,
            icon: tag.icon,
            amountCents,
            percentage: totalSpecificTagCents > 0 ? Math.round((amountCents / totalSpecificTagCents) * 100) : 0,
        }))
        .sort((a, b) => b.amountCents - a.amountCents);

    const destinationMap = new Map<string, { locationId: string; name: string; amountCents: number; count: number }>();
    let totalUberDestinationCents = 0;

    for (const entry of allYearEntries) {
        if (entry.amountCents <= 0) continue;

        let locId: string | null = null;
        let locName: string | null = null;

        if (entry.location) {
            locId = entry.location.id;
            locName = entry.location.name;
        } else if (entry.name.toLowerCase().startsWith("uber - ")) {
            locName = entry.name.slice(7).trim();
            locId = `name_${locName.toLowerCase()}`;
        }

        if (locId && locName) {
            totalUberDestinationCents += entry.amountCents;
            const existing = destinationMap.get(locId);
            if (existing) {
                existing.amountCents += entry.amountCents;
                existing.count += 1;
            } else {
                destinationMap.set(locId, {
                    locationId: locId,
                    name: locName,
                    amountCents: entry.amountCents,
                    count: 1,
                });
            }
        }
    }

    const topDestinations: DashboardTopDestination[] = [...destinationMap.values()]
        .map((dest) => ({
            ...dest,
            percentage: totalUberDestinationCents > 0 ? Math.round((dest.amountCents / totalUberDestinationCents) * 100) : 0,
        }))
        .sort((a, b) => b.amountCents - a.amountCents)
        .slice(0, 5);

    const kpis: DashboardKpis = {
        burnRate,
        budget,
        fixedVsVariable,
        paymentDistribution,
        largestExpense,
        largestExpenses,
        bySpecificTag,
        topDestinations,
    };

    return {
        year,
        includeReimbursements,
        totalCents,
        previousYearTotalCents,
        monthlyAverageCents,
        filteredTotalCents,
        entries: filteredEntries,
        byCategory,
        monthlyPoints,
        annualHistory,
        settings,
        kpis,
    };
}
