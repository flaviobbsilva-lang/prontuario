"use client";

import { useEffect, useRef, useState } from "react";

export default function GravadorAnamnese({ inserir, exemplo, teste = false }: {
  inserir: (texto: string) => void;
  exemplo?: string;
  teste?: boolean;
}) {
  const [autorizado, setAutorizado] = useState(false);
  const [fase, setFase] = useState<"livre" | "abrindo" | "gravando" | "pausado" | "enviando">("livre");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [erro, setErro] = useState("");
  const gravador = useRef<MediaRecorder | null>(null);
  const ativo = useRef(false);

  useEffect(() => {
    ativo.current = true;
    return () => {
      ativo.current = false;
      const atual = gravador.current;
      if (atual && atual.state !== "inactive") atual.stop();
      atual?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function iniciar() {
    setErro("");
    setFase("abrindo");
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!ativo.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const atual = new MediaRecorder(stream);
      const partes: Blob[] = [];
      let tamanho = 0;
      atual.ondataavailable = ({ data }) => {
        tamanho += data.size;
        if (tamanho <= 4_000_000) partes.push(data);
        else if (atual.state !== "inactive") atual.stop();
      };
      atual.onstop = () => {
        atual.stream.getTracks().forEach((track) => track.stop());
        if (!ativo.current) return;
        setFase("livre");
        if (tamanho > 4_000_000) {
          setErro("A gravação passou de 4 MB. Grave um trecho mais curto.");
          return;
        }
        setAudio(new Blob(partes, { type: atual.mimeType }));
      };
      gravador.current = atual;
      atual.start(1000);
      setFase("gravando");
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      setErro("Não foi possível abrir o microfone. Confira a permissão do navegador.");
      setFase("livre");
    }
  }

  async function transcrever() {
    if (!audio || !autorizado) return;
    setErro("");
    if (exemplo) {
      inserir(exemplo);
      setAudio(null);
      setAutorizado(false);
      return;
    }
    setFase("enviando");
    const dados = new FormData();
    const extensao = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
    dados.set("audio", audio, "gravacao." + extensao);
    try {
      const resposta = await fetch("/api/anamnese/transcrever", { method: "POST", body: dados });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro);
      inserir(resultado.texto);
      setAudio(null);
      setAutorizado(false);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha na transcrição.");
    } finally {
      setFase("livre");
    }
  }

  return <section className="space-y-2 border-b border-lilac pb-3 text-sm">
    <h2 className="font-medium">Gravar anamnese</h2>
    <label className="flex items-start gap-2">
      <input type="checkbox" checked={autorizado} disabled={fase !== "livre"}
        onChange={(event) => setAutorizado(event.target.checked)} />
      {exemplo ? "Vou usar apenas uma fala fictícia neste teste." :
        teste ? "Vou gravar uma fala fictícia e enviá-la à OpenAI para transcrição." :
        "O paciente autorizou a gravação e o envio do áudio à OpenAI para transcrição."}
    </label>
    <div className="flex flex-wrap gap-2">
      {fase === "livre" && !audio && <button type="button" disabled={!autorizado} onClick={iniciar}
        className="rounded-lg border border-lilac px-3 py-2 disabled:opacity-50">Gravar</button>}
      {(fase === "gravando" || fase === "pausado") && <>
        <button type="button" className="rounded-lg border border-lilac px-3 py-2" onClick={() => {
          if (fase === "gravando") { gravador.current?.pause(); setFase("pausado"); }
          else { gravador.current?.resume(); setFase("gravando"); }
        }}>{fase === "gravando" ? "Pausar" : "Retomar"}</button>
        <button type="button" className="rounded-lg border border-lilac px-3 py-2"
          onClick={() => gravador.current?.stop()}>Encerrar gravação</button>
      </>}
      {fase === "livre" && audio && <>
        <button type="button" disabled={!autorizado} className="rounded-lg bg-purple px-3 py-2 text-white disabled:opacity-50"
          onClick={transcrever}>Transcrever</button>
        <button type="button" className="rounded-lg border border-lilac px-3 py-2"
          onClick={() => { setAudio(null); setErro(""); }}>Descartar áudio</button>
      </>}
    </div>
    <p role="status">{({ livre: "", abrindo: "Abrindo microfone…", gravando: "Gravando", pausado: "Pausado", enviando: "Transcrevendo…" })[fase]}</p>
    {erro && <p role="alert" className="text-red-700">{erro}</p>}
  </section>;
}
