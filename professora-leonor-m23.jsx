import { useState, useRef, useEffect, useCallback } from "react";

const STORAGE_KEY = "leonor_m23_v2";
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

const SYSTEM = `És a Professora Leonor, explicadora de Língua Portuguesa com 32 anos de experiência, especializada na preparação de candidatos adultos para a prova ACFES — "Avaliação de Capacidade para a Frequência do Ensino Superior de Maiores de 23 Anos" da Universidade Aberta (UAb).

Esta prova destina-se a adultos sem o 12.º ano que, tendo 23+ anos, querem aceder ao ensino superior. NÃO é uma prova de cultura geral — é uma prova de competência linguística: ler, interpretar e escrever com clareza, coerência e correção.

PERSONALIDADE: Calorosa mas exigente. Sentido de humor discreto. Tratas o aluno por "tu". Valorizas a experiência de vida como argumento. Nunca aceitas respostas vagas sem comentário.

PROGRAMA COMPLETO:
PARTE I — Interpretação de Texto (11 valores):
• Pergunta 1 — Ironia/intenção/opiniões autênticas do autor (3 val.) — resposta até 12 linhas
• Pergunta 2 — Título alternativo + justificação (2 val.) — resposta até 9 linhas
• Pergunta 3 — Comentário de excerto com base nas ideias do texto (3 val.) — até 12 linhas
• Perguntas 4.1, 4.2, 4.3 — Explicar frases/expressões em contexto (1 val. cada) — até 6 linhas cada
PARTE II — Composição Argumentativa (9 valores):
• Introdução: apresentação + contextualização (2 val.) + expressão escrita (1 val.)
• Desenvolvimento: argumentos a favor E contra, exemplos variados (2 val.) + expressão escrita (1 val.)
• Conclusão: opinião pessoal justificada (2 val.) + expressão escrita (1 val.)
• Máximo 35 linhas

QUANDO GERAS PROVA (MODO: GERAR_PROVA):
Geras prova completa com: texto original de crónica/opinião (22-26 linhas) sobre tema social atual português com autor fictício e publicação fictícia portuguesa. Parte I com todas as 5 perguntas com cotações e limites. Parte II com texto introdutório + enunciado completo com estrutura obrigatória detalhada.
Usa === PARTE I === e === PARTE II === como separadores. Usa "── Pergunta X (Y valores) ──" para cada questão.

QUANDO CORRIGES (MODO: CORRIGIR):
1. Corriges PERGUNTA A PERGUNTA com [NOTA: X/Y valores] no início de cada bloco
2. Identificas erros ortográficos/gramaticais específicos (citas palavra/frase errada)
3. Explicas o raciocínio esperado versus o que foi escrito
4. Cada pergunta termina com ✅ (bem) / ❌ (insuficiente) / ⚠️ (incompleto)
5. No final: NOTA TOTAL: X/20 valores + áreas prioritárias a melhorar
6. Terminas sempre com "💡 Dica da Professora Leonor:" com 1 truque prático

Usa linguagem PT-PT rigorosa e correta. Nunca uses bullet points nas explicações — prefere prosa fluida.`;

async function callClaude(messages) {
  if (!API_KEY) throw new Error("Chave API não definida no ficheiro .env");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM },
        ...messages,
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} — ${await res.text()}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

