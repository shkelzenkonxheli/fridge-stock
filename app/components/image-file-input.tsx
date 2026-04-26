"use client";

import { useEffect, useState } from "react";
import { UploadedImage } from "@/app/components/uploaded-image";

type ImageFileInputProps = {
  id: string;
  name: string;
  label: string;
  helperText?: string;
  onHasFileChange?: (hasFile: boolean) => void;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function ImageFileInput({
  id,
  name,
  label,
  helperText,
  onHasFileChange,
}: ImageFileInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setErrorMessage(null);
    onHasFileChange?.(false);

    const input = document.getElementById(id) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="space-y-4">
        <input
          id={id}
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }

            if (!file) {
              setPreviewUrl(null);
              setErrorMessage(null);
              onHasFileChange?.(false);
              return;
            }

            if (file.size > MAX_IMAGE_SIZE_BYTES) {
              setPreviewUrl(null);
              setErrorMessage(
                "Fotoja eshte me e madhe se 5MB. Zgjedh nje file me te vogel.",
              );
              event.currentTarget.value = "";
              onHasFileChange?.(false);
              return;
            }

            setPreviewUrl(URL.createObjectURL(file));
            setErrorMessage(null);
            onHasFileChange?.(true);
          }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2.5 file:font-medium file:text-white hover:file:bg-slate-800"
        />
        {previewUrl ? (
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <UploadedImage
              src={previewUrl}
              alt="Preview"
              className="h-64 w-full object-cover"
            />
            <div className="flex justify-end border-t border-slate-100 px-3 py-3">
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {helperText ? (
        <p className="mt-2 text-xs text-slate-500">{helperText}</p>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 text-xs font-medium text-rose-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
