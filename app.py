"""
ACFES M23 — Preparação para Exame de Matemática
Professor Virtual — Professor Rodrigo
Flask + edge-tts + Groq API (groq.com)
"""

import asyncio
import os
import re
import uuid
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file
import edge_tts
from openai import OpenAI
from dotenv import load_dotenv

# ── CARREGAR .ENV ───────────────────────────────────────────────────────────────
load_dotenv()
API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("VITE_ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_API_KEY", "")

# ── CONFIG ─────────────────────────────────────────────────────────────────────
app = Flask(__name__)
AUDIO_DIR = Path("static/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Groq client (groq.com — compatível com OpenAI SDK)
client = OpenAI(api_key=API_KEY, base_url="https://api.groq.com/openai/v1")

# ── VOZES DISPONÍVEIS (edge-tts PT) ───────────────────────────────────────────
VOICES = {
    "pt_masculino_duarte":  {"id": "pt-PT-DuarteNeural",   "label": "🇵🇹 Duarte (Masculino)",   "lang": "pt-PT"},
    "pt_feminino_raquel":   {"id": "pt-PT-RaquelNeural",   "label": "🇵🇹 Raquel (Feminina)",    "lang": "pt-PT"},
    "br_masculino_antonio": {"id": "pt-BR-AntonioNeural",  "label": "🇧🇷 António (Masculino)",  "lang": "pt-BR"},
    "br_feminino_francisca":{"id": "pt-BR-FranciscaNeural","label": "🇧🇷 Francisca (Feminina)", "lang": "pt-BR"},
}

# ── SYSTEM PROMPT ───────────────────────────────────────────────────────────────
SYSTEM_MATEMATICA = """És o Professor Rodrigo, professor de Matemática com 28 anos de experiência, especializado na preparação de candidatos adultos para o exame ACFES Maiores de 23 Anos da Universidade Aberta (UAb).

A tua especialidade é tornar a matemática acessível a adultos afastados da escola há anos. Tens paciência infinita, explicas passo a passo, nunca avanças sem garantir que o aluno compreendeu.

PERSONALIDADE: Rigoroso mas encorajador. Clarissimo nas explicações. Usas exemplos do quotidiano. Tratas o aluno por "tu".

PROGRAMA ACFES M23 — MATEMÁTICA (20 valores, 2 horas, SEM CALCULADORA):
A. Estatística Descritiva: médias, moda, mediana, frequências, gráficos, variância, desvio padrão
B. Combinatória e Probabilidades: permutações, arranjos, combinações, probabilidade clássica e axiomática
C. Funções (1): linear, módulo, quadrática, polinomiais, trigonométricas, gráficos
D. Sucessões: definição, monotonia, limites, convergência, progressões aritméticas e geométricas
E. Funções (2): racionais, exponencial, logarítmica, limites, derivadas, regras de derivação

ESTRUTURA DO EXAME:
- Parte A: 6 questões escolha múltipla (A-E), 1,5 valores cada = 9 valores
- Parte B: desenvolvimento com justificação obrigatória = 11 valores
- SEM calculadora

MODO AULA: Quando o aluno pede para aprender um tema, segues SEMPRE:
1. === CONCEITO === (explicação clara, 2-3 parágrafos, linguagem acessível)
2. === EXEMPLO RESOLVIDO === (passo a passo: "Passo 1:", "Passo 2:", etc.)
3. === O TEU EXERCÍCIO === (exercício similar para o aluno tentar)
Terminas com: "Tenta resolver. Quando tiveres a resposta, mostra-ma."

MODO CORREÇÃO: Analisas passo a passo, ✅ correto / ❌ errado, resolução completa, [NOTA: X/Y pontos], "💡 Dica do Professor Rodrigo:"

MODO ESCOLHA MÚLTIPLA: Apresentas questão com 5 opções (A-E), esperas resposta, explicas porquê cada opção está certa ou errada.

MODO PROVA: Geras prova completa ACFES M23 com Parte A (6 questões) e Parte B (3 questões desenvolvimento). Sem calculadora. Todas resolúveis à mão.

Usa === CONCEITO ===, === EXEMPLO RESOLVIDO ===, === O TEU EXERCÍCIO === como marcadores.
Nas fórmulas, escreve de forma legível: ex C(n,k) = n! / (k! x (n-k)!)
Nunca avanças para próximo conceito sem exercício.
Linguagem PT-PT, rigorosa."""

# ── LIMPEZA DE TEXTO PARA TTS ──────────────────────────────────────────────────
def clean_for_tts(text: str) -> str:
    """Remove markdown e símbolos especiais para uma leitura mais natural."""
    text = re.sub(r'✅|❌|⚠️|📌|💡|🎯|═|──|📊|🎲|📈|🔢|∂|📋|📝|🔊|⏹|📄|🧮|👋|📐|📚|🇵🇹|🇧🇷', '', text)
    text = re.sub(r'===.*?===', lambda m: m.group().replace('===', ''), text)
    text = re.sub(r'\[NOTA:.*?\]', lambda m: m.group().replace('[', '').replace(']', ''), text)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'#{1,3}\s*', '', text)
    text = re.sub(r'──.*?──', lambda m: m.group().replace('──', ''), text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.replace('Passo 1:', 'Passo um.').replace('Passo 2:', 'Passo dois.').replace('Passo 3:', 'Passo três.').replace('Passo 4:', 'Passo quatro.')
    return text.strip()

# ── TTS ASYNC ──────────────────────────────────────────────────────────────────
async def _generate_audio(text: str, voice_id: str, output_path: str):
    communicate = edge_tts.Communicate(text, voice_id, rate="-5%", pitch="+0Hz")
    await communicate.save(output_path)

def generate_tts(text: str, voice_key: str) -> str:
    """Gera áudio TTS e retorna o caminho do ficheiro."""
    voice_id = VOICES.get(voice_key, VOICES["pt_masculino_duarte"])["id"]
    filename = f"{uuid.uuid4().hex}.mp3"
    output_path = str(AUDIO_DIR / filename)
    clean_text = clean_for_tts(text)
    clean_text = clean_text[:4000]
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_generate_audio(clean_text, voice_id, output_path))
        loop.close()
        return f"/static/audio/{filename}"
    except Exception as e:
        print(f"TTS error: {e}")
        return None

