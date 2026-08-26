import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

function copySessionCookies(from: NextResponse, to: NextResponse) {
    for (const cookie of from.cookies.getAll()) {
        to.cookies.set(cookie);
    }

    for (const header of ["cache-control", "expires", "pragma"] as const) {
        const value = from.headers.get(header);

        if (value) {
            to.headers.set(header, value);
        }
    }

    return to;
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet, headers) {
                for (const { name, value } of cookiesToSet) {
                    request.cookies.set(name, value);
                }

                response = NextResponse.next({ request });

                for (const { name, value, options } of cookiesToSet) {
                    response.cookies.set(name, value, options);
                }

                for (const [key, value] of Object.entries(headers)) {
                    response.headers.set(key, value);
                }
            },
        },
    });

    const { data } = await supabase.auth.getClaims();

    return {
        response,
        hasSession: Boolean(data?.claims),
        copySessionCookies,
    };
}
