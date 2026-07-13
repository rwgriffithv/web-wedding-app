import { getAllConfig } from "@/lib/repository/site-config";
import { getAll } from "@/lib/repository/schedule";
import { MIME_TYPES } from "@/lib/media";
import { CountdownTimer } from "@/components/countdown-timer";

export const revalidate = 60;

export default function HomePage() {
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));
  const title = config.home_title || "";
  const subtitle = config.home_subtitle || "";
  const date = config.home_date || "";
  const time = config.home_time || "";
  const location = config.home_location || "";
  const video = config.home_background_video || "";
  const poster = config.home_background_video_poster || "";
  const videoExt = video.split(".").pop()?.split("?")[0]?.toLowerCase();
  const videoType = videoExt ? MIME_TYPES[`.${videoExt}`] : undefined;
  const scheduleItems = getAll();
  const scheduleRange = scheduleItems.length > 0
    ? `${scheduleItems[0].time} – ${scheduleItems[scheduleItems.length - 1].time}`
    : null;

  let weddingDateStr: string | null = null;
  if (date) {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      weddingDateStr = parsed.toISOString().slice(0, 10) + "T" + (time || "12:00");
    }
  }

  return (
    <div className="home-hero">
      {video ? (
        <video className="home-video" autoPlay muted loop playsInline preload="metadata" poster={poster || undefined} aria-hidden="true">
          <source src={video} type={videoType} />
        </video>
      ) : (
        <div className="home-video" style={{ background: "var(--color-fallback-gradient)" }} />
      )}
      <div className="home-overlay" />
      <div className="home-content">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {(date || location) && <p className="date-location">{date}{date && location && " \u2014 "}{location}</p>}
        {weddingDateStr && <CountdownTimer targetDate={weddingDateStr} />}
        {scheduleRange && <p className="schedule-range">{scheduleRange}</p>}
      </div>
    </div>
  );
}
