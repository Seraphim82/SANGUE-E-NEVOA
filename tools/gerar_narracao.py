"""Gera a narração das cenas com o modelo de voz do Gemini.

Lê tools/narracao.json (criado por tools/coletar_narracao.mjs) e grava um MP3 por parágrafo
em audio/narracao/<chave>.mp3. Parágrafos que já têm áudio são pulados, então dá para parar e
continuar depois. Quando o Google pede para ir mais devagar (erro 429), espera e tenta de novo.

Uso:
    python3 tools/gerar_narracao.py              (todos os capítulos)
    python3 tools/gerar_narracao.py c1           (só as cenas do Capítulo I)

Requer a variável GEMINI_API_KEY e o ffmpeg instalado.
"""

import base64
import json
import os
import re
import subprocess  # nosec B404: só chama o ffmpeg com argumentos fixos
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MODELO = "gemini-2.5-pro-preview-tts"
VOZ = "Algenib"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent"
if not URL.startswith("https://"):
    raise SystemExit("URL da API inválida")

ESTILO = (
    "Você é o narrador de uma série épica de aventura, no estilo dos narradores brasileiros de anime "
    "clássico dos anos 90: voz grave e encorpada, tom solene e dramático, ritmo lento, pausas marcadas "
    "antes das frases mais fortes. Nas falas entre aspas, interprete com emoção, mas sem trocar de voz. "
    "Fale em português do Brasil, com dicção clara. Narre exatamente o texto a seguir, sem acrescentar "
    "nada:\n\n"
)
PASTA = RAIZ / "audio" / "narracao"
CHAVE_VALIDA = re.compile(r"^[0-9a-f]{16}$")


def chave_api():
    chave = os.environ.get("GEMINI_API_KEY")
    if not chave:
        sys.exit("Defina a variável de ambiente GEMINI_API_KEY com a sua chave do Google AI Studio.")
    return chave


def pedir(texto):
    corpo = {
        "contents": [{"role": "user", "parts": [{"text": ESTILO + texto}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ}}},
        },
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(corpo).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": chave_api()},
    )
    with urllib.request.urlopen(req, timeout=300) as resp:  # nosec B310: URL fixa em https, validada acima
        dados = json.load(resp)
    parte = dados["candidates"][0]["content"]["parts"][0]["inlineData"]
    taxa = re.search(r"rate=(\d+)", parte.get("mimeType", ""))
    return base64.b64decode(parte["data"]), int(taxa.group(1)) if taxa else 24000, parte.get("mimeType", "")


def gravar(chave, audio, taxa, tipo):
    """Converte o áudio do Gemini (PCM ou WAV) para MP3 mono, leve para baixar no celular."""
    PASTA.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as tmp:
        tmp.write(audio)
    entrada = ["-i", tmp.name] if "wav" in tipo else ["-f", "s16le", "-ar", str(taxa), "-ac", "1", "-i", tmp.name]
    destino = PASTA / f"{chave}.mp3"
    subprocess.run(  # nosec B603 B607: ffmpeg com argumentos fixos e caminhos gerados aqui
        ["ffmpeg", "-loglevel", "error", "-y", *entrada, "-ac", "1", "-b:a", "64k", str(destino)],
        check=True,
    )
    os.unlink(tmp.name)
    return destino


# O plano pago aceita 10 pedidos por minuto neste modelo: um pedido a cada 6,5 s fica abaixo disso.
INTERVALO = 6.5
_trava = threading.Lock()
_ultimo = [0.0]


def esperar_vez():
    """Espaça o início dos pedidos para não estourar o limite por minuto."""
    with _trava:
        agora = time.monotonic()
        espera = _ultimo[0] + INTERVALO - agora
        if espera > 0:
            time.sleep(espera)
        _ultimo[0] = time.monotonic()


def limites_estourados(corpo):
    """Lê do erro 429 quais limites estouraram (por minuto, por dia...)."""
    try:
        detalhes = json.loads(corpo).get("error", {}).get("details", [])
    except ValueError:
        return []
    return [v.get("quotaId", "") for d in detalhes for v in d.get("violations", [])]


class CotaDoDia(Exception):
    """O Google avisou que a cota de pedidos do dia acabou: só amanhã."""


def gerar(item):
    chave, texto = item["chave"], item["texto"]
    if not CHAVE_VALIDA.match(chave):
        return f"{chave}: chave inválida, pulado"
    destino = PASTA / f"{chave}.mp3"
    if destino.exists():
        return None
    espera = 20
    for _ in range(10):
        try:
            esperar_vez()
            audio, taxa, tipo = pedir(texto)
            gravar(chave, audio, taxa, tipo)
            return f"{chave}: ok ({item['cena']})"
        except urllib.error.HTTPError as erro:
            corpo = erro.read().decode()
            if erro.code == 402:
                raise SystemExit("Os créditos da chave do Gemini acabaram.") from erro
            # Só para de vez quando o limite estourado é o do dia; o por minuto passa com uma pausa.
            if erro.code == 429 and any("PerDay" in q for q in limites_estourados(corpo)):
                raise CotaDoDia() from erro
            corpo = corpo[:300]
            if erro.code not in (429, 500, 502, 503):
                return f"{chave}: erro HTTP {erro.code} {corpo}"
        except Exception as erro:  # rede instável: tenta de novo
            corpo = str(erro)[:160]
        print(f"{chave}: o Google pediu calma, nova tentativa em {espera} s", flush=True)
        time.sleep(espera)
        espera = min(300, espera * 2)
    return f"{chave}: desistiu depois de várias tentativas ({corpo})"


def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else ""
    itens = json.loads((RAIZ / "tools" / "narracao.json").read_text())
    itens = [i for i in itens if i["cena"].startswith(filtro)]
    faltam = [i for i in itens if not (PASTA / f"{i['chave']}.mp3").exists()]
    print(f"{len(itens)} parágrafos, {len(faltam)} sem áudio", flush=True)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            for resultado in pool.map(gerar, faltam):
                if resultado:
                    print(resultado, flush=True)
    except CotaDoDia:
        print("Cota de pedidos do dia esgotada: a geração continua amanhã.", flush=True)
    restam = sum(1 for i in itens if not (PASTA / f"{i['chave']}.mp3").exists())
    # Conta pelos arquivos: um pedido que termina depois do aviso de cota também entra na conta.
    feitos = len(faltam) - restam
    print(f"RESUMO: {feitos} gravados agora, {restam} ainda sem áudio", flush=True)


if __name__ == "__main__":
    main()
