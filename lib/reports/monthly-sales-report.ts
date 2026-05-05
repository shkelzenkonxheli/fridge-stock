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
  activeModelsCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  topSourceLabel: string | null;
  topSourceQuantity: number;
  sourceBreakdown: Array<{
    source: string;
    label: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  topModels: Array<{
    brand: string;
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  topBrands: Array<{
    brand: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  dailySales: Array<{
    date: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
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
        unitPrice: true,
        order: {
          select: {
            source: true,
            createdAt: true,
          },
        },
        variant: {
          select: {
            price: true,
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
  const totalRevenue = orderItems.reduce(
    (sum, item) => sum + Number(item.unitPrice ?? 0) * item.quantity,
    0,
  );
  const totalCost = orderItems.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0,
  );
  const grossProfit = totalRevenue - totalCost;

  const sourceMap = orderItems.reduce(
    (acc, item) => {
      const revenue = Number(item.unitPrice ?? 0) * item.quantity;
      const cost = Number(item.variant.price) * item.quantity;
      const profit = revenue - cost;

      acc[item.order.source] = {
        quantity: (acc[item.order.source]?.quantity ?? 0) + item.quantity,
        revenue: (acc[item.order.source]?.revenue ?? 0) + revenue,
        cost: (acc[item.order.source]?.cost ?? 0) + cost,
        profit: (acc[item.order.source]?.profit ?? 0) + profit,
      };
      return acc;
    },
    {} as Record<
      string,
      { quantity: number; revenue: number; cost: number; profit: number }
    >,
  );

  const sourceLabels: Record<string, string> = {
    INSTAGRAM: "Instagram",
    STORE: "Shitore",
    WHOLESALE: "Shumice",
  };

  const topSourceEntry =
    Object.entries(sourceMap).sort((a, b) => b[1].quantity - a[1].quantity)[0] ??
    null;

  const modelMap = orderItems.reduce(
    (acc, item) => {
      const key = `${item.variant.product.brand}|||${item.variant.product.name}`;
      const current = acc.get(key) ?? {
        brand: item.variant.product.brand,
        name: item.variant.product.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      const revenue = Number(item.unitPrice ?? 0) * item.quantity;
      const cost = Number(item.variant.price) * item.quantity;
      current.quantity += item.quantity;
      current.revenue += revenue;
      current.cost += cost;
      current.profit += revenue - cost;
      acc.set(key, current);
      return acc;
    },
    new Map<
      string,
      {
        brand: string;
        name: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >(),
  );

  const brandMap = orderItems.reduce(
    (acc, item) => {
      const key = item.variant.product.brand;
      const current = acc.get(key) ?? {
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      const revenue = Number(item.unitPrice ?? 0) * item.quantity;
      const cost = Number(item.variant.price) * item.quantity;
      current.quantity += item.quantity;
      current.revenue += revenue;
      current.cost += cost;
      current.profit += revenue - cost;
      acc.set(key, current);
      return acc;
    },
    new Map<
      string,
      { quantity: number; revenue: number; cost: number; profit: number }
    >(),
  );

  const dailyMap = orderItems.reduce(
    (acc, item) => {
      const key = new Intl.DateTimeFormat("sq-AL", {
        timeZone: BUSINESS_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
      }).format(item.order.createdAt);

      const current = acc.get(key) ?? { quantity: 0, revenue: 0, profit: 0 };
      const revenue = Number(item.unitPrice ?? 0) * item.quantity;
      const profit = revenue - Number(item.variant.price) * item.quantity;
      current.quantity += item.quantity;
      current.revenue += revenue;
      current.profit += profit;
      acc.set(key, current);
      return acc;
    },
    new Map<string, { quantity: number; revenue: number; profit: number }>(),
  );

  const topModels = [...modelMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const sourceBreakdown = (["INSTAGRAM", "STORE", "WHOLESALE"] as const).map(
    (source) => ({
      source,
      label: sourceLabels[source],
      quantity: sourceMap[source]?.quantity ?? 0,
      revenue: sourceMap[source]?.revenue ?? 0,
      cost: sourceMap[source]?.cost ?? 0,
      profit: sourceMap[source]?.profit ?? 0,
    }),
  );

  const topBrands = [...brandMap.entries()]
    .map(([brand, values]) => ({
      brand,
      quantity: values.quantity,
      revenue: values.revenue,
      cost: values.cost,
      profit: values.profit,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const dailySales = [...dailyMap.entries()]
    .map(([date, values]) => ({
      date,
      quantity: values.quantity,
      revenue: values.revenue,
      profit: values.profit,
    }))
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
    activeModelsCount: modelMap.size,
    totalRevenue,
    totalCost,
    grossProfit,
    topSourceLabel: topSourceEntry ? sourceLabels[topSourceEntry[0]] : null,
    topSourceQuantity: topSourceEntry?.[1].quantity ?? 0,
    sourceBreakdown,
    topModels,
    topBrands,
    dailySales,
  } satisfies MonthlySalesReport;
}
