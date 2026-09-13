"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { changePassword } from "@/actions/auth";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { messageTone } from "@/components/ui/message";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    id: string;
    label: string;
    error?: string;
    hint?: string;
}

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(({ id, label, error, hint, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium text-text">
                {label}
            </label>
            <div className="relative">
                <input ref={ref} id={id} type={showPassword ? "text" : "password"} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn("min-h-11 w-full rounded-xl border-0 bg-surface-raised px-3 pr-11 text-base text-text transition-colors focus:ring-1 focus:ring-violet", error && "outline-2 outline-solid outline-danger", className)} {...props} />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition-colors hover:text-text focus:outline-none" aria-label={showPassword ? "Ocultar senha" : "Ver senha"} tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
            </div>
            {error ? (
                <p id={errorId} className={messageTone.danger}>
                    {error}
                </p>
            ) : null}
            {hint && !error ? (
                <p id={hintId} className="text-sm text-muted">
                    {hint}
                </p>
            ) : null}
        </div>
    );
});

PasswordField.displayName = "PasswordField";

export function ChangePasswordCard() {
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordInput>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: ChangePasswordInput) {
        const result = await changePassword(values);

        if (!result.ok) {
            if (result.fieldErrors?.currentPassword) {
                setError("currentPassword", { message: result.fieldErrors.currentPassword[0] });
            }
            toast.error(result.error);
            return;
        }

        toast.success("Senha alterada com sucesso!");
        reset();
    }

    return (
        <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet">
                    <KeyRound className="size-4" />
                </div>
                <div>
                    <h2 className="text-base font-bold">Segurança</h2>
                    <p className="text-xs text-muted">Altere a sua senha de acesso à conta.</p>
                </div>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <PasswordField id="currentPassword" label="Senha Atual" autoComplete="current-password" placeholder="••••••••" error={errors.currentPassword?.message} {...register("currentPassword")} />

                <PasswordField id="newPassword" label="Nova Senha" autoComplete="new-password" placeholder="No mínimo 8 caracteres" error={errors.newPassword?.message} {...register("newPassword")} />

                <PasswordField id="confirmPassword" label="Confirmar Nova Senha" autoComplete="new-password" placeholder="Repita a nova senha" error={errors.confirmPassword?.message} {...register("confirmPassword")} />

                <Button type="submit" loading={isSubmitting} className="gap-2">
                    <Check className="size-4" />
                    Salvar nova senha
                </Button>
            </form>
        </Card>
    );
}
