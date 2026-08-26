function readRequired(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing ${name}`);
    }

    return value;
}

export function getSupabaseUrl(): string {
    return readRequired("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey(): string {
    return readRequired("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
