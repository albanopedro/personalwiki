// Configuracao do projeto.
// O vault e a FONTE DA VERDADE: o wiki apenas le esses arquivos.
export const config = {
  // Da para usar outro vault sem mexer no codigo:  VAULT_PATH=/outro/vault npm run api
  // (Parte 15 - foi assim que os testes rodaram numa copia, sem tocar no seu vault)
  vaultPath: process.env.VAULT_PATH || '/Users/albano/Documents/Obsidian Vault',
  apiPort: 3001,   // porta do servidor da API (Parte 5)
};
