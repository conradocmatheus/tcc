# Entenda o seu TCC — roteiro para estudar e apresentar

## Em uma frase

O experimento original avaliou **somente o texto da URL**, com sete sinais explicáveis. A extensão passou a oferecer também uma opção complementar que lê os destinos de links no HTML recebido da página. A pontuação é uma triagem, não uma prova de fraude nem uma probabilidade.

## Qual problema o trabalho resolve?

Páginas falsas podem levar pessoas a informar senhas ou outros dados. A URL às vezes contém pistas, mas nenhuma pista isolada confirma phishing. A pergunta do TCC é se um conjunto simples e explicável de regras consegue identificar parte das URLs de phishing em dados rotulados, inclusive quando o teste contém domínios não usados na escolha dos parâmetros.

## O que foi construído?

1. O usuário escolhe **Analisar só a URL** ou **Analisar URL + HTML** na extensão.
2. A extensão envia a URL da aba à API local. Na segunda opção, solicita também o HTML da página e o envia à mesma API.
3. A API aplica sete regras à URL. Com HTML, examina `href` externos e soma no máximo um ponto complementar quando o destino também possui sinais lexicais.
4. A extensão mostra a pontuação e os motivos. Ela não consulta reputação externa nem bloqueia o site.

| Sinal | Pontos originais |
|---|---:|
| Host em formato IP | 3 |
| Informação antes de `@` | 3 |
| `xn--` no host | 2 |
| Cinco ou mais partes no host | 2 |
| Mais de 120 caracteres | 1 |
| Um dos oito termos definidos no código, no host ou caminho | 1 |
| HTTP | 1 |

Os oito termos são `login`, `verificacao`, `verify`, `senha`, `password`, `conta`, `account` e `atualizacao`. A busca aceita trechos dentro de palavras. Os pesos continuam iguais. Na extensão atual, 0 ponto significa nenhum sinal local, 1 ponto mostra Atenção e 2 ou mais mostram Suspeita forte. O limiar 1 foi o escolhido e medido no experimento offline; o limiar 2 é a política posterior de apresentação no uso cotidiano, ainda sem avaliação externa própria.

**O que a análise de HTML faz?** Ela lê os destinos de todos os links `href` presentes no HTML recebido, dando prioridade aos links marcados como botões. Um destino em outro domínio não é automaticamente suspeito. A regra complementar pontua quando esse destino também recebe pelo menos dois pontos nas regras lexicais. O teste exploratório dessa camada usa HTML arquivado de outra base, pois a PhiUSIIL contém indicadores já extraídos, mas não o HTML bruto.

## De onde vieram os dados?

