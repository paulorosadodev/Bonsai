"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    maxWidth?: string;
}

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    maxWidth = "max-w-lg",
}: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className={`m-auto w-[calc(100%-2rem)] ${maxWidth} rounded-2xl bg-surface-raised p-0 text-text shadow-[0_16px_40px_rgb(8_5_16/0.75)] backdrop:bg-black/75 backdrop:backdrop-blur-sm`}
            aria-labelledby="modal-title"
            aria-describedby={description ? "modal-description" : undefined}
            onClose={onClose}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="flex flex-col p-6">
                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex flex-col gap-1">
                        <h3 id="modal-title" className="text-lg font-bold text-text">
                            {title}
                        </h3>
                        {description ? (
                            <p id="modal-description" className="text-xs text-muted">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-violet"
                        aria-label="Fechar"
                    >
                        <X className="size-4.5" aria-hidden />
                    </button>
                </div>

                <div className="pt-5">{children}</div>
            </div>
        </dialog>
    );
}
