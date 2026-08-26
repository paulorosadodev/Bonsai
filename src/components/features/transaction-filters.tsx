import { categories, categoryLabels, generalTagLabels, generalTags, paymentMethodLabels, paymentMethods } from "@/lib/domain/catalog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { TransactionFilters } from "@/lib/domain/schemas";

export function TransactionFilters({ values }: { values: Pick<TransactionFilters, "month" | "category" | "paymentMethod" | "generalTag"> }) {
    return (
        <form method="get" className="flex flex-col gap-3">
            <input type="hidden" name="month" value={values.month ?? ""} />
            <Select id="category" name="category" label="Categoria" defaultValue={values.category ?? ""}>
                <option value="">Todas</option>
                {categories.map((category) => (
                    <option key={category} value={category}>
                        {categoryLabels[category]}
                    </option>
                ))}
            </Select>
            <Select id="paymentMethod" name="paymentMethod" label="Pagamento" defaultValue={values.paymentMethod ?? ""}>
                <option value="">Todos</option>
                {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                        {paymentMethodLabels[method]}
                    </option>
                ))}
            </Select>
            <Select id="generalTag" name="generalTag" label="Tag" defaultValue={values.generalTag ?? ""}>
                <option value="">Todas</option>
                {generalTags.map((tag) => (
                    <option key={tag} value={tag}>
                        {generalTagLabels[tag]}
                    </option>
                ))}
            </Select>
            <Button type="submit" variant="secondary">
                Filtrar
            </Button>
        </form>
    );
}
