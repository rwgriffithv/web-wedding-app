import { getAll, getAllTabs } from "@/lib/repository/media";
import { Header } from "@/components/header";
import { MediaList } from "./media-list";
import { MediaForm } from "./media-form";

export default function AdminMediaPage() {
  const items = getAll();
  const tabs = getAllTabs();

  return (
    <>
      <Header title="Media Gallery" description="Manage photos and videos." />
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
