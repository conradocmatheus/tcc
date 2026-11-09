const http = require("node:http");
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = 5000;
const LIMITATION = "Esta demo usa apenas regras locais, não consulta bases de ameaças e não garante que o site seja seguro.";
const TERMS = ["login", "verificacao", "verify", "senha", "password", "conta", "account", "atualizacao"];
const EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/i;
const HOME_PAGE = fs.readFileSync(path.join(__dirname, "index.html"));
const EXAMPLE_PAGE = fs.readFileSync(path.join(__dirname, "example.html"));

function analyzeUrl(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 4096) {
    return null;
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return null;

  const signals = [];
  const addSignal = (id, reason, points) => signals.push({ id, reason, points });
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (net.isIP(host.replace(/^\[|\]$/g, ""))) {
    addSignal("ip_host", "O endereço usa um número IP no lugar de um nome de site.", 3);
  }
  if (url.username || url.password) {
    addSignal("userinfo", "O endereço contém informações antes de '@', que podem disfarçar o destino real.", 3);
  }
  if (host.includes("xn--")) {
    addSignal("punycode", "O nome do site contém caracteres internacionais codificados; confira o domínio com atenção.", 2);
  }
  // Regra simples para a demo: três ou mais partes antes das duas finais.
  if (host.split(".").filter(Boolean).length >= 5) {
    addSignal("subdomains", "O endereço tem muitos subdomínios, o que pode dificultar identificar o site principal.", 2);
  }
  if (input.length > 120) {
    addSignal("length", "O endereço é muito longo e pode esconder partes importantes.", 1);
  }
  if (TERMS.some(term => host.includes(term) || path.includes(term))) {
    addSignal("terms", "O endereço usa palavras relacionadas a acesso, senha ou verificação.", 1);
  }
  if (url.protocol === "http:") {
    addSignal("http", "A conexão usa HTTP, sem a proteção de transporte do HTTPS.", 1);
  }

  const score = signals.reduce((total, signal) => total + signal.points, 0);
  const details = {
    score,
    signals,
    reasons: signals.length
      ? signals.map(signal => signal.reason)
      : ["Nenhum dos sinais locais definidos nesta demo foi identificado."],
    limitation: LIMITATION
  };

  if (score >= 1) {
    return {
      classification: "suspeita_forte",
      title: "Suspeita forte",
      recommendation: "Evite informar dados pessoais. Confirme o endereço por um canal oficial.",
      ...details
    };
  }
  return {
    classification: "nenhuma_ameaca_conhecida",
    title: "Nenhuma ameaça conhecida encontrada",
    recommendation: "Continue atento ao conteúdo e confirme o endereço quando houver dúvida.",
    ...details
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function createServer() {
  return http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && EXTENSION_ORIGIN.test(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    if (request.method === "OPTIONS" && request.url === "/api/analyze") {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }
    if (request.method === "GET" && request.url === "/") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(HOME_PAGE);
      return;
    }
    if (request.method === "GET" && request.url === "/exemplo/login") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(EXAMPLE_PAGE);
      return;
    }
    if (request.method !== "POST" || request.url !== "/api/analyze") {
      sendJson(response, 404, { error: "Rota não encontrada." });
      return;
    }

    const chunks = [];
    let bytes = 0;
    let tooLarge = false;
    try {
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 8192) tooLarge = true;
        if (!tooLarge) chunks.push(chunk);
      }
      if (tooLarge) {
        sendJson(response, 413, { error: "Requisição muito grande." });
        return;
      }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const result = analyzeUrl(data?.url);
      if (!result) {
        sendJson(response, 400, { error: "Informe uma URL absoluta HTTP ou HTTPS válida, com até 4096 caracteres." });
        return;
      }
      sendJson(response, 200, result);
    } catch {
      if (!response.headersSent) sendJson(response, 400, { error: "Envie um JSON válido." });
    }
  });
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`API local em http://${HOST}:${PORT}`);
  });
}

module.exports = { analyzeUrl, createServer };
