// Configuracao do projeto.
// O vault e a FONTE DA VERDADE: o wiki apenas le esses arquivos.
export const config = {
  // Da para usar outro vault sem mexer no codigo:  VAULT_PATH=/outro/vault npm run api
  // (Parte 15 - foi assim que os testes rodaram numa copia, sem tocar no seu vault)
  vaultPath: process.env.VAULT_PATH || '/Users/albano/Documents/Obsidian Vault',
  // A porta tambem pode vir do ambiente: API_PORT=3101 npm run api
  // Serve para rodar um segundo wiki (outro vault) sem desligar o primeiro.
  apiPort: Number(process.env.API_PORT) || 3001,   // porta da API (Parte 5)
};
