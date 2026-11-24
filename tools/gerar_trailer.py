"""Monta o trailer de apresentação de Sangue e Névoa (cerca de 1 minuto, 1920x1080).

Cada plano parte de uma pintura do jogo, animada pelo modelo de vídeo do Gemini (Omni), e
ganha uma frase do narrador (mesma voz da narração do jogo). A trilha do jogo fica por baixo.

Uso:
    export GEMINI_API_KEY="sua-chave"
    python3 tools/gerar_trailer.py          # gera o que falta e monta trailer/sangue-e-nevoa-trailer.mp4

Os clipes e as falas ficam em trailer/pecas/ (fora do Git) e não são refeitos se já existirem;
apague um arquivo para refazer só aquele plano. Requer ffmpeg.
"""
import base64
import json
import os
import subprocess  # nosec B404: só chama o ffmpeg com argumentos montados aqui
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PECAS = RAIZ / "trailer" / "pecas"
SAIDA = RAIZ / "trailer" / "sangue-e-nevoa-trailer.mp4"
API = "https://generativelanguage.googleapis.com/v1beta"
MODELO_VIDEO = "gemini-omni-1.2-flash"
MODELO_VOZ = "gemini-2.5-pro-preview-tts"
VOZ = "Algenib"
FONTE = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

ESTILO = ("Animate this exact painting as an 8-second cinematic movie shot for a dark fantasy film trailer. "
          "Keep its painterly oil-painting style, its colours, its characters and its composition. "
          "No text, no letters, no subtitles. ")

VOZ_ESTILO = ("Você é o narrador de um trailer de cinema de ação épica: voz grave e poderosa, cheia de energia "
              "e tensão, ritmo firme e um pouco acelerado, como em trailers de filmes de batalha. Dê ênfase forte "
              "às palavras de impacto, com intensidade crescente, sem pausas longas e sem arrastar as sílabas. "
              "Fale em português do Brasil e narre exatamente o texto a seguir, sem acrescentar nada:\n\n")

# (chave, pintura de origem, o que acontece no plano, segundos usados, fala, letreiro)
PLANOS = [
    ("abertura", "img/scenes/titulo.jpg",
     "Mist slowly rolls between the ancient standing stones under the moon, faint blue fairy lights drift, the lone "
     "traveller's cloak moves in the wind, very slow camera push-in. Quiet eerie wind.",
     6.5, "Escócia, no ano de mil duzentos e noventa e seis.", "ESCÓCIA · 1296"),
    ("fogo", "img/scenes/fogo.jpg",
     "English soldiers set the thatched cottages ablaze at night, roaring flames and sparks fly, villagers flee, "
     "smoke swirls, handheld camera moving fast. Every rider sits upright in the saddle facing the same way as "
     "his horse, and the horses only walk or trot forward, head first, with natural anatomy. Fire roaring, screams.",
     5.5, "O rei Eduardo levou a Pedra do Destino. E trouxe o fogo.", ""),
    ("kelpie", "img/scenes/kelpie_rio.jpg",
     "The ghostly water horse rises out of the dark river, its seaweed mane whipping, water cascading, its eyes "
     "glowing, camera tilts up as it rears. Splashing water, an unearthly neigh.",
     5.5, "Sem a Pedra, as coisas antigas acordaram.", ""),
    ("sluagh", "img/scenes/sluagh_ceu.jpg",
     "A swarm of shadowy flying dead spirits sweeps across the stormy sky toward the camera, clouds churning, "
     "lightning flashes. Howling wind, ghostly shrieks.",
     4.5, "", ""),
    ("ponte", "img/scenes/ponte.jpg",
     "The wooden bridge collapses under the weight of armoured knights, timber splintering, men and horses fall "
     "into the river, spray and mist, dramatic slow camera push-in. Horses never move backwards: any horse still "
     "on the bridge moves forward head first or falls with the timbers, with natural anatomy. Epic battle sound.",
     6.5, "Em Stirling, a ponte caiu.", "STIRLING · 1297"),
    ("flechas", "img/scenes/chuva_flechas.jpg",
     "A storm of arrows darkens the sky and rains down on the Scottish spearmen, shields raised, men falling, "
     "fast camera shake. Whistling arrows, impacts, shouting.",
     5.0, "Em Falkirk, a Escócia sangrou.", "FALKIRK · 1298"),
    ("heroi", "img/action/heroi_furia_ruivo_malha.jpg",
     "The young hero roars and swings his weapon in fury, hair and cloak whipping, sparks and blood mist, the "
     "camera circles him in slow motion. Battle cry, clash of steel.",
     5.5, "Você não é cavaleiro, nem lorde.", ""),
    ("cailleach", "img/scenes/cailleach.jpg",
     "The ancient blue-skinned winter hag goddess rises from the frost, ice spreading across the chamber, her "
     "single eye opening and glowing, frost breath, slow push-in. Cracking ice, deep rumble.",
     6.0, "Mas no seu sangue dorme um poder antigo.", ""),
    ("bannockburn", "img/scenes/bannock.jpg",
     "Two great armies charge across the field at dawn, banners streaming, cavalry crashing into spear walls, "
     "dust and mud flying, sweeping camera. Thunder of hooves, battle roar.",
     6.5, "Bannockburn. A última manhã.", "BANNOCKBURN · 1314"),
    ("capa", "img/scenes/capa.jpg",
     "The four heroes stand ready for battle as storm clouds swirl behind them, the carved Stone glows brighter "
     "blue, mist flows around their feet, their cloaks move in the wind; the golden title at the bottom stays "
     "perfectly still and unchanged. Slow push-in. A deep epic drum hit.",
     8.0, "Sangue e Névoa.", ""),
]
MUSICAS = [("audio/mistico.mp3", 0.0), ("audio/combate.mp3", 11.5), ("audio/final.mp3", 46.0)]


