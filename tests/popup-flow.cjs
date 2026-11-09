// Executar sem servidor prévio: node tests/popup-flow.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { analyzeUrl, createServer } = require("../backend/server");

function element() {
  return {
    textContent: "",
    className: "",
    disabled: false,
    children: [],
    listeners: {},
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; },
    addEventListener(name, handler) { this.listeners[name] = handler; }
  };
}

async function main() {
  const examples = [
    ["https://example.com/", 0, "nenhuma_ameaca_conhecida"],
    ["http://example.com/", 1, "suspeita_forte"],
    ["https://example.com/login", 1, "suspeita_forte"],
    ["http://login.verificacao.conta.exemplo.test/", 4, "suspeita_forte"],
    ["http://127.0.0.1:5000/exemplo/login", 5, "suspeita_forte"]
  ];
  for (const [url, score, classification] of examples) {
    const analysis = analyzeUrl(url);
    assert.equal(analysis.score, score);
    assert.equal(analysis.classification, classification);
    assert.equal(analysis.signals.reduce((total, signal) => total + signal.points, 0), score);
  }

  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await checkPopup(baseUrl);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function checkPopup(baseUrl) {
  const page = await fetch(`${baseUrl}/exemplo/login`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Site fictício para a demonstração/);

  const nodes = Object.fromEntries(["analyze", "site", "result"].map(id => [id, element()]));
  const document = {
    getElementById: id => nodes[id],
    createElement: element
  };
  const tabUrl = "http://127.0.0.1:5000/exemplo/login";
  const chrome = { tabs: { query: async () => [{ url: tabUrl }] } };
  const source = fs.readFileSync(path.join(__dirname, "../extension/popup.js"), "utf8");
  const localFetch = (url, options) => fetch(`${baseUrl}${new URL(url).pathname}`, options);
  vm.runInNewContext(source, { document, chrome, URL, fetch: localFetch });

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(nodes.site.textContent, "127.0.0.1");
  assert.equal(nodes.analyze.disabled, false);

  await nodes.analyze.listeners.click();
  assert.equal(nodes.result.className, "result strong");
  assert.equal(nodes.result.children[0].textContent, "Suspeita forte");
  assert.equal(nodes.result.children[1].textContent, "Pontuação total: 5 pontos");
  const list = nodes.result.children[3];
  assert.equal(list.children.length, 3);
  assert.deepEqual(Array.from(list.children, item => item.children[1].textContent),
    ["+3 pontos", "+1 ponto", "+1 ponto"]);
  assert.match(nodes.result.children.at(-1).textContent, /não garante que o site seja seguro/);
  console.log("Exemplos, página fictícia e popup → API → pontuação exibida: OK");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
