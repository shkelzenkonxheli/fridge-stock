import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { FlashMessage } from "@/app/components/flash-message";
import { requireRole } from "@/lib/auth";
import {
  ProductImageUploadError,
  saveProductImage,
} from "@/lib/product-images";
import { prisma } from "@/lib/prisma";
import {
  buildBarcodeFromVariantId,
  buildVariantSku,
  ensureUniqueSku,
  normalizeVariantCode,
} from "@/lib/variant-codes";
import { VariantRowsForm } from "./variant-rows-form";

type NewProductVariantPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function createVariants(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const productId = Number(formData.get("productId"));
  const rowsRaw = formData.get("rows")?.toString();
  const file = formData.get("image");

  if (!productId || !rowsRaw) {
    return;
  }

  let parsedRows: unknown;

  try {
    parsedRows = JSON.parse(rowsRaw);
  } catch {
    return;
  }

  if (!Array.isArray(parsedRows)) {
    return;
  }

  const normalizedRows = parsedRows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const candidate = row as {
        size?: unknown;
        color?: unknown;
        sku?: unknown;
        barcode?: unknown;
        imagePath?: unknown;
        stock?: unknown;
        price?: unknown;
      };

      const size = String(candidate.size ?? "").trim();
      const color = String(candidate.color ?? "").trim();
      const sku = normalizeVariantCode(String(candidate.sku ?? ""));
      const barcode = normalizeVariantCode(String(candidate.barcode ?? ""));
      const imagePath = String(candidate.imagePath ?? "").trim() || null;
      const stock = Number(candidate.stock);
      const price = String(candidate.price ?? "").trim();

      if (!size || !color || Number.isNaN(stock) || stock < 0 || !price) {
        return null;
      }

      return {
        size,
        color,
        sku,
        barcode,
        imagePath,
        stock,
        price,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (normalizedRows.length === 0) {
    return;
  }

  const [existingProductVariants, existingVariantCodes] = await Promise.all([
    prisma.variant.findMany({
      where: { productId },
      select: {
        size: true,
        color: true,
        barcode: true,
      },
    }),
    prisma.variant.findMany({
      select: {
        sku: true,
        barcode: true,
      },
    }),
  ]);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      brand: true,
    },
  });

  if (!product) {
    return;
  }

  let uploadedImagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    try {
      uploadedImagePath = await saveProductImage(productId, file);
    } catch (error) {
      const message =
        error instanceof ProductImageUploadError
          ? error.message
          : "Ngarkimi i fotos deshtoi.";
      redirect(
        `/products/${productId}/variants/new?error=${encodeURIComponent(message)}`,
      );
    }
  }

  const existingKeys = new Set(
    existingProductVariants.map(
      (variant) => `${variant.size}::${variant.color.toLowerCase()}`,
    ),
  );
  const usedSkus = new Set(
    existingVariantCodes
      .map((variant) => variant.sku)
      .filter((sku): sku is string => Boolean(sku)),
  );
  const usedBarcodes = new Set(
    existingVariantCodes
      .map((variant) => variant.barcode)
      .filter((barcode): barcode is string => Boolean(barcode)),
  );

  const seenRowKeys = new Set<string>();
  const duplicateRowsInRequest = new Set<string>();

  for (const row of normalizedRows) {
    const key = `${row.size}::${row.color.toLowerCase()}`;

    if (seenRowKeys.has(key)) {
      duplicateRowsInRequest.add(key);
      continue;
    }

    seenRowKeys.add(key);
  }

  if (duplicateRowsInRequest.size > 0) {
    const [firstDuplicate] = [...duplicateRowsInRequest];
    const [size, color] = firstDuplicate.split("::");

    redirect(
      `/products/${productId}/variants/new?error=${encodeURIComponent(
        `Varianti Nr ${size} / ${color} eshte shkruar me shume se nje here.`,
      )}`,
    );
  }

  const alreadyExistingRows = normalizedRows.filter((row) =>
    existingKeys.has(`${row.size}::${row.color.toLowerCase()}`),
  );

  if (alreadyExistingRows.length > 0) {
    const firstExisting = alreadyExistingRows[0];

    redirect(
      `/products/${productId}/variants/new?error=${encodeURIComponent(
        `Varianti Nr ${firstExisting.size} / ${firstExisting.color} ekziston tashme per kete produkt.`,
      )}`,
    );
  }

  if (normalizedRows.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const row of normalizedRows) {
        const baseSku =
          row.sku ??
          buildVariantSku({
            brand: product.brand,
            productName: product.name,
            size: row.size,
            color: row.color,
          });
        const createdVariant = await tx.variant.create({
          data: {
            productId,
            size: row.size,
            color: row.color,
            sku: ensureUniqueSku(baseSku, usedSkus),
            imagePath: uploadedImagePath ?? row.imagePath,
            stock: row.stock,
            price: row.price,
          },
        });
        const barcode =
          row.barcode ?? buildBarcodeFromVariantId(createdVariant.id);

        if (usedBarcodes.has(barcode)) {
          throw new Error("Duplicate barcode detected.");
        }

        usedBarcodes.add(barcode);

        await tx.variant.update({
          where: { id: createdVariant.id },
          data: {
            barcode,
          },
        });
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");

  redirect(`/products/${productId}`);
}

export default async function NewProductVariantPage({
  params,
  searchParams,
}: NewProductVariantPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const { id } = await params;
  const productId = Number(id);

  if (Number.isNaN(productId)) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() || null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,transparent_18%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Variant Setup
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Shto variante
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {product.name} - {product.brand}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href={`/products/${product.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Kthehu
            </Link>
          </div>
        </div>
        {errorMessage ? (
          <FlashMessage
            type="error"
            text={errorMessage}
            className="mt-6 rounded-2xl px-4 py-3 text-sm"
          />
        ) : null}
        <VariantRowsForm
          productId={product.id}
          productName={product.name}
          productBrand={product.brand}
          action={createVariants}
        />
      </div>
    </main>
  );
}
