"use client";

import { useEffect } from "react";

const SCROLL_PREFIX = "bonsai_scroll_";
const LAST_EDITED_KEY = "bonsai_last_edited_id";

/**
 * Saves current scroll position and target item ID in sessionStorage before navigating to edit.
 */
export function recordNavigationState(currentUrl: string, itemId?: string) {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.setItem(`${SCROLL_PREFIX}${currentUrl}`, String(window.scrollY));
        if (itemId) {
            sessionStorage.setItem(LAST_EDITED_KEY, itemId);
        }
    } catch {
        // Ignore storage errors (e.g. private mode limits)
    }
}

/**
 * Hook to automatically restore scroll position and highlight the last edited item when returning.
 */
export function useRestoreScroll(currentUrl: string) {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const scrollKey = `${SCROLL_PREFIX}${currentUrl}`;
        let savedY: string | null = null;
        let lastEditedId: string | null = null;

        try {
            savedY = sessionStorage.getItem(scrollKey);
            lastEditedId = sessionStorage.getItem(LAST_EDITED_KEY);
        } catch {
            return;
        }

        if (savedY !== null) {
            const y = Number(savedY);
            try {
                sessionStorage.removeItem(scrollKey);
                sessionStorage.removeItem(LAST_EDITED_KEY);
            } catch {
                // Ignore
            }

            if (!Number.isNaN(y)) {
                // Immediate attempt
                window.scrollTo({ top: y, behavior: "instant" });

                // Frame-delayed attempt to ensure dynamic DOM has rendered
                const raf = requestAnimationFrame(() => {
                    window.scrollTo({ top: y, behavior: "instant" });

                    // If we have an element ID, briefly highlight it
                    if (lastEditedId) {
                        const el = document.getElementById(`tx-${lastEditedId}`) || document.getElementById(`entry-${lastEditedId}`);
                        if (el) {
                            el.classList.add("ring-2", "ring-violet", "ring-offset-2", "ring-offset-surface-raised");
                            setTimeout(() => {
                                el.classList.remove("ring-2", "ring-violet", "ring-offset-2", "ring-offset-surface-raised");
                            }, 1800);
                        }
                    }
                });

                return () => cancelAnimationFrame(raf);
            }
        }
    }, [currentUrl]);
}
