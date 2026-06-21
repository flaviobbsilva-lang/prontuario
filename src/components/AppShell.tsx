"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Activity, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brand } from "@/lib/brand";

const nav = [
  { href: "/", label: "Painel", icon: Activity },
  { href: "/pacientes", label: "Pacientes", icon: Users },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-lilac/60 bg-white/60 flex flex-col">
        <div className="px-5 py-6">
          <p className="font-[family-name:var(--font-display)] text-2xl text-purple leading-none">{brand.appName}</p>
          <p className="text-xs text-muted mt-1">{brand.clinicName}</p>
        </div>
        <nav className="px-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-purple text-white" : "text-ink hover:bg-lilac/30"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <button onClick={sair}
          className="mt-auto m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-lilac/30">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
