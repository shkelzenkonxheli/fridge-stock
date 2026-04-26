import Link from "next/link";
import { hasRole, requireUser } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

const BUSINESS_TIME_ZONE = "Europe/Belgrade";

type ActionTile = {
  title: string;
  subtitle: string;
  href?: string;
  accent: string;
  pill: string;
  icon: React.ReactNode;
  visible: boolean;
  disabled?: boolean;
};

function ActionTile({
  title,
  subtitle,
  href,
  accent,
  pill,
  icon,
  visible,
  disabled,
}: ActionTile) {
  if (!visible) {
    return null;
  }

  const content = (
    <div
      className={`group relative overflow-hidden rounded-[28px] px-5 py-6 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)] ${accent} ${
        disabled ? "opacity-80 saturate-75" : ""
      }`}
    >
      <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
        {icon}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-[240px] text-sm leading-6 text-white/80">
        {subtitle}
      </p>
      <span className="mt-5 inline-flex rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-white/10">
        {pill}
      </span>
    </div>
  );

  if (disabled || !href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function getDateStringInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const zonedTimeAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return zonedTimeAsUtc - date.getTime();
}

function getTimeZoneDayBounds(dateString: string, timeZone: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  const startApprox = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endApprox = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

  const startOffset = getTimeZoneOffsetMs(startApprox, timeZone);
  const endOffset = getTimeZoneOffsetMs(endApprox, timeZone);

  return {
    start: new Date(startApprox.getTime() - startOffset),
    end: new Date(endApprox.getTime() - endOffset),
  };
}

export default async function Home() {
  const currentUser = await requireUser();
  const canManageInventory = hasRole(currentUser, ["SUPER_ADMIN"]);
  const canCreateOrders = hasRole(currentUser, ["SUPER_ADMIN", "SELLER"]);
  const canManageOrders = hasRole(currentUser, [
    "SUPER_ADMIN",
    "SELLER",
    "WAREHOUSE",
  ]);
  const canManageUsers = hasRole(currentUser, ["SUPER_ADMIN"]);

  const today = getDateStringInTimeZone(new Date(), BUSINESS_TIME_ZONE);
  const { start: dateFrom, end: dateTo } = getTimeZoneDayBounds(
    today,
    BUSINESS_TIME_ZONE,
  );

  const [
    totalProducts,
    totalStockValueData,
    lowStockCount,
    ordersToday,
    recentMovements,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.variant.findMany({
      select: { stock: true, price: true },
    }),
    prisma.variant.count({
      where: {
        stock: {
          gt: 0,
          lte: LOW_STOCK_THRESHOLD,
        },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: {
          gte: dateFrom,
          lt: dateTo,
        },
      },
    }),
    prisma.stockMovement.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quantity: true,
        reason: true,
        createdAt: true,
        variant: {
          select: {
            sku: true,
            size: true,
            color: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalStockValue = totalStockValueData.reduce(
    (sum, variant) => sum + Number(variant.price) * variant.stock,
    0,
  );
  const totalStockUnits = totalStockValueData.reduce(
    (sum, variant) => sum + variant.stock,
    0,
  );

  const tiles: ActionTile[] = [
    {
      title: "Produktet",
      subtitle: "Shikoni dhe menaxhoni te gjithe listen e produkteve.",
      href: "/products",
      accent: "bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)]",
      pill: `${totalProducts.toLocaleString("sq-AL")} artikuj gjithsej`,
      visible: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M7 4h10v4H7zM6 10h12v10H6z" />
        </svg>
      ),
    },
    {
      title: "Shto Produkt",
      subtitle: "Regjistroni produkte te reja me specifikat kryesore.",
      href: "/products/new",
      accent: "bg-[linear-gradient(135deg,#0891b2_0%,#06b6d4_100%)]",
      pill: "Kategorizimi automatik",
      visible: canManageInventory,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      title: "Porosite",
      subtitle: "Kontrolloni porosite e regjistruara dhe shitjet e dites.",
      href: "/orders",
      accent: "bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)]",
      pill:
        ordersToday > 0
          ? `${ordersToday} porosi sot`
          : "Nuk ka porosi sot",
      visible: canManageOrders,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M7 6h10M7 12h10M7 18h6" />
        </svg>
      ),
    },
    {
      title: "Shto Porosi",
      subtitle: "Krijoni shitje te reja per klientet pa humbur kohe.",
      href: "/orders/create",
      accent: "bg-[linear-gradient(135deg,#0f766e_0%,#0ea5a4_100%)]",
      pill: "Sinkronizim ne kohe reale",
      visible: canCreateOrders,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      title: "Hyrje Stoku",
      subtitle: "Shtoni mallin e ri qe mberrin nga furnitoret.",
      href: "/stock/incoming",
      accent: "bg-[linear-gradient(135deg,#334155_0%,#0f172a_100%)]",
      pill:
        lowStockCount > 0
          ? `${lowStockCount} variante me stok te ulet`
          : "Inventari ne gjendje te mire",
      visible: canManageInventory,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="m12 19 6-6M12 19l-6-6M12 5v14" />
        </svg>
      ),
    },
    {
      title: "Raporte",
      subtitle: "Shikoni shitjet mujore, top modelet dhe ritmin ditor.",
      href: "/reports",
      accent: "bg-[linear-gradient(135deg,#0f4c81_0%,#0ea5e9_100%)]",
      pill: "Raport mujor per adminin",
      visible: canManageUsers,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-3" />
        </svg>
      ),
    },
    {
      title: "Menaxho Userat",
      subtitle: "Kontrolloni qasjen dhe rolet e secilit perdorues.",
      href: "/users",
      accent: "bg-[linear-gradient(135deg,#dc2626_0%,#f97316_100%)]",
      pill: "Administrim i ekipit",
      visible: canManageUsers,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M20 8v6M23 11h-6" />
        </svg>
      ),
    },
  ];

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f172a_0%,#164e63_55%,#0f766e_100%)] px-7 py-8 text-white shadow-[0_24px_60px_rgba(8,47,73,0.22)]">
            <div className="absolute right-6 top-6 h-28 w-28 rounded-full border border-white/10 bg-white/5" />
            <div className="absolute bottom-6 right-12 h-16 w-16 rounded-2xl border border-white/10 bg-white/5" />
            <div className="absolute -bottom-10 right-20 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative max-w-xl">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-100/70">
                FridgeStock Dashboard
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                Kontroll i shpejte i inventarit
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/72">
                Sistemi eshte gati per pune. Sot jane regjistruar {ordersToday}{" "}
                porosi dhe {lowStockCount} variante kerkojne vemendje.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/orders"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Shiko Porosite
                </Link>
                {canManageInventory ? (
                  <Link
                    href="/orders/new"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    Shto te re
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-cyan-100 bg-white px-6 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-medium text-slate-500">
              Vlera e Inventarit
            </p>
            <p className="mt-4 text-5xl font-semibold tracking-tight text-slate-950">
              €
              {totalStockValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-4 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
              {totalStockUnits.toLocaleString("sq-AL")} cope ne stok
            </p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Veprimet Kryesore
            </h2>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Klikoni per te naviguar
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tiles.map((tile) => (
              <ActionTile key={tile.title} {...tile} />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Levizjet e Fundit
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pasqyra e fundit e levizjeve te inventarit
              </p>
            </div>
          </div>

          {recentMovements.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              Nuk ka ende levizje stoku te regjistruara.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/80 text-left">
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-6 py-4">ID / Produkti</th>
                    <th className="px-6 py-4">Kategoria</th>
                    <th className="px-6 py-4 text-right">Sasia</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Statusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentMovements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {movement.variant.product.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          SKU {movement.variant.sku || "-"} • Nr{" "}
                          {movement.variant.size} • {movement.variant.color}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {movement.reason === "CUSTOMER_RETURN"
                          ? "Kthim klienti"
                          : "Hyrje stoku"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                        +{movement.quantity}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Intl.DateTimeFormat("sq-AL", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(movement.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            movement.reason === "CUSTOMER_RETURN"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {movement.reason === "CUSTOMER_RETURN"
                            ? "PERFUNDUAR"
                            : "NE PROCES"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
