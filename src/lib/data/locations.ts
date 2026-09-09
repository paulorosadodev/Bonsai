import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";

export type UserLocation = {
    id: string;
    userId?: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
};

export type LocationOption = {
    id: string;
    name: string;
};

const fetchUserLocationsMap = cache(async (): Promise<Map<string, LocationOption>> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("user_locations").select("id, name").eq("user_id", user.id).order("name", { ascending: true });

    if (error) {
        throw new Error("Não foi possível carregar o mapa de localidades");
    }

    const map = new Map<string, LocationOption>();
    for (const item of data ?? []) {
        map.set(item.id, item as LocationOption);
    }
    return map;
});

export const getLocations = cache(async (): Promise<LocationOption[]> => {
    const map = await fetchUserLocationsMap();
    return Array.from(map.values());
});

export async function getUserLocationsMap(_supabase?: Awaited<ReturnType<typeof requireUser>>["supabase"], _userId?: string): Promise<Map<string, LocationOption>> {
    return fetchUserLocationsMap();
}
