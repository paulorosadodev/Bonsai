"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/actions/auth";
import { saveSettings } from "@/actions/settings";
import { settingsSchema } from "@/lib/domain/schemas";
import type { CycleSettings } from "@/lib/data/types";
import { buttonClassName, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const days = Array.from({ length: 28 }, (_, index) => index + 1);

export function SettingsPanel({ settings }: { settings: CycleSettings }) {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            closingDay: settings.closingDay,
            dueDay: settings.dueDay,
        },
    });

    return (
        <div className="flex flex-col gap-4">
            <Card className="flex flex-col gap-4">
                <form
                    className="flex flex-col gap-4"
                    onSubmit={handleSubmit(async (values) => {
                        const result = await saveSettings(values);

                        if (!result.ok) {
                            toast.error(result.error);
                            return;
                        }

                        toast.success("Ciclo atualizado");
                        router.refresh();
                    })}
                    noValidate
                >
                    <Select id="closingDay" label="Dia de Fechamento" hint="Padrão: 14" error={errors.closingDay?.message} {...register("closingDay")}>
                        {days.map((day) => (
                            <option key={day} value={day}>
                                {day}
                            </option>
                        ))}
                    </Select>
                    <Select id="dueDay" label="Dia de Vencimento" hint="Padrão: 20" error={errors.dueDay?.message} {...register("dueDay")}>
                        {days.map((day) => (
                            <option key={day} value={day}>
                                {day}
                            </option>
                        ))}
                    </Select>
                    <p className="text-sm text-muted">Mudar o fechamento ou o vencimento recalcula só o mês atual e os próximos. Faturas já fechadas permanecem como estão.</p>
                    <Button type="submit" loading={isSubmitting}>
                        Salvar ciclo
                    </Button>
                </form>
            </Card>
            <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-bold">Exportar CSV</h2>
                <a href="/api/exports/transactions" className={buttonClassName("secondary")}>
                    Exportar transações
                </a>
                <a href="/api/exports/entries" className={buttonClassName("secondary")}>
                    Exportar lançamentos
                </a>
            </Card>
            <form action={logout}>
                <Button type="submit" variant="dangerSoft" className="w-full">
                    Sair
                </Button>
            </form>
        </div>
    );
}
