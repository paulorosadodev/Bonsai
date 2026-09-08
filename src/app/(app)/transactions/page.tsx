import { getTransactions } from "@/lib/data/transactions";
import { getCategories } from "@/lib/data/categories";
import { getGeneralTags, getSpecificTags } from "@/lib/data/tags";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { parseTransactionListParams } from "@/components/features/params";
import { TransactionFilters } from "@/components/features/transaction-filters";
import { TransactionList } from "@/components/features/transaction-list";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const filters = parseTransactionListParams(params);
    const [{ items }, categories, generalTags, specificTags] = await Promise.all([
        getTransactions(filters),
        getCategories(),
        getGeneralTags(),
        getSpecificTags(),
    ]);

    return (
        <div className="flex flex-col gap-4">
            <MonthSwitcher month={filters.month} />
            <TransactionFilters
                values={filters}
                categories={categories}
                generalTags={generalTags}
                specificTags={specificTags}
            />
            {items.length === 0 ? <EmptyState title="Nenhuma transação neste filtro" description="Registre um gasto ou limpe os filtros para ver PIX e cartão." /> : <TransactionList items={items} />}
        </div>
    );
}
