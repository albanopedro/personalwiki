#!/bin/zsh
# Inicializador do Personal Wiki.
#
# Clique duas vezes neste arquivo no Finder: ele liga os dois servidores (a
# API e a tela), espera as duas responderem e abre o wiki no navegador.
# Para desligar tudo: Ctrl+C nesta janela, ou feche a janela.

# 1. Entra na pasta do projeto - a mesma onde este arquivo esta.
#    O $0 e o caminho deste arquivo; o dirname tira o nome e deixa a pasta.
cd "$(dirname "$0")" || exit 1

# 2. O Finder nao usa o PATH do seu Terminal, entao o node "some" quando o
#    script e aberto com dois cliques. Estes sao os lugares onde ele fica:
#    o primeiro e o do Homebrew em Mac com chip Apple (o seu caso).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node > /dev/null; then
  echo "Nao encontrei o Node.js."
  echo "Abra o Terminal e rode 'node -v' para conferir a instalacao."
  read "?Pressione Enter para fechar."
  exit 1
fi

# 3. Ja esta ligado? Entao e so abrir o navegador (evita ligar duas vezes).
if curl -s -o /dev/null --max-time 1 http://localhost:5273; then
  echo "O wiki ja esta ligado - deve haver outra janela aberta."
  open "http://localhost:5273"
  exit 0
fi

# 4. Primeira vez na maquina, ou dependencia nova: instala o que falta.
if [ ! -d node_modules ]; then
  echo "Instalando as dependencias (so na primeira vez)..."
  npm install || { read "?Falhou. Enter para fechar."; exit 1; }
fi

# 5. Quando voce fechar a janela (ou der Ctrl+C), os dois servidores morrem
#    junto. Sem isso, eles continuariam rodando escondidos, segurando as
#    portas 3001 e 5273, e o proximo clique nao funcionaria.
desligar() {
  # Desarma a armadilha ANTES de matar: o "kill 0" acerta todo o grupo de
  # processos, inclusive este script, e sem desarmar ele se chamaria de novo,
  # em cascata (o aviso saia tres vezes e a janela travava).
  trap - EXIT INT TERM
  echo
  echo "Desligando o wiki..."
  kill 0
}
trap desligar EXIT INT TERM

npm run api &     # a API, na porta 3001: le o vault e responde as perguntas
npm run dev &     # a tela, na porta 5273: o React

# 6. Espera a tela responder antes de abrir o navegador (ate 30 segundos).
#    Sem isso, o navegador abriria antes de existir o que mostrar.
printf "Ligando o wiki"
for _ in {1..60}; do
  curl -s -o /dev/null --max-time 1 http://localhost:5273 && break
  printf "."
  sleep 0.5
done
echo

open "http://localhost:5273"

echo
echo "Wiki aberto em http://localhost:5273"
echo "Deixe esta janela aberta enquanto estiver usando o wiki."
echo "Para desligar: Ctrl+C aqui, ou feche a janela."
echo

# 7. Fica segurando a janela, mostrando o que os dois servidores escrevem -
#    inclusive o "Vault mudou: ..." quando voce edita uma nota no Obsidian.
wait
