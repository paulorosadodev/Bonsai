import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import { defaultSettings } from "./entries";
import type { CycleSettings } from "./types";

export const getSettings = cache(async (): Promise<CycleSettings> => {
    const { supabase, user } = await requireUser();
    const [settingsResult, budgetResult] = await Promise.all([supabase.from("user_settings").select("closing_day, due_day").eq("user_id", user.id).maybeSingle(), supabase.from("user_monthly_budgets").select("budget_cents").eq("user_id", user.id).order("effective_month", { ascending: false }).limit(1).maybeSingle()]);

    if (settingsResult.error) {
        throw new Error("Não foi possível carregar as configurações");
    }

    const data = settingsResult.data;
    const currentBudget = budgetResult.data?.budget_cents ?? null;

    if (!data) {
        return {
            ...defaultSettings,
            monthlyBudgetCents: currentBudget,
        };
    }

    return {
        closingDay: data.closing_day,
        dueDay: data.due_day,
        monthlyBudgetCents: currentBudget,
    };
});

export async function getEffectiveMonthlyBudget(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, targetMonth: string): Promise<number | null> {
    const { data } = await supabase.from("user_monthly_budgets").select("budget_cents").eq("user_id", userId).lte("effective_month", targetMonth).order("effective_month", { ascending: false }).limit(1).maybeSingle();

    return data ? Number(data.budget_cents) : null;
}

export async function getAnnualMonthlyBudgets(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, year: number): Promise<{ totalAnnualBudgetCents: number | null; monthlyBudgets: Array<{ month: string; budgetCents: number | null }> }> {
    const { data } = await supabase.from("user_monthly_budgets").select("effective_month, budget_cents").eq("user_id", userId).lte("effective_month", `${year}-12`).order("effective_month", { ascending: true });

    const records = (data ?? []).map((r) => ({
        effectiveMonth: r.effective_month as string,
        budgetCents: Number(r.budget_cents),
    }));

    const monthlyBudgets: Array<{ month: string; budgetCents: number | null }> = [];
    let hasAnyBudget = false;
    let totalAnnualBudgetCents = 0;

    for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${String(m).padStart(2, "0")}`;
        // Find the latest budget effective on or before monthKey
        let activeBudget: number | null = null;
        for (const record of records) {
            if (record.effectiveMonth <= monthKey) {
                activeBudget = record.budgetCents;
            } else {
                break;
            }
        }

        monthlyBudgets.push({ month: monthKey, budgetCents: activeBudget });
        if (activeBudget !== null) {
            hasAnyBudget = true;
            totalAnnualBudgetCents += activeBudget;
        }
    }

    return {
        totalAnnualBudgetCents: hasAnyBudget ? totalAnnualBudgetCents : null,
        monthlyBudgets,
    };
}

export async function ensureSettings(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string): Promise<CycleSettings> {
    const { data, error } = await supabase.from("user_settings").select("closing_day, due_day").eq("user_id", userId).maybeSingle();

    if (error) {
        throw new Error("Não foi possível carregar as configurações");
    }

    if (data) {
        return { closingDay: data.closing_day, dueDay: data.due_day };
    }

    const { data: created, error: insertError } = await supabase.from("user_settings").insert({ user_id: userId }).select("closing_day, due_day").single();

    if (insertError) {
        const { data: existing } = await supabase.from("user_settings").select("closing_day, due_day").eq("user_id", userId).maybeSingle();

        if (existing) {
            return { closingDay: existing.closing_day, dueDay: existing.due_day };
        }

        throw new Error("Não foi possível criar as configurações");
    }

    return { closingDay: created.closing_day, dueDay: created.due_day };
}
