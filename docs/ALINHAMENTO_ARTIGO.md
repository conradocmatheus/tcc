# Alinhamento do artigo com o protótipo e a amostra

Aplicado ao Google Docs em 24/10/2026 pela sessão de edição do navegador Comet. A integração do Drive, usada para leitura e verificação, retornou `403 PERMISSION_DENIED` para escrita; a sessão do navegador tinha permissão de editor. Os trechos abaixo registram o que foi alterado antes da Entrega 03.

## 1. Regra de termos em “3. Materiais e Métodos”

No parágrafo que começa com “Cada URL receberá pontos”, substituir apenas o trecho da regra de termos por:

> presença, sem distinção entre maiúsculas e minúsculas, de um dos termos login, verificacao, verify, senha, password, conta, account ou atualizacao como trecho do host ou caminho (+1)

Esses são exatamente os oito termos em `backend/server.js`, `backend/PhishingDetector.Api/UrlAnalyzer.cs` e `docs/ANALISES.md`. A regra procura cada sequência dentro do host ou caminho; não exige palavra inteira. `signin`, `verification`, `secure` e `update`, citados na versão anterior do artigo, não acionam essa regra.

## 2. Fonte e preparação dos dados em “3. Materiais e Métodos”

Substituir o parágrafo que começa com “As URLs serão obtidas de fontes públicas” por:

> Para a avaliação, foi utilizado o conjunto PhiUSIIL Phishing URL (Website), disponibilizado no repositório UCI por Prasad e Chandra (2024). Foram consideradas somente as colunas URL e label, com rótulos 0 para phishing e 1 para legítima; as características extraídas das páginas não foram usadas pelo detector. Após a exclusão de 1.384 entradas inválidas ou incompatíveis, 877 duplicatas, um conflito de rótulo e 604 registros de domínios com rótulos opostos, restaram 232.928 URLs elegíveis. Foram selecionadas de modo determinístico 500 URLs por classe, com no máximo cinco por domínio registrável e semente tcc-2026-10-24-v1. Uma cópia congelada da Public Suffix List foi usada para identificar o domínio registrável. A amostra foi dividida por domínio em desenvolvimento (579 URLs), validação (193) e teste final (228), sem abrir os endereços. Os rótulos publicados não foram revalidados neste estudo, e a amostra equilibrada não representa a frequência de phishing na navegação real.

Os números vêm de `dados/processados/phiusiil-v1/auditoria.json`. O protocolo completo está em `docs/PROTOCOLO_DADOS.md`. PhishTank e Tranco foram opções investigadas, mas não são a fonte da amostra principal.

## 3. Referência a acrescentar

> PRASAD, Arvind; CHANDRA, Shalini. PhiUSIIL Phishing URL (Website) [conjunto de dados]. UCI Machine Learning Repository, 2024. Disponível em: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset. Acesso em: 24 out. 2026.

## Verificação feita

- Os três ajustes foram conferidos por leitura do Google Docs após a edição, e o navegador indicou “Saved to Drive”.
- O teste de execução do backend Node.js detectou os oito termos implementados e não detectou os quatro termos exclusivos da redação anterior.
- Os arquivos Node.js e ASP.NET Core contêm a mesma lista de termos. Não foi possível executar a versão ASP.NET Core porque o SDK .NET não está instalado neste computador.
- O teste final de URLs ainda não foi avaliado; não usar números de desempenho antes de congelar regras e limiar.
