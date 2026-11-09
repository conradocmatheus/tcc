# Alerta de Links — demo do TCC

Prova de conceito local: a extensão lê o endereço da aba quando você a abre; ao clicar em **Analisar este site**, envia a URL à API local e mostra sinais explicáveis. Não bloqueia páginas, não usa banco de dados nem consulta listas de ameaças.

## Executar a API

Com o **Node.js** já instalado, execute na pasta do projeto:

```powershell
node backend/server.js
```

A API escuta somente em `http://127.0.0.1:5000`. Abra esse endereço para testar URLs fictícias: o resultado mostra cada sinal, seus pontos e o total. `/health` retorna o status técnico. Não é necessário instalar pacotes. A versão ASP.NET Core original continua em `backend/PhishingDetector.Api` e pode ser executada com `dotnet run --project backend/PhishingDetector.Api` se você instalar o SDK .NET 9. Execute apenas uma API por vez, pois ambas usam a porta 5000.

## Carregar a extensão

1. Abra `chrome://extensions/` no Chrome ou `edge://extensions/` no Edge.
2. Ative **Modo do desenvolvedor** e escolha **Carregar sem compactação**.
3. Selecione a pasta `extension` deste projeto.
4. Abra um site HTTP ou HTTPS, clique no ícone da extensão e depois em **Analisar este site**.

**Exemplo para testar a extensão:** abra `http://127.0.0.1:5000/exemplo/login` em uma aba. É uma página fictícia servida pelo próprio projeto, sem formulário de senha. Clique na extensão nessa aba. O resultado esperado é **Suspeita forte — 5 pontos**: IP (+3), palavra `login` (+1) e HTTP (+1). Essa classificação demonstra as regras; a página local não é maliciosa.

Para demonstrar as duas categorias com diferentes pontuações, envie URLs fictícias à API pelo terminal:

```powershell
$base = 'http://127.0.0.1:5000/api/analyze'
@('https://example.com/', 'https://example.com/login', 'http://login.verificacao.conta.exemplo.test/') | ForEach-Object {
  Invoke-RestMethod -Uri $base -Method Post -ContentType 'application/json' -Body (@{ url = $_ } | ConvertTo-Json)
}
```

O teste do fluxo do popup pode ser repetido com `node tests/popup-flow.cjs`, sem iniciar a API antes.

O limiar ativo na API e na extensão é **1 ponto**: qualquer sinal gera o alerta. A classificação é uma triagem por regras locais, não um diagnóstico de phishing. A categoria **“Nenhuma ameaça conhecida encontrada”** significa apenas que nenhuma regra desta demo disparou; ela não confirma que o site é seguro. O nome de domínio com muitas partes é uma aproximação simples, que também pode gerar alertas em endereços legítimos.

Veja [as sete regras atuais, a pontuação e as próximas análises propostas](docs/ANALISES.md).

Para medir os acertos e falsos alertas das regras, e testar se as pessoas entendem o aviso, siga o [roteiro de avaliação](docs/AVALIACAO.md). O script `tests/avaliar-urls.cjs` lê uma planilha TSV de URLs rotuladas sem visitar os sites.
