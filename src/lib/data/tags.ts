import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { GeneralTagOption, SpecificTagOption, UserGeneralTag, UserSpecificTag } from "@/lib/domain/catalog";

export const getGeneralTags = cache(async (): Promise<GeneralTagOption[]> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("user_general_tags").select("id, name, color, icon").eq("user_id", user.id).order("name", { ascending: true });

    if (error) {
        throw new Error("Não foi possível carregar as tags gerais");
    }

    return (data ?? []) as GeneralTagOption[];
});

export const getSpecificTags = cache(async (categoryId?: string): Promise<SpecificTagOption[]> => {
    const { supabase, user } = await requireUser();
    let query = supabase.from("user_specific_tags").select("id, category_id, name, color, icon").eq("user_id", user.id).order("name", { ascending: true });

    if (categoryId) {
        query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error("Não foi possível carregar as tags específicas");
    }

    return (data ?? []).map((item) => ({
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        color: item.color || "#94A3B8",
        icon: item.icon,
    }));
});

export async function getUserGeneralTagsMap(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string): Promise<Map<string, UserGeneralTag>> {
    const { data, error } = await supabase.from("user_general_tags").select("id, user_id, name, color, icon, created_at, updated_at").eq("user_id", userId);

    if (error) {
        throw new Error("Não foi possível carregar as tags gerais");
    }

    const map = new Map<string, UserGeneralTag>();
    for (const item of data ?? []) {
        map.set(item.id, item as UserGeneralTag);
    }
    return map;
}

export async function getUserSpecificTagsMap(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string): Promise<Map<string, UserSpecificTag>> {
    const { data, error } = await supabase.from("user_specific_tags").select("id, user_id, category_id, name, color, icon, created_at, updated_at").eq("user_id", userId);

    if (error) {
        throw new Error("Não foi possível carregar as tags específicas");
    }

    const map = new Map<string, UserSpecificTag>();
    for (const item of data ?? []) {
        map.set(item.id, item as UserSpecificTag);
    }
    return map;
}
