import { getConfig } from "@/lib/repository/site-config";
import { getAll } from "@/lib/repository/schedule";

export default function HomePage() {
  const title = getConfig("home_title");
  const subtitle = getConfig("home_subtitle");
  const date = getConfig("home_date");
  const location = getConfig("home_location");
  const video = getConfig("home_background_video");
  const scheduleItems = getAll();
  const scheduleRange = scheduleItems.length > 0
    ? `${scheduleItems[0].time} – ${scheduleItems[scheduleItems.length - 1].time}`
    : null;

  return (
    <div className="home-hero">
      {video ? (
        <video className="home-video" autoPlay muted loop playsInline>
          <source src={video} type="video/mp4" />
        </video>
      ) : (
        <div className="home-video" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} />
      )}
      <div className="home-overlay" />
      <div className="home-content">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        <p className="date-location">{date} &mdash; {location}</p>
        {scheduleRange && <p className="schedule-range">{scheduleRange}</p>}
      </div>
    </div>
  );
}
