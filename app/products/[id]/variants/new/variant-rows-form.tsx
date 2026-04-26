"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ImageFileInput } from "@/app/components/image-file-input";

type VariantRow = {
  id: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  imagePath: string;
  stock: string;
  price: string;
};

type VariantRowsFormProps = {
  productId: number;
  productName: string;
  productBrand: string;
  action: (formData: FormData) => void | Promise<void>;
};

const createEmptyRow = (): VariantRow => ({
  id: crypto.randomUUID(),
  size: "",
  color: "",
  sku: "",
  barcode: "",
  imagePath: "",
  stock: "",
  price: "",
});

const incrementSize = (size: string) => {
  const trimmedSize = size.trim();

  if (!/^\d+$/.test(trimmedSize)) {
    return size;
  }

  return String(Number(trimmedSize) + 1);
};

const cloneRow = (row: VariantRow): VariantRow => ({
  id: crypto.randomUUID(),
  size: incrementSize(row.size),
  color: row.color,
  sku: row.sku,
  barcode: row.barcode,
  imagePath: row.imagePath,
  stock: row.stock,
  price: row.price,
});

const getColorDotClass = (color: string) => {
  const normalized = color.trim().toLowerCase();

  if (normalized.includes("zez")) return "bg-slate-900";
  if (normalized.includes("bardh") || normalized.includes("white")) {
    return "border border-slate-300 bg-white";
  }
  if (normalized.includes("kuq") || normalized.includes("red"))
    return "bg-red-500";
  if (normalized.includes("blu") || normalized.includes("blue"))
    return "bg-blue-500";
  if (normalized.includes("gjelb") || normalized.includes("green"))
    return "bg-emerald-600";
  if (normalized.includes("verdh") || normalized.includes("yellow"))
    return "bg-amber-400";
  if (normalized.includes("roz") || normalized.includes("pink"))
    return "bg-rose-400";
  if (normalized.includes("vjollc") || normalized.includes("purple"))
    return "bg-violet-500";
  if (normalized.includes("portok") || normalized.includes("orange"))
    return "bg-orange-500";
  if (normalized.includes("kafe") || normalized.includes("brown"))
    return "bg-amber-700";
  if (
    normalized.includes("gri") ||
    normalized.includes("gray") ||
    normalized.includes("grey")
  ) {
    return "bg-slate-400";
  }

  return "bg-slate-300";
};

export function VariantRowsForm({
  productId,
  productName,
  productBrand,
  action,
}: VariantRowsFormProps) {
  const [rows, setRows] = useState<VariantRow[]>([createEmptyRow()]);
  const [hasGroupImage, setHasGroupImage] = useState(false);

  const updateRow = (
    rowId: string,
    field: keyof Omit<VariantRow, "id">,
    value: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addRow = () => {
    setRows((currentRows) => {
      const lastRow = currentRows[currentRows.length - 1];

      if (!lastRow) {
        return [createEmptyRow()];
      }

      return [...currentRows, cloneRow(lastRow)];
    });
  };

  const removeRow = (rowId: string) => {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const serializedRows = JSON.stringify(
    rows.map(({ size, color, sku, barcode, imagePath, stock, price }) => ({
      size,
      color,
      sku,
      barcode,
      imagePath,
      stock,
      price,
    })),
  );

  const validRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.size.trim() &&
          row.color.trim() &&
          row.stock.trim() &&
          row.price.trim(),
      ),
    [rows],
  );

  const totalNewStock = validRows.reduce(
    (sum, row) => sum + (Number(row.stock) || 0),
    0,
  );
  const totalInventoryValue = validRows.reduce(
    (sum, row) => sum + (Number(row.stock) || 0) * (Number(row.price) || 0),
    0,
  );
  const isReadyToSave =
    validRows.length > 0 && validRows.length === rows.length;

  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rows" value={serializedRows} />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 border-l-4 border-blue-500 pl-4">
              <p className="text-xl font-semibold text-slate-950">
                Imazhi i Grupit
              </p>
            </div>

            <ImageFileInput
              id="image"
              name="image"
              label="Ngarko foton kryesore"
              helperText="Fotoja e zgjedhur ketu u caktohet automatikisht te gjitha varianteve te ketij submit-i."
              onHasFileChange={setHasGroupImage}
            />

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Imazhi kryesor per kete grup variantesh. Perdor format JPG ose
              PNG.
            </p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Informacion i shpejte
            </p>

            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">ID e Produktit:</dt>
                <dd className="font-semibold text-slate-950">#{productId}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Produkti:</dt>
                <dd className="font-semibold text-slate-950">{productName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Marka:</dt>
                <dd className="font-semibold text-slate-950">{productBrand}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Foto grupi:</dt>
                <dd className="font-semibold text-slate-950">
                  {hasGroupImage ? "Po" : "Jo"}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-semibold text-slate-950">
                  Specifikat e Variantit
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="text-base">+</span>
                Shto rresht te ri
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Numri</th>
                    <th className="px-5 py-4">Ngjyra</th>
                    <th className="px-5 py-4 text-center">Stoku</th>
                    <th className="px-5 py-4 text-center">Cmimi (EUR)</th>
                    <th className="px-5 py-4 text-center">Veprim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={row.id} className="align-middle">
                      <td className="px-5 py-4">
                        <input
                          type="text"
                          value={row.size}
                          onChange={(event) =>
                            updateRow(row.id, "size", event.target.value)
                          }
                          placeholder={index === 0 ? "42" : "43"}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-3 w-3 shrink-0 rounded-full ${getColorDotClass(row.color)}`}
                          />
                          <input
                            type="text"
                            value={row.color}
                            onChange={(event) =>
                              updateRow(row.id, "color", event.target.value)
                            }
                            placeholder="E kuqe"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          value={row.stock}
                          onChange={(event) =>
                            updateRow(row.id, "stock", event.target.value)
                          }
                          placeholder="0"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-center text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.price}
                          onChange={(event) =>
                            updateRow(row.id, "price", event.target.value)
                          }
                          placeholder="0.00"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-center text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Hiq rreshtin ${index + 1}`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="M5.75 6.5h8.5M8 6.5V5.25A1.25 1.25 0 0 1 9.25 4h1.5A1.25 1.25 0 0 1 12 5.25V6.5M7 8.25v5.25M10 8.25v5.25M13 8.25v5.25M6.5 6.5 7 15a1 1 0 0 0 1 .94h4a1 1 0 0 0 1-.94l.5-8.5"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M10 4.5v11M4.5 10h11"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Dupliko rreshtat
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/products/${productId}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                >
                  Anulo
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M5.75 10.25 8.5 13l5.75-5.75"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Ruaj variantet
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Total stoku i ri
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {totalNewStock}
          </p>
          <p className="mt-1 text-sm text-slate-500">Artikuj</p>
        </div>
        <div className="rounded-[24px] border border-blue-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Vlera e inventarit
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {totalInventoryValue.toFixed(2)} EUR
          </p>
        </div>
        <div className="rounded-[24px] border border-blue-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Statusi i variantit
          </p>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                isReadyToSave
                  ? "bg-emerald-900 text-emerald-50"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isReadyToSave ? "I gatshem per ruajtje" : "Ne plotesim"}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
