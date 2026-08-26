import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function EditTransactionNotFound() {
    return (
        <div className="flex flex-col items-start gap-3 py-6">
            <h1 className="text-2xl font-bold">Transação não encontrada</h1>
            <p className="text-sm text-muted">Ela pode ter sido excluída ou o endereço está incorreto.</p>
            <Link href="/transactions" className={buttonClassName("primary")}>
                Voltar à lista
            </Link>
        </div>
    );
}
