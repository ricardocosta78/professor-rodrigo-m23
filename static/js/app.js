/* ── STATE ── */
let voiceKey      = localStorage.getItem("voice") || "pt_masculino_duarte";
let messages      = [];
let uploadedText  = "";
let uploadedName  = "";
let sessionHistory = JSON.parse(localStorage.getItem("acfes_mat_history") || "[]");

const audio = document.getElementById("audioPlayer");

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("voiceSelect").value = voiceKey;
  renderPrograma();
  renderProgresso();

  const greeting = "Olá! Sou o Professor Rodrigo. 🧮\n\nTenho 28 anos de experiência a ensinar Matemática e a preparar adultos para o exame ACFES da Universidade Aberta.\n\nO exame dura 2 horas, vale 20 valores e NÃO permite calculadora. Com boa preparação é perfeitamente acessível.\n\nEscolhe um tema ou aula rápida no painel esquerdo, ou escreve-me directamente. 📐";
  addMessage("assistant", greeting, false);
});

/* ── TABS ── */
function setTab(tab) {
  ["aula","progresso","programa"].forEach(t => {
    document.getElementById("tab" + cap(t)).style.display = t === tab ? "flex" : "none";
    document.querySelectorAll(".tab").forEach((btn,i) => {
      btn.classList.toggle("active", ["aula","progresso","programa"][i] === tab);
    });
  });
  if (tab === "progresso") renderProgresso();
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ── VOICE ── */
function saveVoice(key) {
  voiceKey = key;
  localStorage.setItem("voice", key);
}

function testVoice() {
  speakText("Olá, sou o Professor Rodrigo. Vamos estudar Matemática juntos, passo a passo.");
}

function speakText(text) {
  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: voiceKey }),
  })
  .then(r => r.json())
  .then(data => {
    if (data.audio_url) playAudio(data.audio_url);
  });
}

function playAudio(url) {
  stopAudio();
  audio.src = url + "?t=" + Date.now();
  audio.play().catch(() => {});
  setSpeaking(true);
  audio.onended = () => setSpeaking(false);
  audio.onerror = () => setSpeaking(false);
}

function stopAudio() {
  audio.pause();
  audio.currentTime = 0;
  setSpeaking(false);
}

function setSpeaking(on) {
  document.getElementById("profAvatar").classList.toggle("speaking", on);
  document.getElementById("speakingDot").classList.toggle("active", on);
}

/* ── MESSAGES ── */
function addMessage(role, content, playVoice = true) {
  messages.push({ role, content });

  const wrap = document.createElement("div");
  wrap.className = "msg-wrap" + (role === "user" ? " user" : "");

  const av = document.createElement("div");
  av.className = "msg-avatar " + (role === "user" ? "user-av" : "prof-mat");
  av.textContent = role === "user" ? "🧑‍🎓" : "🧮";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + (role === "user" ? "user-msg" : "prof");

  if (role === "assistant") {
    const label = document.createElement("div");
    label.className = "msg-label mat";
    label.textContent = "PROF. RODRIGO";
    bubble.appendChild(label);
  }

  const txt = document.createElement("div");
  txt.className = "msg-text";
  txt.innerHTML = formatMessage(content);
  bubble.appendChild(txt);

  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const btnOuvir = document.createElement("button");
    btnOuvir.className = "msg-btn btn-ouvir";
    btnOuvir.textContent = "🔊 Ouvir";
    btnOuvir.onclick = () => speakText(content);

    const btnParar = document.createElement("button");
    btnParar.className = "msg-btn btn-parar";
    btnParar.textContent = "⏹ Parar";
    btnParar.onclick = stopAudio;

    const isProva    = content.includes("Parte A") || content.includes("PARTE A");
    const isCorrecao = content.includes("[NOTA:") || content.includes("NOTA TOTAL") || content.includes("TOTAL:");

    const btnPdf = document.createElement("button");
    btnPdf.className = "msg-btn " + (isProva ? "btn-pdf-prova" : "btn-pdf");
    btnPdf.textContent = isProva ? "📄 PDF Prova" : isCorrecao ? "📄 PDF Correção" : "📄 PDF Aula";
    btnPdf.onclick = () => downloadPDF(content, isProva ? "prova" : isCorrecao ? "correcao" : "aula");

    actions.appendChild(btnOuvir);
    actions.appendChild(btnParar);
    actions.appendChild(btnPdf);
    bubble.appendChild(actions);
  }

  wrap.appendChild(av);
  wrap.appendChild(bubble);

  const container = document.getElementById("messages");
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;

  if (role === "assistant" && playVoice) {
    speakText(content);
  }
}

