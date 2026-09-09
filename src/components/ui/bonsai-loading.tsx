import Image from "next/image";
import logo from "@/assets/logo.png";
import { cn } from "@/components/ui/cn";

export interface BonsaiLoadingProps {
    className?: string;
    fullScreen?: boolean;
    label?: string;
    showBrandText?: boolean;
    showProgressBar?: boolean;
    size?: "sm" | "md" | "lg";
}

export function BonsaiLoading({ className, fullScreen = false, label = "Carregando...", showBrandText = false, showProgressBar = true, size = "md" }: BonsaiLoadingProps) {
    const logoSizeClass = size === "sm" ? "size-20 sm:size-22" : size === "lg" ? "size-36 sm:size-42" : "size-28 sm:size-32";

    const outerRippleSizeClass = size === "sm" ? "size-40 sm:size-44" : size === "lg" ? "size-72 sm:size-84" : "size-56 sm:size-64";

    const outerDashedRingSizeClass = size === "sm" ? "size-34 sm:size-38" : size === "lg" ? "size-60 sm:size-70" : "size-48 sm:size-54";

    const innerDashedRingSizeClass = size === "sm" ? "size-28 sm:size-32" : size === "lg" ? "size-50 sm:size-58" : "size-40 sm:size-44";

    const pulseRingSizeClass = size === "sm" ? "size-24 sm:size-26" : size === "lg" ? "size-42 sm:size-50" : "size-34 sm:size-38";

    const innerRippleSizeClass = size === "sm" ? "size-22 sm:size-24" : size === "lg" ? "size-38 sm:size-44" : "size-30 sm:size-34";

    const glowSizeClass = size === "sm" ? "size-28 sm:size-32" : size === "lg" ? "size-52 sm:size-60" : "size-40 sm:size-48";

    return (
        <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center select-none text-center", fullScreen ? "fixed inset-0 z-50 min-h-dvh bg-ink/95 backdrop-blur-md px-4 pt-12" : "min-h-[65dvh] w-full pt-16 pb-12 sm:pt-24 sm:pb-16 px-4", className)}>
            <div className="relative flex flex-col items-center justify-center translate-y-3 sm:translate-y-6">
                {/* Logo & Rings cluster: all concentric circles centered directly on the logo */}
                <div className="relative flex items-center justify-center">
                    {/* Concentric rings wrapper at z-0 */}
                    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                        {/* Ring 1: Huge expanding zen ripple aura ring */}
                        <div className={cn("animate-bonsai-ring absolute rounded-full border border-orchid/25", outerRippleSizeClass)} aria-hidden="true" />

                        {/* Ring 2: Large rotating dashed orbital track with 2 glowing nodes (clockwise) */}
                        <div className={cn("absolute rounded-full border-2 border-dashed border-violet/40 animate-spin [animation-duration:36s]", outerDashedRingSizeClass)} aria-hidden="true">
                            {/* Orbiting node 1: Orchid */}
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-3 rounded-full bg-orchid shadow-[0_0_12px_var(--orchid)]" />
                            {/* Orbiting node 2: Mint */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-mint shadow-[0_0_10px_var(--mint)]" />
                        </div>

                        {/* Ring 3: Counter-rotating dashed orbital ring with 3rd glowing node */}
                        <div className={cn("absolute rounded-full border border-dashed border-orchid/35 animate-spin [animation-duration:26s] [animation-direction:reverse]", innerDashedRingSizeClass)} aria-hidden="true">
                            {/* Orbiting node 3: Violet */}
                            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 size-2.5 rounded-full bg-violet shadow-[0_0_10px_var(--violet)]" />
                        </div>

                        {/* Ring 4: Concentric breathing pulse ring */}
                        <div className={cn("animate-background-pulse absolute rounded-full border border-violet/30", pulseRingSizeClass)} aria-hidden="true" />

                        {/* Ring 5: Inner expanding ripple wave closely wrapping the logo */}
                        <div className={cn("animate-bonsai-ring absolute rounded-full border border-orchid/35", innerRippleSizeClass)} aria-hidden="true" />

                        {/* Soft ambient breathing glow */}
                        <div className={cn("animate-bonsai-glow absolute rounded-full bg-radial from-orchid/25 via-violet/15 to-transparent blur-2xl", glowSizeClass)} aria-hidden="true" />
                    </div>

                    {/* Bonsai logo icon in front at z-10 with floating motion */}
                    <div className="relative z-10 animate-bonsai-float">
                        <Image src={logo} alt="Bonsai" width={logo.width} height={logo.height} unoptimized priority className={cn("object-contain select-none pointer-events-none", logoSizeClass)} />
                    </div>
                </div>

                {/* Optional Japanese brand kanji "盆栽" */}
                {showBrandText && (
                    <span className="relative z-10 mt-6 font-brand text-3xl sm:text-4xl tracking-wider text-text [text-shadow:0_0_12px_color-mix(in_srgb,var(--orchid)_40%,transparent),0_0_24px_color-mix(in_srgb,var(--orchid)_18%,transparent)]" aria-hidden="true">
                        盆栽
                    </span>
                )}

                {/* Indeterminate progress shimmer bar positioned comfortably below the orbits */}
                {showProgressBar && (
                    <div className="relative z-10 mt-20 sm:mt-24 flex flex-col items-center gap-2.5">
                        <div className="relative h-1 w-28 sm:w-32 overflow-hidden rounded-full bg-surface-raised/80" aria-hidden="true">
                            <div className="animate-bonsai-shimmer absolute inset-y-0 w-1/2 rounded-full bg-linear-to-r from-violet via-orchid to-mint" />
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-widest text-muted/80">{label}</span>
                    </div>
                )}
            </div>

            {/* Accessible screen-reader announcement */}
            <span className="sr-only">{label}</span>
        </div>
    );
}
