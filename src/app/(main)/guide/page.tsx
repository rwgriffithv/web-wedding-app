import Link from "next/link";
import Image from "next/image";
import { getAll as getScheduleItems } from "@/lib/repository/schedule";
import { getConfig } from "@/lib/repository/site-config";
import { getImages } from "@/lib/repository/dress-code";
import { getAll as getLodgingOptions } from "@/lib/repository/lodging";
import { MoodBoard } from "./mood-board";

interface GuidePageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { id: "schedule", label: "Schedule" },
  { id: "dress-code", label: "Dress Code" },
  { id: "lodging", label: "Lodging" },
  { id: "gifts", label: "Gifts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isValidTab(tab: string | undefined): tab is TabId {
  return TABS.some((t) => t.id === tab);
}

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const params = await searchParams;
  const activeTab: TabId = isValidTab(params.tab) ? params.tab : "schedule";

  const scheduleItems = getScheduleItems();
  const scheduleText = getConfig("schedule_text");
  const dressCodeText = getConfig("dress_code_text");
  const dressCodeImages = getImages();
  const lodgingOptions = getLodgingOptions();
  const lodgingText = getConfig("lodging_text");
  const giftsText = getConfig("gifts_text");

  return (
    <div className="page-content">
      <h1>Guide</h1>

      <nav className="content-tabs" role="tablist" aria-label="Guide sections">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            id={`guide-tab-${tab.id}`}
            href={tab.id === "schedule" ? "/guide" : `/guide?tab=${tab.id}`}
            className={`content-tab${activeTab === tab.id ? " active" : ""}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`guide-panel-${tab.id}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "schedule" && (
        <div id="guide-panel-schedule" role="tabpanel" aria-labelledby="guide-tab-schedule">
          {scheduleText && <p className="guide-tab-text">{scheduleText}</p>}
          {scheduleItems.length > 0 ? (
            <div className="schedule-timeline">
              {scheduleItems.map((item) => (
                <div className="schedule-item" key={item.id}>
                  <div className="schedule-time">{item.time}</div>
                  <div className="schedule-dot" />
                  <div className="schedule-label">{item.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Schedule coming soon.</p>
          )}
        </div>
      )}

      {activeTab === "dress-code" && (
        <div id="guide-panel-dress-code" role="tabpanel" aria-labelledby="guide-tab-dress-code">
          {!dressCodeText && dressCodeImages.length === 0 ? (
            <p className="empty-state">Dress Code coming soon.</p>
          ) : (
            <>
              {dressCodeText && <p className="guide-tab-text">{dressCodeText}</p>}
              {dressCodeImages.length > 0 && (
                <MoodBoard images={dressCodeImages} />
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "lodging" && (
        <div id="guide-panel-lodging" role="tabpanel" aria-labelledby="guide-tab-lodging">
          {lodgingText && <p className="guide-tab-text">{lodgingText}</p>}
          {lodgingOptions.length === 0 ? (
            <p className="empty-state">Lodging options coming soon.</p>
          ) : (
            <div className="lodging-grid">
              {lodgingOptions.map((option) => (
                <div className="lodging-card" key={option.id}>
                  <Image src={option.thumbnail_url || option.image_url} alt={option.title} width={600} height={200} style={{ objectFit: "cover", width: "100%", height: "200px" }} />
                  <div className="lodging-card-body">
                    <h3>{option.title}</h3>
                    <a href={option.url} target="_blank" rel="noopener noreferrer">
                      View Details &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "gifts" && (
        <div id="guide-panel-gifts" role="tabpanel" aria-labelledby="guide-tab-gifts">
          {giftsText ? (
            <p className="guide-tab-text">{giftsText}</p>
          ) : (
            <p className="empty-state">Gift information coming soon.</p>
          )}
        </div>
      )}
    </div>
  );
}
