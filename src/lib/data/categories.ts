import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { CategoryOption, UserCategory } from "@/lib/domain/catalog";

export const getCategories = cache(async (): Promise<CategoryOption[]> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_categories")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

    if (error) {
        throw new Error("Não foi possível carregar as categorias");
    }

    return (data ?? []) as CategoryOption[];
});

export async function getUserCategoriesMap(
    supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
    userId: string
): Promise<Map<string, UserCategory>> {
    const { data, error } = await supabase
        .from("user_categories")
        .select("id, user_id, name, color, icon, created_at, updated_at")
        .eq("user_id", userId);

    if (error) {
        throw new Error("Não foi possível carregar o mapa de categorias");
    }

    const map = new Map<string, UserCategory>();
    for (const item of data ?? []) {
        map.set(item.id, item as UserCategory);
    }
    return map;
}
