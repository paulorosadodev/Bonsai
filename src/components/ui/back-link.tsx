"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackLink() {
    const router = useRouter();

    return (
        <button type="button" className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-orchid hover:bg-surface-raised" onClick={() => router.back()}>
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
        </button>
    );
}
