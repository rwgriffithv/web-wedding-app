"use client";

import { useRef, useState, useEffect, useActionState } from "react";
import { addItem, createTabInline } from "./actions";
import { SearchableSelect } from "@/components/searchable-select";
import { FileUpload } from "@/components/file-upload";
import { FileBrowser } from "@/components/file-browser";
import { detectMediaType } from "@/lib/media";
import type { MediaTab } from "@/lib/db";

const initialState: { success?: boolean; error?: string; tabId?: number; slug?: string } | null = null;

export function MediaForm({ tabs }: { tabs: MediaTab[] }) {
  const [state, dispatch, isPending] = useActionState(addItem, initialState);
  const urlRef = useRef<HTMLInputElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const [showBrowser, setShowBrowser] = useState(false);

  const [tabOptions, setTabOptions] = useState(tabs.map(t => ({ value: t.id, label: t.label })));
  const [tabSlugMap, setTabSlugMap] = useState<Map<number, string>>(new Map(tabs.map(t => [t.id, t.slug])));
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [creatingTab, setCreatingTab] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      setSelectedTabId(null);
      formRef.current?.reset();
    }
  }, [state]);

  const handleCreateNewTab = async (name: string) => {
    setCreatingTab(true);
    setTabError(null);
    try {
      const formData = new FormData();
      formData.append("tab_name", name);
      const result = await createTabInline(initialState, formData);

      if (result.success && result.tabId && result.slug) {
        const { tabId, slug } = result;
        setTabOptions(prev => [...prev, { value: tabId, label: name }]);
        setTabSlugMap(prev => new Map(prev).set(tabId, slug));
        setSelectedTabId(tabId);
      } else if (result.error) {
        setTabError(result.error);
      }
    } finally {
      setCreatingTab(false);
    }
  };

  const setUrlAndDetectType = (url: string) => {
    if (urlRef.current) urlRef.current.value = url;
    if (typeInputRef.current) typeInputRef.current.value = detectMediaType(url);
  };

  const handleSubmit = (formData: FormData) => {
    if (selectedTabId !== null) {
      const slug = tabSlugMap.get(selectedTabId);
      if (slug) formData.set("section", slug);
    }
    if (typeInputRef.current && urlRef.current?.value) {
      typeInputRef.current.value = detectMediaType(urlRef.current.value);
    }
    if (typeInputRef.current) formData.set("type", typeInputRef.current.value);
    dispatch(formData);
  };

  return (
    <form ref={formRef} action={handleSubmit} className="styled-form">
      {showBrowser && (
        <FileBrowser
          onSelect={(url) => setUrlAndDetectType(url)}
          onClose={() => setShowBrowser(false)}
        />
      )}
      <input type="hidden" name="type" ref={typeInputRef} defaultValue="image" />
      <div className="form-group">
        <label htmlFor="url">URL</label>
        <div className="flex-row items-center gap-1">
          <input
            ref={urlRef}
            id="url"
            name="url"
            type="text"
            required
            placeholder="https://example.com/photo.jpg or /api/media/file.jpg"
            className="flex-1"
            onBlur={(e) => {
              if (typeInputRef.current && e.target.value) {
                typeInputRef.current.value = detectMediaType(e.target.value);
              }
            }}
          />
          <FileUpload
            onUpload={(result) => {
              if (urlRef.current) urlRef.current.value = result.url;
              if (typeInputRef.current && result.type) typeInputRef.current.value = result.type;
            }}
            accept="image/*,video/*"
            label="Upload"
          />
          <button type="button" className="btn btn-sm" onClick={() => setShowBrowser(true)}>Local</button>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" placeholder="Media description" />
      </div>
      <div className="form-group">
        <label>Tab</label>
        <SearchableSelect
          options={tabOptions}
          value={selectedTabId}
          onChange={setSelectedTabId}
          onCreateNew={handleCreateNewTab}
          placeholder="Select a tab (optional)..."
          disabled={creatingTab}
        />
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Media added.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      {tabError && <p className="text-error text-sm mb-1" role="alert">{tabError}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending || creatingTab}>{isPending ? "Adding..." : "Add Media"}</button>
    </form>
  );
}
