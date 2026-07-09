import { getSections, getBySection } from "@/lib/repository/media";
import { MediaGallery } from "./media-gallery";

export default function MediaPage() {
  const sections = getSections();
  const sectionData = sections.map((s) => ({ section: s, items: getBySection(s) }));

  return (
    <div className="page-content">
      <h1>Media</h1>
      {sectionData.length === 0 ? (
        <p style={{ color: "var(--color-muted)" }}>Media gallery coming soon.</p>
      ) : (
        sectionData.map(({ section, items }) => (
          <div className="media-section" key={section}>
            <h2>{section}</h2>
            <MediaGallery items={items} />
          </div>
        ))
      )}
    </div>
  );
}
