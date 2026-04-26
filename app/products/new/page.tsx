import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FlashMessage } from "@/app/components/flash-message";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function createProduct(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const name = formData.get("name")?.toString().trim();
  const brand = formData.get("brand")?.toString().trim();

  if (!name || !brand) {
    return;
  }

  const existingProduct = await prisma.product.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      brand: {
        equals: brand,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingProduct) {
    redirect(
      `/products/new?error=${encodeURIComponent(
        "Ky model ekziston tashme per kete brand. Ndrysho modelin ose zgjidh produktin ekzistues.",
      )}`,
    );
  }

  const product = await prisma.product.create({
    data: {
      name,
      brand,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");

  redirect(`/products/${product.id}`);
}

type NewProductPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffedd5_0%,transparent_20%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-slate-200/80 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Product Setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Shto model te ri
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Krijo modelin baze te patikes. Pas ruajtjes kalon direkt te faqja e
            produktit per te shtuar variantet sipas numrit dhe ngjyres.
          </p>

          {errorMessage ? (
            <FlashMessage
              type="error"
              text={errorMessage}
              className="mt-6 rounded-2xl px-4 py-3 text-sm shadow-sm"
            />
          ) : null}

          <form action={createProduct} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-800"
              >
                Emri i modelit
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="p.sh. Nike Air Max 90"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="brand"
                className="block text-sm font-medium text-slate-800"
              >
                Brendi
              </label>
              <input
                id="brand"
                name="brand"
                type="text"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="p.sh. Nike"
              />
            </div>

            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
              >
                Ruaj modelin
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Kthehu te produktet
              </Link>
            </div>
          </form>
        </section>

        <aside className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="rounded-[28px] bg-gradient-to-br from-orange-50 via-white to-sky-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workflow
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Si ecen procesi
            </h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">1. Krijo modelin</p>
                <p className="mt-1 text-sm text-slate-600">
                  Regjistro emrin dhe brendin e patikes si produkt baze.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Shto variantet</p>
                <p className="mt-1 text-sm text-slate-600">
                  Hyr te produkti dhe shto numrat, ngjyrat, stokun dhe cmimet.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">3. Menaxho porosite</p>
                <p className="mt-1 text-sm text-slate-600">
                  Porosite lidhen me variantin konkret qe shitet ne depo.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
