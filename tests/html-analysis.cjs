const assert = require("node:assert/strict");
const { analyzeUrl, analyzePage } = require("../backend/server");

const page = "https://exemplo.com/";
const ordinary = '<a href="https://pagamento.example.org/">Pagar</a>';
const externalWithSignal = '<a href="http://login.conta.example.org/" role="button">Acessar</a>';
const relative = '<a href="/login">Entrar</a>';

assert.equal(analyzeUrl(page).score, 0);

const internal = analyzePage(page, relative);
assert.equal(internal.score, 0);
assert.equal(internal.htmlAnalysis.externalLinks, 0);

const safeExternal = analyzePage(page, ordinary);
assert.equal(safeExternal.score, 0);
assert.equal(safeExternal.htmlAnalysis.externalLinks, 1);

const suspicious = analyzePage(page, externalWithSignal);
assert.equal(suspicious.mode, "url_html");
assert.equal(suspicious.urlScore, 0);
assert.equal(suspicious.htmlScore, 1);
assert.equal(suspicious.classification, "atencao");
assert.equal(suspicious.htmlAnalysis.buttonLinks, 1);
assert.match(suspicious.signals[0].reason, /link de botão/);

const combined = analyzePage("https://exemplo.com/login", externalWithSignal);
assert.equal(combined.urlScore, 1);
assert.equal(combined.htmlScore, 1);
assert.equal(combined.classification, "suspeita_forte");

assert.equal(analyzePage(page, '<a href="javascript:alert(1)">Não navegável</a>').htmlAnalysis.navigableLinks, 0);
assert.equal(analyzePage(page, "x".repeat(2_000_001)), null);
console.log("Leitura estática dos href e combinação com a URL: OK");