def chave_api():
    chave = os.environ.get("GEMINI_API_KEY")
    if not chave:
        sys.exit("Defina a variável de ambiente GEMINI_API_KEY com a sua chave do Google AI Studio.")
    return chave


def post(caminho, corpo, tempo=900):
    req = urllib.request.Request(
        f"{API}/{caminho}",
        data=json.dumps(corpo).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": chave_api()},
    )
    with urllib.request.urlopen(req, timeout=tempo) as resp:  # nosec B310: URL fixa em https
        return json.load(resp)


def com_tentativas(funcao, nome):
    espera = 20
    for _ in range(6):
        try:
            return funcao()
        except urllib.error.HTTPError as erro:
            corpo = erro.read().decode()[:300]
            if erro.code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f"{nome}: erro HTTP {erro.code} {corpo}") from erro
        except (urllib.error.URLError, TimeoutError) as erro:
            corpo = str(erro)
        print(f"{nome}: nova tentativa em {espera} s ({corpo[:80]})", flush=True)
        time.sleep(espera)
        espera = min(240, espera * 2)
    raise RuntimeError(f"{nome}: desistiu depois de várias tentativas")


def gerar_clipe(plano):
    chave, imagem, acao = plano[0], plano[1], plano[2]
    destino = PECAS / f"{chave}.mp4"
    if destino.exists():
        return
    dados = base64.b64encode((RAIZ / imagem).read_bytes()).decode()
    corpo = {"model": MODELO_VIDEO, "input": [
        {"type": "image", "mime_type": "image/jpeg", "data": dados},
        {"type": "text", "text": ESTILO + acao},
    ]}
    resposta = com_tentativas(lambda: post("interactions", corpo), chave)
    for passo in resposta.get("steps", []):
        for parte in passo.get("content") or []:
            if parte.get("type") == "video":
                destino.write_bytes(base64.b64decode(parte["data"]))
                print(f"{chave}: clipe pronto", flush=True)
                return
    raise RuntimeError(f"{chave}: a resposta não trouxe vídeo")


def gerar_fala(plano):
    chave, fala = plano[0], plano[4]
    destino = PECAS / f"{chave}.wav"
    if not fala or destino.exists():
        return
    corpo = {
        "contents": [{"role": "user", "parts": [{"text": VOZ_ESTILO + fala}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ}}}},
    }
    # O modelo de voz às vezes devolve uma resposta vazia (finishReason OTHER) em frases curtas: tenta de novo.
    for _ in range(6):
        resposta = com_tentativas(lambda: post(f"models/{MODELO_VOZ}:generateContent", corpo, 300), chave + " (voz)")
        partes = resposta.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        if partes and "inlineData" in partes[0]:
            break
        print(f"{chave}: resposta de voz vazia, nova tentativa", flush=True)
    else:
        raise RuntimeError(f"{chave}: o modelo de voz não devolveu áudio")
    parte = partes[0]["inlineData"]
    bruto = PECAS / f"{chave}.pcm"
    bruto.write_bytes(base64.b64decode(parte["data"]))
    sem_silencio = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",  # nosec B603 B607
                    "-i", str(bruto), "-af", sem_silencio, str(destino)], check=True)
    bruto.unlink()
    print(f"{chave}: fala pronta", flush=True)


def duracao(arquivo):
    saida = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",  # nosec B603 B607
                            "-of", "csv=p=0", str(arquivo)], capture_output=True, text=True, check=True)
    return float(saida.stdout.strip())


def texto_ffmpeg(texto):
    return texto.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’")


