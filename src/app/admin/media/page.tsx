import { getAll, getAllTabs } from "@/lib/repository/media";
import { getConfig } from "@/lib/repository/site-config";
import { MEDIA_MAX_FILE_SIZE_MB_DEFAULT } from "@/lib/constants";
import { Header } from "@/components/header";
import { MediaList } from "./media-list";
import { MediaForm } from "./media-form";
import { MediaSettingsForm } from "./media-settings-form";

export default function AdminMediaPage() {
  const items = getAll();
  const tabs = getAllTabs();
  const raw = parseInt(getConfig("media_max_file_size_mb"), 10);
  const maxFileSizeMb = String(Number.isFinite(raw) && raw > 0 ? raw : MEDIA_MAX_FILE_SIZE_MB_DEFAULT);

  return (
    <>
      <Header title="Media Gallery" description="Manage photos and videos." />
      <details className="admin-section">
        <summary>Settings</summary>
        <div className="admin-section-body">
          <MediaSettingsForm maxFileSizeMb={maxFileSizeMb} />
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
