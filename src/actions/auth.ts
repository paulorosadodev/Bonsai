"use server";

import { redirect } from "next/navigation";
import { changePasswordSchema, loginSchema } from "@/lib/domain/schemas";
import { getSafePath } from "@/lib/supabase/paths";
import { createClient, requireUser } from "@/lib/supabase/server";
import { fromZodError, genericAuthError, type ActionResult } from "./result";

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

function formatAuthError(message: string): string {
    if (message.toLowerCase().includes("different from the old password")) {
        return "A nova senha deve ser diferente da senha anterior.";
    }
    if (message.toLowerCase().includes("at least") || message.toLowerCase().includes("characters")) {
        return "A nova senha deve conter pelo menos 8 caracteres.";
    }
    if (message.toLowerCase().includes("weak")) {
        return "A nova senha é muito fraca. Escolha uma senha mais segura.";
    }
    return message || "Não foi possível alterar a senha. Tente novamente.";
}

export async function changePassword(input: unknown): Promise<ActionResult> {
    const parsed = changePasswordSchema.safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();

    if (!user?.email) {
        return { ok: false, error: "Usuário não possui e-mail associado." };
    }

    // Valida a senha atual tentando autenticar
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.currentPassword,
    });

    if (verifyError) {
        return {
            ok: false,
            error: "A senha atual está incorreta.",
            fieldErrors: {
                currentPassword: ["A senha atual está incorreta."],
            },
        };
    }

    // Atualiza para a nova senha
    const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
    });

    if (updateError) {
        return {
            ok: false,
            error: formatAuthError(updateError.message),
        };
    }

    return { ok: true };
}
