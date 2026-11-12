# 4. RESULTADOS E DISCUSSÃO — texto baseado no teste final

A busca no conjunto de desenvolvimento avaliou 81.920 combinações de pesos e limiares, com desempate pela validação. A configuração selecionada manteve os sete pesos originais (3, 3, 2, 2, 1, 1 e 1) e reduziu de três para um ponto o limiar de previsão positiva. Os rótulos do teste final não foram usados nessa escolha. A amostra de teste reuniu 228 URLs de 226 domínios registráveis: 110 rotuladas como phishing e 118 como legítimas.

**Tabela 1 — Desempenho no teste final separado por domínio**

| Medida | Baseline: limiar 3 | Calibrado: limiar 1 |
|---|---:|---:|
| Verdadeiros positivos (VP) | 4 | 74 |
| Falsos negativos (FN) | 106 | 36 |
| Falsos positivos (FP) | 0 | 3 |
| Verdadeiros negativos (VN) | 118 | 115 |
| Precisão | 100,00% | 96,10% |
| Revocação | 3,64% | 67,27% |
| F1 | 7,02% | 79,14% |
| Taxa de falsos positivos | 0,00% | 2,54% |

Fonte: elaboração dos autores com a amostra PhiUSIIL descrita na metodologia (2026).

O baseline alertou apenas quatro dos 110 casos de phishing. Sua precisão de 100% decorreu de quatro alertas corretos e nenhum falso alerta, mas conviveu com 106 casos não identificados. Com o limiar de um ponto, o método alertou 74 casos de phishing e três URLs legítimas. A diferença de F1 foi de 72,13 pontos percentuais; o intervalo de 95% por bootstrap pareado e agrupado por domínio, com 5.000 réplicas, foi de 63,24 a 80,11 pontos percentuais. A hipótese H1 recebeu apoio nesta amostra, sem implicar o mesmo ganho em outras fontes de URLs.

A mudança de desempenho ocorreu pela redução do limiar, e não pela alteração dos pesos. Entre as 110 URLs rotuladas como phishing no teste, 67 usavam HTTP, enquanto nenhuma das 118 legítimas usava esse protocolo. Assim, a regra de HTTP teve influência expressiva no resultado e pode refletir características particulares da base. Trinta e seis URLs de phishing não acionaram qualquer uma das sete regras e continuaram sem alerta no método calibrado. Os três falsos positivos acionaram a regra de cinco ou mais rótulos no host. As regras de IP no host e de informação antes de “@” não ocorreram no teste; não é possível estimar sua utilidade a partir desta amostra.

O uso de separação por domínio reduz a chance de avaliar URLs do mesmo domínio nos conjuntos de escolha e teste, mas não assegura generalização para fontes, períodos ou ataques distintos. Os rótulos publicados pela UCI não foram revalidados, e a seleção de 500 URLs por classe produziu uma amostra artificialmente equilibrada. A precisão observada, portanto, não deve ser interpretada como desempenho esperado na navegação cotidiana. A configuração com limiar um foi medida offline no teste final e aplicada posteriormente à API da extensão demonstrativa. Em uma revisão posterior, a extensão passou a mostrar Atenção com um ponto e Suspeita forte com dois ou mais. Essa política cotidiana não foi validada pelas métricas do teste final. A comparação posterior do limiar dois na mesma partição é exploratória e consta em `docs/COMPARACAO_LIMIAR_2.md`.
