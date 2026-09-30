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

# Folha de rosto limpa (sem título/data duplicados). UniFECAF em destaque.
COVER="$OUT_DIR/.cover-fragment.html"
cat > "$COVER" <<'EOF'
<section class="cover" aria-label="Folha de rosto">
  <div class="cover-top">
    <p class="institution">UniFECAF</p>
    <p class="course">Graduação Tecnológica em Inteligência Artificial e Automação Digital</p>
    <p class="module">Módulo: Produtividade e Gestão do Tempo</p>
  </div>
  <div class="cover-mid">
    <p class="author-name">João Henrique Benatti Coimbra</p>
    <h1>PersonalOS - Documentação de Entrega</h1>
    <p class="subtitle">Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade</p>
    <p class="nature">
      Trabalho acadêmico apresentado à UniFECAF como documentação de entrega
      do módulo Produtividade e Gestão do Tempo, referente ao Sistema
      Operacional Pessoal (PersonalOS).
    </p>
  </div>
  <div class="cover-bottom">
    <div class="meta-block">
      <div><span class="label">RA:</span> 188635</div>
    </div>
    <p class="place-date">30 de setembro de 2026</p>
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
  --include-before-body="$COVER" \
  -o "$HTML"

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
