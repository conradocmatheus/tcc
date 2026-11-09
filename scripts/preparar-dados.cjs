// Prepara uma amostra reproduzível de URLs da base PhiUSIIL (UCI 967).
// Nunca faz requisições para as URLs contidas na base.
// Uso: node scripts/preparar-dados.cjs caminho/do/PhiUSIIL_Phishing_URL_Dataset.csv caminho/da/PSL.dat pasta/saida
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { domainToASCII } = require('node:url');

const TARGET_PER_CLASS = 500;
const MAX_PER_DOMAIN_PER_CLASS = 5;
const SEED = 'tcc-2026-10-24-v1';

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function parseCsv(text, onRow) {
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') {
      row.push(field.replace(/\r$/, '')); field = '';
      onRow(row); row = [];
    } else field += c;
  }
  if (quoted) throw new Error('CSV termina dentro de campo entre aspas');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); onRow(row); }
}

function loadPsl(filename) {
  const exact = new Set(), wildcard = new Set(), exception = new Set();
  for (const original of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const line = original.trim();
    if (!line || line.startsWith('//')) continue;
    const normalized = domainToASCII(line.replace(/^!|^\*\./, '')).toLowerCase();
    if (!normalized) continue;
    if (line.startsWith('!')) exception.add(normalized);
    else if (line.startsWith('*.')) wildcard.add(normalized);
    else exact.add(normalized);
  }
  return { exact, wildcard, exception };
}

function registrableDomain(hostname, psl) {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return null;
  const labels = host.split('.');
  if (labels.length < 2 || labels.some(x => !x)) return null;
  let ruleLength = 1, exceptionLength = 0;
  for (let i = 0; i < labels.length; i++) {
    const suffix = labels.slice(i).join('.');
    if (psl.exception.has(suffix)) exceptionLength = Math.max(exceptionLength, labels.length - i);
    if (psl.exact.has(suffix)) ruleLength = Math.max(ruleLength, labels.length - i);
    if (i > 0 && psl.wildcard.has(suffix)) ruleLength = Math.max(ruleLength, labels.length - i + 1);
  }
  const suffixLength = exceptionLength ? exceptionLength - 1 : ruleLength;
  return labels.length > suffixLength ? labels.slice(-suffixLength - 1).join('.') : null;
}

function validUrl(input, psl) {
  if (!input || input.length > 4096 || /[\t\r\n]/.test(input)) return null;
  try {
    const parsed = new URL(input);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    const domain = registrableDomain(parsed.hostname, psl);
    if (!domain || ['example.com', 'example.net', 'example.org'].includes(domain)) return null;
    return { domain, canonical: parsed.href };
  } catch { return null; }
}

function writeTsv(filename, rows) {
  fs.writeFileSync(filename, 'url\trotulo\n' + rows.map(r => `${r.url}\t${r.label}`).join('\n') + '\n', 'utf8');
}

