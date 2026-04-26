"use client";

import { useMemo, useState } from "react";
import { UploadedImage } from "@/app/components/uploaded-image";
import { LOW_STOCK_THRESHOLD, getStockTone } from "@/lib/inventory";

type ProductQuickVariant = {
  size: string;
  color: string;
  imagePath: string | null;
  stock: number;
};

type ProductStockQuickViewProps = {
  productName: string;
  productBrand: string;
  imagePath: string | null;
  variants: ProductQuickVariant[];
  className?: string;
  showImageButton?: boolean;
};

function getColorSwatchClass(color: string) {
  const normalized = color.trim().toLowerCase();

  if (normalized.includes("zez") || normalized.includes("black")) {
    return "bg-black";
  }
  if (normalized.includes("bardh") || normalized.includes("white")) {
    return "border border-slate-300 bg-white";
  }
  if (normalized.includes("kuq") || normalized.includes("red")) {
    return "bg-red-500";
  }
  if (normalized.includes("gjelb") || normalized.includes("green")) {
    return "bg-emerald-600";
  }
  if (normalized.includes("blu") || normalized.includes("blue")) {
    return "bg-blue-600";
  }
  if (normalized.includes("verdh") || normalized.includes("yellow")) {
    return "bg-yellow-400";
  }

  return "bg-slate-300";
}

export function ProductStockQuickView({
  productName,
  productBrand,
  imagePath,
  variants,
  className = "",
  showImageButton = true,
}: ProductStockQuickViewProps) {
  const [showStock, setShowStock] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const groupedVariants = useMemo(() => {
    const sorted = [...variants].sort(
      (a, b) =>
        a.color.localeCompare(b.color, "sq", { sensitivity: "base" }) ||
        a.size.localeCompare(b.size, "sq", {
          numeric: true,
          sensitivity: "base",
        }),
    );

    return sorted.reduce(
      (groups, variant) => {
        const current = groups.get(variant.color) ?? [];
        current.push(variant);
        groups.set(variant.color, current);
        return groups;
      },
      new Map<string, ProductQuickVariant[]>(),
    );
  }, [variants]);

  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const stockTone = getStockTone(totalStock);

  return (
    <>
      {showImageButton ? (
        <button
          type="button"
          onClick={() =>
            imagePath
              ? setPreviewImage({
                  src: imagePath,
                  alt: productName,
                })
              : undefined
          }
          className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className} ${
            imagePath ? "transition hover:border-slate-300" : ""
          }`}
          title={imagePath ? "Hap foton" : "Pa foto"}
        >
          {imagePath ? (
            <UploadedImage
              src={imagePath}
              alt={productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              IMG
            </div>
          )}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setShowStock(true)}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Stoku
      </button>

      {showStock ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => setShowStock(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {imagePath ? (
                    <UploadedImage
                      src={imagePath}
                      alt={productName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-950">
                    {productName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{productBrand}</p>
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stockTone.badgeClassName}`}
                  >
                    {totalStock} cope • {stockTone.label}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStock(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Mbyll"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
              {Array.from(groupedVariants.entries()).map(([color, colorVariants]) => {
                const colorImage = colorVariants.find(
                  (variant) => variant.imagePath,
                )?.imagePath;

                return (
                  <section
                    key={color}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          colorImage
                            ? setPreviewImage({
                                src: colorImage,
                                alt: `${productName} ${color}`,
                              })
                            : undefined
                        }
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        title={colorImage ? "Hap foton" : "Pa foto"}
                      >
                        {colorImage ? (
                          <UploadedImage
                            src={colorImage}
                            alt={`${productName} ${color}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            IMG
                          </span>
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-3 w-3 rounded-full ${getColorSwatchClass(color)}`}
                          />
                          <h3 className="text-base font-semibold text-slate-900">
                            {color}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                          {colorVariants.length} variante
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {colorVariants.map((variant) => {
                        const tone =
                          variant.stock > 0 && variant.stock <= LOW_STOCK_THRESHOLD
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : variant.stock > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-500";

                        return (
                          <div
                            key={`${color}-${variant.size}`}
                            className={`min-w-[92px] rounded-2xl border px-3 py-2.5 ${tone}`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                              Nr {variant.size}
                            </p>
                            <p className="mt-1 text-xs font-medium">
                              {variant.stock} ne stok
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {previewImage ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/75 text-white transition hover:bg-slate-950"
              aria-label="Mbyll foton"
            >
              ×
            </button>
            <div className="overflow-hidden rounded-[22px]">
              <UploadedImage
                src={previewImage.src}
                alt={previewImage.alt}
                className="h-auto max-h-[80vh] w-full object-contain bg-slate-50"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