function formatMessage(text) {
  text = text.replace(/^(===.*===)$/gm, '<span class="section-head">$1</span>');
  text = text.replace(/^(── .*──)$/gm, '<span class="section-head">$1</span>');
  text = text.replace(/^(Passo \d+:)/gm, '<span class="step-head">$1</span>');
  text = text.replace(/\[NOTA:([^\]]+)\]/g, '<span class="nota-inline">[NOTA:$1]</span>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return text;
}

/* ── SEND MESSAGE ── */
async function sendMessage(overrideText) {
  const textarea = document.getElementById("userInput");
  const text = overrideText || textarea.value.trim();

  let userContent = text;
  let displayText = text;

  if (uploadedText) {
    userContent = `[RESOLUÇÃO DO ALUNO PARA CORRIGIR]\n\n${uploadedText}\n\n${text ? `Nota do aluno: ${text}` : `Corrige detalhadamente com [NOTA: X/Y] para cada questão/passo e TOTAL: X/20 no final.`}`;
    displayText = uploadedName ? `📎 Resolução enviada (${uploadedName})` : "📎 Resolução enviada";
  }

  if (!userContent) return;

  textarea.value = "";
  clearUpload();

  addMessage("user", displayText, false);
  showTyping(true);
  setInputDisabled(true);

  try {
    const apiMessages = messages.slice(0, -1);
    apiMessages.push({ role: "user", content: userContent });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: apiMessages,
        voice: voiceKey,
        audio: true,
      }),
    });

    const data = await res.json();
    showTyping(false);

    if (data.error) {
      addMessage("assistant", "Erro: " + data.error + " — Verifica a tua ANTHROPIC_API_KEY no ficheiro .env.", false);
    } else {
      messages.push({ role: "assistant", content: data.text });
      addMessageRendered(data.text);

      if (data.audio_url) playAudio(data.audio_url);

      // Extrai nota se for correção
      const totalMatch = data.text.match(/TOTAL[:\s]+(\d+(?:[,\.]\d+)?)\s*\/\s*20/i);
      if (totalMatch) {
        const total = parseFloat(totalMatch[1].replace(",", "."));
        const entry = {
          id: Date.now(), date: new Date().toLocaleDateString("pt-PT"),
          total, max: 20, pct: Math.round(total / 20 * 100),
        };
        sessionHistory.push(entry);
        localStorage.setItem("acfes_mat_history", JSON.stringify(sessionHistory));
        renderProgresso();
      }
    }
  } catch (e) {
    showTyping(false);
    addMessage("assistant", "Erro de ligação. Verifica se o servidor está a correr e o ficheiro .env tem a ANTHROPIC_API_KEY. 🔄", false);
  }

  setInputDisabled(false);
  document.getElementById("userInput").focus();
}

function addMessageRendered(content) {
  addMessage("assistant", content, false);
}

function handleKey(e) {
  if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); sendMessage(); }
}

function setInputDisabled(dis) {
  document.getElementById("btnSend").disabled = dis;
  document.getElementById("userInput").disabled = dis;
}

