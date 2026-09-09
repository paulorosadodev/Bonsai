"use server";

import { getTransactionSuggestions, type TransactionSuggestion } from "@/lib/data/suggestions";
import type { ActionResult } from "./result";

export type { TransactionSuggestion };

export async function searchTransactionNames(query: string): Promise<ActionResult<{ suggestions: TransactionSuggestion[] }>> {
    const clean = (query ?? "").trim();
    if (clean.length < 2) {
        return { ok: true, suggestions: [] };
    }

    try {
        const suggestions = await getTransactionSuggestions(clean, 5);
        return { ok: true, suggestions };
    } catch {
        return { ok: true, suggestions: [] };
    }
}
