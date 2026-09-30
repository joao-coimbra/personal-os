#!/usr/bin/env bash
# Regenera o PDF de documentação de entrega a partir do Markdown.
# Uso: bash scripts/build-entrega-pdf.sh
#      bun run docs:entrega-pdf
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/docs/entrega/PersonalOS-Documentacao-Entrega.md"
OUT_DIR="$ROOT/docs/entrega"
HTML="$OUT_DIR/PersonalOS-Documentacao-Entrega.html"
PDF="$OUT_DIR/PersonalOS-Documentacao-Entrega.pdf"
CSS="$OUT_DIR/entrega-print.css"
ARTIFACT_DIR="${ARTIFACT_DIR:-/opt/cursor/artifacts}"

export PATH="${HOME}/.local/bin:${PATH}"

if [[ ! -f "$SRC" ]]; then
  echo "Fonte não encontrada: $SRC" >&2
  exit 1
fi

mkdir -p "$OUT_DIR" "$ARTIFACT_DIR"

if ! command -v pandoc >/dev/null 2>&1; then
  echo "Instale pandoc (apt install pandoc)." >&2
  exit 1
fi

if ! command -v weasyprint >/dev/null 2>&1 && ! python3 -c "import weasyprint" >/dev/null 2>&1; then
  echo "Instale weasyprint: pip3 install --user weasyprint" >&2
  exit 1
fi

# ABNT-leaning print stylesheet (margens ~2–3 cm; tipografia profissional)
cat > "$CSS" <<'EOF'
:root {
  --ink: #1c1917;
  --ink-soft: #44403c;
  --muted: #78716c;
  --rule: #d6d3d1;
  --rule-strong: #1c1917;
  --accent: #1e3a5f;
  --accent-soft: #e8eef4;
  --paper: #fafaf9;
  --code-bg: #f5f5f4;
}

@page {
  size: A4;
  /* ABNT aproximado: superior/esquerda 3 cm; inferior/direita 2 cm */
  margin: 3cm 2cm 2cm 3cm;
  @bottom-center {
    content: counter(page);
    font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
    font-size: 9pt;
    color: #78716c;
  }
}

html {
  font-size: 12pt;
}

body {
  max-width: 100%;
  margin: 0;
  font-family: "Liberation Serif", "DejaVu Serif", "Times New Roman", Times, serif;
  font-weight: 400;
  line-height: 1.5;
  color: var(--ink);
  background: #fff;
  text-align: justify;
  hyphens: auto;
}

h1, h2, h3, h4 {
  font-family: "Liberation Sans", "DejaVu Sans", "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.25;
  text-align: left;
  page-break-after: avoid;
  hyphens: none;
}

h1 {
  font-size: 1.55rem;
  margin: 0 0 1.1em;
  padding-bottom: 0.4em;
  border-bottom: 1.5pt solid var(--rule-strong);
  letter-spacing: -0.01em;
}

h2 {
  font-size: 1.2rem;
  margin: 1.75em 0 0.65em;
  padding-bottom: 0.25em;
  border-bottom: 0.75pt solid var(--rule);
}

h3 {
  font-size: 1.05rem;
  margin: 1.35em 0 0.5em;
  color: #243b55;
  font-weight: 600;
}

h4 {
  font-size: 1rem;
  margin: 1.1em 0 0.4em;
  color: var(--ink-soft);
  font-weight: 600;
}

p {
  margin: 0 0 0.85em;
  orphans: 3;
  widows: 3;
}

li {
  orphans: 3;
  widows: 3;
  margin-bottom: 0.25em;
}

a {
  color: var(--accent);
  text-decoration: none;
}

strong {
  font-weight: 700;
  color: var(--ink);
}

code, pre {
  font-family: "JetBrains Mono", "DejaVu Sans Mono", "Liberation Mono", Consolas, monospace;
  font-size: 0.82em;
  hyphens: none;
}

code {
  padding: 0.08em 0.28em;
  background: var(--code-bg);
  border: 0.5pt solid var(--rule);
  border-radius: 2px;
}

pre {
  background: var(--code-bg);
  border: 0.5pt solid var(--rule);
  border-left: 3pt solid var(--accent);
  padding: 0.9em 1em;
  border-radius: 0 3px 3px 0;
  overflow-x: auto;
  white-space: pre-wrap;
  page-break-inside: avoid;
  margin: 0.9em 0 1.1em;
  line-height: 1.4;
  text-align: left;
}

pre code {
  padding: 0;
  border: none;
  background: transparent;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.9em 0 1.25em;
  font-size: 0.88em;
  font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
  line-height: 1.35;
  page-break-inside: avoid;
  text-align: left;
}

th, td {
  padding: 0.45em 0.55em;
  vertical-align: top;
  border: 0.5pt solid #a8a29e;
}

th {
  color: #fff;
  background: var(--accent);
  font-weight: 600;
  letter-spacing: 0.01em;
}

tr:nth-child(even) td {
  background: var(--paper);
}

blockquote {
  margin: 1em 0;
  padding: 0.55em 0 0.55em 1em;
  border-left: 3pt solid var(--accent);
  color: var(--ink-soft);
  font-style: italic;
  background: linear-gradient(90deg, var(--accent-soft), transparent 70%);
}

