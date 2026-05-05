"use client";

import { useEffect, useRef, useState } from "react";
import { UploadedImage } from "@/app/components/uploaded-image";

type ProductOption = {
  id: number;
  name: string;
  brand: string;
  imagePath: string | null;
};

type ProductModelPickerProps = {
  products: ProductOption[];
  selectedProductId: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  emptyLabel: string;
};

export function ProductModelPicker({
  products,
  selectedProductId,
  onSelect,
  disabled = false,
  placeholder,
  emptyLabel,
}: ProductModelPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedProduct =
    products.find((product) => String(product.id) === selectedProductId) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        disabled={disabled}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className="min-w-0 truncate">
          {selectedProduct ? selectedProduct.name : placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="ml-3 h-4 w-4 shrink-0 text-slate-400"
        >
          <path
            d="m5.75 7.75 4.25 4.5 4.25-4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          {products.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">{emptyLabel}</div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-2">
              <div className="space-y-1">
                {products.map((product) => {
                  const selected = String(product.id) === selectedProductId;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        onSelect(String(product.id));
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        selected
                          ? "bg-emerald-50 text-slate-950"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {product.imagePath ? (
                          <UploadedImage
                            src={product.imagePath}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            IMG
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {product.brand}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
