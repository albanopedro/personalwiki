// Toda conversa com a API passa por aqui.  (Parte 20)
//
// Duas coisas podem dar errado, e ate agora cada tela cuidava so da primeira:
//
//   1. a API RESPONDE, mas recusando: "nota nao encontrada", "ja existe uma
//      nota com esse nome", "a nota mudou no disco"...
//   2. a API NAO RESPONDE: voce fechou a janela do inicializador, o Mac
//      dormiu, o servidor reiniciou. Aqui o fetch falha - e, sem ninguem
//      para pegar essa falha, a tela simplesmente nao reagia ao clique.
//
// As duas viram a mesma coisa: um erro com mensagem em portugues, que a
// tela so precisa mostrar.

export async function api(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error('A API não respondeu. Ela está rodando? (npm run api)');
  }

  if (!res.ok) {
    // Nossas rotas sempre recusam mandando { error: "..." } em JSON. Se a
    // resposta NAO tem esse formato, quem respondeu nao foi a API: foi o
    // Vite no meio do caminho, dizendo que nao conseguiu falar com ela.
    // (E por isso que "API desligada" chega aqui como erro 500, e nao como
    // falha de conexao.)
    const corpo = await res.json().catch(() => null);
    if (corpo?.error) throw new Error(corpo.error);
    throw new Error('A API não respondeu. Ela está rodando? (npm run api)');
  }

  return res.json();
}

/** Atalho para as rotas que MANDAM dados: o editor, as tarefas e a nota nova. */
export function apiSend(path, method, body) {
  return api(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
