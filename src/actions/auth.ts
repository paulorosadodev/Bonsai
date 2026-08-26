"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/domain/schemas";
import { getSafePath } from "@/lib/supabase/paths";
import { createClient } from "@/lib/supabase/server";
import { genericAuthError, type ActionResult } from "./result";

export async function login(input: unknown, next?: string): Promise<ActionResult> {
    const parsed = loginSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, error: genericAuthError };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
        return { ok: false, error: genericAuthError };
    }

    redirect(getSafePath(next));
}

export async function logout(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}
