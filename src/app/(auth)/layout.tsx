import type { ReactNode } from "react";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className="relative isolate min-h-dvh overflow-hidden">
            <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">{children}</div>
        </div>
    );
}
