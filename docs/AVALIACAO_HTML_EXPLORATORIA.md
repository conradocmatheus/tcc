# Avaliação exploratória da análise URL + HTML

Data: 12 de novembro de 2026. Esta etapa foi concebida depois de conhecidos os resultados do experimento PhiUSIIL. Seus números não substituem o teste original nem confirmam uma hipótese pré-registrada.

## Fonte e unidade de análise

Foi usada a amostra pública *Full-snippet* do [LNU-Phish](https://lnu-phish.github.io/), cuja coleta ocorreu em 2019. O arquivo publicado pelos autores contém URL, rótulo e HTML arquivado para cada página. O SHA-256 do arquivo baixado (`LNU-Phish_snippet.zip`) foi `9228DB6D8CE2FFB9870BA3425003C8D79392B1EE416295BEA1122709311986B0`, igual ao valor publicado na página da fonte. O arquivo anuncia 100 amostras, mas os cinco JSON de páginas contêm **99 registros**: 40 rotulados como phishing (`mal`) e 59 como legítimos (`ben`). Todos os 99 tinham HTML e status HTTP 200 no registro. Nenhum endereço da base foi aberto durante a avaliação.

O protocolo de comparação aplicou às mesmas páginas: **A**, pontuação das sete regras da URL; **B**, a mesma pontuação mais, no máximo, um ponto quando o HTML arquivado contém um `href` externo cujo destino alcança pelo menos dois pontos nas regras de URL. Todos os `href` navegáveis foram examinados; links marcados como botões tiveram prioridade na explicação. Domínios registráveis foram comparados com a cópia congelada da Public Suffix List. A regra nova foi definida antes de executar esta avaliação. Os limiares 1 e 2 são apresentados separadamente.

## Limitação de protocolo na fonte

As **59 URLs legítimas estão sem `http://` ou `https://`** no arquivo original. Para analisá-las como URLs absolutas, foi necessário acrescentar um protocolo presumido. Como isso altera diretamente a regra HTTP, a comparação principal abaixo **retira o ponto de HTTP das duas configurações**. Ela compara o efeito incremental do HTML, mas não é uma réplica exata das sete regras do PhiUSIIL. Uma análise de sensibilidade com `https://` presumido para as URLs sem protocolo está indicada em seguida. Usar `http://` presumido faz todas as 59 URLs legítimas receberem ao menos um ponto de HTTP; por isso, o protocolo desconhecido impede uma conclusão firme sobre o desempenho real.

## Resultados sem o ponto de HTTP da página

| Limiar | Configuração | VP | FN | FP | VN | Precisão | Revocação | F1 | Taxa de FP |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | A: URL | 18 | 22 | 0 | 59 | 100,00% | 45,00% | 62,07% | 0,00% |
| 1 | B: URL + HTML | 22 | 18 | 1 | 58 | 95,65% | 55,00% | 69,84% | 1,69% |
| 2 | A: URL | 9 | 31 | 0 | 59 | 100,00% | 22,50% | 36,73% | 0,00% |
| 2 | B: URL + HTML | 11 | 29 | 0 | 59 | 100,00% | 27,50% | 43,14% | 0,00% |

Com limiar 1, a inclusão do HTML identificou quatro phishings adicionais e alertou uma página legítima. Com limiar 2, identificou dois phishings adicionais sem falso alerta adicional nesta amostra. O indicador novo apareceu em nove páginas rotuladas como phishing e uma legítima. Foram identificados 6.435 links navegáveis, dos quais 1.735 apontavam para outros domínios registráveis e 111 tinham marcação de botão.

## Sensibilidade: `https://` presumido e regra HTTP mantida

| Limiar | Configuração | VP | FN | FP | VN | F1 |
|---|---|---:|---:|---:|---:|---:|
| 1 | A: URL | 29 | 11 | 0 | 59 | 84,06% |
| 1 | B: URL + HTML | 30 | 10 | 1 | 58 | 84,51% |
| 2 | A: URL | 15 | 25 | 0 | 59 | 54,55% |
| 2 | B: URL + HTML | 19 | 21 | 0 | 59 | 64,41% |

A conclusão qualitativa desta amostra — ganho limitado de revocação, com possível falso positivo — não depende apenas dessa imputação. Os valores absolutos das métricas, porém, mudam bastante quando a regra HTTP é mantida ou retirada. Não se deve apresentar a H3 como confirmada com esta amostra pequena, antiga e com protocolo ausente nas URLs legítimas.

O tempo local medido no mesmo processo foi de aproximadamente 0,003 ms por URL para a análise lexical e 0,52 ms por página para URL + HTML (medianas). Esse número cobre apenas processamento após o HTML estar disponível; **não inclui download da página**, que pode dominar a espera da pessoa na extensão. Deve ser tratado como medição exploratória da implementação, não como tempo de navegação.

## Reproduzir

1. Baixar o *Full-snippet* do [LNU-Phish](https://lnu-phish.github.io/) e conferir o SHA-256 publicado pelos autores.
2. Extrair os cinco arquivos JSON de páginas com a senha publicada na mesma página, sem executar ou visitar o conteúdo HTML.
3. Instalar as dependências fixadas do projeto com `npm ci`.
4. Executar `node scripts/avaliar-lnu-html.cjs CAMINHO_DA_PASTA_EXTRAIDA https`. Repetir com `http` para a análise de sensibilidade.

Para uma avaliação conclusiva da nova camada, obter uma base maior e recente que associe cada URL rotulada ao HTML bruto correspondente e preserve o protocolo original. Congelar as regras e a divisão antes de consultar o novo conjunto final.
