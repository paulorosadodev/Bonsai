import { getSettings } from "@/lib/data/settings";
import { SettingsPanel } from "@/components/features/settings-panel";

export default async function SettingsPage() {
    const settings = await getSettings();

    return (
        <div className="flex flex-col gap-4">

            <SettingsPanel settings={settings} />
        </div>
    );
}
