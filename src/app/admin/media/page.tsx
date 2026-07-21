import { getAll, getAllTabs } from "@/lib/repository/media";
import { getMediaMaxFileSizeMb, getMediaMaxFileSizeTtlSeconds } from "@/lib/site-config";
import { Header } from "@/components/header";
import { MediaList } from "./media-list";
import { MediaForm } from "./media-form";
import { MediaSettingsForm } from "./media-settings-form";

export default function AdminMediaPage() {
  const items = getAll();
  const tabs = getAllTabs();
  const maxFileSizeMb = String(getMediaMaxFileSizeMb());
  const maxFileSizeTtlSeconds = String(getMediaMaxFileSizeTtlSeconds());

  return (
    <>
      <Header title="Media Gallery" description="Manage photos and videos." />
      <details className="admin-section">
        <summary>Settings</summary>
        <div className="admin-section-body">
          <MediaSettingsForm maxFileSizeMb={maxFileSizeMb} maxFileSizeTtlSeconds={maxFileSizeTtlSeconds} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Add Media</summary>
        <div className="admin-section-body">
          <MediaForm tabs={tabs} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Media Items ({items.length})</summary>
        <div className="admin-section-body">
          <MediaList items={items} tabs={tabs} />
        </div>
      </details>
    </>
  );
}