function showTyping(show) {
  const existing = document.getElementById("typingIndicator");
  if (show && !existing) {
    const wrap = document.createElement("div");
    wrap.className = "typing-wrap"; wrap.id = "typingIndicator";
    const av = document.createElement("div");
    av.className = "msg-avatar prof-mat";
    av.textContent = "🧮";
    const bubble = document.createElement("div");
    bubble.className = "typing-bubble";
    bubble.innerHTML = `<div class="typing-dots"><span class="typing-label">A calcular</span><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    wrap.appendChild(av); wrap.appendChild(bubble);
    const c = document.getElementById("messages");
    c.appendChild(wrap); c.scrollTop = c.scrollHeight;
  } else if (!show && existing) {
    existing.remove();
  }
}

/* ── QUICK ACTIONS ── */
const QUICK_PROMPTS = {
  dicas_mat: "Dá-me as principais dicas estratégicas para o exame ACFES de Matemática: gestão do tempo, como abordar a Parte A (escolha múltipla) vs. Parte B (desenvolvimento), e os erros mais comuns. Lembra que não há calculadora.",
  gerar_prova_mat: "MODO PROVA\nGera uma prova-modelo ACFES M23 completa de Matemática com:\nParte A: 6 questões de escolha múltipla (opções A-E), 1,5 valores cada, cobrindo temas variados do programa.\nParte B: Questão 1 sobre Estatística (3 val.), Questão 2 sobre Funções ou Sucessões (4 val.), Questão 3 com duas alíneas (a e b) sendo que o aluno resolve apenas uma (4 val.).\nTotal 20 valores. SEM calculadora. Todas resolúveis à mão.",
  tema_estatistica: "Vou estudar Estatística Descritiva para o exame ACFES. Apresenta-me os subtemas deste capítulo e pergunta-me por onde quero começar.",
  tema_combinatoria: "Vou estudar Combinatória e Probabilidades para o exame ACFES. Apresenta-me os subtemas e pergunta-me por onde quero começar.",
  tema_funcoes1: "Vou estudar Funções (capítulo 1 — linear, módulo, quadrática, polinomiais, trigonométricas) para o exame ACFES. Apresenta-me os subtemas e pergunta-me por onde quero começar.",
  tema_sucessoes: "Vou estudar Sucessões para o exame ACFES. Apresenta-me os subtemas (monotonia, limites, convergência, progressões) e pergunta-me por onde quero começar.",
  tema_funcoes2: "Vou estudar Funções (capítulo 2 — exponencial, logarítmica, limites, derivadas) para o exame ACFES. Apresenta-me os subtemas e pergunta-me por onde quero começar.",
};

const LESSON_PROMPTS = {
  media_moda_mediana: "Explica-me os conceitos de média, moda e mediana com linguagem clara e acessível. Depois resolve um exemplo passo a passo com um conjunto de dados real. No final, dá-me um exercício semelhante para eu tentar.",
  frequencias: "Explica-me frequências relativas e frequências acumuladas. Mostra-me como preencher uma tabela passo a passo com um exemplo concreto. No final, dá-me um exercício com uma tabela para eu completar.",
  combinacoes: "Explica-me combinações C(n,k) — o que são, a fórmula, e quando se usam. Resolve um exemplo passo a passo. No final, dá-me um exercício prático.",
  probabilidade: "Explica-me probabilidade clássica (casos favoráveis a dividir por casos possíveis). Mostra-me como calcular passo a passo com um exemplo concreto. No final, um exercício para eu resolver.",
  funcao_linear: "Explica-me a função linear f(x) = mx + b: o que é o declive, a ordenada na origem, como calcular zeros e como traçar o gráfico. Exemplo resolvido passo a passo. Exercício no final.",
  funcao_quadratica: "Explica-me a função quadrática f(x) = ax² + bx + c: como encontrar o vértice, os zeros (fórmula resolvente), e o gráfico. Exemplo resolvido passo a passo. Exercício no final.",
  logaritmos: "Explica-me a função logarítmica ln(x): o que é, domínio, propriedades essenciais (ln(1)=0, ln(e)=1, ln(a×b)=ln(a)+ln(b)). Exemplo resolvido passo a passo. Exercício no final.",
  derivadas: "Explica-me as regras de derivação: derivada de uma constante, de x^n, regra do produto, regra do quociente, e regra da cadeia (função composta). Um exemplo resolvido passo a passo para cada regra. Exercício no final.",
  limites_sucessoes: "Explica-me como calcular limites de sucessões, incluindo infinitamente grandes, infinitésimos e sucessões convergentes. Exemplos resolvidos passo a passo. Exercício no final.",
};

function quickAction(key) {
  const prompt = QUICK_PROMPTS[key];
  if (prompt) sendMessage(prompt);
}

function quickLesson(key) {
  const prompt = LESSON_PROMPTS[key];
  if (prompt) sendMessage(prompt);
}

/* ── FILE UPLOAD ── */
function handleFileUpload(input) {
  const file = input.files[0]; if (!file) return;
  uploadedName = file.name;

  if (file.type === "text/plain") {
    const reader = new FileReader();
    reader.onload = e => {
      uploadedText = e.target.result;
      showUploadPreview(file.name);
      enableCorrigir(true);
    };
    reader.readAsText(file);
  } else {
    uploadedText = `[Ficheiro carregado: ${file.name}]`;
    showUploadPreview(file.name);
    enableCorrigir(true);
    addMessage("assistant", `📎 Recebi o ficheiro **${file.name}**.\n\nPara PDF e imagens, por favor escreve ou cola o texto das tuas respostas na caixa em baixo. Para ficheiros .txt o conteúdo é lido automaticamente.`, false);
  }
  input.value = "";
}

function showUploadPreview(name) {
  const prev = document.getElementById("uploadPreview");
  const nameEl = document.getElementById("uploadPreviewName");
  prev.style.display = "flex";
  nameEl.textContent = "📎 " + name.substring(0, 40);

  const badgeMat = document.getElementById("uploadedNameMat");
  if (badgeMat) { badgeMat.textContent = "✅ " + name.substring(0, 18); badgeMat.style.display = "block"; }
}

function clearUpload() {
  uploadedText = ""; uploadedName = "";
  document.getElementById("uploadPreview").style.display = "none";
  const badgeMat = document.getElementById("uploadedNameMat");
  if (badgeMat) badgeMat.style.display = "none";
  enableCorrigir(false);
}

function enableCorrigir(on) {
  const btn = document.getElementById("btnCorrigirMat");
  if (btn) btn.disabled = !on;
}

function submitCorrection() {
  sendMessage("Corrige a minha resolução detalhadamente com [NOTA: X/Y pontos] para cada questão/passo e TOTAL: X/20 no final.");
}

/* ── PDF DOWNLOAD ── */
function downloadPDF(content, kind) {
  const titleMap = {
    prova:    "Prova ACFES M23 — Matemática",
    correcao: "Correção — Prof. Rodrigo",
    aula:     "Aula — Matemática",
  };
  fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title:    titleMap[kind] || "ACFES M23 Matemática",
      content,
      subtitle: `${new Date().toLocaleDateString("pt-PT")} · Universidade Aberta`,
      kind,
    }),
  })
  .then(r => {
    if (!r.ok) return r.json().then(d => { alert("Erro PDF: " + (d.error || r.status)); });
    return r.blob();
  })
  .then(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ACFES_M23_Mat_${kind}_${Date.now()}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

/* ── PROGRESSO ── */
function renderProgresso() {
  const container = document.getElementById("progressoContent");
  if (!container) return;

  if (sessionHistory.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div>Ainda não tens sessões corrigidas.<br><small>Resolve exercícios → carrega a resolução → recebe nota.</small></div></div>`;
    return;
  }

  const totals = sessionHistory.map(h => h.total);
  const best   = Math.max(...totals);
  const avg    = (totals.reduce((a,b)=>a+b,0)/totals.length).toFixed(1);
  const trend  = totals.length >= 2 ? (totals[totals.length-1] >= totals[totals.length-2] ? "📈 A subir" : "📉 A baixar") : "—";

  let html = "";

  if (totals.length >= 2) {
    const W=280, H=90, pad=22;
    const minV=Math.max(0,Math.min(...totals)-2), maxV=Math.min(20,Math.max(...totals)+2);
    const sx = i => pad + (i/(totals.length-1))*(W-pad*2);
    const sy = v => H-pad-((v-minV)/(maxV-minV||1))*(H-pad*2);
    const pts = totals.map((v,i) => `${sx(i)},${sy(v)}`).join(" ");
    const area = `M${sx(0)},${sy(totals[0])} ${totals.slice(1).map((v,i)=>`L${sx(i+1)},${sy(v)}`).join(" ")} L${sx(totals.length-1)},${H-pad} L${sx(0)},${H-pad} Z`;
    html += `<div class="chart-wrap">
      <div style="font-size:10px;color:var(--text-faint);font-weight:700;letter-spacing:1px;margin-bottom:12px;font-family:sans-serif">EVOLUÇÃO DAS NOTAS</div>
      <svg width="${W}" height="${H}" style="overflow:visible">
        <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
        </linearGradient></defs>
        ${[0,5,10,15,20].filter(v=>v>=minV-1&&v<=maxV+1).map(v=>`
          <line x1="${pad}" y1="${sy(v)}" x2="${W-pad}" y2="${sy(v)}" stroke="#ffffff10" stroke-width="1"/>
          <text x="${pad-4}" y="${sy(v)+3.5}" font-size="9" fill="#ffffff44" text-anchor="end">${v}</text>
        `).join("")}
        <path d="${area}" fill="url(#cg)"/>
        <polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${totals.map((v,i)=>`<circle cx="${sx(i)}" cy="${sy(v)}" r="4" fill="#22d3ee" stroke="#07101e" stroke-width="2"/>`).join("")}
      </svg>
    </div>`;
  }

  html += `<div class="stats-grid">
    <div class="stat-card"><div class="stat-label">SESSÕES</div><div class="stat-val">${sessionHistory.length}</div></div>
    <div class="stat-card"><div class="stat-label">MELHOR NOTA</div><div class="stat-val">${best}/20</div></div>
    <div class="stat-card"><div class="stat-label">MÉDIA</div><div class="stat-val">${avg}/20</div></div>
    <div class="stat-card"><div class="stat-label">TENDÊNCIA</div><div class="stat-val" style="font-size:14px">${trend}</div></div>
  </div>`;

  [...sessionHistory].reverse().forEach((h, i) => {
    const cls = h.pct >= 70 ? "score-ok" : h.pct >= 50 ? "score-med" : "score-bad";
    html += `<div class="hist-item">
      <div>
        <div class="hist-date">${h.date} · Sessão #${sessionHistory.length - i}</div>
        <div class="hist-topic">📐 Matemática</div>
      </div>
      <div class="hist-score ${cls}">${h.total}<span style="font-size:11px;opacity:.6">/20</span></div>
    </div>`;
  });

  html += `<button onclick="clearHistory()" style="margin-top:8px;background:none;border:1px solid #7f1d1d;color:#f87171;border-radius:8px;padding:6px 16px;cursor:pointer;font-size:11px;font-family:sans-serif">🗑 Apagar histórico</button>`;
  container.innerHTML = html;
}

