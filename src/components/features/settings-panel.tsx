"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/actions/auth";
import { saveSettings } from "@/actions/settings";
import { settingsSchema } from "@/lib/domain/schemas";
import { formatBrl } from "@/lib/domain/money";
import type { CategoryOption, GeneralTagOption, SpecificTagOption } from "@/lib/domain/catalog";
import type { LocationOption } from "@/lib/data/locations";
import type { CycleSettings } from "@/lib/data/types";
import { Download, FileSpreadsheet, ReceiptText, LogOut, PiggyBank, Wallet, CalendarClock, CalendarCheck, Check } from "lucide-react";
import { buttonClassName, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CategoryManager } from "./category-manager";
import { GeneralTagManager } from "./general-tag-manager";
import { LocationManager } from "./location-manager";

const days = Array.from({ length: 28 }, (_, index) => index + 1);

interface SettingsPanelProps {
    settings: CycleSettings;
    categories?: CategoryOption[];
    generalTags?: GeneralTagOption[];
    specificTags?: SpecificTagOption[];
    locations?: LocationOption[];
}

export function SettingsPanel({ settings, categories = [], generalTags = [], specificTags = [], locations = [] }: SettingsPanelProps) {
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
            monthlyBudget: settings.monthlyBudgetCents ? formatBrl(settings.monthlyBudgetCents) : "",
        },
    });

    const closingDay = useWatch({ control, name: "closingDay" });
    const dueDay = useWatch({ control, name: "dueDay" });

    return (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* Coluna Esquerda no Desktop (Orçamento, Exportação, Sessão) */}
            <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-5 lg:sticky lg:top-18">
                {/* 1. Orçamento & Ciclo */}
                <div className="order-1 lg:order-0">
                    <Card className="flex flex-col gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet">
                                <PiggyBank className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold">Orçamento & Ciclo</h2>
                                <p className="text-xs text-muted">Defina seu teto de gastos mensal e o ciclo de fechamento das faturas.</p>
                            </div>
                        </div>
                        <form
                            className="flex flex-col gap-4"
                            onSubmit={handleSubmit(async (values) => {
                                const result = await saveSettings(values);

                                if (!result.ok) {
                                    toast.error(result.error);
                                    return;
                                }

                                toast.success("Configurações atualizadas");
                                router.refresh();
                            })}
                            noValidate
                        >
                            <Controller
                                control={control}
                                name="monthlyBudget"
                                render={({ field }) => (
                                    <CurrencyInput
                                        id="monthlyBudget"
                                        label={
                                            <span className="flex items-center gap-1.5">
                                                <Wallet className="size-3.5 text-violet" />
                                                Teto de Gasto Mensal
                                            </span>
                                        }
                                        hint="Válido a partir do mês corrente. Meses passados mantêm seus tetos históricos."
                                        placeholder="Ex: R$ 3.000,00"
                                        value={typeof field.value === "string" ? field.value : ""}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        error={errors.monthlyBudget?.message}
                                        className="bg-surface-raised"
                                    />
                                )}
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Select
                                    id="closingDay"
                                    name="closingDay"
                                    label={
                                        <span className="flex items-center gap-1.5">
                                            <CalendarClock className="size-3.5 text-orchid" />
                                            Dia de Fechamento
                                        </span>
                                    }
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
                                    label={
                                        <span className="flex items-center gap-1.5">
                                            <CalendarCheck className="size-3.5 text-mint" />
                                            Dia de Vencimento
                                        </span>
                                    }
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
                            </div>
                            <p className="text-xs text-muted">Mudar o fechamento ou o vencimento recalcula só o mês atual e os próximos. Faturas já fechadas permanecem como estão.</p>
                            <Button type="submit" loading={isSubmitting} className="gap-2">
                                <Check className="size-4" />
                                Salvar alterações
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* 5. Exportar CSV */}
                <div className="order-5 lg:order-0">
                    <Card className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet">
                                <Download className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold">Exportar Dados</h2>
                                <p className="text-xs text-muted">Baixe seus dados financeiros em formato CSV.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
                            <a href="/api/exports/transactions" className={buttonClassName("secondary", "sm", "w-full text-xs gap-2 justify-center")}>
                                <FileSpreadsheet className="size-3.5 text-mint" />
                                Transações
                            </a>
                            <a href="/api/exports/entries" className={buttonClassName("secondary", "sm", "w-full text-xs gap-2 justify-center")}>
                                <ReceiptText className="size-3.5 text-orchid" />
                                Lançamentos
                            </a>
                        </div>
                    </Card>
                </div>

                {/* 6. Logout / Sessão */}
                <div className="order-6 lg:order-0">
                    <Card className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger">
                                <LogOut className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-text">Sessão</h2>
                                <p className="text-xs text-muted">Desconectar da sua conta</p>
                            </div>
                        </div>
                        <form action={logout}>
                            <Button type="submit" variant="dangerSoft" size="sm" className="gap-1.5">
                                <LogOut className="size-3.5" />
                                Sair
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>

            {/* Coluna Direita no Desktop (Categorias, Tags Gerais, Locais) */}
            <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-7">
                {/* 2. Categorias & Sub-tags */}
                <div className="order-2 lg:order-0">
                    <Card className="flex flex-col gap-4">
                        <CategoryManager categories={categories} specificTags={specificTags} generalTags={generalTags} />
                    </Card>
                </div>

                {/* 3. Tags Gerais */}
                <div className="order-3 lg:order-0">
                    <Card className="flex flex-col gap-4">
                        <GeneralTagManager generalTags={generalTags} categories={categories} />
                    </Card>
                </div>

                {/* 4. Locais */}
                <div className="order-4 lg:order-0">
                    <Card className="flex flex-col gap-4">
                        <LocationManager locations={locations} />
                    </Card>
                </div>
            </div>
        </div>
    );
}
