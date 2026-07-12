import { getConfig } from "@/lib/repository/site-config";
import { getAll } from "@/lib/repository/schedule";
import { CountdownTimer } from "@/components/countdown-timer";

export default function HomePage() {
  const title = getConfig("home_title");
  const subtitle = getConfig("home_subtitle");
  const date = getConfig("home_date");
  const time = getConfig("home_time");
  const location = getConfig("home_location");
  const video = getConfig("home_background_video");
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
        <video className="home-video" autoPlay muted loop playsInline aria-hidden="true">
          <source src={video} type="video/mp4" />
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
