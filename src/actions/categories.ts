"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categoryCreateSchema, categoryUpdateSchema, type CategoryCreateInput, type CategoryUpdateInput } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { fromZodError, genericDeleteError, genericSaveError, type ActionResult } from "./result";

const idSchema = z.string().uuid();

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "categoria";
}

function revalidateFinance() {
    revalidatePath("/", "layout");
}

export async function createCategory(input: CategoryCreateInput): Promise<ActionResult<{ id: string }>> {
    const parsed = categoryCreateSchema.safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_categories")
        .insert({
            user_id: user.id,
            name: parsed.data.name,
            slug: slugify(parsed.data.name),
            color: parsed.data.color,
            icon: parsed.data.icon,
        })
        .select("id")
        .single();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma categoria com este nome." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function updateCategory(id: string, input: CategoryUpdateInput): Promise<ActionResult<{ id: string }>> {
    const idParsed = idSchema.safeParse(id);
    const parsed = categoryUpdateSchema.safeParse(input);

    if (!idParsed.success) {
        return { ok: false, error: "ID de categoria inválido" };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const updateData: Database["public"]["Tables"]["user_categories"]["Update"] = {};
    if (parsed.data.name !== undefined) {
        updateData.name = parsed.data.name;
        updateData.slug = slugify(parsed.data.name);
    }
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon;

    const { data, error } = await supabase
        .from("user_categories")
        .update(updateData)
        .eq("id", idParsed.data)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma categoria com este nome." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
    const idParsed = idSchema.safeParse(id);

    if (!idParsed.success) {
        return { ok: false, error: "ID de categoria inválido" };
    }

    const { supabase, user } = await requireUser();

    // Check if category is in use by transactions
    const { count: txCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", idParsed.data)
        .eq("user_id", user.id);

    if (txCount && txCount > 0) {
        return { ok: false, error: "Esta categoria está em uso por transações e não pode ser excluída." };
    }

    // Check if category is in use by recurring series
    const { count: recCount } = await supabase
        .from("recurring_versions")
        .select("series_id", { count: "exact", head: true })
        .eq("category_id", idParsed.data);

    if (recCount && recCount > 0) {
        return { ok: false, error: "Esta categoria está em uso por recorrências ativas e não pode ser excluída." };
    }

    const { data, error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", idParsed.data)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        return { ok: false, error: genericDeleteError };
    }

    revalidateFinance();
    return { ok: true };
}
