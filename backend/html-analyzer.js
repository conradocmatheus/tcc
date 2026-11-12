const path = require("node:path");
const { Parser } = require("htmlparser2");
const { loadPsl, registrableDomain } = require("../scripts/preparar-dados.cjs");

const psl = loadPsl(path.join(__dirname, "../dados/brutos/public_suffix_list-2026-10-24.dat"));
const MAX_HTML_LENGTH = 2_000_000;
const MAX_LINKS = 10_000;

function extractLinks(html) {
  if (typeof html !== "string" || html.length > MAX_HTML_LENGTH) return null;
  const links = [];
  const anchors = [];
  let buttonDepth = 0;
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === "button") {
        buttonDepth++;
        for (const anchor of anchors) anchor.buttonLike = true;
      }
      if (name !== "a" || links.length + anchors.length >= MAX_LINKS) return;
      const className = attributes.class || "";
      anchors.push({
        href: attributes.href || "",
        buttonLike: buttonDepth > 0 || attributes.role?.toLowerCase() === "button" ||
          /(?:^|[\s_-])(?:btn|button)(?:$|[\s_-])/i.test(className)
      });
    },
    onclosetag(name) {
      if (name === "a" && anchors.length) links.push(anchors.pop());
      if (name === "button" && buttonDepth > 0) buttonDepth--;
    }
  }, { decodeEntities: true });
  parser.write(html);
  parser.end();
  while (anchors.length && links.length < MAX_LINKS) links.push(anchors.pop());
  return links;
}

function sameRegistrableDomain(a, b) {
  const domainA = registrableDomain(a.hostname, psl);
  const domainB = registrableDomain(b.hostname, psl);
  return domainA && domainB ? domainA === domainB : a.hostname === b.hostname;
}

function analyzeHtml(html, pageUrl, analyzeUrl) {
  const links = extractLinks(html);
  if (!links) return null;
  const page = new URL(pageUrl);
  let navigable = 0, external = 0, buttonLinks = 0, suspicious = 0;
  let best = null;
  const seen = new Set();
  for (const link of links) {
    let target;
    try { target = new URL(link.href, page); } catch { continue; }
    if (!["http:", "https:"].includes(target.protocol) || !link.href || link.href.startsWith("#")) continue;
    navigable++;
    if (link.buttonLike) buttonLinks++;
    if (sameRegistrableDomain(page, target)) continue;
    external++;
    if (seen.has(target.href)) continue;
    seen.add(target.href);
    const lexical = analyzeUrl(target.href);
    if (!lexical || lexical.score < 2) continue;
    suspicious++;
    if (!best || (link.buttonLike && !best.buttonLike) ||
        (link.buttonLike === best.buttonLike && lexical.score > best.score)) {
      best = { buttonLike: link.buttonLike, score: lexical.score, host: target.hostname };
    }
  }
  const signals = best ? [{
    id: "html_external_target",
    reason: `O HTML contém ${best.buttonLike ? "um link de botão" : "um link"} para outro domínio (${best.host}) cujo endereço soma ${best.score} pontos nas regras de URL.`,
    points: 1
  }] : [];
  return {
    linksFound: links.length,
    navigableLinks: navigable,
    buttonLinks,
    externalLinks: external,
    externalTargetsWithSignals: suspicious,
    signals,
    limitation: "Foram analisados apenas os href presentes no HTML recebido; links criados por scripts após o carregamento não foram examinados."
  };
}

module.exports = { analyzeHtml, extractLinks, MAX_HTML_LENGTH };
