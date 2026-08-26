"use client";

import { motion } from "motion/react";
import { formatBrl } from "@/lib/domain/money";

export function AnimatedAmount({ cents, className = "text-3xl font-bold tabular" }: { cents: number; className?: string }) {
    return (
        <motion.p key={cents} aria-live="polite" className={className} initial={{ opacity: 0.45, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            {formatBrl(cents)}
        </motion.p>
    );
}
