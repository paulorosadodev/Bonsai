"use client";

import { useState, type FormEvent } from "react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { messageTone } from "@/components/ui/message";

export function LoginForm({ next }: { next: string }) {
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setError(null);
        const result = await login(
            {
                email: String(form.get("email") ?? ""),
                password: String(form.get("password") ?? ""),
            },
            next,
        );

        if (result && !result.ok) {
            setError(result.error);
            setPending(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field id="email" name="email" type="email" autoComplete="email" required maxLength={254} label="E-mail" />
            <Field id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} label="Senha" />
            {error ? (
                <p role="alert" className={messageTone.danger}>
                    {error}
                </p>
            ) : null}
            <Button type="submit" loading={pending}>
                Entrar
            </Button>
        </form>
    );
}