function speakText(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[✅❌⚠️📌💡🎯═──\[\]#*_`]/g, " ").replace(/\n+/g, ". ").replace(/\s{2,}/g, " ").trim().substring(0, 4000);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "pt-PT"; u.rate = 0.93; u.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices();
  const pick = voices.find(v => /raquel/i.test(v.name)) || voices.find(v => v.lang === "pt-PT" && /microsoft/i.test(v.name)) || voices.find(v => v.lang === "pt-PT") || voices.find(v => v.lang.startsWith("pt"));
  if (pick) u.voice = pick;
  u.onend = onEnd || null;
  window.speechSynthesis.speak(u);
}
function stopTTS() { window.speechSynthesis?.cancel(); }

function makePDF(title, body, kind) {
  const ensureJsPDF = () => new Promise(resolve => {
    if (window.jspdf) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = resolve;
    document.head.appendChild(s);
  });
  ensureJsPDF().then(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 22, TW = W - M * 2, LH = 6.5;
    let y = 0;
    const chk = () => { if (y > 275) { doc.addPage(); y = 22; } };
    const band = kind === "prova" ? [28, 72, 120] : [15, 90, 60];
    doc.setFillColor(...band);
    doc.rect(0, 0, W, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("ACFES — Maiores de 23 Anos", M, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Língua Portuguesa | Universidade Aberta", M, 22);
    doc.text(new Date().toLocaleDateString("pt-PT"), W - M, 22, { align: "right" });
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(kind === "prova" ? "PROVA-MODELO" : "CORREÇÃO DETALHADA", W - M, 14, { align: "right" });
    y = 44;
    doc.setTextColor(...band); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    const tl = doc.splitTextToSize(title, TW);
    doc.text(tl, M, y); y += tl.length * 8 + 3;
    doc.setDrawColor(...band); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 9;
    doc.setTextColor(22, 22, 38); doc.setFontSize(10.5);
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (!line) { y += 3.5; continue; }
      chk();
      const isSect = /^(===|──|PARTE [I]+|Pergunta|\[NOTA)/.test(line);
      if (isSect) {
        y += 2;
        if (/^\[NOTA/.test(line)) {
          doc.setFillColor(225, 245, 230); doc.rect(M - 2, y - 5, TW + 4, 8, "F");
          doc.setTextColor(15, 100, 50);
        } else { doc.setTextColor(...band); }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        const sl = doc.splitTextToSize(line.replace(/^===|===$|^──|──$/g, "").trim(), TW);
        doc.text(sl, M, y); y += sl.length * LH + 3;
        doc.setTextColor(22, 22, 38); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
      } else {
        const wl = doc.splitTextToSize(line, TW);
        for (const wline of wl) { chk(); doc.text(wline, M, y); y += LH; }
      }
    }
    const np = doc.getNumberOfPages();
    for (let i = 1; i <= np; i++) {
      doc.setPage(i); doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(160, 160, 170);
      doc.line(M, 284, W - M, 284);
      doc.text("Professora Leonor · ACFES M23 · Língua Portuguesa", M, 289);
      doc.text(`Pág. ${i} / ${np}`, W - M, 289, { align: "right" });
    }
    doc.save(`${kind === "prova" ? "Prova" : "Correcao"}_M23_${Date.now()}.pdf`);
  });
}

function parseScores(text) {
  const re = /\[NOTA[:\s]+(\d+(?:[,\.]\d+)?)\s*\/\s*(\d+)/gi;
  let m, idx = 0;
  const perguntas = [];
  while ((m = re.exec(text)) !== null) {
    idx++;
    perguntas.push({ label: `P${idx}`, got: parseFloat(m[1].replace(",", ".")), max: parseFloat(m[2]) });
  }
  const tot = text.match(/NOTA\s+TOTAL[:\s]+(\d+(?:[,\.]\d+)?)\s*\/\s*20/i);
  return { perguntas, total: tot ? parseFloat(tot[1].replace(",", ".")) : null };
}

function EvolutionChart({ history }) {
  if (history.length < 2) return null;
  const W = 300, H = 110, pad = 28;
  const vals = history.map(h => h.total);
  const minV = Math.max(0, Math.min(...vals) - 2), maxV = Math.min(20, Math.max(...vals) + 2);
  const sx = i => pad + (i / (vals.length - 1)) * (W - pad * 2);
  const sy = v => H - pad - ((v - minV) / (maxV - minV)) * (H - pad * 2);
  const pts = vals.map((v, i) => `${sx(i)},${sy(v)}`).join(" ");
  const area = `M${sx(0)},${sy(vals[0])} ${vals.slice(1).map((v, i) => `L${sx(i + 1)},${sy(v)}`).join(" ")} L${sx(vals.length - 1)},${H - pad} L${sx(0)},${H - pad} Z`;
  return (
    <svg width={W} height={H} style={{ overflow: "visible", display: "block" }}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" /><stop offset="100%" stopColor="#4ade80" stopOpacity="0" /></linearGradient></defs>
      {[0, 5, 10, 15, 20].filter(v => v >= minV && v <= maxV + 2).map(v => (
        <g key={v}><line x1={pad} y1={sy(v)} x2={W - pad} y2={sy(v)} stroke="#ffffff10" strokeWidth="1" /><text x={pad - 4} y={sy(v) + 3.5} fontSize="9" fill="#ffffff44" textAnchor="end">{v}</text></g>
      ))}
      <path d={area} fill="url(#cg)" />
      <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => <circle key={i} cx={sx(i)} cy={sy(v)} r="4" fill="#4ade80" stroke="#080f1e" strokeWidth="2" />)}
    </svg>
  );
}

const TIPS = [
  { icon: "🎭", title: "Ironia ≠ mentira", body: "O autor irónico escreve o contrário do que pensa — para parecer absurdo de propósito. A pergunta sobre ironia quer as tuas OPINIÕES REAIS do autor, não o que ele escreveu literalmente." },
  { icon: "📐", title: "Estrutura = metade da nota", body: "Introdução, Desenvolvimento e Conclusão bem separados valem 3 valores só de estrutura. Não os saltes mesmo que o tempo aperte." },
  { icon: "🔗", title: "Conectores que salvam", body: "'Por um lado... por outro', 'No entanto', 'Além disso', 'Em suma' — mostram que sabes argumentar. Usa pelo menos 4 no desenvolvimento." },
  { icon: "📏", title: "Respeita os limites de linhas", body: "Mais não é melhor. Uma resposta de 15 linhas quando o limite é 12 pode ser penalizada. Sê preciso e conciso." },
  { icon: "🧩", title: "Explica ≠ copia", body: "Nas perguntas de explicação de frases, NUNCA repitas as palavras originais. Usa vocabulário completamente diferente para mostrar que entendeste." },
  { icon: "💡", title: "Usa a tua experiência", body: "Na composição, exemplos da tua vida profissional ou pessoal são tão válidos quanto exemplos literários. Usa-os — é a vantagem dos adultos." },
];

const TEORIA = [
  { icon: "🎭", title: "Como identificar ironia", body: `A ironia é quando o autor diz o contrário do que pensa, geralmente para criticar algo de forma inteligente.\n\nComo a reconheces: o que o autor escreve parece absurdo, exagerado ou contraditório com o tom do texto? Se sim, é provavelmente irónico.\n\nNas perguntas sobre ironia, o avaliador quer saber as OPINIÕES REAIS do autor. Tens de "traduzir" a ironia.\n\nExemplo: Se um autor escreve "Que excelente ideia proibir livros antigos", a opinião real é o oposto — que é uma ideia terrível.` },
  { icon: "🏗️", title: "Estrutura da Composição (Parte II)", body: `INTRODUÇÃO (3 val.): Apresenta o tema com palavras tuas — nunca copias o texto. Contextualiza o problema. Termina a anunciar a tua posição.\n\nDESENVOLVIMENTO (3 val.): É o coração. Expõe pelo menos 2 argumentos a favor E 2 contra. Usa exemplos concretos da vida real, do trabalho, da sociedade. Liga as ideias com conectores. Cada argumento deve ter: afirmação + justificação + exemplo.\n\nCONCLUSÃO (3 val.): A TUA opinião pessoal, claramente expressa e justificada. Não pode ser vaga. Toma uma posição e defende-a. Começa com "Em suma," ou "Concluindo,".` },
  { icon: "🔗", title: "Conectores Essenciais", body: `Para ADICIONAR: além disso · ademais · também · acrescente-se que · não só… mas também\n\nPara CONTRASTAR: no entanto · contudo · porém · apesar de · todavia · em contrapartida · pelo contrário\n\nPara CAUSAR: porque · visto que · dado que · uma vez que · já que · pois\n\nPara EXEMPLIFICAR: por exemplo · nomeadamente · como é o caso de · a título de exemplo\n\nPara CONCLUIR: portanto · assim · em suma · concluindo · em conclusão · desta forma` },
  { icon: "📝", title: "Explicar Expressões (Perguntas 4.x)", body: `A regra de ouro: NUNCA repitas as palavras da expressão original. Usa vocabulário completamente diferente.\n\nEstratégia em 3 passos:\n1. Identifica o sentido literal da expressão\n2. Percebe o sentido no contexto do texto\n3. Escreve com palavras totalmente diferentes, mostrando que entendeste ambos\n\nLimite: até 6 linhas. Uma boa resposta cabe em 3-4 linhas bem escritas.` },
  { icon: "💯", title: "Distribuição de Cotações", body: `PARTE I — 11 valores:\n• Pergunta 1 (ironia/opiniões): 3 val. — até 12 linhas\n• Pergunta 2 (título + justificação): 2 val. — até 9 linhas\n• Pergunta 3 (comentário de excerto): 3 val. — até 12 linhas\n• Perguntas 4.1, 4.2, 4.3: 1 val. cada — até 6 linhas cada\n\nPARTE II — 9 valores:\n• Introdução: 2 val. conteúdo + 1 val. expressão escrita\n• Desenvolvimento: 2 val. conteúdo + 1 val. expressão escrita\n• Conclusão: 2 val. conteúdo + 1 val. expressão escrita` },
  { icon: "🎯", title: "Estratégia no Dia da Prova", body: `Tens 150 minutos. Usa-os assim:\n• 15 min — Lê o texto da Parte I duas vezes com atenção\n• 45 min — Responde às perguntas 1 a 4.3 da Parte I\n• 10 min — Lê o texto da Parte II e faz esquema da composição\n• 50 min — Escreve a composição com estrutura bem separada\n• 15 min — Revê ortografia, pontuação e coesão\n• 15 min — Margem de segurança\n\nNão percas demasiado tempo na Parte I — as perguntas 4.x valem apenas 1 valor cada. Investe na composição.` },
];

const TREINO_PERGUNTAS = [
  { q: "O que é ironia e como a identifico?", icon: "🎭" },
  { q: "Como estruturo a composição argumentativa?", icon: "✍️" },
  { q: "Que conectores devo usar?", icon: "🔗" },
  { q: "Como explico uma expressão em contexto?", icon: "🔍" },
  { q: "Qual é a diferença entre comentar e resumir?", icon: "📄" },
  { q: "Como justificar um título alternativo?", icon: "🏷️" },
];

function Btn({ onClick, bg, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1e3a5f55" : bg, color: "#fff", border: "none",
      borderRadius: 7, padding: "5px 13px", fontSize: 11, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", letterSpacing: .4, opacity: disabled ? .5 : 1,
    }}>{children}</button>
  );
}

