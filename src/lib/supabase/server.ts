import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/types/database";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export const createClient = cache(async () => {
    const cookieStore = await cookies();

    return createServerClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet, _headers) {
                try {
                    for (const { name, value, options } of cookiesToSet) {
                        cookieStore.set(name, value, options);
                    }
                } catch {
                    return;
                }
            },
        },
    });
});

export const getUserClient = cache(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    return { supabase, user: error ? null : data.user };
});

export async function requireUser() {
    const { supabase, user } = await getUserClient();

    if (!user) {
        redirect("/login");
    }

    return { supabase, user };
}
