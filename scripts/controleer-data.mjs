// Controleert de Selecta-data. Faalt (exit 1) bij elke fout, zodat GitHub Actions rood wordt.
import fs from 'node:fs';

const fouten = [];
const lees = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const data = lees('data/fondsen.json');
const prov = lees('data/aanbieders.json');

const isinOk = (s) => /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s);
function isinCheckcijfer(isin) {
  const digits = isin.slice(0, 11).split('').map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c)).join('');
  let som = 0, dubbel = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (dubbel) { n *= 2; if (n > 9) n -= 9; }
    som += n; dubbel = !dubbel;
  }
  return (10 - (som % 10)) % 10 === Number(isin[11]);
}

const gezien = new Set();
for (const f of data.fondsen) {
  const id = f.isin || f.naam;
  if (!isinOk(f.isin) || !isinCheckcijfer(f.isin)) fouten.push(`${id}: ongeldig ISIN`);
  if (gezien.has(f.isin)) fouten.push(`${id}: dubbel ISIN`);
  gezien.add(f.isin);
  if (!['ETF', 'indexfonds'].includes(f.type)) fouten.push(`${id}: type moet ETF of indexfonds zijn`);
  if (!/^https:\/\//.test(f.bron || '')) fouten.push(`${id}: bron-URL ontbreekt of is geen https`);
  if (typeof f.ter !== 'number' || f.ter > 0.5) fouten.push(`${id}: TER ontbreekt of boven 0,50%`);
  if (f.sri !== null && !(Number.isInteger(f.sri) && f.sri >= 1 && f.sri <= 7)) fouten.push(`${id}: SRI moet 1-7 of null zijn`);
  for (const j of ['2021', '2022', '2023', '2024', '2025']) {
    const v = f.rendement?.[j];
    if (!(v === null || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 200))) fouten.push(`${id}: rendement ${j} ongeldig`);
  }
  if (f.start && f.start > '2021-01-01') fouten.push(`${id}: start na 1-1-2021, geen 5 volle kalenderjaren`);
}

for (const a of prov.aanbieders) {
  if (a.link) {
    for (const f of data.fondsen) {
      const tickers = (f.ticker || '').split('/').map((t) => t.trim()).filter((t) => t.length >= 3);
      if (a.link.includes(f.isin)) fouten.push(`${a.id}: link bevat ISIN ${f.isin}`);
      for (const t of tickers) if (new RegExp('[?&=/]' + t + '(\\b|$)', 'i').test(a.link)) fouten.push(`${a.id}: link bevat ticker ${t}`);
    }
  }
  if (a.betaald && !/^Advertentie\./.test(a.vergoedingTekst)) fouten.push(`${a.id}: betaalde aanbieder zonder "Advertentie."`);
}
const ids = prov.aanbieders.map((a) => a.naam);
const gesorteerd = [...ids].sort((x, y) => x.localeCompare(y, 'nl'));
if (ids.join('|') !== gesorteerd.join('|')) fouten.push('Aanbieders moeten in vaste alfabetische volgorde staan');

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const verboden of ['keuzehulp', 'selectietool', 'aanbevolen', 'populair', 'past bij jou', 'maximale samengestelde rente']) {
  if (html.toLowerCase().includes(verboden)) fouten.push(`index.html bevat verboden woord: "${verboden}"`);
}
for (const naam of ['DEGIRO', 'eToro', 'Scalable', 'Brand New Day']) {
  if (naam !== 'Brand New Day' && html.includes(naam)) fouten.push(`index.html noemt brokernaam ${naam} buiten de kaarten`);
}

if (fouten.length) {
  console.error('Controle MISLUKT:\n- ' + fouten.join('\n- '));
  process.exit(1);
}
console.log(`Controle geslaagd: ${data.fondsen.length} fondsen, ${prov.aanbieders.length} aanbieders.`);
