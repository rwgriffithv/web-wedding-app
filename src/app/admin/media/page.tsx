import { getAll, getAllTabs } from "@/lib/repository/media";
import { getAllConfig } from "@/lib/repository/site-config";
import { getMediaMaxFileSizeMb, getMediaMaxFileSizeTtlSeconds } from "@/lib/site-config";
import { Header } from "@/components/header";
import { RateLimitForm } from "@/components/rate-limit-form";
import { MEDIA_RATE_LIMIT_MAX_KEY, MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, MEDIA_RATE_LIMIT_MAX_DEFAULT, MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";
import { MediaList } from "./media-list";
import { MediaForm } from "./media-form";
import { MediaSettingsForm } from "./media-settings-form";

export default function AdminMediaPage() {
  const items = getAll();
  const tabs = getAllTabs();
  const maxFileSizeMb = String(getMediaMaxFileSizeMb());
  const maxFileSizeTtlSeconds = String(getMediaMaxFileSizeTtlSeconds());
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));

  return (
    <>
      <Header title="Media Gallery" description="Manage photos and videos." />
      <details className="admin-section">
        <summary>Settings</summary>
        <div className="admin-section-body">
          <MediaSettingsForm maxFileSizeMb={maxFileSizeMb} maxFileSizeTtlSeconds={maxFileSizeTtlSeconds} />
        </div>
      </details>
      <details className="admin-section">
        <summary>Rate Limiting</summary>
        <div className="admin-section-body">
          <RateLimitForm
            config={config}
            maxKey={MEDIA_RATE_LIMIT_MAX_KEY}
            windowKey={MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY}
            maxDefault={String(MEDIA_RATE_LIMIT_MAX_DEFAULT)}
            windowDefault={String(MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)}
            description="Rate limiting for media file and list requests per IP. Cached images are not affected (browser serves from cache)."
            revalidatePaths={["/admin/media"]}
          />
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
