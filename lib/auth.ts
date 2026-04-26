import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "stock_app_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type UserRole = "SUPER_ADMIN" | "SELLER" | "WAREHOUSE";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { token: sessionToken } }).catch(() => null);
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(
  roles: UserRole[],
) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}

export function hasRole(user: AuthUser, roles: UserRole[]) {
  return roles.includes(user.role);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await prisma.session.delete({ where: { token: sessionToken } }).catch(() => null);
  }

  cookieStore.delete(SESSION_COOKIE);
}
