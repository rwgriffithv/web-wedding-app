"use client";

import { FileUpload } from "@/components/file-upload";

interface MediaInputProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  id: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  accept?: string;
  uploadLabel?: string;
  onUpload: (result: { url: string; type?: "image" | "video" }) => void;
  onBrowse: () => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

export function MediaInput({
  inputRef,
  id,
  name,
  placeholder,
  defaultValue,
  accept = "image/*",
  uploadLabel = "Upload",
  onUpload,
  onBrowse,
  onBlur,
}: MediaInputProps) {
  return (
    <div className="flex-row items-center gap-1">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="flex-1"
        onBlur={onBlur}
      />
      <FileUpload
        onUpload={onUpload}
        accept={accept}
        label={uploadLabel}
        size="sm"
      />
      <button type="button" className="btn btn-sm btn-ghost" onClick={onBrowse}>
        Local
      </button>
    </div>
  );
}
