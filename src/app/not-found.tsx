import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import logo from "@/assets/logo.png";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="relative isolate min-h-dvh w-full flex flex-col items-center justify-center overflow-hidden px-4 py-12 text-center select-none">
            {/* Large Bonsai hero with concentric celestial rings centered on it */}
            <div className="relative mb-8 flex items-center justify-center">
                {/* Concentric rings centered directly on the logo at z-0 */}
                <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                    {/* Ring 1: Huge expanding zen ripple aura */}
                    <div className="animate-bonsai-ring absolute size-[760px] sm:size-[980px] rounded-full border border-orchid/30" />

                    {/* Ring 2: Large rotating dashed orbital track with glowing nodes */}
                    <div className="absolute size-[620px] sm:size-[780px] rounded-full border-2 border-dashed border-violet/45 animate-spin [animation-duration:40s]">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 size-4 rounded-full bg-orchid shadow-[0_0_18px_var(--orchid)]" />
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rounded-full bg-mint shadow-[0_0_14px_var(--mint)]" />
                    </div>

                    {/* Ring 3: Counter-rotating dashed orbital ring */}
                    <div className="absolute size-[480px] sm:size-[620px] rounded-full border border-dashed border-orchid/40 animate-spin [animation-duration:28s] [animation-direction:reverse]">
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 size-3.5 rounded-full bg-violet shadow-[0_0_14px_var(--violet)]" />
                    </div>

                    {/* Ring 4: Concentric breathing pulse ring */}
                    <div className="animate-background-pulse absolute size-[360px] sm:size-[460px] rounded-full border border-violet/35" />

                    {/* Ring 5: Inner expanding ripple wave closely wrapping the logo */}
                    <div className="animate-bonsai-ring absolute size-[260px] sm:size-[320px] rounded-full border border-orchid/40" />

                    {/* Ambient breathing glow */}
                    <div className="animate-bonsai-glow absolute size-[300px] sm:size-[380px] rounded-full bg-radial from-orchid/25 via-violet/15 to-transparent blur-2xl" />
                </div>

                {/* Big Bonsai Logo in native resolution with floating motion */}
                <div className="relative z-10 animate-bonsai-float">
                    <Image src={logo} alt="Bonsai" width={logo.width} height={logo.height} unoptimized priority className="size-48 sm:size-56 object-contain pointer-events-none" />
                </div>
            </div>

            {/* Error tag */}
            <div className="relative z-10 flex flex-col items-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orchid/25 bg-surface-raised/70 px-3.5 py-1 text-xs font-semibold tracking-wider text-orchid uppercase">
                    <Compass className="size-3.5" aria-hidden="true" />
                    404 • Página não encontrada
                </span>

                {/* Headline */}
                <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-text">Você se perdeu no jardim</h1>

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none justify-center">
                    <Link href="/" className={buttonClassName("primary", "md", "w-full sm:w-auto")}>
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Voltar ao Resumo
                    </Link>
                    <Link href="/transacoes" className={buttonClassName("secondary", "md", "w-full sm:w-auto")}>
                        Ver Transações
                    </Link>
                </div>
            </div>
        </div>
    );
}
