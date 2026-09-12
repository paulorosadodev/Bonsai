"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { sanitizeReturnUrl } from "@/lib/navigation/return-url";

export function BackLink({ fallbackHref = "/transacoes" }: { fallbackHref?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl");

    const handleBack = () => {
        if (returnUrl) {
            router.push(sanitizeReturnUrl(returnUrl, fallbackHref));
        } else if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(fallbackHref);
        }
    };

    return (
        <button type="button" className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-orchid hover:bg-surface-raised" onClick={handleBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
        </button>
    );
}
