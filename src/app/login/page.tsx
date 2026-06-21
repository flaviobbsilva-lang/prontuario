"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { brand } from "@/lib/brand";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) { setErro("E-mail ou senha incorretos."); return; }
    router.replace("/");
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-[family-name:var(--font-display)] text-3xl text-purple">{brand.appName}</p>
        <p className="text-sm text-muted mt-1">{brand.clinicName}</p>

        <div className="mt-8 space-y-3">
          <label className="block text-sm text-ink">E-mail
            <input className="mt-1 w-full rounded-lg border border-lilac bg-white px-3 py-2 outline-none focus:border-purple"
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm text-ink">Senha
            <input className="mt-1 w-full rounded-lg border border-lilac bg-white px-3 py-2 outline-none focus:border-purple"
              type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <button onClick={entrar} disabled={carregando}
            className="w-full rounded-lg bg-purple px-3 py-2 text-white font-medium disabled:opacity-60">
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </main>
  );
}
