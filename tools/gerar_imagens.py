"""Gera as ilustrações do jogo com o modelo de imagem do Gemini (Nano Banana Pro).

Uso:
    export GEMINI_API_KEY="sua-chave"
    python3 tools/gerar_imagens.py              # gera tudo o que ainda não existe
    python3 tools/gerar_imagens.py aldeia fogo  # gera (ou refaz) cenas específicas
    python3 tools/gerar_imagens.py retrato:kelpie
    python3 tools/gerar_imagens.py heroi:ruiva_malha

As cenas são salvas em img/scenes/<chave>.jpg (1600 px, 21:9) e os retratos em
img/portraits/<chave>.jpg (720 px, 3:4). Requer: pip install pillow
"""
import base64
import io
import json
import re
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from prompts import (  # noqa: E402
    CENAS,
    ESTILO,
    ESTILO_HEROI,
    ESTILO_RETRATO,
    HEROIS,
    HEROIS_APARENCIA,
    HEROIS_ROUPA,
    RETRATOS,
)

RAIZ = Path(__file__).resolve().parent.parent
MODELO = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")
if not re.fullmatch(r"[\w.-]+", MODELO):
    sys.exit(f"Nome de modelo inválido: {MODELO!r}")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:streamGenerateContent?alt=sse"
if not URL.startswith("https://generativelanguage.googleapis.com/"):
    sys.exit("URL da API inesperada.")


def chave_api():
    chave = os.environ.get("GEMINI_API_KEY")
    if not chave:
        sys.exit("Defina a variável de ambiente GEMINI_API_KEY com a sua chave do Google AI Studio.")
    return chave


def destino(chave):
    if chave.startswith("heroi:"):
        return RAIZ / "img" / "heroes" / f"{chave[6:]}.jpg"
    if chave.startswith("retrato:"):
        return RAIZ / "img" / "portraits" / f"{chave[8:]}.jpg"
    return RAIZ / "img" / "scenes" / f"{chave}.jpg"


def partes_heroi(nome):
    """Texto do retrato do herói e, se já existir, o retrato em lã da mesma aparência como referência."""
    aparencia, roupa = HEROIS[nome]
    texto = ESTILO_HEROI + HEROIS_APARENCIA[aparencia] + " " + HEROIS_ROUPA[roupa]
    base = destino(f"heroi:{aparencia}_la")
    if roupa == "la" or not base.exists():
        return [{"text": texto}]
    referencia = base64.b64encode(base.read_bytes()).decode()
    return [
        {"inlineData": {"mimeType": "image/jpeg", "data": referencia}},
        {"text": "Paint this exact same person, same face, hair and build, in a new portrait. " + texto},
    ]


def gerar(chave):
    heroi = chave.startswith("heroi:")
    retrato = chave.startswith("retrato:") or heroi
    if heroi:
        partes = partes_heroi(chave[6:])
    else:
        nome = chave[8:] if retrato else chave
        partes = [{"text": ESTILO_RETRATO + RETRATOS[nome] if retrato else ESTILO + CENAS[nome]}]
    corpo = {
        "contents": [{"role": "user", "parts": partes}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4" if retrato else "21:9"},
        },
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(corpo).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": chave_api()},
    )
    dados = None
    with urllib.request.urlopen(req, timeout=400) as resp:  # nosec B310: URL fixa em https, validada acima
        for linha in resp:
            linha = linha.decode().strip()
            if not linha.startswith("data:"):
                continue
            for cand in json.loads(linha[5:]).get("candidates", []):
                for parte in cand.get("content", {}).get("parts", []):
                    if "inlineData" in parte and not parte.get("thought"):
                        dados = parte["inlineData"]["data"]
    if not dados:
        raise RuntimeError("a resposta não trouxe imagem")
    img = Image.open(io.BytesIO(base64.b64decode(dados))).convert("RGB")
    largura = 720 if retrato else 1600
    img = img.resize((largura, round(img.height * largura / img.width)), Image.LANCZOS)
    saida = destino(chave)
    saida.parent.mkdir(parents=True, exist_ok=True)
    img.save(saida, "JPEG", quality=82, optimize=True, progressive=True)
    return saida


def main():
    # Os retratos em lã vêm primeiro: servem de referência para as outras roupas.
    herois = sorted(HEROIS, key=lambda k: not k.endswith("_la"))
    todas = list(CENAS) + [f"retrato:{k}" for k in RETRATOS] + [f"heroi:{k}" for k in herois]
    chaves = sys.argv[1:] or [k for k in todas if not destino(k).exists()]
    for chave in chaves:
        try:
            print(f"{chave}: {gerar(chave).relative_to(RAIZ)}", flush=True)
        except urllib.error.HTTPError as erro:
            print(f"{chave}: erro HTTP {erro.code} {erro.read().decode()[:200]}", flush=True)
        except Exception as erro:  # segue para a próxima imagem
            print(f"{chave}: erro {erro}", flush=True)


if __name__ == "__main__":
    main()
