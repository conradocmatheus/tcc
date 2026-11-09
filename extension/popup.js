const API_URL = "http://127.0.0.1:5000/api/analyze";
const button = document.getElementById("analyze");
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
  addText("p", data.limitation, "limitation");
}

async function analyze() {
  if (!currentUrl) return;
  button.disabled = true;
  showMessage("Analisando o endereço…");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl })
    });
    if (!response.ok) throw new Error("A API não conseguiu analisar este endereço.");
    showAnalysis(await response.json());
  } catch {
    showMessage("Não foi possível conectar à API local. Inicie a API e tente novamente.");
  } finally {
    button.disabled = false;
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
    showMessage("Pronto para analisar. Clique no botão acima.");
  } catch {
    site.textContent = "Endereço indisponível";
    showMessage("Não foi possível ler a aba. Abra um site comum e tente novamente.");
  }
}

button.addEventListener("click", analyze);
loadCurrentTab();
