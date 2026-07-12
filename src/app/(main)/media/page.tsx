import Link from "next/link";
import { getAll, getBySection, getAllTabs } from "@/lib/repository/media";
import { MediaGallery } from "./media-gallery";

interface MediaPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function isValidTab(slug: string, tabs: { slug: string }[]): boolean {
  return tabs.some(t => t.slug === slug);
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const params = await searchParams;
  const tabs = getAllTabs();
  const allItems = getAll();

  if (tabs.length === 0) {
    return (
      <div className="page-content">
        <h1>Media</h1>
        {allItems.length === 0 ? (
          <p className="text-muted">Media gallery coming soon.</p>
        ) : (
          <MediaGallery items={allItems} />
        )}
      </div>
    );
  }

  const activeSlug = params.tab && isValidTab(params.tab, tabs) ? params.tab : tabs[0].slug;
  const activeTab = tabs.find(t => t.slug === activeSlug) ?? tabs[0];
  const items = getBySection(activeTab.slug);

  return (
    <div className="page-content">
      <h1>Media</h1>
      <nav className="content-tabs" role="tablist" aria-label="Media sections">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            id={`media-tab-${tab.slug}`}
            href={tab.slug === tabs[0].slug ? "/media" : `/media?tab=${tab.slug}`}
            className={`content-tab${activeTab.slug === tab.slug ? " active" : ""}`}
            role="tab"
            aria-selected={activeTab.slug === tab.slug}
            aria-controls={`media-panel-${tab.slug}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div id={`media-panel-${activeTab.slug}`} role="tabpanel" aria-labelledby={`media-tab-${activeTab.slug}`}>
        {items.length === 0 ? (
          <p className="empty-state">No media in this section yet.</p>
        ) : (
          <MediaGallery items={items} />
        )}
      </div>
    </div>
  );
}
