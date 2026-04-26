import Image from "next/image";
import { redirect } from "next/navigation";
import { FlashMessage } from "@/app/components/flash-message";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function login(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    redirect("/login?error=validation");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    redirect("/login?error=credentials");
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    redirect("/login?error=credentials");
  }

  await createSession(user.id);
  redirect("/");
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "validation":
      return "Ploteso email dhe password.";
    case "credentials":
      return "Email ose password nuk eshte i sakte.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  const usersCount = await prisma.user.count();

  if (usersCount === 0) {
    redirect("/setup");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <Image
          src="/bg.jpeg"
          alt="Background"
          fill
          priority
          className="object-cover object-[center_38%] scale-[1.04]"
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.5)_0%,rgba(2,6,23,0.66)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(2,6,23,0.56)_0%,transparent_34%),radial-gradient(circle_at_right,rgba(2,6,23,0.46)_0%,transparent_34%),radial-gradient(circle_at_top_left,rgba(34,211,238,0.12)_0%,transparent_28%)]" />
      <div className="absolute inset-0 backdrop-blur-[0.5px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-md rounded-[32px] border border-white/25 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1 shadow-sm">
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                className="object-contain"
                sizes="64px"
                priority
              />
            </div>
            <p className="mt-3 text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
              FridgeStock
            </p>
          </div>
          <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight text-slate-950">
            Login
          </h1>

          {errorMessage ? (
            <FlashMessage
              type="error"
              text={errorMessage}
              className="mt-6 rounded-2xl px-4 py-3 text-sm"
            />
          ) : null}

          <form action={login} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-800"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="admin@stockapp.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-800"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
            >
              Hyr ne panel
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
