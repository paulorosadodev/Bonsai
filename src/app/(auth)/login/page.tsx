import Image from "next/image";
import { redirect } from "next/navigation";
import logo from "@/assets/logo.png";
import { getSafePath } from "@/lib/supabase/paths";
import { getUserClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    const { user } = await getUserClient();

    if (user) {
        redirect("/");
    }

    const params = await searchParams;

    return (
        <>
            <div className="flex flex-col items-center gap-1">
                <Image src={logo} alt="" width={800} height={800} className="size-60 object-contain" priority />
                <span className="text-6xl font-brand tracking-wide text-text [text-shadow:0_0_8px_color-mix(in_srgb,var(--orchid)_35%,transparent),0_0_18px_color-mix(in_srgb,var(--orchid)_18%,transparent)]">
                    盆栽
                </span>
            </div>
            <LoginForm next={getSafePath(params.next)} />
        </>
    );
}
