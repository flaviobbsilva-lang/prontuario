import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const banco = await createClient();
  const { data: { user } } = await banco.auth.getUser();
  if (!user) return Response.json({ erro: "Entre novamente no prontuário." }, { status: 401 });
  const { data: equipe } = await banco.rpc("is_staff");
  if (equipe !== true) return Response.json({ erro: "Acesso restrito à equipe clínica." }, { status: 403 });

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return Response.json({ erro: "Transcrição ainda não configurada." }, { status: 503 });
  const entrada = await request.formData().catch(() => null);
  const audio = entrada?.get("audio");
  if (!(audio instanceof File) || !audio.size || audio.size > 4_000_000 ||
      !/^(audio|video)\/(webm|mp4|ogg)(;|$)/.test(audio.type)) {
    return Response.json({ erro: "Gravação inválida ou maior que 4 MB." }, { status: 400 });
  }
  const dados = new FormData();
  dados.set("file", audio);
  dados.set("model", "gpt-4o-mini-transcribe");
  dados.set("language", "pt");
  try {
    const resposta = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: "Bearer " + chave }, body: dados,
      signal: AbortSignal.timeout(55000),
    });
    if (resposta.ok) {
      const { text } = await resposta.json();
      if (typeof text === "string" && text.trim()) return Response.json({ texto: text });
    }
    if (resposta.status === 429) {
      const falha = await resposta.json().catch(() => null);
      const codigo = falha?.error?.code;
      const semSaldo = codigo === "credit_balance_exhausted" || codigo === "insufficient_quota";
      return Response.json({
        erro: semSaldo
          ? "A API da OpenAI está sem saldo ou cota. Confira o faturamento e tente novamente."
          : "Limite temporário de transcrição atingido. Aguarde um pouco e tente novamente.",
      }, { status: 429 });
    }
  } catch {
    // Do not log clinical audio or the upstream response.
  }
  return Response.json({ erro: "Não foi possível transcrever a gravação. Tente novamente." }, { status: 502 });
}
