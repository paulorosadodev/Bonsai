import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { CategoryOption, UserCategory } from "@/lib/domain/catalog";

const fetchUserCategoriesMap = cache(async (): Promise<Map<string, UserCategory>> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("user_categories").select("id, user_id, name, color, icon, created_at, updated_at").eq("user_id", user.id).order("name", { ascending: true });

    if (error) {
        throw new Error("Não foi possível carregar o mapa de categorias");
    }

    const map = new Map<string, UserCategory>();
    for (const item of data ?? []) {
        map.set(item.id, item as UserCategory);
    }
    return map;
});

export const getCategories = cache(async (): Promise<CategoryOption[]> => {
    const map = await fetchUserCategoriesMap();
    return Array.from(map.values()).map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
    }));
});

export async function getUserCategoriesMap(_supabase?: Awaited<ReturnType<typeof requireUser>>["supabase"], _userId?: string): Promise<Map<string, UserCategory>> {
    return fetchUserCategoriesMap();
}
