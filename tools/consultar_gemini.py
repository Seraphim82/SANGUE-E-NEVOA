"""Envia o Livro do Jogador ao Gemini e salva uma análise crítica de game design.

Uso:
    export GEMINI_API_KEY="sua-chave"
    python3 tools/consultar_gemini.py [modelo]

A resposta é salva em docs/analise-gemini.md.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MODELO = sys.argv[1] if len(sys.argv) > 1 else "gemini-3.1-pro-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:streamGenerateContent?alt=sse"

livro = (RAIZ / "docs" / "livro-do-jogador.md").read_text(encoding="utf-8")

JOGO_DIGITAL = """
Além do livro, existe uma versão jogável no navegador (Capítulo I) com:
- Criação de personagem com 3 origens e 10 pontos livres; testes de 3d6 com dados na tela.
- Combate por turnos: Atacar, Ataque Total, Defesa Total, magias, ervas; choque, crítico, RD e multiplicadores de dano.
- Ilustrações animadas por cena e trilha sonora gerada no navegador (climas: tema, suspense, bravura, místico, lamento).
- Escolhas com um "vento guia" que sopra pétalas de urze até a opção selecionada.
- Tela de Personagem: vestimentas (lã, gibão, tartan, couro fervido, cota de malha, Manto da Névoa),
  armas e amuletos (sorveira, trança de kelpie, pedra de víbora) com prévia no retrato do herói,
  melhorias na forja em 3 níveis (Reforçado, Temperado, Lendário) pagas com pennies e materiais
  (ferro, couro, tecido, prata) obtidos na história e nos combates, e aba de Aprendizados
  (atributos, perícias, magias).
"""

PEDIDO = """Você é um game designer sênior especialista em RPGs de mesa (GURPS em especial),
narrativa histórica e jogos digitais de aventura. Analise o material abaixo do jogo
"Sangue e Névoa", ambientado na Escócia de 1296–1297 com elementos do folclore escocês.

Responda em português do Brasil, com estas seções:
1. Impressão geral (pontos fortes e fracos).
2. Regras e equilíbrio: custos, letalidade do combate, progressão por pontos, melhorias de itens.
   Aponte números específicos que você mudaria e por quê.
3. Narrativa e ambientação: coerência histórica, uso do folclore, ritmo do Capítulo I.
4. Bestiário: criaturas fortes ou fracas demais, ideias de novas criaturas do folclore escocês.
5. Progressão do personagem: vestimentas, armas, amuletos e aprendizados. O que falta para
   a evolução ser satisfatória ao longo de vários capítulos?
6. Sugestões concretas para o Capítulo II, "O Martelo e a Pedra".
7. As 5 melhorias mais importantes, em ordem de prioridade.

Seja específico e crítico; não elogie sem motivo.
"""

corpo = {
    "contents": [{"role": "user", "parts": [
        {"text": PEDIDO},
        {"text": "=== LIVRO DO JOGADOR ===\n" + livro},
        {"text": "=== VERSÃO DIGITAL ===\n" + JOGO_DIGITAL},
    ]}],
    "generationConfig": {"temperature": 0.7},
}

cab = {"Content-Type": "application/json",
       "x-goog-api-key": os.environ.get("GEMINI_API_KEY") or sys.exit("Defina GEMINI_API_KEY.")}
req = urllib.request.Request(URL, data=json.dumps(corpo).encode(), headers=cab, method="POST")
partes = []
try:
    with urllib.request.urlopen(req, timeout=600) as r:
        for linha in r:
            linha = linha.decode("utf-8").strip()
            if not linha.startswith("data:"):
                continue
            bloco = json.loads(linha[5:])
            for c in bloco.get("candidates", []):
                for p in c.get("content", {}).get("parts", []):
                    if p.get("text") and not p.get("thought"):
                        partes.append(p["text"])
except urllib.error.HTTPError as e:
    print(f"Erro HTTP {e.code}: {e.read().decode()[:500]}")
    sys.exit(1)

texto = "".join(partes)
saida = RAIZ / "docs" / "analise-gemini.md"
saida.write_text(f"# Análise do Gemini ({MODELO})\n\n{texto}\n", encoding="utf-8")
print(f"Análise salva em {saida} ({len(texto)} caracteres)")
