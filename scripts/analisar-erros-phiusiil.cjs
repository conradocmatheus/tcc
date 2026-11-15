// Diagnóstico descritivo posterior ao teste final. Não acessa nenhuma URL.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { loadRows, BASELINE } = require('../tests/avaliar-urls.cjs');

const testFile = path.join(__dirname, '..', 'dados', 'processados', 'phiusiil-v1', 'teste.tsv');
const expectedSha256 = '4b36c90fd65945ffd99abb43abf499af8646446e012e65b9352f45fd0b7afb43';
const actualSha256 = crypto.createHash('sha256').update(fs.readFileSync(testFile)).digest('hex');
assert.equal(actualSha256, expectedSha256, 'A partição de teste mudou');

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function describe(rows) {
  const lengths = rows.map(row => row.url.length);
  const hosts = rows.map(row => new URL(row.url).hostname);
  return {
    count: rows.length,
    https: rows.filter(row => new URL(row.url).protocol === 'https:').length,
    http: rows.filter(row => new URL(row.url).protocol === 'http:').length,
    lengthMin: Math.min(...lengths),
    lengthMedian: median(lengths),
    lengthMax: Math.max(...lengths),
    nonRootPath: rows.filter(row => new URL(row.url).pathname !== '/').length,
    query: rows.filter(row => Boolean(new URL(row.url).search)).length,
    fragment: rows.filter(row => Boolean(new URL(row.url).hash)).length,
    hostWithDigit: hosts.filter(host => /\d/.test(host)).length,
    hostWithHyphen: hosts.filter(host => host.includes('-')).length,
    hostLabels: Object.fromEntries(
      [...new Set(hosts.map(host => host.split('.').filter(Boolean).length))]
        .sort((a, b) => a - b)
        .map(count => [count, hosts.filter(host => host.split('.').filter(Boolean).length === count).length])
    )
  };
}

const groups = { vp: [], fn: [], fp: [], vn: [] };
for (const row of loadRows(testFile)) {
  const score = row.signals.reduce((sum, id) => sum + BASELINE[id], 0);
  const predictedPhishing = score >= 1;
  const actualPhishing = row.label === 'phishing';
  const outcome = actualPhishing ? (predictedPhishing ? 'vp' : 'fn') : (predictedPhishing ? 'fp' : 'vn');
  groups[outcome].push({ ...row, score });
}

assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.length])), {
  vp: 74, fn: 36, fp: 3, vn: 115
});

const terms = ['login', 'verificacao', 'verify', 'senha', 'password', 'conta', 'account', 'atualizacao'];
const result = {
  status: 'Análise exploratória posterior à abertura do teste final; sem recalibração.',
  testSha256: actualSha256,
  threshold: 1,
  confusion: Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.length])),
  shapes: Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, describe(rows)])),
  falseNegatives: {
    scoreZero: groups.fn.filter(row => row.score === 0).length,
    queryWithExistingTerm: groups.fn.filter(row => terms.some(term => new URL(row.url).search.toLowerCase().includes(term))).length,
    fragmentWithExistingTerm: groups.fn.filter(row => terms.some(term => new URL(row.url).hash.toLowerCase().includes(term))).length
  },
  falsePositives: {
    onlySubdomains: groups.fp.filter(row => row.signals.length === 1 && row.signals[0] === 'subdomains').length,
    scoreDistribution: Object.fromEntries([...new Set(groups.fp.map(row => row.score))].map(score => [score, groups.fp.filter(row => row.score === score).length]))
  },
  truePositives: {
    onlyHttp: groups.vp.filter(row => row.signals.length === 1 && row.signals[0] === 'http').length
  }
};

console.log(JSON.stringify(result, null, 2));
