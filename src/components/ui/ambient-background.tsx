import { cn } from "@/components/ui/cn";

export interface AmbientBackgroundProps {
    className?: string;
}

export function AmbientBackground({ className }: AmbientBackgroundProps) {
    return (
        <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 overflow-hidden select-none z-0", className)}>
            {/* Upper area stays clean solid ink, ensuring seamless match with top navbar */}

            {/* Glowing orbs confined strictly to the bottom portion of the screen */}
            {/* Orb 1: Bottom-left violet/orchid drifting glow */}
            <div className="animate-ambient-slow absolute -bottom-36 -left-28 size-[520px] sm:size-[660px] rounded-full bg-linear-to-tr from-violet/35 via-orchid/25 to-transparent blur-[90px]" />

            {/* Orb 2: Bottom-right mint/violet drifting glow */}
            <div className="animate-ambient-reverse absolute -bottom-36 -right-28 size-[480px] sm:size-[620px] rounded-full bg-linear-to-tl from-mint/25 via-violet/28 to-transparent blur-[100px]" />

            {/* Orb 3: Lower-center breathing orchid aura */}
            <div className="animate-bonsai-glow absolute bottom-8 left-1/2 size-[360px] sm:size-[480px] -translate-x-1/2 rounded-full bg-radial from-orchid/20 via-violet/12 to-transparent blur-[85px]" />
        </div>
    );
}
