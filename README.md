# ACFES M23 — Professor Virtual
##  Matemática

App de preparação para o exame ACFES Maiores de 23 Anos da Universidade Aberta.
Usa Flask + edge-tts (vozes naturais Microsoft) + Anthropic API.

---

## INSTALAÇÃO RÁPIDA

### 1. Pré-requisitos
- Python 3.10 ou superior
- Conta Anthropic com API key (https://console.anthropic.com)

### 2. Instalar dependências
```bash
pip install flask edge-tts anthropic reportlab
```

### 3. Definir a API key

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-api03-..."
```

**Windows (CMD):**
```cmd
set ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Mac/Linux:**
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### 4. Correr a app
```bash
cd acfes_m23
python app.py
```

### 5. Abrir no browser
```
http://localhost:5000
```

---

## VOZES DISPONÍVEIS

| Chave | Voz | Género | Sotaque |
|-------|-----|--------|---------|
| pt_feminino_raquel | Raquel | Feminino | 🇵🇹 Português Europeu |
| pt_masculino_duarte | Duarte | Masculino | 🇵🇹 Português Europeu |
| br_feminino_francisca | Francisca | Feminino | 🇧🇷 Português do Brasil |
| br_masculino_antonio | António | Masculino | 🇧🇷 Português do Brasil |

As vozes Microsoft Neural são muito mais naturais do que a síntese de voz do browser.
edge-tts usa a infraestrutura do Microsoft Edge — requer ligação à internet.

---

## FUNCIONALIDADES

### Língua Portuguesa (Professora Leonor)
- Gerar provas completas originais (Parte I + II)
- Treinar ironia, composição argumentativa, explicação de expressões
- Upload de resolução (.txt lido automaticamente, PDF/imagem com colagem manual)
- Correção detalhada com nota por pergunta e total em 20 valores
- PDF de provas, aulas e correções

### Matemática (Professor Rodrigo)
- 5 temas do programa: Estatística, Combinatória, Funções (1), Sucessões, Funções (2)
- 9 aulas rápidas: conceito + exemplo resolvido passo a passo + exercício
- Gerar provas completas (Parte A escolha múltipla + Parte B desenvolvimento)
- Correção com nota e explicação pedagógica
- PDF de aulas, provas e correções

### Comum
- 4 vozes naturais Microsoft Neural (PT-PT e PT-BR, feminino e masculino)
- Auto-play das respostas do professor
- Histórico de notas com gráfico de evolução
- Separador "Programa" com todos os temas clicáveis

---

## ESTRUTURA DO PROJETO

```
acfes_m23/
├── app.py                  # Flask + API routes + TTS + PDF
├── requirements.txt
├── README.md
├── templates/
│   └── index.html          # HTML principal
└── static/
    ├── css/
    │   └── style.css       # Estilos
    ├── js/
    │   └── app.js          # Lógica frontend
    └── audio/              # Ficheiros MP3 temporários (auto-limpeza)
```

---

## NOTAS IMPORTANTES

1. **API Key**: Nunca coloques a key diretamente no código. Usa variáveis de ambiente.
2. **Áudio temporário**: Os ficheiros MP3 em `static/audio/` são limpos automaticamente após 1 hora.
3. **Sem calculadora**: Todos os exemplos de Matemática são resolúveis à mão (como no exame real).
4. **Histórico**: Guardado no localStorage do browser — não se perde ao fechar o servidor.
5. **edge-tts**: Requer ligação à internet para gerar o áudio (usa servidores Microsoft).

---

## PROBLEMAS COMUNS

**"Erro de ligação"** → Verifica que o servidor está a correr (`python app.py`)

**Sem áudio** → edge-tts precisa de internet. Verifica a tua ligação.

**"ModuleNotFoundError"** → Corre `pip install flask edge-tts anthropic reportlab`

**PDF não descarrega** → Verifica que o reportlab está instalado: `pip install reportlab`

**Voz em inglês** → Seleciona uma voz PT no seletor do painel esquerdo
