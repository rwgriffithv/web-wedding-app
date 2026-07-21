"use client";

import { useRef, useState, useActionState } from "react";
import { saveSiteConfig } from "./actions";
import { FileBrowser } from "@/components/file-browser";
import { MediaInput } from "@/components/media-input";
import {
  LANDING_TITLE_KEY, LANDING_BACKGROUND_KEY,
  HOME_TITLE_KEY, HOME_DATE_KEY, HOME_TIME_KEY,
  HOME_VENUE_KEY, HOME_LOCATION_KEY, HOME_BACKGROUND_VIDEO_KEY,
  HOME_BACKGROUND_VIDEO_POSTER_KEY,
  BANNER_TEXT_KEY,
} from "@/lib/constants";

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
          <label htmlFor={LANDING_TITLE_KEY}>Landing Page Title</label>
          <input id={LANDING_TITLE_KEY} name={LANDING_TITLE_KEY} type="text" defaultValue={config[LANDING_TITLE_KEY]} />
        </div>
        <div className="form-group">
          <label htmlFor={LANDING_BACKGROUND_KEY}>Landing Background Image URL</label>
          <MediaInput
            inputRef={landingBgRef}
            id={LANDING_BACKGROUND_KEY}
            name={LANDING_BACKGROUND_KEY}
            placeholder="https://example.com/image.jpg or /api/media/file.jpg"
            defaultValue={config[LANDING_BACKGROUND_KEY]}
            accept="image/*"
            onUpload={(result) => { if (landingBgRef.current) landingBgRef.current.value = result.url; }}
            onBrowse={() => setShowBrowser("landing")}
          />
        </div>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Home</legend>
        <div className="form-group">
          <label htmlFor={HOME_TITLE_KEY}>Home Page Title</label>
          <input id={HOME_TITLE_KEY} name={HOME_TITLE_KEY} type="text" defaultValue={config[HOME_TITLE_KEY]} />
        </div>
        <div className="form-group">
          <label htmlFor={HOME_DATE_KEY}>Wedding Date</label>
          <input id={HOME_DATE_KEY} name={HOME_DATE_KEY} type="date" defaultValue={config[HOME_DATE_KEY]} />
        </div>
        <div className="form-group">
          <label htmlFor={HOME_TIME_KEY}>Wedding Time</label>
          <input id={HOME_TIME_KEY} name={HOME_TIME_KEY} type="time" defaultValue={config[HOME_TIME_KEY]} />
        </div>
        <div className="form-group">
          <label htmlFor={HOME_VENUE_KEY}>Wedding Venue</label>
          <input id={HOME_VENUE_KEY} name={HOME_VENUE_KEY} type="text" defaultValue={config[HOME_VENUE_KEY]} placeholder="e.g. The Grand Ballroom" />
        </div>
        <div className="form-group">
          <label htmlFor={HOME_LOCATION_KEY}>Wedding Location</label>
          <input id={HOME_LOCATION_KEY} name={HOME_LOCATION_KEY} type="text" defaultValue={config[HOME_LOCATION_KEY]} placeholder="e.g. City, State" />
        </div>
        <div className="form-group">
          <label htmlFor={HOME_BACKGROUND_VIDEO_KEY}>Home Background Video URL</label>
          <MediaInput
            inputRef={homeBgRef}
            id={HOME_BACKGROUND_VIDEO_KEY}
            name={HOME_BACKGROUND_VIDEO_KEY}
            placeholder="https://example.com/video.mp4 or /api/media/video.mp4"
            defaultValue={config[HOME_BACKGROUND_VIDEO_KEY]}
            accept="video/*"
            uploadLabel="Upload"
            onUpload={(result) => { if (homeBgRef.current) homeBgRef.current.value = result.url; }}
            onBrowse={() => setShowBrowser("home")}
          />
          {config[HOME_BACKGROUND_VIDEO_POSTER_KEY] && (
            <p className="text-muted text-xs mt-1">
              Poster auto-generated from first frame.
            </p>
          )}
        </div>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Banner</legend>
        <div className="form-group">
          <label htmlFor={BANNER_TEXT_KEY}>Banner Text</label>
          <textarea id={BANNER_TEXT_KEY} name={BANNER_TEXT_KEY} rows={2} defaultValue={config[BANNER_TEXT_KEY]} placeholder="Optional announcement text (scrolls if too long for one line)" />
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
