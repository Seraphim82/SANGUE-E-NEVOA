"""Gera a trilha sonora de Sangue e Névoa com o modelo de música Lyria, do Gemini.

Uso:
    python3 tools/gerar_musica.py                  (gera as faixas que ainda não existem)
    python3 tools/gerar_musica.py combate taverna  (gera ou refaz só essas)

As faixas são salvas em audio/<chave>.mp3. Requer a variável GEMINI_API_KEY.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MODELO = "lyria-3-pro-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent"
if not URL.startswith("https://"):
    raise SystemExit("URL da API inválida")

ESTILO = (
    "Instrumental music for a dark historical-fantasy role-playing game set in Scotland in 1296. "
    "Authentic medieval and Celtic folk instruments only, recorded like a film soundtrack. "
    "No vocals with words, no modern instruments, no synthesizers, no drum kit. "
    "About 90 seconds long, ending in a way that loops back smoothly to the beginning. Piece: "
)

FAIXAS = {
    "tema": "Main theme. Epic and longing: a Highland bagpipe melody over Celtic harp and slow war drums, "
    "building to a proud, emotional climax, then settling.",
    "aldeia": "Village life. Calm, warm and pastoral: fiddle and wooden flute trade a gentle folk melody over "
    "harp, soft frame drum, a sense of home by a river at dusk.",
    "estrada": "Journey across the Highlands. Adventurous and hopeful: tin whistle melody, driving bodhrán "
    "rhythm, fiddle and harp, moderate-fast walking tempo, wide open landscapes.",
    "taverna": "Tavern. Lively and merry: fast fiddle reel, tin whistle, bodhrán, foot stomps and hand claps, "
    "a crowded smoky alehouse.",
    "suspense": "Suspense and pursuit. Tense and low: muffled deep frame drum heartbeat, low bowed strings, "
    "sparse plucked harp notes, a sense of being hunted at night.",
    "sombrio": "Haunted forest and peat bog. Dark and eerie: low bagpipe drone, distant breathy flute, "
    "creaking bowed strings, slow and unsettling.",
    "mistico": "Faerie magic and ancient standing stones. Ethereal and enchanting: shimmering Celtic harp "
    "arpeggios, small bells, wordless distant female choir, soft drone, slow and dreamlike.",
    "combate": "Battle against soldiers. Fierce and driving: pounding war drums, aggressive fiddle ostinato, "
    "bagpipe battle cry melody, fast tempo, heroic tension.",
    "combate_feerico": "Battle against supernatural creatures. Wild and otherworldly: irregular frame drums, "
    "dissonant harp, howling bagpipe drone, fast and frightening.",
    "lamento": "Lament for the dead. Sorrowful and slow: solo Highland bagpipe lament over a quiet harp, "
    "grief after a burned village.",
    "vitoria": "Victory. Triumphant and proud: massed bagpipes and war drums in a march, bright fiddle, "
    "joyful and glorious.",
    "final": "Ending and epilogue. Moving and bittersweet: harp and fiddle open softly, then bagpipe and "
    "drums swell into a hopeful, emotional farewell to the Highlands.",
}


def chave_api():
    chave = os.environ.get("GEMINI_API_KEY")
    if not chave:
        sys.exit("Defina a variável de ambiente GEMINI_API_KEY com a sua chave do Google AI Studio.")
    return chave


def destino(chave):
    return RAIZ / "audio" / f"{chave}.mp3"


def gerar(chave):
    corpo = {"contents": [{"role": "user", "parts": [{"text": ESTILO + FAIXAS[chave]}]}]}
    req = urllib.request.Request(
        URL,
        data=json.dumps(corpo).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": chave_api()},
    )
    with urllib.request.urlopen(req, timeout=600) as resp:  # nosec B310: URL fixa em https, validada acima
        dados = json.load(resp)
    for cand in dados.get("candidates", []):
        for parte in cand.get("content", {}).get("parts", []):
            if "inlineData" in parte:
                saida = destino(chave)
                saida.parent.mkdir(parents=True, exist_ok=True)
                saida.write_bytes(base64.b64decode(parte["inlineData"]["data"]))
                return saida
    raise RuntimeError("a resposta não trouxe áudio")


def main():
    chaves = sys.argv[1:] or [k for k in FAIXAS if not destino(k).exists()]
    for chave in chaves:
        if chave not in FAIXAS:
            print(f"{chave}: faixa desconhecida", flush=True)
            continue
        try:
            print(f"{chave}: {gerar(chave).relative_to(RAIZ)}", flush=True)
        except urllib.error.HTTPError as erro:
            print(f"{chave}: erro HTTP {erro.code} {erro.read().decode()[:200]}", flush=True)
        except Exception as erro:  # segue para a próxima faixa
            print(f"{chave}: erro {erro}", flush=True)


if __name__ == "__main__":
    main()
