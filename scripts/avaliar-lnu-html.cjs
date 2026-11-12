// Avaliação externa exploratória em HTML arquivado. Não visita nenhum endereço.
// Uso: node scripts/avaliar-lnu-html.cjs pasta-extraida [https|http]
const fs = require("node:fs");
const path = require("node:path");
const { analyzeUrl, analyzePage } = require("../backend/server");

function findSamples(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  return files.flatMap(item => {
    const filename = path.join(dir, item.name);
    if (item.isDirectory()) return findSamples(filename);
    return item.name.endsWith(".json") && !item.name.endsWith("_features.json") ? [filename] : [];
  });
}

function metrics(confusion) {
  const { vp, fp, vn, fn } = confusion;
  const ratio = (n, d) => d ? n / d : 0;
  return {
    precision: ratio(vp, vp + fp),
    recall: ratio(vp, vp + fn),
    f1: ratio(2 * vp, 2 * vp + fp + fn),
    falsePositiveRate: ratio(fp, fp + vn)
  };
}

function evaluate(rows, threshold, field) {
  const confusion = { vp: 0, fp: 0, vn: 0, fn: 0 };
  for (const row of rows) {
    const positive = row[field] >= threshold;
    const cell = row.label === "mal" ? (positive ? "vp" : "fn") : (positive ? "fp" : "vn");
    confusion[cell]++;
  }
  return { confusion, metrics: metrics(confusion) };
}

function timing(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * 0.95)] };
}

function main() {
  const [directory, assumedScheme = "https"] = process.argv.slice(2);
  if (!directory || !["http", "https"].includes(assumedScheme)) {
    throw Error("Uso: node scripts/avaliar-lnu-html.cjs pasta-extraida [https|http]");
  }
  const files = findSamples(directory).sort();
  if (!files.length) throw Error("Nenhum arquivo JSON de páginas encontrado");
  const rows = [];
  let missingScheme = 0, invalid = 0;
  const urlTimes = [], combinedTimes = [];
  for (const file of files) {
    for (const item of JSON.parse(fs.readFileSync(file, "utf8"))) {
      if (!["ben", "mal"].includes(item.label) || typeof item.URL !== "string" || typeof item.HTML !== "string") {
        invalid++; continue;
      }
      const hasScheme = /^https?:\/\//i.test(item.URL);
      const url = hasScheme ? item.URL : `${assumedScheme}://${item.URL}`;
      if (!hasScheme) missingScheme++;
      const urlStart = performance.now();
      const lexical = analyzeUrl(url);
      urlTimes.push(performance.now() - urlStart);
      const combinedStart = performance.now();
      const combined = analyzePage(url, item.HTML);
      combinedTimes.push(performance.now() - combinedStart);
      if (!lexical || !combined) { invalid++; continue; }
      const pageHttp = lexical.signals.some(signal => signal.id === "http") ? 1 : 0;
      rows.push({ label: item.label, urlScore: lexical.score, combinedScore: combined.score,
        urlWithoutHttp: lexical.score - pageHttp, combinedWithoutHttp: combined.score - pageHttp,
        htmlScore: combined.htmlScore, links: combined.htmlAnalysis });
    }
  }
  const report = {
    source: "LNU-Phish full-snippet (2019); HTML arquivado, sem acesso às URLs.",
    files: files.map(file => path.basename(file)),
    total: rows.length,
    classCounts: { phishing: rows.filter(x => x.label === "mal").length, legitima: rows.filter(x => x.label === "ben").length },
    missingScheme,
    assumedScheme,
    invalid,
    htmlSignalCount: rows.filter(x => x.htmlScore > 0).length,
    htmlSignalByClass: {
      phishing: rows.filter(x => x.label === "mal" && x.htmlScore > 0).length,
      legitima: rows.filter(x => x.label === "ben" && x.htmlScore > 0).length
    },
    linksSummary: {
      navigable: rows.reduce((sum, x) => sum + x.links.navigableLinks, 0),
      external: rows.reduce((sum, x) => sum + x.links.externalLinks, 0),
      button: rows.reduce((sum, x) => sum + x.links.buttonLinks, 0)
    },
    localProcessingTime: { url: timing(urlTimes), urlPlusHtml: timing(combinedTimes) },
    results: Object.fromEntries([1, 2].map(threshold => [threshold, {
      url: evaluate(rows, threshold, "urlScore"),
      urlPlusHtml: evaluate(rows, threshold, "combinedScore"),
      urlWithoutHttp: evaluate(rows, threshold, "urlWithoutHttp"),
      urlPlusHtmlWithoutHttp: evaluate(rows, threshold, "combinedWithoutHttp")
    }]))
  };
  console.log(JSON.stringify(report, null, 2));
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
