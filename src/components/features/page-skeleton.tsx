import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            {Array.from({ length: blocks }, (_, index) => (
                <Card key={index} className="flex flex-col gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-24 w-full" />
                </Card>
            ))}
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
        </div>
    );
}
