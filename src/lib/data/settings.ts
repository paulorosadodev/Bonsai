import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import { defaultSettings } from "./entries";
import type { CycleSettings } from "./types";

export const getSettings = cache(async (): Promise<CycleSettings> => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("user_settings").select("closing_day, due_day").eq("user_id", user.id).maybeSingle();

    if (error) {
        throw new Error("Não foi possível carregar as configurações");
    }

    if (!data) {
        return defaultSettings;
    }

    return {
        closingDay: data.closing_day,
        dueDay: data.due_day,
    };
});

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