def montar():
    """Corta cada clipe, sobe para 1080p com faixas de cinema, letreiros, falas e trilha."""
    TRANSICAO = 0.5
    entradas, filtros, rotulos = [], [], []
    inicio, momentos = 0.0, []
    for i, (chave, _, _, segundos, _, letreiro) in enumerate(PLANOS):
        clipe = PECAS / f"{chave}.mp4"
        fala = PECAS / f"{chave}.wav"
        precisa = duracao(fala) + 1.0 if PLANOS[i][4] and fala.exists() else 0
        usar = min(max(segundos, precisa), duracao(clipe) - 0.1)
        entradas += ["-i", str(clipe)]
        cadeia = (f"[{i}:v]trim=0:{usar},setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,"
                  f"fps=24,format=yuv420p,setsar=1")
        # Faixas pretas de cinema (2,39:1) em todos os planos, menos no último: lá o título da capa
        # fica embaixo e seria coberto.
        if i < len(PLANOS) - 1:
            barra = round((1080 - 1920 / 2.39) / 2)
            cadeia += (f",drawbox=x=0:y=0:w=iw:h={barra}:color=black:t=fill,"
                       f"drawbox=x=0:y=ih-{barra}:w=iw:h={barra}:color=black:t=fill")
        if letreiro:
            cadeia += (f",drawtext=fontfile={FONTE}:text='{texto_ffmpeg(letreiro)}':fontcolor=0xE8C46A:"
                       f"fontsize=60:x=(w-tw)/2:y=h-230:shadowcolor=black@0.8:shadowx=3:shadowy=3:"
                       f"alpha='if(lt(t,0.6),t/0.6,if(lt(t,{usar - 0.8}),1,max(0,({usar}-t)/0.8)))'")
        filtros.append(cadeia + f"[v{i}]")
        rotulos.append((f"v{i}", usar))
        momentos.append(inicio)
        inicio += usar - TRANSICAO
    # Fusões curtas entre os planos.
    atual, fim = rotulos[0][0], rotulos[0][1]
    for i, (rotulo, usar) in enumerate(rotulos[1:], 1):
        saida = f"x{i}"
        filtros.append(f"[{atual}][{rotulo}]xfade=transition=fade:duration={TRANSICAO}:offset={fim - TRANSICAO}[{saida}]")
        atual, fim = saida, fim + usar - TRANSICAO
    total = fim
    filtros.append(f"[{atual}]fade=t=in:st=0:d=1,fade=t=out:st={total - 1.5}:d=1.5[video]")

    # Áudio: som dos clipes baixo, trilha do jogo e falas por cima.
    audios = []
    n = len(PLANOS)
    for i, (rotulo, usar) in enumerate(rotulos):
        filtros.append(f"[{i}:a]atrim=0:{usar},asetpts=PTS-STARTPTS,volume=0.35,"
                       f"adelay={int(momentos[i] * 1000)}:all=1[s{i}]")
        audios.append(f"[s{i}]")
    proximo = n
    for j, (musica, comeco) in enumerate(MUSICAS):
        fim_musica = MUSICAS[j + 1][1] + 2 if j + 1 < len(MUSICAS) else total
        entradas += ["-i", str(RAIZ / musica)]
        filtros.append(f"[{proximo}:a]atrim=0:{fim_musica - comeco},asetpts=PTS-STARTPTS,volume=0.55,"
                       f"afade=t=in:d=1.5,afade=t=out:st={fim_musica - comeco - 2}:d=2,"
                       f"adelay={int(comeco * 1000)}:all=1[m{j}]")
        audios.append(f"[m{j}]")
        proximo += 1
    livre = 0.0  # quando o narrador termina a fala anterior
    for i, plano in enumerate(PLANOS):
        fala = PECAS / f"{plano[0]}.wav"
        if not plano[4] or not fala.exists():
            continue
        comeca = max(momentos[i] + 0.3, livre + 0.3)
        livre = comeca + duracao(fala)
        entradas += ["-i", str(fala)]
        filtros.append(f"[{proximo}:a]volume=1.6,adelay={int(comeca * 1000)}:all=1[f{i}]")
        audios.append(f"[f{i}]")
        proximo += 1
    filtros.append(f"{''.join(audios)}amix=inputs={len(audios)}:normalize=0,"
                   f"atrim=0:{total},afade=t=out:st={total - 2}:d=2,alimiter=limit=0.95[audio]")

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *entradas,  # nosec B603 B607
                    "-filter_complex", ";".join(filtros), "-map", "[video]", "-map", "[audio]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", str(SAIDA)], check=True)
    print(f"Trailer: {SAIDA.relative_to(RAIZ)} ({total:.1f} s)", flush=True)


def main():
    PECAS.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        tarefas = [pool.submit(gerar_clipe, p) for p in PLANOS] + [pool.submit(gerar_fala, p) for p in PLANOS]
        erros = [str(t.exception()) for t in tarefas if t.exception()]
    if erros:
        sys.exit("Faltaram peças:\n" + "\n".join(erros))
    montar()


if __name__ == "__main__":
    main()
