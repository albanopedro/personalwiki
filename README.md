# Personal Wiki Offline

Um wiki local para ler, navegar e editar as notas do seu vault do Obsidian,
sem internet e sem banco de dados.

O vault é a **fonte da verdade**: o wiki lê os arquivos `.md` direto da pasta
do Obsidian e monta um índice na memória. O que você escreve no Obsidian
aparece aqui na hora; o que você escreve aqui vai para os mesmos arquivos.

## Como ligar

Clique duas vezes em **`iniciar.command`**. Ele liga os dois servidores,
espera a tela responder e abre o navegador. Para desligar: `Ctrl+C` na janela
que abriu, ou fechar a janela.

À mão, em duas abas do Terminal:

```bash
npm run api    # a API, na porta 3001: lê o vault e responde as perguntas
npm run dev    # a tela, na porta 5273: o React
```

Depois, abra `http://localhost:5273`.

Precisa de **Node.js** instalado. Na primeira vez, rode `npm install`.

## O que ele faz

- lê o vault e monta o índice (18 notas em ~20 ms)
- mostra as notas formatadas: títulos, listas, tabelas, callouts do Obsidian,
  código com cores e caixinhas de tarefa clicáveis
- navega pelos `[[links]]`, com backlinks e sumário de cada nota
- busca com trechos e o nome da seção onde cada resultado está
- grafo das conexões entre as notas
- cada nota tem endereço próprio, então o botão Voltar do navegador funciona
- percebe sozinho quando você edita uma nota no Obsidian
- edita e cria notas, gravando no vault

## As pastas

```
config.js            onde fica o vault e em que portas tudo roda
iniciar.command      o atalho de um clique (macOS)

server/              o que roda no Node e enxerga o disco
  index.js           a API: as rotas que a tela pergunta
  vault.js           lê os arquivos, monta o índice e vigia mudanças
  parser.js          entende o markdown das notas (frontmatter, [[links]])
  search.js          o motor de busca
  teste*.js          scripts de estudo: mostram o que o parser e o índice veem

src/                 o que roda no navegador (React)
  main.jsx           os endereços do wiki (React Router)
  App.jsx            junta tudo: lê o endereço, busca os dados, monta a tela
  components/        cada pedaço da tela (menu, nota, editor, grafo...)
  utils/             conversões usadas pela tela (markdown, endereços, API...)
  styles.css         todo o visual
```

## Ajustes

No `config.js` ficam o caminho do vault e a porta da API. Dá para mudar sem
editar o código, por variáveis de ambiente — útil para abrir um segundo vault
sem desligar o primeiro:

```bash
VAULT_PATH="/outro/vault" API_PORT=3101 npm run api
API_PORT=3101 WIKI_PORT=5373 npm run dev
```

## Sobre gravar no seu vault

O wiki escreve nas suas notas em três situações: salvar no editor, criar uma
nota e marcar uma caixinha de tarefa. As travas:

- a API **só escuta no próprio computador** (`127.0.0.1`), então ninguém na
  mesma rede alcança suas notas
- só é possível gravar em arquivos que o índice já conhece
- a gravação é em dois passos (arquivo temporário + renomear), então uma nota
  nunca fica pela metade no disco
- antes de gravar, o wiki confere se o arquivo mudou por fora (no Obsidian) e
  recusa em vez de escrever por cima

## O que ainda não tem

Apagar e renomear notas · diagramas mermaid · imagens · tema claro ·
destacar os termos na busca · listas de "recentes" e "mais citadas" ·
filtros no grafo · autocomplete de `[[links]]` · busca por significado
