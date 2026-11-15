# Análise exploratória dos erros no teste PhiUSIIL

Diagnóstico posterior à abertura do teste final. Usa a mesma partição congelada (`teste.tsv`, SHA-256 `4b36c90fd65945ffd99abb43abf499af8646446e012e65b9352f45fd0b7afb43`), os sete pesos originais e limiar de um ponto. Não altera o detector nem recalibra parâmetros. Reproduzir com `node scripts/analisar-erros-phiusiil.cjs`. O script lê URLs como texto; não as visita nem as imprime.

| Resultado | Quantidade | Características observadas |
| --- | ---: | --- |
| Verdadeiros positivos | 74 | 67 usam HTTP; em 58, HTTP é o único sinal. |
| Falsos negativos | 36 | Todos usam HTTPS e recebem zero ponto. Comprimento de 18 a 100 caracteres, mediana 39; hosts com dois a quatro rótulos; nove têm caminho além da raiz. |
| Falsos positivos | 3 | Todos usam HTTPS e recebem dois pontos exclusivamente pela regra de cinco rótulos no host. Comprimento de 28 a 32 caracteres; não têm caminho além da raiz. |
| Verdadeiros negativos | 115 | Todos usam HTTPS e têm caminho raiz, sem sinais das sete regras. |

Entre os 36 falsos negativos, 16 hosts contêm dígitos e 14 contêm hífen. Entre os 115 verdadeiros negativos, esses números são três e nove, respectivamente. Essas diferenças são apenas achados exploratórios da mesma partição de teste; não autorizam acrescentar novas regras ou afirmar que dígitos e hífens indicam fraude em outros conjuntos. Nenhum dos 36 falsos negativos contém, na consulta ou no fragmento, os termos já utilizados pela regra lexical.

Além da assimetria de protocolo já discutida no artigo, a amostra apresenta uma diferença estrutural entre classes: nenhuma das 118 URLs legítimas tem caminho além da raiz, enquanto 22 das 110 URLs rotuladas como phishing têm. Essa observação não explica sozinha os acertos do detector, pois não há regra de presença de caminho, mas reforça que a composição da fonte difere da navegação cotidiana. Uma avaliação externa recente e com classes coletadas de modo comparável é necessária antes de criar ou validar novas regras.

Os rótulos são os publicados pela UCI, sem revalidação individual. Os formatos observados descrevem URLs, não o conteúdo nem a intenção das páginas. Não se deve incluir URLs ativas do conjunto no artigo.
