#!/usr/bin/env bash
# Regenera o PDF de documentação acadêmica a partir do Markdown.
# Uso: bash scripts/build-entrega-pdf.sh
#      bun run docs:entrega-pdf
# Saída: docs/entrega/Documentacao.pdf
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/docs/entrega/Documentacao.md"
OUT_DIR="$ROOT/docs/entrega"
HTML="$OUT_DIR/Documentacao.html"
PDF="$OUT_DIR/Documentacao.pdf"
CSS="$OUT_DIR/entrega-print.css"
ARTIFACT_DIR="${ARTIFACT_DIR:-/opt/cursor/artifacts}"

export PATH="${HOME}/.local/bin:${PATH}"

if [[ ! -f "$SRC" ]]; then
  echo "Fonte não encontrada: $SRC" >&2
  exit 1
fi

if [[ ! -f "$CSS" ]]; then
  echo "CSS não encontrado: $CSS" >&2
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

# Capa e folha de rosto em páginas distintas (ABNT). Título e data uma vez em cada.
FRONT_MATTER="$OUT_DIR/.front-matter.html"
cat > "$FRONT_MATTER" <<'EOF'
<section class="capa" aria-label="Capa">
  <div class="front-top">
    <p class="institution">UniFECAF</p>
    <p class="course">Graduação Tecnológica em Inteligência Artificial e Automação Digital</p>
    <p class="module">Módulo: Produtividade e Gestão do Tempo</p>
  </div>
  <div class="front-mid">
    <p class="author-name">João Henrique Benatti Coimbra</p>
    <h1>PersonalOS - Documentação de Entrega</h1>
    <p class="subtitle">Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade</p>
  </div>
  <div class="front-bottom">
    <p class="place-date">1 de outubro de 2026</p>
  </div>
</section>

<section class="folha-rosto" aria-label="Folha de rosto">
  <div class="front-top">
    <p class="institution">UniFECAF</p>
    <p class="course">Graduação Tecnológica em Inteligência Artificial e Automação Digital</p>
    <p class="module">Módulo: Produtividade e Gestão do Tempo</p>
  </div>
  <div class="front-mid">
    <p class="author-name">João Henrique Benatti Coimbra</p>
    <h1>PersonalOS - Documentação de Entrega</h1>
    <p class="subtitle">Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade</p>
    <p class="nature">
      Trabalho acadêmico apresentado à UniFECAF como documentação de entrega
      do módulo Produtividade e Gestão do Tempo, referente ao Sistema
      Operacional Pessoal (PersonalOS).
    </p>
  </div>
  <div class="front-bottom">
    <div class="meta-block">
      <div><span class="label">RA:</span> 188635</div>
    </div>
    <p class="place-date">1 de outubro de 2026</p>
  </div>
</section>
EOF

pandoc "$SRC" \
  --from markdown \
  --to html5 \
  --standalone \
  --metadata title="PersonalOS - Documentação de Entrega" \
  --metadata author="João Henrique Benatti Coimbra" \
  --css "$CSS" \
  --include-before-body="$FRONT_MATTER" \
  -o "$HTML"

# Remove o bloco de título do pandoc (evita título/data duplicados na impressão).
python3 - "$HTML" <<'PY'
from pathlib import Path
import re
import sys

html_path = Path(sys.argv[1])
text = html_path.read_text(encoding="utf-8")
text = re.sub(
    r'<header id="title-block-header">.*?</header>\s*',
    "",
    text,
    count=1,
    flags=re.DOTALL,
)
html_path.write_text(text, encoding="utf-8")
PY

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

cp -f "$PDF" "$ARTIFACT_DIR/Documentacao.pdf"
cp -f "$SRC" "$ARTIFACT_DIR/Documentacao.md"
rm -f "$FRONT_MATTER"

# Remove nomes antigos do artefato e do diretório de entrega, se existirem.
rm -f \
  "$OUT_DIR/PersonalOS-Documentacao-Entrega.pdf" \
  "$OUT_DIR/PersonalOS-Documentacao-Entrega.html" \
  "$OUT_DIR/PersonalOS-Documentacao-Entrega.md" \
  "$ARTIFACT_DIR/PersonalOS-Documentacao-Entrega.pdf" \
  "$ARTIFACT_DIR/PersonalOS-Documentacao-Entrega.md"

echo "PDF: $PDF"
echo "Artifact: $ARTIFACT_DIR/Documentacao.pdf"
wc -c "$PDF"
pdfinfo "$PDF" 2>/dev/null || true
pdffonts "$PDF" 2>/dev/null | head -20 || true
