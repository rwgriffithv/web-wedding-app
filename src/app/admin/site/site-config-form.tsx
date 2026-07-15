"use client";

import { useRef, useState, useActionState } from "react";
import { saveSiteConfig } from "./actions";
import { FileBrowser } from "@/components/file-browser";
import { MediaInput } from "@/components/media-input";

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
        <legend>Landing</legend>
        <div className="form-group">
          <label htmlFor="landing_title">Landing Page Title</label>
          <input id="landing_title" name="landing_title" type="text" defaultValue={config.landing_title} />
        </div>
        <div className="form-group">
          <label htmlFor="landing_background">Landing Background Image URL</label>
          <MediaInput
            inputRef={landingBgRef}
            id="landing_background"
            name="landing_background"
            placeholder="https://example.com/image.jpg or /api/media/file.jpg"
            defaultValue={config.landing_background}
            accept="image/*"
            onUpload={(result) => { if (landingBgRef.current) landingBgRef.current.value = result.url; }}
            onBrowse={() => setShowBrowser("landing")}
          />
        </div>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Home</legend>
        <div className="form-group">
          <label htmlFor="home_title">Home Page Title</label>
          <input id="home_title" name="home_title" type="text" defaultValue={config.home_title} />
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
          <label htmlFor="home_venue">Wedding Venue</label>
          <input id="home_venue" name="home_venue" type="text" defaultValue={config.home_venue} placeholder="e.g. The Grand Ballroom" />
        </div>
        <div className="form-group">
          <label htmlFor="home_location">Wedding Location</label>
          <input id="home_location" name="home_location" type="text" defaultValue={config.home_location} placeholder="e.g. City, State" />
        </div>
        <div className="form-group">
          <label htmlFor="home_background_video">Home Background Video URL</label>
          <MediaInput
            inputRef={homeBgRef}
            id="home_background_video"
            name="home_background_video"
            placeholder="https://example.com/video.mp4 or /api/media/video.mp4"
            defaultValue={config.home_background_video}
            accept="video/*"
            uploadLabel="Upload"
            onUpload={(result) => { if (homeBgRef.current) homeBgRef.current.value = result.url; }}
            onBrowse={() => setShowBrowser("home")}
          />
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