function main() {
  const [csvPath, pslPath, outputDir] = process.argv.slice(2);
  if (!csvPath || !pslPath || !outputDir) throw new Error('Uso: node scripts/preparar-dados.cjs base.csv psl.dat pasta/saida');
  fs.mkdirSync(outputDir, { recursive: true });
  const psl = loadPsl(pslPath);
  const csv = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const counters = { sourceRows: 0, invalidLabel: 0, invalidUrl: 0, duplicate: 0, conflictingUrl: 0, mixedDomainRows: 0, eligible: 0 };
  const byCanonical = new Map();
  let header;
  parseCsv(csv, fields => {
    if (!header) { header = fields; return; }
    counters.sourceRows++;
    if (fields.length !== header.length) { counters.invalidUrl++; return; }
    const label = fields[header.indexOf('label')] === '0' ? 'phishing' : fields[header.indexOf('label')] === '1' ? 'legitima' : null;
    if (!label) { counters.invalidLabel++; return; }
    const url = fields[header.indexOf('URL')];
    const valid = validUrl(url, psl);
    if (!valid) { counters.invalidUrl++; return; }
    const prior = byCanonical.get(valid.canonical);
    if (prior) {
      if (prior.label !== label) { prior.conflict = true; counters.conflictingUrl++; }
      else counters.duplicate++;
      return;
    }
    byCanonical.set(valid.canonical, { url, label, domain: valid.domain, conflict: false });
  });
  if (!header || !header.includes('URL') || !header.includes('label')) throw new Error('Colunas URL/label ausentes');
  const domainLabels = new Map();
  for (const row of byCanonical.values()) {
    if (row.conflict) continue;
    const labels = domainLabels.get(row.domain) || new Set();
    labels.add(row.label); domainLabels.set(row.domain, labels);
  }
  const eligible = [...byCanonical.values()].filter(row => {
    if (row.conflict) return false;
    if (domainLabels.get(row.domain).size > 1) { counters.mixedDomainRows++; return false; }
    return true;
  });
  counters.eligible = eligible.length;
  const chosen = [];
  const selection = {};
  for (const label of ['phishing', 'legitima']) {
    const candidates = eligible.filter(r => r.label === label).sort((a,b) => sha256(SEED + a.url).localeCompare(sha256(SEED + b.url)));
    const perDomain = new Map();
    let capped = 0;
    for (const row of candidates) {
      if (chosen.filter(r => r.label === label).length >= TARGET_PER_CLASS) break;
      const count = perDomain.get(row.domain) || 0;
      if (count >= MAX_PER_DOMAIN_PER_CLASS) { capped++; continue; }
      chosen.push(row); perDomain.set(row.domain, count + 1);
    }
    selection[label] = { eligible: candidates.length, selected: [...perDomain.values()].reduce((a,b)=>a+b,0), domains: perDomain.size, cappedDuringSelection: capped };
  }
  if (selection.phishing.selected !== TARGET_PER_CLASS || selection.legitima.selected !== TARGET_PER_CLASS) {
    throw new Error(`Amostra insuficiente: phishing=${selection.phishing.selected}, legitima=${selection.legitima.selected}`);
  }
  const domainSplit = new Map();
  for (const row of chosen) {
    if (domainSplit.has(row.domain)) continue;
    const n = parseInt(sha256(SEED + ':split:' + row.domain).slice(0, 8), 16) / 0x100000000;
    domainSplit.set(row.domain, n < 0.6 ? 'desenvolvimento' : n < 0.8 ? 'validacao' : 'teste');
  }
  const counts = {};
  for (const split of ['desenvolvimento', 'validacao', 'teste']) {
    const rows = chosen.filter(r => domainSplit.get(r.domain) === split).sort((a,b) => a.label.localeCompare(b.label) || a.domain.localeCompare(b.domain) || a.url.localeCompare(b.url));
    writeTsv(path.join(outputDir, `${split}.tsv`), rows);
    counts[split] = { total: rows.length, phishing: rows.filter(r=>r.label==='phishing').length, legitima: rows.filter(r=>r.label==='legitima').length, domains: new Set(rows.map(r=>r.domain)).size };
  }
  const audit = {
    createdAtUtc: new Date().toISOString(), seed: SEED, targetPerClass: TARGET_PER_CLASS,
    maxPerDomainPerClass: MAX_PER_DOMAIN_PER_CLASS,
    source: { name: 'PhiUSIIL Phishing URL (Website)', provider: 'UCI Machine Learning Repository', datasetId: 967, url: 'https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset', csvSha256: sha256(fs.readFileSync(csvPath)), pslSha256: sha256(fs.readFileSync(pslPath)) },
    labelMapping: { '0': 'phishing', '1': 'legitima' }, counters, selection, splits: counts,
    limitations: ['Rótulos são os publicados pelo conjunto PhiUSIIL e não foram revalidados.', 'Uma amostra equilibrada não representa a prevalência real de phishing.', 'Somente a cadeia textual da URL é usada pelo analisador.']
  };
  fs.writeFileSync(path.join(outputDir, 'auditoria.json'), JSON.stringify(audit, null, 2) + '\n');
  console.log(JSON.stringify({ counters, selection, splits: counts }, null, 2));
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { loadPsl, registrableDomain };
