# Comparação exploratória do limiar 2

Data: 11 de novembro de 2026.

Esta comparação foi solicitada depois da análise do teste final. Portanto, é uma análise exploratória *post hoc*, não uma nova calibração nem uma confirmação independente. Foram mantidas as sete regras, os pesos originais (3, 3, 2, 2, 1, 1 e 1), as partições já congeladas e a previsão positiva quando a pontuação é maior ou igual ao limiar. Nenhuma URL foi visitada.

| Partição | Limiar | VP | FN | FP | VN | Precisão | Revocação | F1 | Taxa de FP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Validação (193 URLs) | 1 | 54 | 51 | 2 | 86 | 96,43% | 51,43% | 67,08% | 2,27% |
| Validação (193 URLs) | 2 | 9 | 96 | 2 | 86 | 81,82% | 8,57% | 15,52% | 2,27% |
| Validação (193 URLs) | 3 | 3 | 102 | 0 | 88 | 100,00% | 2,86% | 5,56% | 0,00% |
| Teste (228 URLs) | 1 | 74 | 36 | 3 | 115 | 96,10% | 67,27% | 79,14% | 2,54% |
| Teste (228 URLs) | 2 | 11 | 99 | 3 | 115 | 78,57% | 10,00% | 17,74% | 2,54% |
| Teste (228 URLs) | 3 | 4 | 106 | 0 | 118 | 100,00% | 3,64% | 7,02% | 0,00% |

No teste, mudar de 1 para 2 pontos retirou 63 verdadeiros positivos sem retirar nenhum dos três falsos positivos. Os três endereços legítimos que receberam alerta tinham pontuação 2; nenhum legítimo da amostra tinha pontuação 1. O F1 caiu 61,40 pontos percentuais. Na validação ocorreu o mesmo padrão: dois falsos positivos com pontuação 2 permaneceram, enquanto 45 verdadeiros positivos com pontuação 1 deixaram de ser identificados.

**Interpretação:** nesta amostra PhiUSIIL, o limiar 2 não resolveu os falsos alertas e prejudicou fortemente a revocação. Isso não demonstra que o limiar 2 seria inútil na navegação cotidiana: URLs legítimas com apenas 1 ponto, como as relatadas informalmente em sites conhecidos, não estão representadas na validação ou no teste. Para avaliar o uso cotidiano, é preciso uma amostra externa rotulada, incluindo páginas legítimas variadas, com protocolo definido antes da medição.

A extensão passou a usar limiar 2 para a categoria Suspeita forte e Atenção para 1 ponto. Essa política de apresentação deve ser identificada separadamente do limiar 1 avaliado no artigo. As métricas publicadas para o limiar 1 não descrevem automaticamente o uso cotidiano da extensão.

Reprodução, a partir da raiz do projeto, com Node.js:

```powershell
node -e "const {loadRows,evaluate,BASELINE}=require('./tests/avaliar-urls.cjs'); for(const nome of ['validacao','teste']){const linhas=loadRows('dados/processados/phiusiil-v1/'+nome+'.tsv'); for(const limiar of [1,2,3]){const r=evaluate(linhas,BASELINE,limiar); console.log(nome,limiar,r.confusion,r.metrics);}}"
```
