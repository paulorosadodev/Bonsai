"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    maxWidth?: string;
}

const emptySubscribe = () => () => {};

export function Modal({ open, onClose, title, description, children, maxWidth = "max-w-lg" }: ModalProps) {
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    useEffect(() => {
        if (!open) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
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
    }, [open, onClose]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? "modal-description" : undefined} className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 bg-[#100b1e]/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

                    {/* Dialog Content */}
                    <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15, ease: "easeOut" }} className={`relative z-10 my-auto w-[calc(100%-2rem)] ${maxWidth} rounded-2xl border border-surface-raised/80 bg-surface-raised p-0 text-text shadow-[0_16px_40px_rgb(8_5_16/0.75)]`} onClick={(e) => e.stopPropagation()}>
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
                                <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-violet" aria-label="Fechar">
                                    <X className="size-4.5" aria-hidden />
                                </button>
                            </div>

                            <div className="pt-5">{children}</div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
