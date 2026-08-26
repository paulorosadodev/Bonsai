import { getTransactions } from "@/lib/data/transactions";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthSwitcher } from "@/components/features/month-switcher";
import { parseTransactionListParams, searchHref } from "@/components/features/params";
import { TransactionFilters } from "@/components/features/transaction-filters";
import { TransactionList } from "@/components/features/transaction-list";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const filters = parseTransactionListParams(params);
    const { items } = await getTransactions(filters);

    return (
        <div className="flex flex-col gap-4">
            <MonthSwitcher month={filters.month} hrefFor={(next) => searchHref("/transactions", { month: next, category: filters.category, paymentMethod: filters.paymentMethod, generalTag: filters.generalTag })} />
            <TransactionFilters values={filters} />
            {items.length === 0 ? <EmptyState title="Nenhuma transação neste filtro" description="Registre um gasto ou limpe os filtros para ver PIX e cartão." /> : <TransactionList items={items} />}
        </div>
    );
}
