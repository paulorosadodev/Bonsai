"use client";

import { useOptimistic } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import logo1 from "@/assets/logo.png";
import { financeSearchHref, isFinancePath, isMonth, searchHref } from "@/components/features/params";
import { Toggle } from "@/components/ui/toggle";
import { useFinancePending } from "./finance-pending";

export function AppHeader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const onFinance = isFinancePath(pathname);
    const monthValue = searchParams.get("month");
    const month = monthValue && isMonth(monthValue) ? monthValue : undefined;
    const urlChecked = searchParams.get("includeReimbursements") === "true";
    const [checked, setChecked] = useOptimistic(urlChecked);
    const { pending, start } = useFinancePending();
    const homeHref = onFinance ? financeSearchHref("/", searchParams) : "/";

    return (
        <header className="sticky top-0 z-30 bg-ink pt-[env(safe-area-inset-top,0px)]">
            <div className="relative mx-auto flex h-14 w-full max-w-lg items-center px-4">
                <Link href={homeHref} aria-label="Bonsai" className="inline-flex items-center gap-2">
                    <Image src={logo1} alt="" width={52} height={52} className="size-13 object-contain" priority />
                    <span className="text-xl font-bold tracking-wide text-text [text-shadow:0_0_8px_color-mix(in_srgb,var(--orchid)_35%,transparent),0_0_18px_color-mix(in_srgb,var(--orchid)_18%,transparent)]">盆栽</span>
                </Link>
                {onFinance ? (
                    <Toggle
                        checked={checked}
                        className="ml-auto gap-2"
                        aria-busy={pending || undefined}
                        onCheckedChange={(next) => {
                            start(() => {
                                setChecked(next);
                                router.replace(searchHref(pathname, { month, includeReimbursements: next }), { scroll: false });
                            });
                        }}
                    >
                        Reembolsos
                        {pending ? <LoaderCircle className="size-4 animate-spin text-orchid" aria-hidden /> : null}
                    </Toggle>
                ) : null}
                {pending ? (
                    <div className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label="Atualizando reembolsos">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-violet" />
                    </div>
                ) : null}
            </div>
        </header>
    );
}
