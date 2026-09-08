import { getSettings } from "@/lib/data/settings";
import { getCategories } from "@/lib/data/categories";
import { getGeneralTags, getSpecificTags } from "@/lib/data/tags";
import { SettingsPanel } from "@/components/features/settings-panel";

export default async function SettingsPage() {
    const [settings, categories, generalTags, specificTags] = await Promise.all([
        getSettings(),
        getCategories(),
        getGeneralTags(),
        getSpecificTags(),
    ]);

    return (
        <div className="flex flex-col gap-4">
            <SettingsPanel
                settings={settings}
                categories={categories}
                generalTags={generalTags}
                specificTags={specificTags}
            />
        </div>
    );
}
