// Enderecos das notas.  (Parte 11)
//
// O id de uma nota e o caminho do arquivo dentro do vault. O endereco e esse
// caminho sem o ".md", com cada pedaco codificado (espaco, acento, travessao):
//
//   "Apostila Engenharia de Software/05 — Arquitetura de Computadores e Dados.md"
//   -> "/nota/Apostila%20Engenharia%20de%20Software/05%20%E2%80%94%20Arquitetura..."
//
// As barras entre pasta e nome continuam barras de verdade: por isso cada
// pedaco e codificado separado.
//
// Parte 12: a busca e os backlinks mandam tambem uma linha, que vai NO
// ENDERECO ("?linha=412"). Antes ela ia no state do React Router, mas o
// state nao viaja para outra aba - e o Cmd+clique abriria a nota no topo.
export function noteUrl(id, line = null) {
  const path = id.replace(/\.md$/, '').split('/').map(encodeURIComponent).join('/');
  const url = `/nota/${path}`;
  return line === null ? url : `${url}?linha=${line}`;
}
