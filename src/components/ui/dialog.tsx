"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "./button";

const emptySubscribe = () => () => {};

export function ConfirmDialog({ open, title, description, confirmLabel = "Excluir", cancelLabel = "Cancelar", pending = false, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; pending?: boolean; onConfirm: () => void; onClose: () => void }) {
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

    return createPortal(
        <AnimatePresence>
            {open && (
                <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="fixed inset-0 z-60 flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-[#100b1e]/75 backdrop-blur-sm"
                        onClick={() => {
                            if (!pending) onClose();
                        }}
                        aria-hidden="true"
                    />

                    {/* Dialog Card */}
                    <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15, ease: "easeOut" }} className="relative z-10 my-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-danger/25 bg-surface p-5 text-text shadow-[0_16px_40px_rgb(8_5_16/0.65)]" onClick={(event) => event.stopPropagation()}>
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
