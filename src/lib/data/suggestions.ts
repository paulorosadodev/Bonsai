import { requireUser } from "@/lib/supabase/server";

export type TransactionSuggestion = {
    name: string;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    specificTagId: string | null;
    generalTagIds: string[];
};

export async function getTransactionSuggestions(query: string, limit = 5): Promise<TransactionSuggestion[]> {
    const clean = query.trim();
    if (clean.length < 2) {
        return [];
    }

    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("suggest_transaction_names", {
        p_query: clean,
        p_limit: limit,
    });

    if (error) {
        console.error("Error fetching transaction suggestions:", error);
        return [];
    }

    return (data ?? []).map((item) => ({
        name: item.name,
        categoryId: item.category_id,
        categoryName: item.category_name,
        categoryColor: item.category_color,
        categoryIcon: item.category_icon,
        specificTagId: item.specific_tag_id || null,
        generalTagIds: item.general_tag_ids ?? [],
    }));
}
