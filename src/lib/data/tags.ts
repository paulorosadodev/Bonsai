import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { GeneralTagOption, SpecificTagOption, UserGeneralTag, UserSpecificTag } from "@/lib/domain/catalog";

const fetchUserGeneralTagsMap = cache(async (): Promise<Map<string, UserGeneralTag>> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("user_general_tags").select("id, user_id, name, color, icon, created_at, updated_at").eq("user_id", user.id).order("name", { ascending: true });

    if (error) {
        throw new Error("Não foi possível carregar as tags gerais");
    }

    const map = new Map<string, UserGeneralTag>();
    for (const item of data ?? []) {
        map.set(item.id, item as UserGeneralTag);
    }
    return map;
});

export const getGeneralTags = cache(async (): Promise<GeneralTagOption[]> => {
    const map = await fetchUserGeneralTagsMap();
    return Array.from(map.values()).map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        icon: tag.icon ?? null,
    }));
});

export async function getUserGeneralTagsMap(_supabase?: Awaited<ReturnType<typeof requireUser>>["supabase"], _userId?: string): Promise<Map<string, UserGeneralTag>> {
    return fetchUserGeneralTagsMap();
}

const fetchUserSpecificTagsMap = cache(async (): Promise<Map<string, UserSpecificTag>> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("user_specific_tags").select("id, user_id, category_id, name, color, icon, created_at, updated_at").eq("user_id", user.id).order("name", { ascending: true });

    if (error) {
        throw new Error("Não foi possível carregar as tags específicas");
    }

    const map = new Map<string, UserSpecificTag>();
    for (const item of data ?? []) {
        map.set(item.id, item as UserSpecificTag);
    }
    return map;
});

export const getSpecificTags = cache(async (categoryId?: string): Promise<SpecificTagOption[]> => {
    const map = await fetchUserSpecificTagsMap();
    const list: SpecificTagOption[] = [];

    for (const item of map.values()) {
        if (!categoryId || item.category_id === categoryId) {
            list.push({
                id: item.id,
                categoryId: item.category_id,
                name: item.name,
                color: item.color || "#94A3B8",
                icon: item.icon ?? null,
            });
        }
    }

    return list;
});

export async function getUserSpecificTagsMap(_supabase?: Awaited<ReturnType<typeof requireUser>>["supabase"], _userId?: string): Promise<Map<string, UserSpecificTag>> {
    return fetchUserSpecificTagsMap();
}
