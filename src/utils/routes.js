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
export function noteUrl(id) {
  const path = id.replace(/\.md$/, '').split('/').map(encodeURIComponent).join('/');
  return `/nota/${path}`;
}
