"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { locationCreateSchema, locationUpdateSchema, type LocationCreateInput, type LocationUpdateInput } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import { fromZodError, genericDeleteError, genericSaveError, type ActionResult } from "./result";

const idSchema = z.string().uuid();

function revalidateFinance() {
    revalidatePath("/", "layout");
}

export async function createLocation(input: LocationCreateInput): Promise<ActionResult<{ id: string; name: string }>> {
    const parsed = locationCreateSchema.safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_locations")
        .insert({
            user_id: user.id,
            name: parsed.data.name,
        })
        .select("id, name")
        .single();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma localidade com este nome." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id, name: data.name };
}

export async function updateLocation(id: string, input: LocationUpdateInput): Promise<ActionResult<{ id: string }>> {
    const idParsed = idSchema.safeParse(id);
    const parsed = locationUpdateSchema.safeParse(input);

    if (!idParsed.success) {
        return { ok: false, error: "ID de localidade inválido" };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_locations")
        .update({
            name: parsed.data.name,
        })
        .eq("id", idParsed.data)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma localidade com este nome." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function deleteLocation(id: string): Promise<ActionResult> {
    const idParsed = idSchema.safeParse(id);

    if (!idParsed.success) {
        return { ok: false, error: "ID de localidade inválido" };
    }

    const { supabase, user } = await requireUser();

    // Check if location is in use by transactions
    const { count: txCount } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("location_id", idParsed.data).eq("user_id", user.id);

    if (txCount && txCount > 0) {
        return { ok: false, error: "Esta localidade está vinculada a transações e não pode ser excluída." };
    }

    const { data, error } = await supabase.from("user_locations").delete().eq("id", idParsed.data).eq("user_id", user.id).select("id").maybeSingle();

    if (error || !data) {
        return { ok: false, error: genericDeleteError };
    }

    revalidateFinance();
    return { ok: true };
}
