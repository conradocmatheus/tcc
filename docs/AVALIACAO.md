# Como avaliar a demo do TCC

O trabalho tem **duas perguntas diferentes**: (1) as regras distinguem URLs de phishing de URLs legítimas? (2) as pessoas entendem o alerta e sabem o que fazer? A página fictícia da demo apenas mostra que o código funciona; não responde a nenhuma das duas.

## 1. Testar as regras e os pontos

1. Monte uma planilha com URLs **rotuladas por uma fonte independente**. Para phishing, uma opção é o conjunto de entradas verificadas do [PhishTank](https://phishtank.org/developer_info.php). Para legítimas, uma lista de sites populares, como a [Tranco](https://tranco-list.eu/), pode servir de ponto de partida; confirme o rótulo e registre as limitações da fonte. Registre data, origem e critérios de seleção. Não abra URLs suspeitas: o avaliador lê somente o texto.
2. Inclua exemplos variados, inclusive URLs legítimas com `login`, HTTP, IP ou caminhos longos. Remova duplicatas. Separe **antes de ajustar pesos** dois conjuntos: desenvolvimento (para escolher pesos e limites) e teste final (para medir o resultado). Evite que URLs do mesmo site apareçam nos dois conjuntos.
3. Salve cada conjunto como TSV UTF-8 com o cabeçalho `url<TAB>rotulo` e rótulos `phishing` ou `legitima`. Exemplo de formato, **não de evidência**: `https://example.com/<TAB>legitima`.
4. Na pasta do projeto, execute `node tests/avaliar-urls.cjs dados/desenvolvimento.tsv`. O relatório mostra acertos, falsos alertas, casos perdidos, precisão e taxa de detecção para o limiar informado (3 por padrão). Também mostra quantas vezes cada regra aparece em cada classe. O limite **1** foi o calibrado e medido no experimento original; **2** é o limiar cotidiano atual da extensão; **3** é o limiar original preservado para comparação histórica. Para escolher um limiar, use desenvolvimento e validação, preservando um novo teste independente.
5. Discuta cada peso. Exemplo: se o sinal `terms` aparece muito em URLs legítimas, +1 pode ser razoável ou ainda alto; se uma regra não ajuda a separar os grupos, teste peso 0. Para simular outra combinação, passe um JSON com as sete regras e pesos inteiros: `node tests/avaliar-urls.cjs dados/desenvolvimento.tsv dados/pesos-alternativos.json`. Isso **não muda a API**, só simula o resultado. Compare também os limites; escolha um compromisso explícito entre phishing perdido e falso alerta.
6. Depois de fixar pesos e limites, rode **uma vez** no conjunto de teste final e relate os números e a composição da amostra. Se alterar as regras após ver esse resultado, prepare outro conjunto final. A [definição de precisão, detecção e matriz de confusão](https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall) ajuda a interpretar os números.

O score **não é uma porcentagem de risco**. Mesmo um bom resultado nessa amostra não prova que todo site futuro será detectado. URLs locais como `127.0.0.1` devem ficar fora da avaliação de eficácia: a página fictícia da demo é legítima e recebe 5 pontos de propósito.

## 2. Testar se o alerta é compreensível

Mostre a participantes do público que o TCC pretende atender **três capturas da extensão** (0, 1 e 2+ pontos; cada faixa tem uma categoria distinta), em ordem alternada. Use páginas fictícias e não peça que abram links suspeitos. Antes de explicar a interface, peça que respondam, com as próprias palavras:

1. “O que este aviso diz sobre o endereço?”
2. “O que fez aparecer esse resultado?”
3. “O que você faria antes de informar uma senha?”
4. “Se aparecer ‘nenhuma ameaça conhecida’, isso garante que o site é seguro?”

Defina a correção **antes** das sessões: a resposta deve identificar o nível de cautela, citar pelo menos um motivo exibido, escolher uma ação coerente (por exemplo, conferir o endereço por canal oficial) e reconhecer que pontuação 0 não garante segurança. Registre, por cenário, quantas pessoas acertaram cada item, o tempo para responder e as palavras que causaram confusão. Não conte “gostei da tela” como compreensão.

Faça primeiro um piloto pequeno para corrigir perguntas confusas. No estudo, obtenha consentimento, evite coletar senhas/dados pessoais e reporte o perfil geral dos participantes e a quantidade observada. Se a alegação do TCC for que a ferramenta **melhora** a compreensão, compare o desempenho com um aviso comum ou uma versão sem explicações, com cenários equivalentes e ordem alternada. Um teste só com a demo sustenta uma conclusão mais limitada: como os participantes interpretaram **esta interface**. A [W3C recomenda envolver usuários reais em tarefas específicas](https://www.w3.org/WAI/test-evaluate/involving-users/) e combinar isso com revisão de acessibilidade.

## Resultado a apresentar ao professor

Mostre uma tabela de desempenho das URLs, exemplos de falsos alertas e casos perdidos, mais outra tabela com os acertos nas quatro perguntas de compreensão. Isso transforma “a demo parece boa” em evidência mensurável, com limites declarados.
