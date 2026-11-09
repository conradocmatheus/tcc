// Escolhe pesos/limiar usando somente desenvolvimento e validação.
// Nunca lê o arquivo de teste nem visita as URLs.
// Uso: node tests/calibrar-urls.cjs desenvolvimento.tsv validacao.tsv saida.json
const fs = require('node:fs');
const crypto = require('node:crypto');
const { RULES, BASELINE, loadRows, evaluate } = require('./avaliar-urls.cjs');

function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function patterns(rows) {
  const map = new Map();
  for (const row of rows) {
    const mask = RULES.reduce((n, id, i) => n | (row.signals.includes(id) ? 1 << i : 0), 0);
    const item = map.get(mask) || { mask, phishing: 0, legitima: 0 };
    item[row.label]++; map.set(mask, item);
  }
  return [...map.values()];
}
function matrix(items, weights, threshold) {
  const c = { vp: 0, fp: 0, vn: 0, fn: 0 };
  for (const item of items) {
    let score = 0;
    for (let i = 0; i < RULES.length; i++) if (item.mask & (1 << i)) score += weights[i];
    if (score >= threshold) { c.vp += item.phishing; c.fp += item.legitima; }
    else { c.fn += item.phishing; c.vn += item.legitima; }
  }
  return c;
}
function f1(c) { return (2 * c.vp + c.fp + c.fn) ? 2 * c.vp / (2 * c.vp + c.fp + c.fn) : 0; }
function fpr(c) { return (c.fp + c.vn) ? c.fp / (c.fp + c.vn) : 0; }
function better(a, b) {
  if (!b) return true;
  for (const [x, y, desc] of [
    [a.devF1, b.devF1, true], [a.valF1, b.valF1, true],
    [a.valFpr, b.valFpr, false], [a.devFpr, b.devFpr, false],
    [a.distance, b.distance, false], [Math.abs(a.threshold - 3), Math.abs(b.threshold - 3), false]
  ]) if (Math.abs(x - y) > 1e-12) return desc ? x > y : x < y;
  return a.code < b.code;
}
function main() {
  const [devFile, valFile, outputFile] = process.argv.slice(2);
  if (!devFile || !valFile || !outputFile || process.argv.length !== 5) throw Error('Uso: node tests/calibrar-urls.cjs desenvolvimento.tsv validacao.tsv saida.json');
  const dev = loadRows(devFile), val = loadRows(valFile);
  const seen = new Set(dev.map(r => r.url));
  if (val.some(r => seen.has(r.url))) throw Error('Há URLs repetidas entre desenvolvimento e validação');
  const dp = patterns(dev), vp = patterns(val), base = RULES.map(id => BASELINE[id]);
  let best = null;
  for (let code = 0; code < 4 ** RULES.length; code++) {
    let n = code;
    const weights = RULES.map(() => { const d = n % 4; n = Math.floor(n / 4); return d; });
    const distance = weights.reduce((sum, w, i) => sum + Math.abs(w - base[i]), 0);
    for (let threshold = 1; threshold <= 5; threshold++) {
      const dc = matrix(dp, weights, threshold), vc = matrix(vp, weights, threshold);
      const candidate = { code, weights, threshold, devF1: f1(dc), valF1: f1(vc), devFpr: fpr(dc), valFpr: fpr(vc), distance };
      if (better(candidate, best)) best = candidate;
    }
  }
  const weights = Object.fromEntries(RULES.map((id, i) => [id, best.weights[i]]));
  const result = {
    method: 'Busca exaustiva de 4^7 combinações de pesos (0..3) e cinco limiares (1..5). Ordenação: maior F1 no desenvolvimento; em empate, maior F1 na validação, menor FPR e menor distância dos pesos baseline.',
    files: { developmentSha256: sha256File(devFile), validationSha256: sha256File(valFile) },
    weights, threshold: best.threshold,
    development: evaluate(dev, weights, best.threshold),
    validation: evaluate(val, weights, best.threshold),
    baselineDevelopment: evaluate(dev, BASELINE, 3),
    baselineValidation: evaluate(val, BASELINE, 3)
  };
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ weights, threshold: best.threshold, devF1: best.devF1, valF1: best.valF1, devFpr: best.devFpr, valFpr: best.valFpr, outputFile }, null, 2));
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
