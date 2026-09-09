import { BonsaiLoading } from "@/components/ui/bonsai-loading";

export function PageSkeleton({ blocks }: { blocks?: number } = {}) {
    void blocks;
    return <BonsaiLoading />;
}

export function FormSkeleton() {
    return <BonsaiLoading />;
}
