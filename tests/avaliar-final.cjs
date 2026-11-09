// Avaliação final única: baseline e configuração congelada no mesmo teste.
// Nunca visita URLs. Recusa sobrescrever o relatório final.
// Uso: node tests/avaliar-final.cjs dev.tsv val.tsv teste.tsv psl.dat config.json saida.json
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { loadRows, evaluate, BASELINE } = require('./avaliar-urls.cjs');
const { loadPsl, registrableDomain } = require('../scripts/preparar-dados.cjs');

function hashFile(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function fresh() { return { vp: 0, fp: 0, vn: 0, fn: 0 }; }
function add(a, b) { for (const k of ['vp', 'fp', 'vn', 'fn']) a[k] += b[k]; }
function f1(c) { const d = 2 * c.vp + c.fp + c.fn; return d ? 2 * c.vp / d : 0; }
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; }; }
function percentile(sorted, q) { const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); }

function groupedBootstrap(rows, psl, weights, threshold, repetitions = 5000) {
  const groups = new Map();
  for (const row of rows) {
    const domain = registrableDomain(new URL(row.url).hostname, psl);
    if (!domain) throw Error('Domínio registrável ausente no teste');
    const group = groups.get(domain) || { label: row.label, baseline: fresh(), calibrated: fresh() };
    if (group.label !== row.label) throw Error('Domínio com rótulos conflitantes no teste');
    const baselineScore = row.signals.reduce((sum, id) => sum + BASELINE[id], 0);
    const calibratedScore = row.signals.reduce((sum, id) => sum + weights[id], 0);
    const positive = row.label === 'phishing';
    for (const [key, score, limit] of [['baseline', baselineScore, 3], ['calibrated', calibratedScore, threshold]]) {
      const predicted = score >= limit;
      group[key][positive ? (predicted ? 'vp' : 'fn') : (predicted ? 'fp' : 'vn')]++;
    }
    groups.set(domain, group);
  }
  const byClass = {
    phishing: [...groups.values()].filter(g => g.label === 'phishing'),
    legitima: [...groups.values()].filter(g => g.label === 'legitima')
  };
  const random = rng(20261024), base = [], cal = [], difference = [];
  for (let i = 0; i < repetitions; i++) {
    const b = fresh(), c = fresh();
    for (const label of ['phishing', 'legitima']) {
      const source = byClass[label];
      for (let j = 0; j < source.length; j++) {
        const chosen = source[Math.floor(random() * source.length)];
        add(b, chosen.baseline); add(c, chosen.calibrated);
      }
    }
    base.push(f1(b)); cal.push(f1(c)); difference.push(f1(c) - f1(b));
  }
  const interval = values => { values.sort((a,b)=>a-b); return [percentile(values, 0.025), percentile(values, 0.975)]; };
  return { method: 'Bootstrap pareado por domínio registrável, estratificado por classe; 5.000 reamostragens, semente 20261024; percentis 2,5 e 97,5.', domains: groups.size, domainsByClass: { phishing: byClass.phishing.length, legitima: byClass.legitima.length }, baselineF1: interval(base), calibratedF1: interval(cal), deltaF1: interval(difference) };
}

function main() {
  const [devFile, valFile, testFile, pslFile, configFile, outputFile] = process.argv.slice(2);
  if (!outputFile || process.argv.length !== 8) throw Error('Uso: node tests/avaliar-final.cjs dev.tsv val.tsv teste.tsv psl.dat config.json saida.json');
  if (fs.existsSync(outputFile)) throw Error('Relatório final já existe; não sobrescrever nem repetir o teste');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  if (hashFile(devFile) !== config.files.developmentSha256 || hashFile(valFile) !== config.files.validationSha256) throw Error('Partições de desenvolvimento/validação mudaram após calibração');
  const test = loadRows(testFile), psl = loadPsl(pslFile);
  const baseline = evaluate(test, BASELINE, 3);
  const calibrated = evaluate(test, config.weights, config.threshold);
  const confidence95 = groupedBootstrap(test, psl, config.weights, config.threshold);
  const result = {
    evaluatedAtUtc: new Date().toISOString(),
    files: { testSha256: hashFile(testFile), pslSha256: hashFile(pslFile), configSha256: hashFile(configFile), analyzerSha256: hashFile(path.join(__dirname, '..', 'backend', 'server.js')) },
    baseline, calibrated, deltaF1: calibrated.metrics.f1 - baseline.metrics.f1, confidence95,
    interpretation: 'Estimativas condicionais à amostra PhiUSIIL; a prevalência de phishing foi artificialmente equilibrada. O limite calibrado foi escolhido sem consultar o teste.'
  };
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ baseline: { confusion: baseline.confusion, metrics: baseline.metrics }, calibrated: { threshold: calibrated.threshold, weights: calibrated.weights, confusion: calibrated.confusion, metrics: calibrated.metrics }, deltaF1: result.deltaF1, confidence95 }, null, 2));
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
