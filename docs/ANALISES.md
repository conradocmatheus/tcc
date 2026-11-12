# Análises da demo de phishing

## Escopo atual

A extensão oferece duas opções após o clique do usuário. A primeira envia somente a URL da aba à API local. A segunda solicita novamente o HTML da URL da aba, envia URL e HTML à API local e examina os destinos de links `href` do código recebido, sem executar scripts. A página inicial em `http://127.0.0.1:5000/` demonstra apenas a análise de URL. A extensão não consulta bases de ameaças, não faz DNS e não bloqueia a navegação. O HTML pode diferir da página já carregada; links inseridos por scripts depois do carregamento não entram nesta análise.

A API aceita uma URL absoluta `http://` ou `https://` com até 4.096 caracteres. Entradas inválidas retornam erro 400, sem classificação. Uma URL válida recebe pontos conforme a tabela. Cada regra só pontua uma vez.

Na opção URL + HTML, todos os `href` navegáveis do HTML recebido são examinados. Um ponto adicional, no máximo, é concedido quando algum link aponta para outro domínio registrável e a URL de destino atinge pelo menos dois pontos nas regras lexicais. O aviso prioriza links marcados como botões por `role`, classe ou elemento `<button>`. Um link externo, isoladamente, não pontua. A classificação cotidiana usa a soma dos pontos da URL e do eventual sinal de HTML.

| Sinal verificado | Condição exata no código | Pontos | Por que chama atenção | Limitação |
|---|---|---:|---|---|
| IP como endereço do site | O host é reconhecido como IPv4 ou IPv6 | 3 | É menos fácil reconhecer o responsável pelo site | Serviços legítimos também podem usar IP |
| Informações antes de `@` | A URL tem usuário ou senha antes do host | 3 | O texto antes de `@` pode confundir sobre o destino real | Alguns sistemas legítimos usam esse formato |
| Domínio internacional codificado | O host contém `xn--` | 2 | Caracteres parecidos podem dificultar a leitura do domínio | Domínios internacionais legítimos também usam essa codificação |
| Muitas partes no host | O host tem **cinco ou mais** partes separadas por ponto | 2 | Pode ficar difícil identificar o domínio principal | A regra não reconhece sufixos como `com.br` e pode contar errado |
| URL longa | O texto recebido tem **mais de 120 caracteres** | 1 | Pode esconder o trecho que identifica o destino | Links legítimos com parâmetros costumam ser longos |
| Termos de acesso/verificação | Host ou caminho contém `login`, `verificacao`, `verify`, `senha`, `password`, `conta`, `account` ou `atualizacao`, sem diferenciar maiúsculas | 1 | Esses termos são comuns em páginas que pedem credenciais | Páginas legítimas também os usam; a busca aceita partes de palavras |
| HTTP | O protocolo é `http:` | 1 | A conexão não tem a proteção de transporte do HTTPS | HTTP isoladamente não indica phishing; HTTPS não confirma legitimidade |

**Observações sobre a entrada:** o programa considera o caminho da URL nas palavras-chave, mas não examina o conteúdo da página nem os parâmetros de consulta como sinais específicos. A consulta e o fragmento entram apenas na regra de comprimento. O resultado mostra cada sinal com seus pontos e a soma total.

### Classificação

| Pontuação total | Categoria exibida | Interpretação correta |
|---:|---|---|
| 0 | Nenhuma ameaça conhecida encontrada | Nenhuma **regra local** disparou. Não houve consulta a uma base de ameaças e isso não comprova segurança. |
| 1 | Atenção | Um sinal local foi encontrado; isso também pode ocorrer em sites legítimos. |
| 2 ou mais | Suspeita forte | Dois ou mais pontos foram encontrados; isso não confirma phishing. |

Exemplos fictícios para a apresentação, sem abrir os endereços:

| URL enviada à API | Pontos | Resultado |
|---|---:|---|
| `https://example.com/` | 0 | Nenhuma ameaça conhecida encontrada |
| `https://example.com/login` | 1 (termo) | Atenção; um único sinal não atinge o limiar cotidiano de 2 pontos |
| `http://login.verificacao.conta.exemplo.test/` | 4 (subdomínios + termo + HTTP) | Suspeita forte |
| `http://127.0.0.1:5000/exemplo/login` | 5 (IP + termo + HTTP) | Suspeita forte; página local fictícia para testar a extensão |

O limiar cotidiano de dois pontos reserva “Suspeita forte” para pontuações maiores, mas não foi validado como solução para falsos positivos: no teste PhiUSIIL, os três casos legítimos que recebiam alerta com limiar 1 continuam recebendo com limiar 2. O limiar 1 permanece como configuração histórica da avaliação offline. O rótulo “Nenhuma ameaça conhecida encontrada” significa somente que nenhuma regra local disparou, não que o site seja seguro.

## O que implementar a seguir

| Prioridade | Análise / trabalho | Critério de conclusão | Dependência e cuidado |
|---|---|---|---|
| 1 | **Identificar o domínio registrável** com a Public Suffix List e destacar esse domínio na interface | `exemplo.com.br` e `exemplo.co.uk` são distinguidos de seus subdomínios; a regra de “muitas partes” passa a contar subdomínios reais | Precisa manter uma cópia atualizada da lista. A [Public Suffix List](https://publicsuffix.org/list/) descreve sufixos como `com` e `co.uk`. |
| 2 | **Avaliar as regras com uma amostra rotulada e fixa** de URLs benignas e de phishing, sem visitar os sites | Registrar matriz de confusão, precisão, revocação, F1 e exemplos de falsos positivos; ajustar pesos e limites com base nos resultados | Não tratar a pontuação atual como precisão medida. Documentar origem, período e licença dos dados. |
| 3 | **Verificar imitação de marcas** usando uma lista pequena de nomes e domínios oficiais definidos para a pesquisa | Alertar quando uma marca aparece em domínio registrável diferente do oficial; explicar qual parte do endereço causou o alerta | Exige lista mantida e testes de falsos positivos; palavra em caminho isoladamente não deve bastar. |
| 4 | **Consultar reputação conhecida**, opcionalmente via Google Safe Browsing v5 | Mostrar “correspondência encontrada”, “sem correspondência” ou “consulta indisponível” separadamente das heurísticas; indisponibilidade nunca vira resultado favorável | Requer chave, internet, tratamento de limite/cache e análise de privacidade, pois a URL é enviada ao serviço. A [API v5](https://developers.google.com/safe-browsing/reference/rest/v5/urls/search) pesquisa URLs em listas de ameaças conhecidas; resposta vazia não garante segurança. |

**Sequência sugerida para o TCC:** corrigir a identificação do domínio, medir os erros das regras atuais e só então acrescentar novos sinais. A consulta de reputação pode ser uma etapa separada, com saída própria, para não misturar “sinal heurístico” com “ameaça conhecida em uma lista”.

## Fora da demo atual

Bloqueio automático, inspeção do conteúdo da página, redirecionamentos, DNS, idade do domínio, aprendizado de máquina e testes com usuários não estão implementados. Cada um amplia o escopo e precisaria de método e avaliação próprios antes de sustentar qualquer afirmação de eficácia. A interface atual pode ser avaliada por clareza e acessibilidade sem afirmar que reduz golpes no mundo real.
