import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-3 px-4 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            <h1 className="text-2xl font-bold">Página não encontrada</h1>
            <p className="text-sm text-muted">Esse endereço não existe no Bonsai.</p>
            <Link href="/" className={buttonClassName("primary")}>
                Ir para o resumo
            </Link>
        </div>
    );
}
