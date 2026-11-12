# Alerta de Links — demo do TCC

Prova de conceito local com duas opções: analisar somente a URL da aba ou combinar a URL com os destinos de links `href` presentes no HTML recebido da página. A análise mostra os sinais encontrados. Não bloqueia páginas, não usa banco de dados nem consulta listas de ameaças.

## Executar a API

Com o **Node.js** já instalado, execute na pasta do projeto:

```powershell
npm ci
node backend/server.js
```

A API escuta somente em `http://127.0.0.1:5000`. Abra esse endereço para testar URLs fictícias: o resultado mostra cada sinal, seus pontos e o total. `/health` retorna o status técnico. A versão ASP.NET Core original continua em `backend/PhishingDetector.Api` e oferece apenas análise de URL; a nova análise de HTML está na API Node. Execute apenas uma API por vez, pois ambas usam a porta 5000.

## Carregar a extensão

1. Abra `chrome://extensions/` no Chrome ou `edge://extensions/` no Edge.
2. Ative **Modo do desenvolvedor** e escolha **Carregar sem compactação**.
3. Selecione a pasta `extension` deste projeto.
4. Abra um site HTTP ou HTTPS, clique no ícone da extensão e escolha **Analisar só a URL** ou **Analisar URL + HTML**.

**Exemplo para testar a extensão:** abra `http://127.0.0.1:5000/exemplo/login` em uma aba. É uma página fictícia servida pelo próprio projeto, sem formulário de senha. Clique na extensão nessa aba. O resultado esperado em ambas as opções é **Suspeita forte — 5 pontos**: IP (+3), palavra `login` (+1) e HTTP (+1). Essa classificação demonstra as regras; a página local não é maliciosa.

Para demonstrar as três categorias com diferentes pontuações, envie URLs fictícias à API pelo terminal:

```powershell
$base = 'http://127.0.0.1:5000/api/analyze'
@('https://example.com/', 'https://example.com/login', 'http://login.verificacao.conta.exemplo.test/') | ForEach-Object {
  Invoke-RestMethod -Uri $base -Method Post -ContentType 'application/json' -Body (@{ url = $_ } | ConvertTo-Json)
}
```

O teste do fluxo do popup pode ser repetido com `node tests/popup-flow.cjs`, sem iniciar a API antes.

Na opção URL + HTML, a extensão faz uma nova leitura HTTP da URL da aba ao clicar no botão e envia o HTML recebido somente à API local. O parser lê os `href` do código-fonte sem executar scripts. Links criados depois por JavaScript não entram na análise. Se a página não fornecer HTML, a extensão mostra o resultado da URL e informa que o HTML ficou indisponível. A segunda requisição pode devolver uma versão diferente da página já carregada e pode falhar em páginas autenticadas ou com redirecionamentos. O HTML não é armazenado pela API.

Um link externo comum não é considerado prova de phishing. A regra complementar soma no máximo um ponto se um `href` levar a outro domínio registrável **e** a URL desse destino somar pelo menos dois pontos nas regras lexicais. Links marcados como botão têm prioridade na justificativa. Os resultados exploratórios da comparação em páginas arquivadas estão em [AVALIACAO_HTML_EXPLORATORIA.md](docs/AVALIACAO_HTML_EXPLORATORIA.md).

O limiar para **Suspeita forte** na API e na extensão é **2 pontos**: 1 ponto mostra **Atenção** e 0 ponto mostra **Nenhuma ameaça conhecida encontrada**. Essa é uma política de apresentação para o uso cotidiano, escolhida após a avaliação offline. O experimento do artigo mediu separadamente o limiar calibrado de **1 ponto**; suas métricas não descrevem a política de 2 pontos da extensão. A classificação é uma triagem por regras locais, não um diagnóstico de phishing. Pontuação 0 não confirma que o site é seguro. O nome de domínio com muitas partes é uma aproximação simples, que também pode gerar alertas em endereços legítimos.

Veja [as sete regras atuais, a pontuação e as próximas análises propostas](docs/ANALISES.md).

Para medir os acertos e falsos alertas das regras, e testar se as pessoas entendem o aviso, siga o [roteiro de avaliação](docs/AVALIACAO.md). O script `tests/avaliar-urls.cjs` lê uma planilha TSV de URLs rotuladas sem visitar os sites.
