"use client";

import { useEffect, useRef } from "react";
import { Button } from "./button";

export function ConfirmDialog({ open, title, description, confirmLabel = "Excluir", cancelLabel = "Cancelar", pending = false, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; pending?: boolean; onConfirm: () => void; onClose: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) {
            return;
        }
        if (open && !node.open) {
            node.showModal();
        }
        if (!open && node.open) {
            node.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-danger/25 bg-surface p-5 text-text shadow-[0_16px_40px_rgb(8_5_16/0.65)]"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <h2 id="confirm-dialog-title" className="text-lg font-bold">
                {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm text-muted">
                {description}
            </p>
            <div className="mt-5 flex flex-col gap-2">
                <Button variant="danger" loading={pending} onClick={onConfirm}>
                    {confirmLabel}
                </Button>
                <Button variant="ghost" disabled={pending} onClick={onClose}>
                    {cancelLabel}
                </Button>
            </div>
        </dialog>
    );
}
