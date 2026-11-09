# Protocolo de dados e rotulagem — TCC

Estado: amostra preparada, configuração congelada e teste final executado uma vez em 24/10/2026. A fonte principal foi alterada em relação à proposta de 19/10/2026 porque construir URLs a partir de domínios Tranco não garantiria que essas URLs existem. Registrar qualquer alteração posterior com data e motivo.

## 1. Pergunta e unidade de análise

A unidade é uma URL HTTP(S) como texto. O algoritmo não acessa o endereço. A tarefa binária de avaliação é distinguir URLs rotuladas como phishing de URLs tratadas operacionalmente como legítimas. A categoria exibida pela extensão é uma tradução da pontuação; pontuação não é probabilidade de fraude.

## 2. Fontes e significado dos rótulos

**Fonte principal.** Usar o [PhiUSIIL Phishing URL (Website)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset), publicado no repositório UCI em 2024. O arquivo contém URLs efetivamente registradas e os rótulos originais `0 = phishing` e `1 = legítima`. Conservar somente as colunas `URL` e `label` na amostra; as demais características incluem informação da página e não devem alimentar o detector, que opera apenas sobre o texto da URL.

Os rótulos são os atribuídos pelos autores desse conjunto, sem revalidação neste TCC. O estudo mede desempenho **nessa amostra**, sujeito a erros de rótulo e características próprias da coleta original. O artigo deve citar Prasad e Chandra e o conjunto UCI; não pode afirmar que cada URL foi verificada novamente em 2026.

**Fontes complementares reservadas.** Uma captura do feed `online-valid.csv.gz` do PhishTank e a lista Tranco `262N9` foram baixadas em 24/10/2026, mas **não integram a amostra principal**. Uma eventual avaliação externa com elas exige protocolo próprio, pois Tranco mede popularidade, não legitimidade de URLs individuais.

Fonte principal e licença: [UCI PhiUSIIL](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset), CC BY 4.0.

## 3. Coleta e rastreabilidade

1. Guardar o ZIP original da UCI e a cópia da Public Suffix List, com URL, data e SHA-256. O `auditoria.json` registra os hashes do CSV extraído e da lista de sufixos.
2. A quantidade foi fixada em **500 URLs por classe**, antes de calcular pontuações. A semente de seleção é `tcc-2026-10-24-v1`.
3. Selecionar de modo determinístico e limitar a cinco URLs por domínio registrável e classe, para evitar concentração excessiva em poucos domínios.
4. Guardar `auditoria.json` com contagens de exclusão e composição das partições. O avaliador consome exportações separadas com `url<TAB>rotulo`.
5. Não abrir URLs de phishing. Se algum link for usado apenas como texto em tabelas ou logs, evitar que vire hiperlink clicável no relatório público.

Captura e processamento: 24/10/2026. SHA-256 do ZIP UCI: `0A639FD03AEA6308C5B1C10C92AA23C2CE1505447A9137271865CD0BADC9A59A`. SHA-256 do CSV extraído: `A236549CD369CD80BD478FF8E1779CBF44C58D5C3F79F7A51A1ADBED7D06D1C6`. Versão da Public Suffix List: `2026-10-22_08-36-41_UTC`.

## 4. Elegibilidade e limpeza

- Aceitar somente URL absoluta HTTP(S), com host, até 4.096 caracteres, compatível com o analisador do projeto. Rejeitar URLs locais, loopback, domínios reservados para demonstração e entradas que não possam receber domínio registrável confiável.
- Manter a URL original para a análise. Criar uma chave canônica **apenas** para deduplicação por meio do parser WHATWG `URL` do Node.js (`href`), que normaliza protocolo, host, porta padrão e certos componentes do caminho. Essa regra deve ser registrada porque pode reunir textos originalmente diferentes. Duplicatas normalizadas contam uma vez.
- Excluir conflitos em que a mesma chave canônica receba os dois rótulos e domínios registráveis que contenham ambos os rótulos. Não usar a pontuação das sete regras para limpar os dados.
- Extrair domínio registrável com uma versão congelada da [Public Suffix List](https://publicsuffix.org/list/), registrando arquivo, data e SHA-256. Em caso de host IP ou extração incerta, excluir da avaliação agrupada e contar separadamente; não substituir eTLD+1 por “últimas duas partes”.
- Publicar uma tabela de fluxo: recebidas, inválidas, duplicadas, conflitos, exclusões por domínio/limite e amostra final, por classe e fonte.

Fluxo observado: 235.795 registros na fonte; 1.384 URLs inválidas/incompatíveis; 877 duplicatas; um conflito de rótulo da mesma URL; 604 registros de domínios com rótulos opostos excluídos; 232.928 URLs elegíveis. A seleção final contém 500 URLs por classe e 1.000 no total. Os números pormenorizados e as divisões constam em `dados/processados/phiusiil-v1/auditoria.json`.

## 5. Partições e prevenção de vazamento

O conjunto foi separado por **domínio registrável**, mantendo todas as URLs de um domínio na mesma partição: desenvolvimento 579 URLs (285 phishing; 294 legítimas), validação 193 (105; 88) e teste final 228 (110; 118). As proporções aproximam 60/20/20 porque cada domínio é indivisível. O teste final permaneceu reservado até que regras e parâmetros fossem congelados.

Foram examinadas as 81.920 combinações de pesos inteiros 0 a 3 e limiares 1 a 5 usando somente desenvolvimento e validação. A ordenação priorizou F1 no desenvolvimento e usou F1 na validação, taxa de falsos positivos e proximidade dos pesos originais como desempate. A configuração congelada manteve os pesos `3,3,2,2,1,1,1` e reduziu o limiar de 3 para 1. O teste final comparou as duas configurações uma única vez; os resultados estão em `dados/processados/phiusiil-v1/resultado-final.json`. A comparação entre divisão aleatória e agrupada, anteriormente prevista como H2, não foi executada e fica como trabalho futuro. Se mudar critérios após ver o teste final, registrar a mudança e obter um novo conjunto final.

## 6. Relato e limitações

Considerar `score >= limiar` como previsão positiva de phishing. Reportar VP, FP, VN, FN, precisão, revocação, F1 e taxa de falsos positivos com os denominadores e valores absolutos. Mostrar desempenho por fonte, por partição e exemplos de erros sem links ativos. Intervalos de confiança exigem um procedimento declarado que respeite a dependência entre URLs do mesmo domínio (por exemplo, reamostragem por domínio), além de informar sua incerteza.

Uma amostra equilibrada de pesquisa **não** permite interpretar precisão como taxa esperada de acerto na navegação real, onde a prevalência de phishing é diferente. O conjunto PhiUSIIL é de 2024 e seus rótulos não foram revalidados; diferenças de fonte, período e composição limitam a generalização para URLs atuais. Ausência de sinais não demonstra segurança; o estudo não avalia conteúdo de página, redirecionamentos, DNS nem pessoas usuárias.

## 7. Pendências de relato

- O artigo deve incluir a matriz de confusão e as métricas do teste final, com discussão dos 36 casos de phishing sem sinais e dos três falsos positivos.
- `docs/AVALIACAO.md` ainda descreve um roteiro com participantes que não foi realizado nesta avaliação computacional; tratá-lo como proposta separada, não como resultado do TCC.
- O teste final da configuração calibrada com limiar 1 foi feito offline. Após a avaliação, o mesmo limiar foi aplicado às duas versões da API usadas pela extensão demonstrativa; essa atualização não altera os resultados históricos do teste final.
