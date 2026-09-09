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
                {/* Logo wrapper with all celestial rings centered directly on it */}
                <div className="relative flex items-center justify-center">
                    {/* Concentric rings: centered 100% on the logo */}
                    <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
                        {/* Ring 1: Huge expanding zen ripple aura ring */}
                        <div className="animate-bonsai-ring absolute size-[740px] sm:size-[980px] rounded-full border border-orchid/25" />

                        {/* Ring 2: Large rotating dashed orbital track with glowing nodes */}
                        <div className="absolute size-[580px] sm:size-[780px] rounded-full border-2 border-dashed border-violet/40 animate-spin [animation-duration:40s]">
                            {/* Glowing orbiting node dots */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 size-4 rounded-full bg-orchid shadow-[0_0_18px_var(--orchid)]" />
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rounded-full bg-mint shadow-[0_0_14px_var(--mint)]" />
                        </div>

                        {/* Ring 3: Counter-rotating dashed orbital ring */}
                        <div className="absolute size-[440px] sm:size-[580px] rounded-full border border-dashed border-orchid/35 animate-spin [animation-duration:28s] [animation-direction:reverse]">
                            <div className="absolute top-1/2 -right-2 -translate-y-1/2 size-3.5 rounded-full bg-violet shadow-[0_0_14px_var(--violet)]" />
                        </div>

                        {/* Ring 4: Concentric breathing pulse ring */}
                        <div className="animate-background-pulse absolute size-[320px] sm:size-[440px] rounded-full border border-violet/30" />

                        {/* Ring 5: Inner expanding ripple wave closely wrapping the circular logo */}
                        <div className="animate-bonsai-ring absolute size-[260px] sm:size-[300px] rounded-full border border-orchid/35" />
                    </div>

                    <Image src={logo} alt="" width={800} height={800} className="size-60 object-contain" priority />
                </div>

                <span className="relative z-10 text-6xl font-brand tracking-wide text-text [text-shadow:0_0_8px_color-mix(in_srgb,var(--orchid)_35%,transparent),0_0_18px_color-mix(in_srgb,var(--orchid)_18%,transparent)]">盆栽</span>
            </div>
            <div className="relative z-10">
                <LoginForm next={getSafePath(params.next)} />
            </div>
        </>
    );
}
