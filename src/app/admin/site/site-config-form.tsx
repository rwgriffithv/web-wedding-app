"use client";

import { useRef, useState, useActionState } from "react";
import { saveSiteConfig } from "./actions";
import { FileUpload } from "@/components/file-upload";
import { FileBrowser } from "@/components/file-browser";

interface SiteConfigFormProps {
  config: Record<string, string>;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function SiteConfigForm({ config }: SiteConfigFormProps) {
  const [state, dispatch, isPending] = useActionState(saveSiteConfig, initialState);
  const landingBgRef = useRef<HTMLInputElement>(null);
  const homeBgRef = useRef<HTMLInputElement>(null);
  const [showBrowser, setShowBrowser] = useState<"landing" | "home" | null>(null);

  return (
    <form action={dispatch} className="styled-form">
      {showBrowser === "landing" && (
        <FileBrowser
          onSelect={(url) => { if (landingBgRef.current) landingBgRef.current.value = url; }}
          onClose={() => setShowBrowser(null)}
        />
      )}
      {showBrowser === "home" && (
        <FileBrowser
          onSelect={(url) => { if (homeBgRef.current) homeBgRef.current.value = url; }}
          onClose={() => setShowBrowser(null)}
        />
      )}
      <fieldset className="admin-fieldset form-group">
        <legend>Login & Landing</legend>
        <div className="form-group">
          <label htmlFor="landing_title">Landing Page Title</label>
          <input id="landing_title" name="landing_title" type="text" defaultValue={config.landing_title} />
        </div>
        <div className="form-group">
          <label htmlFor="landing_background">Landing Background Image URL</label>
          <div className="flex-row items-center gap-1">
            <input ref={landingBgRef} id="landing_background" name="landing_background" type="text" defaultValue={config.landing_background} placeholder="https://example.com/image.jpg or /api/media/file.jpg" className="flex-1" />
            <FileUpload onUpload={(result) => { if (landingBgRef.current) landingBgRef.current.value = result.url; }} accept="image/*" label="Upload" />
            <button type="button" className="btn btn-sm" onClick={() => setShowBrowser("landing")}>Local</button>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="session_max_hours">Session Expiry (hours)</label>
            <input id="session_max_hours" name="session_max_hours" type="number" min="1" max="24" defaultValue={config.session_max_hours || "24"} />
          </div>
          <div className="form-group">
            <label htmlFor="page_view_debounce_minutes">Page View Debounce (minutes)</label>
            <input id="page_view_debounce_minutes" name="page_view_debounce_minutes" type="number" min="1" max="1440" defaultValue={config.page_view_debounce_minutes || "15"} />
          </div>
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          Session expiry: how long login sessions last (max 24h). Page view debounce: minimum time between page view increments per user.
        </p>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Home</legend>
        <div className="form-group">
          <label htmlFor="home_title">Home Page Title</label>
          <input id="home_title" name="home_title" type="text" defaultValue={config.home_title} />
        </div>
        <div className="form-group">
          <label htmlFor="home_subtitle">Home Page Subtitle</label>
          <input id="home_subtitle" name="home_subtitle" type="text" defaultValue={config.home_subtitle} />
        </div>
        <div className="form-group">
          <label htmlFor="home_date">Wedding Date</label>
          <input id="home_date" name="home_date" type="date" defaultValue={config.home_date} />
        </div>
        <div className="form-group">
          <label htmlFor="home_time">Wedding Time</label>
          <input id="home_time" name="home_time" type="time" defaultValue={config.home_time} />
        </div>
        <div className="form-group">
          <label htmlFor="home_location">Wedding Location</label>
          <input id="home_location" name="home_location" type="text" defaultValue={config.home_location} />
        </div>
        <div className="form-group">
          <label htmlFor="home_background_video">Home Background Video URL</label>
          <div className="flex-row items-center gap-1">
            <input ref={homeBgRef} id="home_background_video" name="home_background_video" type="text" defaultValue={config.home_background_video} placeholder="https://example.com/video.mp4 or /api/media/video.mp4" className="flex-1" />
            <FileUpload onUpload={(result) => { if (homeBgRef.current) homeBgRef.current.value = result.url; }} accept="video/*" label="Upload" />
            <button type="button" className="btn btn-sm" onClick={() => setShowBrowser("home")}>Local</button>
          </div>
          {config.home_background_video_poster && (
            <p className="text-muted text-xs mt-1">
              Poster auto-generated from first frame.
            </p>
          )}
        </div>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Banner</legend>
        <div className="form-group">
          <label htmlFor="banner_text">Banner Text</label>
          <textarea id="banner_text" name="banner_text" rows={2} defaultValue={config.banner_text} placeholder="Optional announcement text (scrolls if too long for one line)" />
          <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
            Optional banner displayed on all pages. Leave empty to hide.
          </p>
        </div>
      </fieldset>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved successfully.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</button>
    </form>
  );
}
