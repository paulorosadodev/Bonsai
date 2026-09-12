"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

const emptySubscribe = () => () => {};

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    pending?: boolean;
    itemPreview?: ReactNode;
    variant?: "danger" | "warning";
    onConfirm: () => void;
    onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Excluir", cancelLabel = "Cancelar", pending = false, itemPreview, variant = "danger", onConfirm, onClose }: ConfirmDialogProps) {
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    useEffect(() => {
        if (!open) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !pending) {
                onClose();
            }
        }

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, pending, onClose]);

    if (!mounted) return null;

    const isDanger = variant === "danger";

    return createPortal(
        <AnimatePresence>
            {open && (
                <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="fixed inset-0 z-60 flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="fixed inset-0 bg-[#100b1e]/80 backdrop-blur-md"
                        onClick={() => {
                            if (!pending) onClose();
                        }}
                        aria-hidden="true"
                    />

                    {/* Dialog Card */}
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.16, ease: "easeOut" }} className="relative z-10 my-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-surface p-5 sm:p-6 text-text shadow-[0_24px_50px_rgb(8_5_16/0.85)]" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start gap-3.5">
                            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", isDanger ? "border-danger/30 bg-danger/15 text-danger" : "border-warning/30 bg-warning/15 text-warning")}>{isDanger ? <Trash2 className="size-5" aria-hidden /> : <AlertTriangle className="size-5" aria-hidden />}</div>

                            <div className="flex flex-col min-w-0 pt-0.5">
                                <h2 id="confirm-dialog-title" className="text-base font-bold text-text">
                                    {title}
                                </h2>
                                <p id="confirm-dialog-description" className="mt-1 text-xs text-muted leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {itemPreview && <div className="mt-4 rounded-xl border border-white/5 bg-surface-raised/70 p-3">{itemPreview}</div>}

                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                            <Button variant="ghost" size="sm" disabled={pending} onClick={onClose} className="min-h-9 h-9 px-3.5 text-xs font-semibold text-muted hover:text-text w-full sm:w-auto">
                                {cancelLabel}
                            </Button>
                            <Button variant={isDanger ? "danger" : "primary"} size="sm" loading={pending} onClick={onConfirm} className="min-h-9 h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm w-full sm:w-auto">
                                {confirmLabel}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
