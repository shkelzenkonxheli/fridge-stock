import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { ConfirmActionForm } from "@/app/components/confirm-action-form";
import { hasRole, requireUser } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD, getStockTone } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { ProductsFilters } from "./products-filters";
import { ProductStockQuickView } from "./product-stock-quick-view";

const PAGE_SIZE = 20;

type ProductsPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    brand?: string;
    model?: string;
  }>;
};

function buildProductsPageHref(
  page: number,
  q: string,
  brand: string,
  model: string,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (q) {
    params.set("q", q);
  }

  if (brand) {
    params.set("brand", brand);
  }

  if (model) {
    params.set("model", model);
  }

  return `/products?${params.toString()}`;
}

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
  if (normalized.includes("portokall") || normalized.includes("orange")) {
    return "bg-orange-500";
  }
  if (normalized.includes("vjollc") || normalized.includes("purple")) {
    return "bg-violet-600";
  }
  if (normalized.includes("pink") || normalized.includes("roz")) {
    return "bg-pink-500";
  }

  return "bg-slate-300";
}

async function deleteProduct(formData: FormData) {
  "use server";

  const productId = Number(formData.get("productId"));

  if (!productId) {
    return;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      _count: {
        select: {
          variants: true,
        },
      },
    },
  });

  if (!product || product._count.variants > 0) {
    return;
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  revalidatePath("/");
  revalidatePath("/products");
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const currentUser = await requireUser();
  const canManageInventory = hasRole(currentUser, ["SUPER_ADMIN"]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const searchQuery = resolvedSearchParams?.q?.trim() || "";
  const selectedBrand = resolvedSearchParams?.brand?.trim() || "";
  const selectedModel = resolvedSearchParams?.model?.trim() || "";
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;
  const filters: Prisma.ProductWhereInput[] = [];
  const searchTokens = searchQuery
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (searchTokens.length > 0) {
    filters.push({
      AND: searchTokens.map((token) => ({
        OR: [
          {
            name: {
              contains: token,
              mode: "insensitive",
            },
          },
          {
            brand: {
              contains: token,
              mode: "insensitive",
            },
          },
          {
            variants: {
              some: {
                color: {
                  contains: token,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            variants: {
              some: {
                size: {
                  contains: token,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            variants: {
              some: {
                sku: {
                  contains: token,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      })),
    });
  }

  if (selectedBrand) {
    filters.push({
      brand: {
        equals: selectedBrand,
        mode: "insensitive",
      },
    });
  }

  if (selectedModel) {
    filters.push({
      name: {
        equals: selectedModel,
        mode: "insensitive",
      },
    });
  }

  const where: Prisma.ProductWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const [products, totalProducts, filterProducts, stockTotals] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        brand: true,
        variants: {
          select: {
            size: true,
            color: true,
            sku: true,
            imagePath: true,
            stock: true,
            price: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      select: {
        brand: true,
        name: true,
      },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
    }),
    prisma.variant.findMany({
      where: {
        product: where,
      },
      select: {
        stock: true,
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;
  const brands = [...new Set(filterProducts.map((product) => product.brand))];
  const models = [
    ...new Set(
      filterProducts.map(
        (product) => `${product.brand.toLowerCase()}::${product.name}`,
      ),
    ),
  ];
  const totalPairs = stockTotals.reduce((sum, variant) => sum + variant.stock, 0);
  const lowStockProducts = products.filter((product) =>
    product.variants.some(
      (variant) => variant.stock > 0 && variant.stock <= LOW_STOCK_THRESHOLD,
    ),
  ).length;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-5 rounded-[30px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Te gjitha patikat
              </h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {totalProducts.toLocaleString("sq-AL")} Produkte gjithsej
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  {totalPairs.toLocaleString("sq-AL")} Patika ne total
                </span>
                <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600">
                  {lowStockProducts} Stoku i ulet
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                Home
              </Link>
              {canManageInventory ? (
                <Link
                  href="/products/new"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                >
                  + Shto Model te Ri
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
            <ProductsFilters
              key={`${searchQuery}|${selectedBrand}|${selectedModel}`}
              searchQuery={searchQuery}
              selectedBrand={selectedBrand}
              selectedModel={selectedModel}
              brands={brands}
              models={models}
            />
          </div>
          {products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-medium text-slate-900">
                {searchQuery || selectedBrand || selectedModel
                  ? "Nuk u gjet asnje produkt me keto filtra"
                  : "Nuk ka ende produkte te regjistruara"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {searchQuery || selectedBrand || selectedModel
                  ? "Provo nje kerkese tjeter ose bej reset per t'i pare te gjitha."
                  : "Shto modelin e pare dhe vazhdo me variantet per te filluar inventarin."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:p-5 lg:hidden">
                {products.map((product) => {
                  const sizes = [
                    ...new Set(product.variants.map((variant) => variant.size)),
                  ];
                  const colors = [
                    ...new Set(
                      product.variants.map((variant) => variant.color),
                    ),
                  ];
                  const totalStock = product.variants.reduce(
                    (sum, variant) => sum + variant.stock,
                    0,
                  );
                  const prices = product.variants.map((variant) =>
                    Number(variant.price),
                  );
                  const minPrice =
                    prices.length > 0 ? Math.min(...prices) : null;
                  const maxPrice =
                    prices.length > 0 ? Math.max(...prices) : null;
                  const previewVariant =
                    product.variants.find((variant) => variant.imagePath) ??
                    product.variants[0];

                  return (
                    <article
                      key={product.id}
                      className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            <ProductStockQuickView
                              productName={product.name}
                              productBrand={product.brand}
                              imagePath={previewVariant?.imagePath ?? null}
                              variants={product.variants.map((variant) => ({
                                size: variant.size,
                                color: variant.color,
                                imagePath: variant.imagePath,
                                stock: variant.stock,
                              }))}
                              className="h-full w-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-base font-semibold text-slate-950">
                              {product.name}
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                              {product.brand}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {product.variants.length} var
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Stoku
                          </p>
                          <p className="mt-1 text-lg font-semibold text-emerald-700">
                            {totalStock}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Cmimi
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {minPrice === null
                              ? "-"
                              : minPrice === maxPrice
                                ? `${minPrice.toFixed(2)} EUR`
                                : `${minPrice.toFixed(2)} - ${maxPrice?.toFixed(2)} EUR`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Numrat
                          </p>
                          <p className="mt-1">
                            {sizes.length > 0 ? sizes.join(", ") : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Ngjyrat
                          </p>
                          <p className="mt-1">
                            {colors.length > 0 ? colors.join(", ") : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <ProductStockQuickView
                          productName={product.name}
                          productBrand={product.brand}
                          imagePath={previewVariant?.imagePath ?? null}
                          variants={product.variants.map((variant) => ({
                            size: variant.size,
                            color: variant.color,
                            imagePath: variant.imagePath,
                            stock: variant.stock,
                          }))}
                          showImageButton={false}
                        />
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Menaxho
                        </Link>
                        {canManageInventory ? (
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            Edito
                          </Link>
                        ) : null}
                        {canManageInventory && product.variants.length === 0 ? (
                          <ConfirmActionForm
                            action={deleteProduct}
                            hiddenFields={[
                              { name: "productId", value: product.id },
                            ]}
                            confirmMessage="A je i sigurt qe don ta fshish kete produkt?"
                            buttonLabel="Fshi"
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          />
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/90 text-left">
                    <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-5 py-4">Modeli</th>
                      <th className="px-5 py-4">Brendi</th>
                      <th className="px-5 py-4">Numrat</th>
                      <th className="px-5 py-4">Ngjyrat</th>
                      <th className="px-5 py-4 text-center">Variante</th>
                      <th className="px-5 py-4 text-center">Stoku</th>
                      <th className="px-5 py-4 text-right">Cmimi</th>
                      <th className="px-5 py-4 text-right">Veprime</th>
                    </tr>
                  </thead>
                  <tbody
                    suppressHydrationWarning
                    className="divide-y divide-slate-100 bg-white"
                  >
                    {products.map((product) => {
                      const sizes = [
                        ...new Set(
                          product.variants.map((variant) => variant.size),
                        ),
                      ];
                      const colors = [
                        ...new Set(
                          product.variants.map((variant) => variant.color),
                        ),
                      ];
                      const previewVariant =
                        product.variants.find((variant) => variant.imagePath) ??
                        product.variants[0];
                      const totalStock = product.variants.reduce(
                        (sum, variant) => sum + variant.stock,
                        0,
                      );
                      const prices = product.variants.map((variant) =>
                        Number(variant.price),
                      );
                      const minPrice =
                        prices.length > 0 ? Math.min(...prices) : null;
                      const maxPrice =
                        prices.length > 0 ? Math.max(...prices) : null;

                      return (
                        <tr key={product.id} className="align-top transition hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                <ProductStockQuickView
                                  productName={product.name}
                                  productBrand={product.brand}
                                  imagePath={previewVariant?.imagePath ?? null}
                                  variants={product.variants.map((variant) => ({
                                    size: variant.size,
                                    color: variant.color,
                                    imagePath: variant.imagePath,
                                    stock: variant.stock,
                                  }))}
                                  className="h-full w-full"
                                />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {product.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {product.brand}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <div className="flex flex-wrap gap-1.5">
                              {sizes.length > 0 ? (
                                sizes.map((size) => (
                                  <span
                                    key={size}
                                    className="inline-flex min-w-7 items-center justify-center rounded-md bg-slate-100 px-1.5 py-1 text-xs font-semibold text-slate-600"
                                  >
                                    {size}
                                  </span>
                                ))
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <div className="flex items-center gap-2">
                              {colors.length > 0 ? (
                                colors.slice(0, 4).map((color) => (
                                  <span
                                    key={color}
                                    title={color}
                                    className={`inline-flex h-4 w-4 rounded-full ${getColorSwatchClass(
                                      color,
                                    )}`}
                                  />
                                ))
                              ) : (
                                <span>-</span>
                              )}
                              {colors.length > 4 ? (
                                <span className="text-xs text-slate-400">
                                  +{colors.length - 4}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                              {product.variants.length}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                getStockTone(totalStock).badgeClassName
                              }`}
                            >
                              {getStockTone(totalStock).label.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                            {minPrice === null
                              ? "-"
                              : minPrice === maxPrice
                                ? `${minPrice.toFixed(2)} EUR`
                                : `${minPrice.toFixed(2)} - ${maxPrice?.toFixed(2)} EUR`}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/products/${product.id}`}
                                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                              >
                                Menaxho
                              </Link>
                              <ProductStockQuickView
                                productName={product.name}
                                productBrand={product.brand}
                                imagePath={previewVariant?.imagePath ?? null}
                                variants={product.variants.map((variant) => ({
                                  size: variant.size,
                                  color: variant.color,
                                  imagePath: variant.imagePath,
                                  stock: variant.stock,
                                }))}
                                showImageButton={false}
                              />
                              {canManageInventory ? (
                                <Link
                                  href={`/products/${product.id}/edit`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                  title="Edito"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
                                  >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                                  </svg>
                                </Link>
                              ) : null}
                              {canManageInventory &&
                              product.variants.length === 0 ? (
                                <ConfirmActionForm
                                  action={deleteProduct}
                                  hiddenFields={[
                                    { name: "productId", value: product.id },
                                  ]}
                                  confirmMessage="A je i sigurt qe don ta fshish kete produkt?"
                                  buttonLabel="Fshi"
                                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {totalProducts > PAGE_SIZE ? (
          <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Faqja{" "}
              <span className="font-semibold text-slate-950">
                {currentPage}
              </span>{" "}
              nga{" "}
              <span className="font-semibold text-slate-950">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              {previousPage ? (
                <Link
                  href={buildProductsPageHref(
                    previousPage,
                    searchQuery,
                    selectedBrand,
                    selectedModel,
                  )}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Mbrapa
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                  Mbrapa
                </span>
              )}
              {nextPage ? (
                <Link
                  href={buildProductsPageHref(
                    nextPage,
                    searchQuery,
                    selectedBrand,
                    selectedModel,
                  )}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Para
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                  Para
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}



