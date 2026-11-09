// Avalia URLs como texto; nunca visita os endereços.
// Uso: node tests/avaliar-urls.cjs arquivo.tsv [pesos.json] [limiar] [--json]
const fs = require('node:fs');
const crypto = require('node:crypto');
const { analyzeUrl } = require('../backend/server');

const RULES = ['ip_host', 'userinfo', 'punycode', 'subdomains', 'length', 'terms', 'http'];
const BASELINE = Object.freeze({ ip_host: 3, userinfo: 3, punycode: 2, subdomains: 2, length: 1, terms: 1, http: 1 });

function loadRows(filename) {
  const lines = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.shift()?.trim() !== 'url\trotulo') throw Error('Cabeçalho esperado: url<TAB>rotulo');
  const seen = new Set(), rows = [];
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    const fields = line.split('\t');
    if (fields.length !== 2 || !['phishing', 'legitima'].includes(fields[1])) throw Error(`Linha ${i + 2}: formato ou rótulo inválido`);
    if (seen.has(fields[0])) throw Error(`Linha ${i + 2}: URL repetida`);
    seen.add(fields[0]);
    const analysis = analyzeUrl(fields[0]);
    if (!analysis) throw Error(`Linha ${i + 2}: URL HTTP(S) inválida`);
    rows.push({ url: fields[0], label: fields[1], signals: analysis.signals.map(s => s.id) });
  }
  if (!rows.length) throw Error('A amostra está vazia');
  return rows;
}

function validateWeights(weights) {
  if (Object.keys(weights).sort().join() !== [...RULES].sort().join() || RULES.some(id => !Number.isInteger(weights[id]) || weights[id] < 0 || weights[id] > 3)) {
    throw Error('São exigidos os sete pesos inteiros de 0 a 3');
  }
  return weights;
}

function evaluate(rows, weights = BASELINE, threshold = 3) {
  validateWeights(weights);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 5) throw Error('Limiar deve ser inteiro de 1 a 5');
  const confusion = { vp: 0, fp: 0, vn: 0, fn: 0 };
  const signals = Object.fromEntries(RULES.map(id => [id, { phishing: 0, legitima: 0 }]));
  const scoreDistribution = { phishing: {}, legitima: {} };
  const errors = { fp: [], fn: [] };
  for (const row of rows) {
    const score = row.signals.reduce((sum, id) => sum + weights[id], 0);
    const predicted = score >= threshold, actual = row.label === 'phishing';
    const cell = actual ? (predicted ? 'vp' : 'fn') : (predicted ? 'fp' : 'vn');
    confusion[cell]++;
    scoreDistribution[row.label][score] = (scoreDistribution[row.label][score] || 0) + 1;
    for (const id of row.signals) signals[id][row.label]++;
    if (cell === 'fp' || cell === 'fn') errors[cell].push({ id: crypto.createHash('sha256').update(row.url).digest('hex').slice(0, 12), score, signals: row.signals });
  }
  const { vp, fp, vn, fn } = confusion;
  const ratio = (n, d) => d ? n / d : 0;
  return {
    size: rows.length, classCounts: { phishing: vp + fn, legitima: vn + fp }, weights, threshold, confusion,
    metrics: { precision: ratio(vp, vp + fp), recall: ratio(vp, vp + fn), f1: ratio(2 * vp, 2 * vp + fp + fn), falsePositiveRate: ratio(fp, fp + vn) },
    signalCounts: signals, scoreDistribution,
    errorExamples: { fp: errors.fp.slice(0, 5), fn: errors.fn.slice(0, 5) }
  };
}

function report(result) {
  const c = result.confusion, m = result.metrics, pct = n => `${(100 * n).toFixed(2)}%`;
  console.log(`Amostra: ${result.size} URLs (${result.classCounts.phishing} phishing; ${result.classCounts.legitima} legítimas)`);
  console.log(`Limiar: pontuação >= ${result.threshold}; pesos: ${RULES.map(id => `${id}=${result.weights[id]}`).join('; ')}`);
  console.log('\nMatriz de confusão (real × previsão):');
  console.log('                  Prevê phishing | Prevê legítima');
  console.log(`Phishing real       ${String(c.vp).padStart(5)} | ${String(c.fn).padStart(5)}`);
  console.log(`Legítima real       ${String(c.fp).padStart(5)} | ${String(c.vn).padStart(5)}`);
  console.log(`\nVP=${c.vp}; FP=${c.fp}; VN=${c.vn}; FN=${c.fn}`);
  console.log(`Precisão=${pct(m.precision)}; revocação=${pct(m.recall)}; F1=${pct(m.f1)}; taxa de falsos positivos=${pct(m.falsePositiveRate)}`);
  console.log('Fórmulas: precisão=VP/(VP+FP); revocação=VP/(VP+FN); F1=2VP/(2VP+FP+FN); taxa de falsos positivos=FP/(FP+VN).');
  console.log('Pontuação não é probabilidade. Exemplos de erro são hashes, sem links ativos.');
  for (const type of ['fp', 'fn']) console.log(`${type.toUpperCase()} (até 5):`, result.errorExamples[type].map(x => `${x.id}: ${x.score} ponto(s) [${x.signals.join(',')}]`).join('; ') || 'nenhum');
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2), json = args.includes('--json'), p = args.filter(x => x !== '--json');
    if (!p.length || p.length > 3) throw Error('Uso: node tests/avaliar-urls.cjs arquivo.tsv [pesos.json] [limiar] [--json]');
    const rows = loadRows(p[0]);
    const weights = p[1] ? validateWeights(JSON.parse(fs.readFileSync(p[1], 'utf8'))) : BASELINE;
    const result = evaluate(rows, weights, p[2] ? Number(p[2]) : 3);
    if (json) console.log(JSON.stringify(result, null, 2)); else report(result);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { RULES, BASELINE, loadRows, validateWeights, evaluate, report };
