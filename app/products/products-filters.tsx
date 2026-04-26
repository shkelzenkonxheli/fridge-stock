"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductsFiltersProps = {
  searchQuery: string;
  selectedBrand: string;
  selectedModel: string;
  brands: string[];
  models: string[];
};

export function ProductsFilters({
  searchQuery,
  selectedBrand,
  selectedModel,
  brands,
  models,
}: ProductsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchQuery);
  const [brand, setBrand] = useState(selectedBrand);
  const [model, setModel] = useState(selectedModel);

  const filteredModels = brand
    ? [
        ...new Set(
          models
            .filter((modelOption) =>
              modelOption.toLowerCase().startsWith(`${brand.toLowerCase()}::`),
            )
            .map((modelOption) => modelOption.split("::")[1] ?? modelOption),
        ),
      ]
    : [
        ...new Set(
          models.map((modelOption) => modelOption.split("::")[1] ?? modelOption),
        ),
      ];

  const updateFilters = useCallback(
    (nextQuery: string, nextBrand: string, nextModel: string) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("page");

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      } else {
        params.delete("q");
      }

      if (nextBrand.trim()) {
        params.set("brand", nextBrand.trim());
      } else {
        params.delete("brand");
      }

      if (nextModel.trim()) {
        params.set("model", nextModel.trim());
      } else {
        params.delete("model");
      }

      const nextUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.replace(nextUrl);
      });
    },
    [pathname, router, searchParams],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters(query, brand, model);
  };

  const applySelectFilters = (nextBrand: string, nextModel: string) => {
    updateFilters(query, nextBrand, nextModel);
  };

  const handleReset = () => {
    setQuery("");
    setBrand("");
    setModel("");

    startTransition(() => {
      router.replace(pathname);
    });
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_140px]">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 stroke-[1.8]"
            >
              <circle cx="11" cy="11" r="6" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Kerko model, brand, ngjyre, numer ose SKU..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Kerko
          </button>
        </div>

        <select
          value={brand}
          onChange={(event) => {
            const nextBrand = event.target.value;
            setBrand(nextBrand);
            setModel("");
            applySelectFilters(nextBrand, "");
          }}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
        >
          <option value="">Te gjitha brendet</option>
          {brands.map((brandOption) => (
            <option key={brandOption} value={brandOption}>
              {brandOption}
            </option>
          ))}
        </select>

        <select
          value={model}
          onChange={(event) => {
            const nextModel = event.target.value;
            setModel(nextModel);
            applySelectFilters(brand, nextModel);
          }}
          disabled={filteredModels.length === 0}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
        >
          <option value="">Te gjitha modelet</option>
          {filteredModels.map((modelOption) => (
            <option key={modelOption} value={modelOption}>
              {modelOption}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
        >
          Reset
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {isPending
            ? "Duke filtruar..."
            : "Shkruaj dhe shtyp Enter per te filtruar tabelen"}
        </p>
      </div>
    </form>
  );
}
