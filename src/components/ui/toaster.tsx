"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
    return (
        <Sonner
            theme="dark"
            richColors
            position="top-center"
            offset="calc(env(safe-area-inset-top, 0px) + 4.25rem)"
            mobileOffset="calc(env(safe-area-inset-top, 0px) + 4.25rem)"
            style={{ zIndex: 99999 }}
            toastOptions={{
                classNames: {
                    toast: "font-sans shadow-[0_12px_32px_rgb(8_5_16/0.55)] pointer-events-auto",
                    title: "font-medium",
                    description: "opacity-90",
                },
            }}
        />
    );
}