function clearHistory() {
  if (!confirm("Apagar todo o histórico de notas?")) return;
  sessionHistory = [];
  localStorage.removeItem("acfes_mat_history");
  renderProgresso();
}

/* ── PROGRAMA ── */
const PROGRAMA = {
  title: "📐 Matemática — ACFES M23",
  exam: [
    { label: "Parte A", desc: "6 × Escolha múltipla (A-E)\n1,5 valores cada = 9 valores\nSem desenvolvimento necessário", color: "#7c3aed" },
    { label: "Parte B", desc: "Desenvolvimento obrigatório\nJustificação em todos os passos\n= 11 valores (Q3: só 1 de 2 alíneas)", color: "#0e7490" },
    { label: "Duração", desc: "2 horas exactas\nSEM calculadora permitida\nTinta azul ou preta", color: "#b45309" },
    { label: "Total", desc: "20 valores (200 pontos)\nSem calculadora!\nManuais 10.º, 11.º e 12.º anos", color: "#15803d" },
  ],
  topics: [
    { title: "A. Estatística Descritiva", color: "#0e7490", chips: ["Médias, moda, mediana","Frequências relativas e acumuladas","Gráficos de barras","Variância e desvio padrão"] },
    { title: "B. Combinatória e Probabilidades", color: "#7c3aed", chips: ["Cálculo combinatório","Permutações e arranjos","Combinações C(n,k)","Probabilidade clássica","Definição axiomática"] },
    { title: "C. Funções (1)", color: "#b45309", chips: ["Função linear","Função módulo","Função quadrática","Funções polinomiais","Funções trigonométricas"] },
    { title: "D. Sucessões", color: "#15803d", chips: ["Definição e noções gerais","Monotonia e limitação","Limites de sucessões","Progressões aritméticas","Progressões geométricas"] },
    { title: "E. Funções (2)", color: "#be123c", chips: ["Função exponencial","Função logarítmica","Funções racionais","Limites de funções","Derivadas — regras","Derivadas laterais"] },
  ],
};

function renderPrograma() {
  const container = document.getElementById("programaContent");
  if (!container) return;

  let html = `<h2 class="tab-title">${PROGRAMA.title}</h2>`;

  html += `<div class="exam-grid">`;
  PROGRAMA.exam.forEach(c => {
    html += `<div class="exam-card" style="background:${c.color}11;border:1px solid ${c.color}44">
      <div class="exam-card-title" style="color:${c.color}">${c.label}</div>
      <div class="exam-card-body">${c.desc}</div>
    </div>`;
  });
  html += `</div>`;

  PROGRAMA.topics.forEach(t => {
    html += `<div class="prog-section" style="border-color:${t.color}33">
      <div class="prog-title" style="color:${t.color}">${t.title}</div>
      <div class="prog-chips">`;
    t.chips.forEach(chip => {
      html += `<button class="prog-chip" style="border-color:${t.color}55;color:${t.color}cc"
        onclick="sendMessage('Explica-me: ${chip.replace(/'/g,"\\'")} — conceito + exemplo resolvido + exercício para praticar.')"
        title="Clica para iniciar aula sobre este tema">
        ${chip}
      </button>`;
    });
    html += `</div></div>`;
  });

  container.innerHTML = html;
}
