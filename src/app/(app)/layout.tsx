import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
    await requireUser();
    return <AppShell>{children}</AppShell>;
}