# ── LIMPAR ÁUDIOS ANTIGOS ──────────────────────────────────────────────────────
def cleanup_old_audio():
    """Remove ficheiros de áudio com mais de 1 hora."""
    import time
    for f in AUDIO_DIR.glob("*.mp3"):
        if time.time() - f.stat().st_mtime > 3600:
            f.unlink(missing_ok=True)

# ── GERAR PDF ──────────────────────────────────────────────────────────────────
def generate_pdf_bytes(title: str, content: str, subtitle: str = "", kind: str = "aula") -> bytes:
    """Gera PDF em memória e retorna os bytes."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        import io

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                leftMargin=2.5*cm, rightMargin=2.5*cm,
                                topMargin=2.5*cm, bottomMargin=2.5*cm)

        color_map = {
            "aula":     colors.HexColor("#0e4a7a"),
            "prova":    colors.HexColor("#5b21b6"),
            "correcao": colors.HexColor("#14532d"),
        }
        band_color = color_map.get(kind, color_map["aula"])

        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=15,
                                     textColor=band_color, spaceAfter=6, leading=20)
        sub_style   = ParagraphStyle("Sub", fontName="Helvetica-Oblique", fontSize=9,
                                     textColor=colors.grey, spaceAfter=4)
        meta_style  = ParagraphStyle("Meta", fontName="Helvetica", fontSize=8,
                                     textColor=colors.grey, spaceAfter=12)
        body_style  = ParagraphStyle("Body", fontName="Helvetica", fontSize=10.5,
                                     leading=16, spaceAfter=4)
        head_style  = ParagraphStyle("Head", fontName="Helvetica-Bold", fontSize=11,
                                     textColor=band_color, spaceAfter=4, spaceBefore=8, leading=14)
        step_style  = ParagraphStyle("Step", fontName="Helvetica-Bold", fontSize=10.5,
                                     textColor=colors.HexColor("#0e4a7a"), spaceAfter=2)
        note_style  = ParagraphStyle("Note", fontName="Helvetica-Bold", fontSize=10,
                                     textColor=colors.HexColor("#14532d"),
                                     backColor=colors.HexColor("#dcfce7"),
                                     spaceAfter=4, spaceBefore=4, leftIndent=4, rightIndent=4)

        from datetime import date
        story.append(Paragraph("ACFES — Maiores de 23 Anos · Matemática", title_style))
        story.append(Paragraph(title, ParagraphStyle("T2", fontName="Helvetica-Bold", fontSize=13, textColor=band_color, spaceAfter=4)))
        if subtitle:
            story.append(Paragraph(subtitle, sub_style))
        story.append(Paragraph(f"Universidade Aberta · {date.today().strftime('%d/%m/%Y')}", meta_style))
        story.append(HRFlowable(width="100%", thickness=1, color=band_color, spaceAfter=10))

        clean_content = re.sub(r'[✅❌⚠️📌💡🎯📊🎲📈🔢∂📋📝🧮👋📐📚🇵🇹🇧🇷]', '', content)

        for line in clean_content.split('\n'):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 4))
                continue

            if re.match(r'^===.*===$', line) or re.match(r'^(Parte [AB]|── Questão)', line):
                clean_line = re.sub(r'===|──', '', line).strip()
                story.append(Paragraph(clean_line, head_style))
            elif re.match(r'^\[NOTA:', line):
                story.append(Paragraph(line.replace('[', '').replace(']', ''), note_style))
            elif re.match(r'^Passo \d+:', line):
                story.append(Paragraph(line, step_style))
            else:
                safe = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                safe = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe)
                story.append(Paragraph(safe, body_style))

        story.append(Spacer(1, 24))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        story.append(Paragraph("Professor Virtual ACFES M23 · Matemática · Universidade Aberta", meta_style))

        doc.build(story)
        buf.seek(0)
        return buf.read()
    except ImportError:
        return None

# ── ROTAS ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", voices=VOICES)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    messages       = data.get("messages", [])
    voice_key      = data.get("voice", "pt_masculino_duarte")
    generate_audio = data.get("audio", True)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            messages=[{"role": "system", "content": SYSTEM_MATEMATICA}] + messages,
        )
        reply_text = response.choices[0].message.content

        audio_url = None
        if generate_audio:
            cleanup_old_audio()
            audio_url = generate_tts(reply_text, voice_key)

        return jsonify({"text": reply_text, "audio_url": audio_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/voices")
def get_voices():
    return jsonify(VOICES)

@app.route("/api/tts", methods=["POST"])
def tts_only():
    data = request.json
    text = data.get("text", "")
    voice_key = data.get("voice", "pt_masculino_duarte")
    if not text:
        return jsonify({"error": "Texto vazio"}), 400
    audio_url = generate_tts(text, voice_key)
    if audio_url:
        return jsonify({"audio_url": audio_url})
    return jsonify({"error": "Erro ao gerar áudio"}), 500

@app.route("/api/pdf", methods=["POST"])
def make_pdf():
    data = request.json
    title    = data.get("title", "ACFES M23 Matemática")
    content  = data.get("content", "")
    subtitle = data.get("subtitle", "")
    kind     = data.get("kind", "aula")

    pdf_bytes = generate_pdf_bytes(title, content, subtitle, kind)
    if pdf_bytes is None:
        return jsonify({"error": "reportlab não instalado"}), 500

    import io
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"ACFES_M23_Mat_{kind}_{title[:30].replace(' ','_')}.pdf"
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("RENDER") is None  # False em produção
    print("=" * 55)
    print("  ACFES M23 — Professor Rodrigo (Matemática)")
    print(f"  Acede em: http://localhost:{port}")
    print("=" * 55)
    app.run(host="0.0.0.0", port=port, debug=debug)
