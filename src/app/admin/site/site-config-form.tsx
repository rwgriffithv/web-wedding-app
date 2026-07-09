"use client";

import { useActionState } from "react";
import { saveSiteConfig } from "./actions";

interface SiteConfigFormProps {
  config: Record<string, string>;
}

const initialState = null as { success?: boolean; error?: string } | null;

export function SiteConfigForm({ config }: SiteConfigFormProps) {
  const [state, dispatch, isPending] = useActionState(saveSiteConfig, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="landing_title">Landing Page Title</label>
        <input id="landing_title" name="landing_title" type="text" defaultValue={config.landing_title} />
      </div>
      <div className="form-group">
        <label htmlFor="landing_background">Landing Background Image URL</label>
        <input id="landing_background" name="landing_background" type="text" defaultValue={config.landing_background} placeholder="https://example.com/image.jpg" />
      </div>
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
        <input id="home_date" name="home_date" type="text" defaultValue={config.home_date} placeholder="August 15, 2026" />
      </div>
      <div className="form-group">
        <label htmlFor="home_location">Wedding Location</label>
        <input id="home_location" name="home_location" type="text" defaultValue={config.home_location} />
      </div>
      <div className="form-group">
        <label htmlFor="home_background_video">Home Background Video URL</label>
        <input id="home_background_video" name="home_background_video" type="text" defaultValue={config.home_background_video} placeholder="https://example.com/video.mp4" />
      </div>
      <div className="form-group">
        <label htmlFor="dress_code_text">Dress Code Description</label>
        <textarea id="dress_code_text" name="dress_code_text" defaultValue={config.dress_code_text} />
      </div>
      {state?.success && <p style={{ color: "#065f46", fontSize: "0.875rem", marginBottom: "1rem" }}>Saved successfully.</p>}
      {state?.error && <p style={{ color: "var(--color-error)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</button>
    </form>
  );
}