hr {
  margin: 1.6em 0;
  border: none;
  border-top: 0.5pt solid var(--rule);
}

ul, ol {
  padding-left: 1.4em;
  margin: 0 0 0.9em;
}

/* Folha de rosto (ABNT-leaning) — sem número de página */
@page :first {
  margin: 2.5cm 2cm 2cm 2.5cm;
  @bottom-center {
    content: none;
  }
}

.cover {
  page-break-after: always;
  min-height: 240mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
  padding: 8mm 4mm 10mm;
  box-sizing: border-box;
  position: relative;
}

.cover::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1.25pt solid var(--accent);
}

.cover::after {
  content: "";
  position: absolute;
  inset: 4px;
  border: 0.5pt solid #8fa3b8;
}

.cover-top,
.cover-mid,
.cover-bottom {
  position: relative;
  z-index: 1;
}

.cover-top {
  padding-top: 14mm;
}

.cover .institution {
  font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
  margin: 0 0 0.55em;
  line-height: 1.45;
}

.cover .course {
  font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ink-soft);
  margin: 0 auto;
  max-width: 28em;
  line-height: 1.4;
}

.cover-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12mm 6mm;
}

.cover .author-name {
  font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 10mm;
  letter-spacing: 0.02em;
}

.cover h1 {
  font-family: "Liberation Serif", "DejaVu Serif", serif;
  font-size: 1.65rem;
  font-weight: 700;
  color: var(--ink);
  border: none;
  margin: 0 auto 0.75em;
  padding: 0;
  max-width: 18em;
  letter-spacing: -0.015em;
  text-align: center;
}

.cover .subtitle {
  font-family: "Liberation Serif", "DejaVu Serif", serif;
  font-size: 0.98rem;
  font-weight: 400;
  font-style: italic;
  color: var(--ink-soft);
  margin: 0 auto 12mm;
  max-width: 32em;
  line-height: 1.45;
  text-align: center;
}

.cover .nature {
  font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 0.88rem;
  color: var(--ink-soft);
  margin: 0 auto;
  max-width: 30em;
  line-height: 1.5;
  text-align: center;
}

.cover-bottom {
  padding-bottom: 8mm;
}

.cover .meta-block {
  font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 0.9rem;
  line-height: 1.75;
  color: var(--ink);
  margin: 0 auto 10mm;
  text-align: center;
}

.cover .meta-block .label {
  font-weight: 700;
  color: var(--accent);
}

.cover .place-date {
  font-family: "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.04em;
  margin: 0;
}
EOF

# Folha de rosto ABNT-leaning — dados exatos do aluno
COVER="$OUT_DIR/.cover-fragment.html"
cat > "$COVER" <<'EOF'
<section class="cover" aria-label="Folha de rosto">
  <div class="cover-top">
    <p class="institution">Graduação Tecnológica em Inteligência Artificial<br>e Automação Digital</p>
    <p class="course">Módulo: Produtividade e Gestão do Tempo</p>
  </div>
  <div class="cover-mid">
    <p class="author-name">João Henrique Benatti Coimbra</p>
    <h1>PersonalOS — Documentação de Entrega</h1>
    <p class="subtitle">Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade</p>
    <p class="nature">
      Trabalho acadêmico apresentado como documentação de entrega
      do módulo Produtividade e Gestão do Tempo, referente ao
      Sistema Operacional Pessoal (PersonalOS).
    </p>
  </div>
  <div class="cover-bottom">
    <div class="meta-block">
      <div><span class="label">RA:</span> 188635</div>
      <div><span class="label">Nome:</span> João Henrique Benatti Coimbra</div>
      <div><span class="label">Curso:</span> Graduação Tecnológica em Inteligência Artificial e Automação Digital</div>
      <div><span class="label">Módulo:</span> Produtividade e Gestão do Tempo</div>
      <div><span class="label">Título:</span> PersonalOS — Documentação de Entrega</div>
      <div><span class="label">Data:</span> 30 de setembro de 2026</div>
    </div>
    <p class="place-date">30 de setembro de 2026</p>
  </div>
</section>
EOF

pandoc "$SRC" \
  --from markdown \
  --to html5 \
  --standalone \
  --metadata title="PersonalOS — Documentação de Entrega" \
  --css "$CSS" \
  --include-before-body="$COVER" \
  -o "$HTML"

# Weasyprint resolve CSS relativo ao HTML
if command -v weasyprint >/dev/null 2>&1; then
  weasyprint "$HTML" "$PDF"
else
  python3 - <<PY
from weasyprint import HTML
HTML(filename="$HTML", base_url="$OUT_DIR").write_pdf("$PDF")
PY
fi

if [[ ! -f "$PDF" ]]; then
  echo "Falha ao gerar PDF." >&2
  exit 1
fi

cp -f "$PDF" "$ARTIFACT_DIR/PersonalOS-Documentacao-Entrega.pdf"
cp -f "$SRC" "$ARTIFACT_DIR/PersonalOS-Documentacao-Entrega.md"
rm -f "$COVER"

echo "PDF: $PDF"
echo "Artifact: $ARTIFACT_DIR/PersonalOS-Documentacao-Entrega.pdf"
wc -c "$PDF"
pdfinfo "$PDF" 2>/dev/null || true
