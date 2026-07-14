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
            <label htmlFor="rate_limit_max_attempts">Max Attempts (per window)</label>
            <input id="rate_limit_max_attempts" name="rate_limit_max_attempts" type="number" min="1" max="1000" defaultValue={config.rate_limit_max_attempts || "5"} />
          </div>
          <div className="form-group">
            <label htmlFor="rate_limit_window_seconds">Window (seconds)</label>
            <input id="rate_limit_window_seconds" name="rate_limit_window_seconds" type="number" min="1" max="1000" defaultValue={config.rate_limit_window_seconds || "60"} />
          </div>
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          Rate limiting protects login attempts per IP+user. Changes take effect on next request.
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
        <legend>RSVP</legend>
        <div className="form-group">
          <label htmlFor="rsvp_deadline">RSVP Deadline</label>
          <input id="rsvp_deadline" name="rsvp_deadline" type="datetime-local" defaultValue={config.rsvp_deadline} />
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          Submissions locked after this date. Leave empty to keep RSVPs always open.
        </p>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Guide</legend>
        <div className="form-group">
          <label htmlFor="guide_tab_schedule_text">Schedule Tab Intro Text</label>
          <textarea id="guide_tab_schedule_text" name="guide_tab_schedule_text" rows={3} maxLength={1000} defaultValue={config.guide_tab_schedule_text} />
          <p className="text-muted text-xs mt-0_25">Optional intro text displayed at the top of the Schedule tab.</p>
        </div>
        <div className="form-group">
          <label htmlFor="guide_tab_dress_code_text">Dress Code Tab Intro Text</label>
          <textarea id="guide_tab_dress_code_text" name="guide_tab_dress_code_text" rows={3} maxLength={1000} defaultValue={config.guide_tab_dress_code_text} />
          <p className="text-muted text-xs mt-0_25">Optional intro text displayed at the top of the Dress Code tab.</p>
        </div>
        <div className="form-group">
          <label htmlFor="guide_tab_lodging_text">Lodging Tab Intro Text</label>
          <textarea id="guide_tab_lodging_text" name="guide_tab_lodging_text" rows={3} maxLength={1000} defaultValue={config.guide_tab_lodging_text} />
          <p className="text-muted text-xs mt-0_25">Optional intro text displayed at the top of the Lodging tab.</p>
        </div>
      </fieldset>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved successfully.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</button>
    </form>
  );
}
