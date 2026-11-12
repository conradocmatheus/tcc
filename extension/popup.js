const API_URL = "http://127.0.0.1:5000/api/analyze";
const button = document.getElementById("analyze");
const pageButton = document.getElementById("analyze-page");
const site = document.getElementById("site");
const result = document.getElementById("result");
let currentUrl = null;

function showMessage(message) {
  result.className = "result";
  result.replaceChildren();
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  result.append(paragraph);
}

function addText(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  result.append(element);
}

function showAnalysis(data) {
  const styles = {
    suspeita_forte: "strong",
    atencao: "caution",
    nenhuma_ameaca_conhecida: "clear"
  };
  result.className = `result ${styles[data.classification] || ""}`;
  result.replaceChildren();
  addText("p", data.mode === "url_html" ? "Análise da URL e dos links no HTML" : "Análise somente da URL");
  addText("h2", data.title);
  if (Number.isInteger(data.score)) {
    addText("p", `Pontuação total: ${data.score} ${data.score === 1 ? "ponto" : "pontos"}`, "score");
  }

  if (Array.isArray(data.signals) && data.signals.length) {
    addText("h3", "Sinais encontrados");
    const list = document.createElement("ul");
    list.className = "signal-list";
    for (const signal of data.signals) {
      const item = document.createElement("li");
      const reason = document.createElement("span");
      reason.textContent = signal.reason;
      const points = document.createElement("strong");
      points.className = "points";
      points.textContent = `+${signal.points} ${signal.points === 1 ? "ponto" : "pontos"}`;
      item.append(reason, points);
      list.append(item);
    }
    result.append(list);
  } else {
    addText("p", data.reasons[0]);
  }
  addText("p", data.recommendation);
  if (data.htmlAnalysis) {
    const info = data.htmlAnalysis;
    addText("p", `HTML: ${info.navigableLinks} links navegáveis, ${info.buttonLinks} em botões e ${info.externalLinks} para outros domínios.`);
  }
  addText("p", data.limitation, "limitation");
}

async function readHtml() {
  const response = await fetch(currentUrl, { credentials: "omit", cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    throw new Error("A página não forneceu HTML.");
  }
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > 2_000_000) throw new Error("O HTML é muito grande para esta demonstração.");
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error("O HTML é muito grande para esta demonstração.");
  return html;
}

async function analyze(withHtml = false) {
  if (!currentUrl) return;
  button.disabled = true;
  pageButton.disabled = true;
  showMessage(withHtml ? "Lendo os links do HTML…" : "Analisando o endereço…");

  try {
    let html;
    let htmlUnavailable = false;
    if (withHtml) {
      try { html = await readHtml(); }
      catch { htmlUnavailable = true; }
    }
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(html === undefined ? { url: currentUrl } : { url: currentUrl, html })
    });
    if (!response.ok) throw new Error("A API não conseguiu analisar este endereço.");
    showAnalysis(await response.json());
    if (htmlUnavailable) addText("p", "Não foi possível obter o HTML desta página; o resultado acima usa apenas a URL.");
  } catch {
    showMessage("Não foi possível conectar à API local. Inicie a API e tente novamente.");
  } finally {
    button.disabled = false;
    pageButton.disabled = false;
  }
}

async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error("Sem endereço disponível");
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      site.textContent = "Página interna do navegador";
      showMessage("Abra um site HTTP ou HTTPS para analisar.");
      return;
    }
    currentUrl = tab.url;
    site.textContent = url.hostname;
    button.disabled = false;
    pageButton.disabled = false;
    showMessage("Pronto para analisar. Clique no botão acima.");
  } catch {
    site.textContent = "Endereço indisponível";
    showMessage("Não foi possível ler a aba. Abra um site comum e tente novamente.");
  }
}

button.addEventListener("click", () => analyze(false));
pageButton.addEventListener("click", () => analyze(true));
loadCurrentTab();
