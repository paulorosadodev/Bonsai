"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteRecurringOccurrence } from "@/actions/recurrences";
import { deleteTransaction } from "@/actions/transactions";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function DeleteTransactionButton({ id, name, kind = "transaction", occurrenceDate }: { id: string; name: string; kind?: "transaction" | "recurrence"; occurrenceDate?: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const recurring = kind === "recurrence";

    async function onConfirm() {
        setPending(true);
        const result = recurring && occurrenceDate ? await deleteRecurringOccurrence(id, occurrenceDate) : await deleteTransaction(id);
        setPending(false);

        if (!result.ok) {
            toast.error(result.error);
            return;
        }

        setOpen(false);
        toast.success(recurring ? "Recorrência encerrada" : "Transação excluída");
        router.push("/transactions");
        router.refresh();
    }

    return (
        <>
            <Button variant="dangerSoft" size="icon" aria-label={`Excluir ${name}`} onClick={() => setOpen(true)}>
                <Trash2 className="size-4" aria-hidden />
            </Button>
            <ConfirmDialog open={open} title={`Excluir ${name}?`} description={recurring ? "Esta ocorrência e as próximas saem do resumo, da fatura e da lista. O histórico anterior permanece." : "A transação e todas as parcelas ligadas a ela saem do resumo, da fatura e da lista."} confirmLabel={recurring ? "Excluir esta e as próximas recorrências" : "Excluir transação"} pending={pending} onConfirm={onConfirm} onClose={() => !pending && setOpen(false)} />
        </>
    );
}