O conjunto [PhiUSIIL na UCI](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) traz URLs e rótulos publicados pelos autores: `0 = phishing`, `1 = legítima`. O nosso algoritmo usou **apenas URL e rótulo**, sem características extraídas da página. Após limpeza, foram escolhidas 500 URLs por classe, com semente fixa e limite de cinco por domínio registrável. A [Public Suffix List](https://publicsuffix.org/list/) permitiu reconhecer domínios como `exemplo.com.br` corretamente. O processo e os hashes estão em `dados/processados/phiusiil-v1/auditoria.json`.

As 1.000 URLs foram separadas por domínio registrável: desenvolvimento 579, validação 193 e teste final 228. URLs do mesmo domínio ficaram na mesma partição. Isso reduz o risco de medir um acerto em endereços quase iguais aos usados para escolher os parâmetros.

## Como ler a matriz de confusão?

O teste final contém **110 URLs rotuladas phishing** e **118 legítimas**.

| Resultado | Significado | Original (limiar 3) | Calibrado (limiar 1) |
|---|---|---:|---:|
| VP | Phishing alertado | 4 | 74 |
| FN | Phishing não alertado | 106 | 36 |
| FP | Legítima alertada | 0 | 3 |
| VN | Legítima sem alerta | 118 | 115 |

**Precisão** responde: entre os endereços alertados como phishing, quantos tinham esse rótulo? `VP/(VP+FP)`. Foi 100% no original (4/4) e 96,10% no calibrado (74/77). Quatro acertos e nenhum falso positivo **não** significam bom detector quando quase todos os phishings são perdidos.

**Revocação** responde: entre os phishings da amostra, quantos receberam alerta? `VP/(VP+FN)`. Foi 3,64% (4/110) no original e 67,27% (74/110) no calibrado.

**F1** combina precisão e revocação: `2VP/(2VP+FP+FN)`. Foi 7,02% no original e 79,14% no calibrado. A diferença foi de 72,13 pontos percentuais. Um bootstrap pareado por domínio registrável, com 5.000 reamostragens, deu intervalo de 95% de 63,24 a 80,11 pontos para essa diferença, **condicional à amostra usada**.

**Taxa de falsos positivos** responde: entre as legítimas, quantas receberam alerta? `FP/(FP+VN)`. Foi 0% no original e 2,54% (3/118) no calibrado.

## O que a calibração realmente mudou?

A busca de pesos inteiros 0–3 e limiares 1–5 usou apenas desenvolvimento e validação. Os **pesos escolhidos ficaram iguais** aos originais. O único ajuste selecionado foi reduzir de 3 para 1 o limiar considerado positivo na avaliação binária. Assim, qualquer sinal já gera previsão positiva no experimento calibrado. Isso aumenta detecção, mas também cria falsos alertas. Após a avaliação, o limiar 1 foi aplicado à API demonstrativa. Em uma revisão posterior, o limiar cotidiano da API foi alterado para 2 pontos, com Atenção para 1 ponto. Os números do teste final foram medidos offline e não representam essa política de apresentação posterior.

## Limitações que você deve saber explicar

- No teste, 67 URLs rotuladas phishing usavam HTTP e nenhuma das 118 legítimas usava HTTP. Essa diferença ajuda muito o método **nesta base** e pode não se repetir na navegação real.
- Ainda ficaram 36 URLs de phishing sem nenhum dos sete sinais. Nenhum limiar positivo pode detectá-las com essas regras.
- Os três falsos positivos calibrados dispararam a regra de muitas partes no host.
- IP e informação antes de `@` não apareceram na amostra final; seu desempenho não foi medido nesse teste.
- Os rótulos originais não foram revalidados em 2026. A amostra foi equilibrada artificialmente, então a precisão observada não é uma taxa esperada de proteção no uso real.
- A hipótese de que uma divisão aleatória seria melhor que a divisão por domínio não foi testada nesta entrega. Quase todos os 1.000 exemplos estão em domínios diferentes (954 domínios), o que torna esse contraste pouco informativo. O artigo precisa retirar essa hipótese ou marcá-la como trabalho futuro.

## Explicação de um minuto

“Nosso TCC avalia uma extensão que ajuda a examinar URLs antes de confiar nelas. Ela usa sete regras simples, como HTTP, IP no host e termos de acesso, e mostra os motivos do alerta. Para medir o desempenho, usamos 1.000 URLs rotuladas de uma base pública, divididas por domínio em desenvolvimento, validação e teste. O limite original de três pontos foi muito conservador no teste: identificou quatro de 110 phishings. Ao escolher um limite de um ponto sem consultar o teste, a detecção subiu para 74 de 110, com três falsos alertas entre 118 URLs legítimas. Isso melhora o F1 nesta amostra, mas não prova proteção geral: 36 phishings não tinham nenhum sinal e o conjunto de dados favoreceu a regra HTTP. A contribuição é uma triagem explicável com erros e limites medidos de forma transparente.”

## Perguntas prováveis da banca

**Por que não usar aprendizado de máquina?** O foco é medir um conjunto pequeno de regras que o usuário possa auditar e que a extensão consiga explicar diretamente. Modelos mais complexos são trabalhos relacionados, não o escopo desta entrega.

**Pontuação zero significa seguro?** Não. Significa apenas que nenhuma das sete regras disparou. Houve 36 phishings com zero ponto no teste final.

**Por que separar por domínio?** Para evitar que URLs do mesmo site fiquem ao mesmo tempo na escolha de parâmetros e no teste, o que poderia inflar o resultado.

**Por que o F1 melhorou tanto?** Principalmente porque o limiar caiu de 3 para 1. No conjunto usado, muitas URLs de phishing tinham um único sinal, sobretudo HTTP. Isso também aumentou os falsos positivos de zero para três.

**O resultado vale para a internet inteira?** Não. Vale para a amostra e as condições descritas. As fontes, datas, rótulos e tipos de URL podem mudar.
