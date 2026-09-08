"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/actions/auth";
import { saveSettings } from "@/actions/settings";
import { settingsSchema } from "@/lib/domain/schemas";
import type { CategoryOption, GeneralTagOption, SpecificTagOption } from "@/lib/domain/catalog";
import type { CycleSettings } from "@/lib/data/types";
import { buttonClassName, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CategoryManager } from "./category-manager";
import { GeneralTagManager } from "./general-tag-manager";

const days = Array.from({ length: 28 }, (_, index) => index + 1);

interface SettingsPanelProps {
    settings: CycleSettings;
    categories?: CategoryOption[];
    generalTags?: GeneralTagOption[];
    specificTags?: SpecificTagOption[];
}

export function SettingsPanel({
    settings,
    categories = [],
    generalTags = [],
    specificTags = [],
}: SettingsPanelProps) {
    const router = useRouter();
    const {
        control,
        setValue,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            closingDay: settings.closingDay,
            dueDay: settings.dueDay,
        },
    });

    const closingDay = useWatch({ control, name: "closingDay" });
    const dueDay = useWatch({ control, name: "dueDay" });

    return (
        <div className="flex flex-col gap-6">
            {/* Invoice Cycle Card */}
            <Card className="flex flex-col gap-4">
                <h2 className="text-lg font-bold">Ciclo de Fatura</h2>
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
                    <Select
                        id="closingDay"
                        name="closingDay"
                        label="Dia de Fechamento"
                        hint="Padrão: 14"
                        error={errors.closingDay?.message}
                        value={String(closingDay)}
                        onChange={(val) => setValue("closingDay", Number(val), { shouldValidate: true })}
                    >
                        {days.map((day) => (
                            <option key={day} value={String(day)}>
                                {day}
                            </option>
                        ))}
                    </Select>
                    <Select
                        id="dueDay"
                        name="dueDay"
                        label="Dia de Vencimento"
                        hint="Padrão: 20"
                        error={errors.dueDay?.message}
                        value={String(dueDay)}
                        onChange={(val) => setValue("dueDay", Number(val), { shouldValidate: true })}
                    >
                        {days.map((day) => (
                            <option key={day} value={String(day)}>
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

            {/* Category Management Card (incorporating Specific Tags) */}
            <Card className="flex flex-col gap-4">
                <CategoryManager categories={categories} specificTags={specificTags} />
            </Card>

            {/* General Tags Card */}
            <Card className="flex flex-col gap-4">
                <GeneralTagManager generalTags={generalTags} />
            </Card>

            {/* CSV Export Card */}
            <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-bold">Exportar CSV</h2>
                <a href="/api/exports/transactions" className={buttonClassName("secondary")}>
                    Exportar transações
                </a>
                <a href="/api/exports/entries" className={buttonClassName("secondary")}>
                    Exportar lançamentos
                </a>
            </Card>

            {/* Logout Button */}
            <form action={logout}>
                <Button type="submit" variant="dangerSoft" className="w-full">
                    Sair
                </Button>
            </form>
        </div>
    );
}
