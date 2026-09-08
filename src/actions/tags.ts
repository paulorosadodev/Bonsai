"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
    generalTagCreateSchema,
    generalTagUpdateSchema,
    specificTagCreateSchema,
    specificTagUpdateSchema,
    type GeneralTagCreateInput,
    type GeneralTagUpdateInput,
    type SpecificTagCreateInput,
    type SpecificTagUpdateInput,
} from "@/lib/domain/schemas";
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
        .replace(/^_+|_+$/g, "") || "tag";
}

function revalidateFinance() {
    revalidatePath("/", "layout");
}

export async function createGeneralTag(input: GeneralTagCreateInput): Promise<ActionResult<{ id: string }>> {
    const parsed = generalTagCreateSchema.safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_general_tags")
        .insert({
            user_id: user.id,
            name: parsed.data.name,
            slug: slugify(parsed.data.name),
            color: parsed.data.color,
            icon: parsed.data.icon ?? undefined,
        })
        .select("id")
        .single();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma tag geral com este nome." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function updateGeneralTag(id: string, input: GeneralTagUpdateInput): Promise<ActionResult<{ id: string }>> {
    const idParsed = idSchema.safeParse(id);
    const parsed = generalTagUpdateSchema.safeParse(input);

    if (!idParsed.success) {
        return { ok: false, error: "ID de tag inválido" };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const updateData: Database["public"]["Tables"]["user_general_tags"]["Update"] = {};
    if (parsed.data.name !== undefined) {
        updateData.name = parsed.data.name;
        updateData.slug = slugify(parsed.data.name);
    }
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon ?? undefined;

    const { data, error } = await supabase
        .from("user_general_tags")
        .update(updateData)
        .eq("id", idParsed.data)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma tag geral com este nome." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function deleteGeneralTag(id: string): Promise<ActionResult> {
    const idParsed = idSchema.safeParse(id);

    if (!idParsed.success) {
        return { ok: false, error: "ID de tag inválido" };
    }

    const { supabase, user } = await requireUser();

    // Delete the tag from user_general_tags
    const { data, error } = await supabase
        .from("user_general_tags")
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

export async function createSpecificTag(input: SpecificTagCreateInput): Promise<ActionResult<{ id: string }>> {
    const parsed = specificTagCreateSchema.safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_specific_tags")
        .insert({
            user_id: user.id,
            category_id: parsed.data.categoryId,
            name: parsed.data.name,
            slug: slugify(parsed.data.name),
            color: parsed.data.color,
            icon: parsed.data.icon ?? undefined,
        })
        .select("id")
        .single();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma tag específica com este nome nesta categoria." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function updateSpecificTag(id: string, input: SpecificTagUpdateInput): Promise<ActionResult<{ id: string }>> {
    const idParsed = idSchema.safeParse(id);
    const parsed = specificTagUpdateSchema.safeParse(input);

    if (!idParsed.success) {
        return { ok: false, error: "ID de tag inválido" };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const updateData: Database["public"]["Tables"]["user_specific_tags"]["Update"] = {};
    if (parsed.data.name !== undefined) {
        updateData.name = parsed.data.name;
        updateData.slug = slugify(parsed.data.name);
    }
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon ?? undefined;

    const { data, error } = await supabase
        .from("user_specific_tags")
        .update(updateData)
        .eq("id", idParsed.data)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        if (error?.code === "23505") {
            return { ok: false, error: "Já existe uma tag específica com este nome nesta categoria." };
        }
        return { ok: false, error: genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data.id };
}

export async function deleteSpecificTag(id: string): Promise<ActionResult> {
    const idParsed = idSchema.safeParse(id);

    if (!idParsed.success) {
        return { ok: false, error: "ID de tag inválido" };
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from("user_specific_tags")
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
