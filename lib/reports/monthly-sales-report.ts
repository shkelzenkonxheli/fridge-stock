import { prisma } from "@/lib/prisma";

export const BUSINESS_TIME_ZONE = "Europe/Belgrade";

export function getMonthStringInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  });

  return formatter.format(date).slice(0, 7);
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

export function getTimeZoneMonthBounds(monthString: string, timeZone: string) {
  const [year, month] = monthString.split("-").map(Number);
  const startApprox = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endApprox = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const startOffset = getTimeZoneOffsetMs(startApprox, timeZone);
  const endOffset = getTimeZoneOffsetMs(endApprox, timeZone);

  return {
    start: new Date(startApprox.getTime() - startOffset),
    end: new Date(endApprox.getTime() - endOffset),
  };
}

export type MonthlySalesReport = {
  selectedMonth: string;
  monthLabel: string;
  ordersCount: number;
  totalPairs: number;
  topSourceLabel: string | null;
  topSourceQuantity: number;
  sourceBreakdown: Array<{ source: string; label: string; quantity: number }>;
  topModels: Array<{ brand: string; name: string; quantity: number }>;
  topBrands: Array<{ brand: string; quantity: number }>;
  dailySales: Array<{ date: string; quantity: number }>;
};

export async function getMonthlySalesReport(selectedMonth: string) {
  const { start: monthFrom, end: monthTo } = getTimeZoneMonthBounds(
    selectedMonth,
    BUSINESS_TIME_ZONE,
  );

  const [ordersCount, orderItems] = await Promise.all([
    prisma.order.count({
      where: {
        createdAt: {
          gte: monthFrom,
          lt: monthTo,
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: monthFrom,
            lt: monthTo,
          },
        },
      },
      select: {
        quantity: true,
        order: {
          select: {
            source: true,
            createdAt: true,
          },
        },
        variant: {
          select: {
            product: {
              select: {
                brand: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPairs = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const sourceMap = orderItems.reduce(
    (acc, item) => {
      acc[item.order.source] = (acc[item.order.source] ?? 0) + item.quantity;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sourceLabels: Record<string, string> = {
    INSTAGRAM: "Instagram",
    STORE: "Shitore",
    WHOLESALE: "Shumice",
  };

  const topSourceEntry =
    Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0] ?? null;

  const modelMap = orderItems.reduce(
    (acc, item) => {
      const key = `${item.variant.product.brand}|||${item.variant.product.name}`;
      const current = acc.get(key) ?? {
        brand: item.variant.product.brand,
        name: item.variant.product.name,
        quantity: 0,
      };
      current.quantity += item.quantity;
      acc.set(key, current);
      return acc;
    },
    new Map<string, { brand: string; name: string; quantity: number }>(),
  );

  const brandMap = orderItems.reduce(
    (acc, item) => {
      const key = item.variant.product.brand;
      acc.set(key, (acc.get(key) ?? 0) + item.quantity);
      return acc;
    },
    new Map<string, number>(),
  );

  const dailyMap = orderItems.reduce(
    (acc, item) => {
      const key = new Intl.DateTimeFormat("sq-AL", {
        timeZone: BUSINESS_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
      }).format(item.order.createdAt);

      acc.set(key, (acc.get(key) ?? 0) + item.quantity);
      return acc;
    },
    new Map<string, number>(),
  );

  const topModels = [...modelMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const sourceBreakdown = (["INSTAGRAM", "STORE", "WHOLESALE"] as const).map(
    (source) => ({
      source,
      label: sourceLabels[source],
      quantity: sourceMap[source] ?? 0,
    }),
  );

  const topBrands = [...brandMap.entries()]
    .map(([brand, quantity]) => ({ brand, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const dailySales = [...dailyMap.entries()]
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => {
      const [aday, amonth] = a.date.split(".").map(Number);
      const [bday, bmonth] = b.date.split(".").map(Number);
      return amonth - bmonth || aday - bday;
    });

  const monthLabel = new Intl.DateTimeFormat("sq-AL", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(`${selectedMonth}-01T12:00:00Z`));

  return {
    selectedMonth,
    monthLabel,
    ordersCount,
    totalPairs,
    topSourceLabel: topSourceEntry ? sourceLabels[topSourceEntry[0]] : null,
    topSourceQuantity: topSourceEntry?.[1] ?? 0,
    sourceBreakdown,
    topModels,
    topBrands,
    dailySales,
  } satisfies MonthlySalesReport;
}
