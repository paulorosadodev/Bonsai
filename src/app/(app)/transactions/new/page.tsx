import { TransactionForm } from "@/components/features/transaction-form";
import { currentCivilDate } from "@/components/features/params";
import { getCategories } from "@/lib/data/categories";
import { getGeneralTags, getSpecificTags } from "@/lib/data/tags";
import { getLocations } from "@/lib/data/locations";
import { BackLink } from "@/components/ui/back-link";

export default async function NewTransactionPage() {
    const [categories, generalTags, specificTags, locations] = await Promise.all([getCategories(), getGeneralTags(), getSpecificTags(), getLocations()]);

    return (
        <div className="flex flex-col gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold">Nova transação</h1>
            <TransactionForm mode="create" today={currentCivilDate()} categories={categories} generalTags={generalTags} specificTags={specificTags} locations={locations} />
        </div>
    );
}