export default function App() {
  const [tab, setTab] = useState("aula");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uploadedText, setUploadedText] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [activeTip, setActiveTip] = useState(0);
  const [step, setStep] = useState("idle");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const saveHistory = useCallback((h) => {
    setHistory(h);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch {}
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    const handler = () => synth.getVoices();
    synth.addEventListener("voiceschanged", handler);
    return () => synth.removeEventListener("voiceschanged", handler);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    setMessages([{
      id: 0, role: "assistant", downloadable: false,
      content: `Olá! Sou a Professora Leonor. 👋\n\nTenho 32 anos de experiência a preparar adultos para a prova ACFES de Maiores de 23 Anos da Universidade Aberta.\n\nA prova vale 20 valores: interpretação de texto (11 val.) e composição argumentativa (9 val.). Não precisas de memorizar nada — precisas de saber ler com atenção e escrever com clareza.\n\nRecomendo: começa pelas 💡 Dicas Rápidas no painel esquerdo antes de gerares a prova. Vamos começar? 📚`,
    }]);
  }, []);

  const addAssistantMsg = (content, extra = {}) =>
    setMessages(prev => [...prev, { id: Date.now(), role: "assistant", content, ...extra }]);

  const send = useCallback(async (overrideText, opts = {}) => {
    const text = overrideText ?? input.trim();
    let userContent = text;
    if (uploadedText) {
      userContent = `[RESOLUÇÃO DO ALUNO PARA CORRIGIR]\n\n${uploadedText}\n\n${text ? `Nota do aluno: ${text}` : "Corrige esta resolução detalhadamente com [NOTA: X/Y] para cada pergunta e NOTA TOTAL no final."}`;
    }
    if (!userContent) return;
    setInput("");
    const displayText = uploadedText ? `📝 Resolução enviada (${uploadedText.substring(0, 80)}…)` : text;
    setMessages(prev => [...prev, { id: Date.now(), role: "user", content: displayText }]);
    setUploadedText(""); setUploadName("");
    setLoading(true);
    try {
      // A API da Anthropic requer que as mensagens comecem sempre com "user"
      const allMsgs = [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userContent }];
      const firstUserIdx = allMsgs.findIndex(m => m.role === "user");
      const apiMsgs = allMsgs.slice(firstUserIdx);
      const reply = await callClaude(apiMsgs);
      const isEx = opts.isExercise, isCorr = userContent.includes("RESOLUÇÃO DO ALUNO") || opts.isCorrection;
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: reply, downloadable: isEx || isCorr, kind: isEx ? "prova" : isCorr ? "correcao" : "chat" }]);
      if (isEx) { setCurrentExercise(reply); setStep("waiting_upload"); }
      if (isCorr) {
        const { perguntas, total } = parseScores(reply);
        if (total !== null) {
          const entry = { id: Date.now(), date: new Date().toLocaleDateString("pt-PT"), total, max: 20, pct: Math.round((total / 20) * 100), perguntas };
          saveHistory([...history, entry]);
        }
        setStep("idle");
      }
    } catch (e) {
      addAssistantMsg(`Erro: ${e.message}\n\nSe o erro for 403 ou "API key not valid", a chave no .env está incorreta. Se for 429, atingiste o limite gratuito. 🔄`);
    }
    setLoading(false);
  }, [input, messages, uploadedText, history, saveHistory]);

  const handleGenerate = () => {
    setStep("generating"); setShowTips(false);
    send(`MODO: GERAR_PROVA\nGera uma prova ACFES M23 completa com texto original de crónica/opinião (22-26 linhas) sobre tema social atual em Portugal, autor fictício português, publicação fictícia. Parte I com todas as 5 questões (1, 2, 3, 4.1, 4.2, 4.3) com cotações e limites. Parte II com texto curto de contextualização e enunciado completo. Usa === PARTE I === e === PARTE II === como separadores e "── Pergunta X (Y valores) ──" para cada questão.`, { isExercise: true });
  };

  const handleCorrect = () => {
    if (!uploadedText && !input.trim()) return;
    setStep("correcting");
    const ctx = currentExercise ? `[PROVA ORIGINAL GERADA]\n${currentExercise.substring(0, 600)}\n\n` : "";
    send(ctx + "MODO: CORRIGIR\nCorrige detalhadamente com [NOTA: X/Y valores] para cada pergunta e NOTA TOTAL: X/20 no final.", { isCorrection: true });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    if (file.type === "text/plain") {
      const r = new FileReader();
      r.onload = ev => setUploadedText(ev.target.result);
      r.readAsText(file);
    } else {
      setUploadedText(`[Ficheiro: ${file.name}]`);
      addAssistantMsg(`📎 Recebi o ficheiro **${file.name}**.\n\nPara PDF e imagens, cola o texto das tuas respostas diretamente na caixa em baixo, ou escreve-as a seguir. Depois clica "Enviar para Correção".`);
    }
    e.target.value = "";
  };

  const handleSpeak = (text) => { setIsSpeaking(true); speakText(text, () => setIsSpeaking(false)); };
  const handleStop = () => { stopTTS(); setIsSpeaking(false); };

  const lastScore = history.length > 0 ? history[history.length - 1] : null;

  const stepLabels = ["Gerar Prova", "Resolver em Papel", "Carregar Resolução", "Correção"];
  const stepIdx = step === "generating" ? 0 : step === "waiting_upload" ? 1 : step === "correcting" ? 2 : -1;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Palatino Linotype', Georgia, serif", background: "#080f1e" }}>

      {/* TOPBAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 22px", background: "linear-gradient(90deg,#05101f,#0b1d38)", borderBottom: "1px solid #1e3a5f", boxShadow: "0 2px 24px #00000088" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2d6a9f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid #2d6a9f55", boxShadow: isSpeaking ? "0 0 0 4px #4ade8044,0 0 16px #4ade8033" : "none", transition: "box-shadow .3s" }}>👩‍🏫</div>
          {isSpeaking && <div style={{ position: "absolute", bottom: -1, right: -1, width: 14, height: 14, borderRadius: "50%", background: "#4ade80", border: "2px solid #080f1e", animation: "pulse 1s infinite" }} />}
        </div>
        <div>
          <div style={{ color: "#e2eaf4", fontWeight: 700, fontSize: 15, letterSpacing: .3 }}>Professora Leonor</div>
          <div style={{ color: "#4a7fa8", fontSize: 9, letterSpacing: 1.2, marginTop: 1 }}>ACFES · MAIORES DE 23 ANOS · UNIVERSIDADE ABERTA · LÍNGUA PORTUGUESA</div>
        </div>
        {lastScore && (
          <div style={{ marginLeft: "auto", background: "#0f2744", border: "1px solid #1e3a5f", borderRadius: 10, padding: "6px 14px", textAlign: "center", cursor: "pointer" }} onClick={() => setTab("progresso")}>
            <div style={{ fontSize: 9, color: "#4a7fa8", letterSpacing: 1 }}>ÚLTIMA NOTA</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: lastScore.pct >= 70 ? "#4ade80" : lastScore.pct >= 50 ? "#fbbf24" : "#f87171" }}>{lastScore.total}<span style={{ fontSize: 11, opacity: .6 }}>/20</span></div>
          </div>
        )}
        <div style={{ display: "flex", gap: 3, marginLeft: lastScore ? 8 : "auto" }}>
          {[["aula", "💬 Aula"], ["progresso", "📊 Progresso"], ["teoria", "📖 Teoria"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: tab === t ? "#4ade80" : "#4a6d8c", borderBottom: tab === t ? "2px solid #4ade80" : "2px solid transparent", transition: "all .15s" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div style={{ width: 214, flexShrink: 0, background: "#05101f", borderRight: "1px solid #1e3a5f", padding: 13, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          {/* Actions */}
          <div style={{ fontSize: 9, color: "#2d5a8e", letterSpacing: 1.5, fontWeight: 700, marginBottom: 9 }}>AÇÕES PRINCIPAIS</div>
          {[
            { icon: "💡", label: "Dicas Rápidas", sub: "Antes de começar", action: () => { setShowTips(true); setTab("aula"); }, active: showTips, color: "#b45309" },
            { icon: "📋", label: "Gerar Prova Completa", sub: "Parte I + Parte II", action: () => { setShowTips(false); handleGenerate(); setTab("aula"); }, active: step === "generating" || step === "waiting_upload", color: "#1e5fa8" },
          ].map(({ icon, label, sub, action, active, color }) => (
            <button key={label} onClick={action} style={{ width: "100%", textAlign: "left", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${active ? color : "#1e3a5f"}`, background: active ? color : "transparent", color: active ? "#fff" : "#94c4e8", cursor: "pointer", transition: "all .18s", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div><div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>{sub && <div style={{ fontSize: 10, opacity: .7, marginTop: 1 }}>{sub}</div>}</div>
              </div>
            </button>
          ))}

          <div style={{ borderTop: "1px solid #1e3a5f", margin: "8px 0" }} />
          <div style={{ fontSize: 9, color: "#2d5a8e", letterSpacing: 1.5, fontWeight: 700, marginBottom: 9 }}>ENTREGAR RESOLUÇÃO</div>

          <button onClick={() => fileRef.current?.click()} style={{ width: "100%", background: "#0a1d35", border: "1.5px dashed #2d5a8e", borderRadius: 11, padding: "10px 13px", cursor: "pointer", color: "#94c4e8", fontSize: 12, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
            <span style={{ fontSize: 18 }}>📤</span>
            <div><div>Carregar ficheiro</div><div style={{ fontSize: 9, opacity: .6, marginTop: 1 }}>.txt · .pdf · .jpg · .png</div></div>
          </button>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleFile} />

          {uploadName && (
            <div style={{ background: "#0a2210", border: "1px solid #15803d44", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#4ade80", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>✅ {uploadName.substring(0, 18)}</span>
              <button onClick={() => { setUploadedText(""); setUploadName(""); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          )}

          <button onClick={handleCorrect} disabled={!uploadedText && !input.trim()} style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${uploadedText || input.trim() ? "#15803d" : "#1e3a5f"}`, background: uploadedText || input.trim() ? "#15803d" : "transparent", color: uploadedText || input.trim() ? "#fff" : "#2d5a8e", cursor: uploadedText || input.trim() ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, textAlign: "left", marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <div><div>Enviar para Correção</div><div style={{ fontSize: 9, opacity: .6, marginTop: 1 }}>Com nota e explicação pedagógica</div></div>
          </button>

          <div style={{ borderTop: "1px solid #1e3a5f", margin: "8px 0" }} />
          <div style={{ fontSize: 9, color: "#2d5a8e", letterSpacing: 1.5, fontWeight: 700, marginBottom: 9 }}>MODO TREINO</div>
          {TREINO_PERGUNTAS.map(({ q, icon }) => (
            <button key={q} onClick={() => { setInput(q); setTab("aula"); }} style={{ width: "100%", textAlign: "left", padding: "7px 11px", borderRadius: 9, border: "1px solid #1e3a5f", background: "transparent", color: "#6b8db5", cursor: "pointer", fontSize: 11, marginBottom: 5, display: "flex", gap: 7, alignItems: "center" }}>
              <span>{icon}</span> {q}
            </button>
          ))}

          <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid #1e3a5f22", fontSize: 9, color: "#2d3a4a", lineHeight: 1.7, textAlign: "center" }}>
            Voz: Raquel (Microsoft Edge)<br />Modelo: Llama 3.3 70B (Groq)
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── TAB AULA ── */}
          {tab === "aula" && (
            <>
              {/* TIPS */}
              {showTips && (
                <div style={{ background: "linear-gradient(135deg,#0d1e35,#0a1628)", borderBottom: "1px solid #1e3a5f", padding: "16px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, letterSpacing: .5 }}>💡 DICAS RÁPIDAS — ANTES DE COMEÇAR</div>
                    <button onClick={() => setShowTips(false)} style={{ background: "none", border: "none", color: "#4a6d8c", cursor: "pointer", fontSize: 18 }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 4 }}>
                    {TIPS.map((tip, i) => (
                      <div key={i} onClick={() => setActiveTip(i)} style={{ minWidth: 155, padding: "11px 13px", background: activeTip === i ? "#1e3a5f" : "#0a1628", border: `1.5px solid ${activeTip === i ? "#4ade80" : "#1e3a5f"}`, borderRadius: 11, cursor: "pointer", transition: "all .15s", flexShrink: 0 }}>
                        <div style={{ fontSize: 20, marginBottom: 5 }}>{tip.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: activeTip === i ? "#4ade80" : "#94c4e8", marginBottom: 4 }}>{tip.title}</div>
                        {activeTip === i && <div style={{ fontSize: 11, color: "#c9d8ea", lineHeight: 1.6 }}>{tip.body}</div>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setShowTips(false); handleGenerate(); }} style={{ marginTop: 12, background: "#1e5fa8", color: "#fff", border: "none", borderRadius: 9, padding: "8px 20px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    Já vi as dicas — Gerar Prova →
                  </button>
                </div>
              )}

              {/* STEP INDICATOR */}
              {stepIdx >= 0 && (
                <div style={{ background: "#0a1628", borderBottom: "1px solid #1e3a5f", padding: "9px 22px", display: "flex", gap: 5, alignItems: "center" }}>
                  {stepLabels.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < stepIdx ? "#4ade80" : i === stepIdx ? "#1e5fa8" : "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{i < stepIdx ? "✓" : i + 1}</div>
                      <span style={{ fontSize: 10, color: i === stepIdx ? "#94c4e8" : "#2d5a8e", fontWeight: i === stepIdx ? 700 : 400 }}>{s}</span>
                      {i < stepLabels.length - 1 && <div style={{ width: 16, height: 1, background: "#1e3a5f", margin: "0 3px" }} />}
                    </div>
                  ))}
                </div>
              )}

              {/* MESSAGES */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 10px" }}>
                {messages.map(msg => {
                  const isA = msg.role === "assistant";
                  return (
                    <div key={msg.id} style={{ display: "flex", gap: 11, marginBottom: 18, flexDirection: isA ? "row" : "row-reverse", alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: isA ? "linear-gradient(135deg,#1e3a5f,#2d6a9f)" : "linear-gradient(135deg,#1a2e1a,#2d5a2d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, border: `2px solid ${isA ? "#2d6a9f44" : "#2d5a2d44"}` }}>
                        {isA ? "👩‍🏫" : "🧑‍🎓"}
                      </div>
                      <div style={{ maxWidth: "77%", background: isA ? "linear-gradient(160deg,#0d1e35,#0a1d33)" : "linear-gradient(160deg,#0d1e0d,#0a1d14)", borderRadius: isA ? "3px 14px 14px 14px" : "14px 3px 14px 14px", padding: "13px 17px", border: `1px solid ${isA ? "#1e3a5f" : "#1a3a1a"}`, boxShadow: "0 2px 12px #00000033" }}>
                        {isA && <div style={{ fontSize: 9, color: "#2d6a9f", letterSpacing: 1.5, fontWeight: 700, marginBottom: 7 }}>PROF. LEONOR</div>}
                        <div style={{ fontSize: 13, lineHeight: 1.75, color: "#c9d8ea", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>{msg.content}</div>
                        {isA && (
                          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            <Btn onClick={() => handleSpeak(msg.content)} bg="#1e5fa8">🔊 Ouvir</Btn>
                            <Btn onClick={handleStop} bg="#374151">⏹ Parar</Btn>
                            {msg.downloadable && <Btn onClick={() => makePDF(msg.kind === "prova" ? `Prova ACFES M23 — ${new Date().toLocaleDateString("pt-PT")}` : `Correção Professora Leonor — ${new Date().toLocaleDateString("pt-PT")}`, msg.content, msg.kind)} bg="#15803d">📄 {msg.kind === "prova" ? "PDF da Prova" : "PDF da Correção"}</Btn>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2d6a9f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, border: "2px solid #2d6a9f44" }}>👩‍🏫</div>
                    <div style={{ background: "#0d1e35", borderRadius: "3px 14px 14px 14px", padding: "13px 18px", border: "1px solid #1e3a5f" }}>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#4a7fa8", marginRight: 6 }}>A escrever</span>
                        {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d6a9f", animation: "blink 1.2s ease-in-out infinite", animationDelay: `${i * .22}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* INPUT */}
              <div style={{ padding: "9px 20px 16px", background: "linear-gradient(0deg,#05101f,#080f1e)", borderTop: "1px solid #1e3a5f22" }}>
                {uploadName && (
                  <div style={{ background: "#0a2210", border: "1px solid #15803d44", borderRadius: 8, padding: "6px 13px", marginBottom: 7, fontSize: 11, color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>📎 {uploadName} — pronto para correção</span>
                    <button onClick={() => { setUploadedText(""); setUploadName(""); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Escreve aqui a tua resposta, pergunta, ou texto para corrigir… (Enter = enviar)" style={{ flex: 1, borderRadius: 12, border: "1px solid #1e3a5f", padding: "10px 14px", fontSize: 13, resize: "none", height: 70, background: "#0a1628", color: "#c9d8ea", fontFamily: "inherit", outline: "none", lineHeight: 1.65 }} />
                  <button onClick={() => send()} disabled={loading || (!input.trim() && !uploadedText)} style={{ width: 50, borderRadius: 12, border: "none", background: loading ? "#1e3a5f" : "linear-gradient(135deg,#1e5fa8,#2d6a9f)", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: 20, boxShadow: "0 4px 18px #2d6a9f33" }}>
                    {loading ? "⏳" : "➤"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── TAB PROGRESSO ── */}
          {tab === "progresso" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 26 }}>
              <div style={{ color: "#94c4e8", fontWeight: 700, fontSize: 16, marginBottom: 20, letterSpacing: .5 }}>📊 Progresso e Histórico</div>
              {history.length === 0 ? (
                <div style={{ background: "#0a1628", borderRadius: 14, padding: 36, textAlign: "center", border: "1px solid #1e3a5f" }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>📭</div>
                  <div style={{ color: "#4a6d8c", fontSize: 13, lineHeight: 1.8 }}>Ainda não tens provas corrigidas.<br /><span style={{ fontSize: 11, opacity: .7 }}>Gera uma prova → resolve em papel → carrega a resolução → recebe a nota.</span></div>
                </div>
              ) : (
                <>
                  {history.length >= 2 && (
                    <div style={{ background: "#0a1628", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid #1e3a5f" }}>
                      <div style={{ fontSize: 10, color: "#4a7fa8", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>EVOLUÇÃO DAS NOTAS (em 20 valores)</div>
                      <EvolutionChart history={history} />
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 11, marginBottom: 20 }}>
                    {[
                      ["Provas feitas", history.length],
                      ["Melhor nota", `${Math.max(...history.map(h => h.total))}/20`],
                      ["Média", `${(history.reduce((a, h) => a + h.total, 0) / history.length).toFixed(1)}/20`],
                      ["Tendência", history.length >= 2 ? (history[history.length - 1].total >= history[history.length - 2].total ? "📈 subir" : "📉 baixar") : "—"],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: "#0a1628", borderRadius: 11, padding: "13px 16px", border: "1px solid #1e3a5f" }}>
                        <div style={{ fontSize: 9, color: "#4a7fa8", letterSpacing: 1, fontWeight: 700 }}>{String(l).toUpperCase()}</div>
                        <div style={{ fontSize: 19, fontWeight: 900, color: "#94c4e8", marginTop: 5 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[...history].reverse().map((h, i) => (
                    <div key={h.id} style={{ background: "#0a1628", borderRadius: 11, padding: "13px 17px", marginBottom: 9, border: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#4a7fa8" }}>{h.date} · Sessão #{history.length - i}</div>
                        {h.perguntas.length > 0 && (
                          <div style={{ display: "flex", gap: 7, marginTop: 7, flexWrap: "wrap" }}>
                            {h.perguntas.map((p, j) => <div key={j} style={{ fontSize: 10, background: "#0f2744", borderRadius: 6, padding: "3px 9px", color: "#94c4e8" }}>{p.label}: {p.got}/{p.max}</div>)}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 21, fontWeight: 900, color: h.pct >= 70 ? "#4ade80" : h.pct >= 50 ? "#fbbf24" : "#f87171" }}>
                        {h.total}<span style={{ fontSize: 11, opacity: .6 }}>/20</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { if (window.confirm("Apagar todo o histórico?")) { saveHistory([]); } }} style={{ marginTop: 6, background: "none", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 11 }}>
                    🗑 Apagar histórico
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── TAB TEORIA ── */}
          {tab === "teoria" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 26 }}>
              <div style={{ color: "#94c4e8", fontWeight: 700, fontSize: 16, marginBottom: 20, letterSpacing: .5 }}>📖 Guia de Estudo — ACFES M23</div>
              {TEORIA.map((item, i) => (
                <div key={i} style={{ background: "#0a1628", borderRadius: 13, padding: 19, marginBottom: 15, border: "1px solid #1e3a5f" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 13 }}>{item.icon} {item.title}</div>
                    <button onClick={() => handleSpeak(item.title + ". " + item.body)} style={{ background: "#1e3a5f", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: "#94c4e8", fontSize: 11, fontWeight: 700 }}>🔊 Ouvir</button>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{item.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
        textarea:focus{border-color:#2d6a9f!important;box-shadow:0 0 0 2px #2d6a9f22}
        button:not(:disabled):hover{filter:brightness(1.12)}
      `}</style>
    </div>
  );
}
