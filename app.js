(function () {
  'use strict';

  var JAREN = ['2021', '2022', '2023', '2024', '2025'];
  var ONTBREEKT = 'Nog geen geverifieerde gegevens';
  var OPSLAG = 'selecta-filters-v1';
  var FILTERS = ['zoek', 'regio', 'soort', 'focus', 'sri', 'esg', 'uitkering', 'kosten', 'rekening', 'aanbieder', 'sort'];

  var fondsen = [];
  var aanbieders = [];
  var beschikbaarheid = {};
  var meta = {};

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, kinderen) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') e.textContent = attrs[k];
        else if (k === 'class') e.className = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (kinderen || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  function procent(n, dec) {
    if (n === null || n === undefined || isNaN(n)) return null;
    return n.toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '%';
  }

  function datumNL(iso) {
    if (!iso) return null;
    var p = iso.split('-');
    return p.length === 3 ? (parseInt(p[2], 10) + '-' + parseInt(p[1], 10) + '-' + p[0]) : iso;
  }

  function isBeschikbaar(provId, isin) {
    var b = beschikbaarheid[provId];
    if (!b) return null;
    if (Object.prototype.hasOwnProperty.call(b, isin)) return b[isin];
    return Object.prototype.hasOwnProperty.call(b, '_overig') ? b._overig : null;
  }

  function soortNaam(f) { return f.type === 'indexfonds' ? 'Indexfonds' : 'ETF'; }

  function uitkeringGroep(f) {
    if (!f.uitkering) return null;
    if (/^Accumulerend/.test(f.uitkering) || /herbelegd/i.test(f.uitkering)) return 'Accumulerend';
    if (/^Uitkerend/.test(f.uitkering)) return 'Uitkerend';
    return null;
  }

  function vulOpties(id, waarden) {
    var s = $(id);
    waarden.forEach(function (w) { s.appendChild(el('option', { value: w, text: w })); });
  }

  function leesFilters() {
    var o = {};
    FILTERS.forEach(function (k) { o[k] = $('f-' + k).value; });
    return o;
  }

  function bewaar() {
    try { localStorage.setItem(OPSLAG, JSON.stringify(leesFilters())); } catch (e) { /* geen opslag beschikbaar */ }
  }

  function herstel() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(OPSLAG) || 'null'); } catch (e) { o = null; }
    if (!o) return;
    FILTERS.forEach(function (k) {
      var s = $('f-' + k);
      if (o[k] === undefined || o[k] === null) return;
      if (s.tagName === 'SELECT' && !Array.prototype.some.call(s.options, function (op) { return op.value === o[k]; })) return;
      s.value = o[k];
    });
  }

  function past(f, flt) {
    if (flt.zoek) {
      var q = flt.zoek.trim().toLocaleLowerCase('nl');
      var hooi = [f.naam, f.isin, f.ticker || '', f.uitgever].join(' ').toLocaleLowerCase('nl');
      if (hooi.indexOf(q) === -1) return false;
    }
    if (flt.regio && f.regio !== flt.regio) return false;
    if (flt.soort && (f.soort + ' · ' + soortNaam(f)) !== flt.soort) return false;
    if (flt.focus && f.focus !== flt.focus) return false;
    if (flt.sri && !(f.sri && f.sri <= Number(flt.sri))) return false;
    if (flt.esg === 'ja' && f.esgUitsluitingen !== true) return false;
    if (flt.uitkering && uitkeringGroep(f) !== flt.uitkering) return false;
    if (flt.kosten && !(f.ter !== null && f.ter <= Number(flt.kosten) + 1e-9)) return false;
    if (flt.rekening === 'pensioen') {
      var ok = aanbieders.some(function (a) { return a.rekeningen.indexOf('pensioen') !== -1 && isBeschikbaar(a.id, f.isin) === true; });
      if (!ok) return false;
    }
    if (flt.aanbieder && isBeschikbaar(flt.aanbieder, f.isin) !== true) return false;
    return true;
  }

  function grafiek(f) {
    var w = 320, h = 200, padL = 8, padR = 8, top = 22, bottom = 38;
    var waarden = JAREN.map(function (j) { var v = f.rendement ? f.rendement[j] : null; return (typeof v === 'number') ? v : null; });
    var bekend = waarden.filter(function (v) { return v !== null; });
    var max = Math.max(5, Math.max.apply(null, bekend.concat([0])));
    var min = Math.min(-5, Math.min.apply(null, bekend.concat([0])));
    var plotH = h - top - bottom;
    var y = function (v) { return top + (max - v) / (max - min) * plotH; };
    var bw = (w - padL - padR) / JAREN.length;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('role', 'img');
    var alt = 'Rendement per kalenderjaar: ' + JAREN.map(function (j, i) { return j + ' ' + (waarden[i] === null ? 'geen gegevens' : procent(waarden[i], 1)); }).join(', ');
    svg.setAttribute('aria-label', alt);
    function add(tag, attrs, text) {
      var n = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text !== undefined) n.textContent = text;
      svg.appendChild(n);
      return n;
    }
    var y0 = y(0);
    JAREN.forEach(function (j, i) {
      var x = padL + i * bw + bw * 0.18, bwi = bw * 0.64, v = waarden[i];
      if (v !== null) {
        var yv = y(v);
        add('rect', { x: x, y: Math.min(yv, y0), width: bwi, height: Math.max(1, Math.abs(y0 - yv)), rx: 3, fill: v >= 0 ? '#2D5A3D' : '#B5543C' });
        var ly = v >= 0 ? yv - 6 : yv + 15;
        add('text', { x: x + bwi / 2, y: ly, 'text-anchor': 'middle', 'font-size': 12, fill: '#1f2a22' }, procent(v, 1));
      } else {
        add('text', { x: x + bwi / 2, y: y0 - 6, 'text-anchor': 'middle', 'font-size': 10, fill: '#5b6a5f' }, 'geen data');
      }
      add('text', { x: x + bwi / 2, y: h - 4, 'text-anchor': 'middle', 'font-size': 12, fill: '#5b6a5f' }, j);
    });
    add('line', { x1: padL, x2: w - padR, y1: y0, y2: y0, stroke: '#2D5A3D66', 'stroke-width': 1 });
    return svg;
  }

  function feit(label, waarde) {
    var td = el('td');
    if (waarde === null || waarde === undefined || waarde === '') td.appendChild(el('span', { class: 'ontbreekt', text: ONTBREEKT }));
    else td.textContent = waarde;
    return el('tr', null, [el('th', { scope: 'row', text: label }), td]);
  }

  function aanbiedersBlok(f) {
    var box = el('div', { class: 'aanbieders' });
    box.appendChild(el('h4', { text: 'Waar te koop' }));
    var lijst = el('ul');
    var onbekend = 0;
    aanbieders.forEach(function (a) {
      var st = isBeschikbaar(a.id, f.isin);
      if (st === null) { onbekend++; return; }
      if (st !== true) return;
      var li = el('li');
      if (a.link) {
        li.appendChild(el('a', { href: a.link, target: '_blank', rel: (a.betaald ? 'sponsored ' : '') + 'noopener noreferrer', text: a.naam }));
        li.appendChild(el('span', { class: 'advertentie', text: a.vergoedingTekst }));
      } else {
        li.appendChild(el('span', { class: 'naam', text: a.naam }));
        if (!a.betaald) li.appendChild(el('span', { class: 'advertentie', text: a.vergoedingTekst }));
      }
      var bron = beschikbaarheid[a.id] || {};
      if (bron._gecontroleerd) li.appendChild(el('span', { class: 'advertentie', text: 'Beschikbaarheid gecontroleerd op ' + datumNL(bron._gecontroleerd) + '.' }));
      lijst.appendChild(li);
    });
    if (lijst.children.length) box.appendChild(lijst);
    else box.appendChild(el('p', { class: 'ontbreekt', text: 'Nog geen gecontroleerde beschikbaarheid.' }));
    if (onbekend > 0 && lijst.children.length) box.appendChild(el('p', { class: 'noot', text: 'Bij ' + onbekend + ' andere aanbieder(s) is de beschikbaarheid nog niet gecontroleerd.' }));
    box.appendChild(el('p', { class: 'noot', text: 'Hier staan alleen aanbieders waarmee ik een commerciële afspraak heb, aangevuld met aanbieders zonder afspraak (zoals Meesman). Dit is geen volledige lijst van alle plekken waar dit fonds te koop is.' }));
    return box;
  }

  function kaart(f) {
    var k = el('article', { class: 'kaart' });
    var detId = 'det-' + f.isin;
    var knop = el('button', { type: 'button', class: 'open-knop', 'aria-expanded': 'false', 'aria-controls': detId, text: 'Bekijk details' });
    var kern = el('div', { class: 'kern' }, [
      el('span', null, ['ISIN ', el('b', { text: f.isin })]),
      el('span', null, ['Kosten ', el('b', { text: procent(f.ter, 2) || ONTBREEKT })]),
      el('span', null, ['Risico (SRI) ', el('b', { text: f.sri ? f.sri + ' van 7' : ONTBREEKT })]),
      el('span', null, [el('b', { text: (f.type === 'indexfonds' ? f.uitkering : uitkeringGroep(f)) || f.uitkering || ONTBREEKT })])
    ]);
    k.appendChild(el('div', { class: 'kaart-kop' }, [
      el('div', null, [el('span', { class: 'soortlabel', text: soortNaam(f) + ' · ' + f.regio }), el('h3', { text: f.naam }), kern]),
      knop
    ]));
    var det = el('div', { class: 'details', id: detId, hidden: 'hidden' });
    knop.addEventListener('click', function () {
      var open = det.hasAttribute('hidden');
      if (open && !det.dataset.klaar) { vulDetails(det, f); det.dataset.klaar = '1'; }
      if (open) det.removeAttribute('hidden'); else det.setAttribute('hidden', 'hidden');
      knop.setAttribute('aria-expanded', open ? 'true' : 'false');
      knop.textContent = open ? 'Details sluiten' : 'Bekijk details';
    });
    k.appendChild(det);
    return k;
  }

  function vulDetails(det, f) {
    var tabel = el('table', { class: 'feiten' }, [el('tbody', null, [
      feit('Soort', soortNaam(f) + ' (' + f.soort.toLowerCase() + ')'),
      feit('Uitgever', f.uitgever),
      feit('Ticker', f.type === 'indexfonds' ? 'Geen (niet beursgenoteerd)' : f.ticker),
      feit('Index', f.index),
      feit('Lopende kosten (TER)', procent(f.ter, 2) + (f.extraKosten ? ' · ' + f.extraKosten : '')),
      feit('Fondsvermogen', f.fondsvermogen ? f.fondsvermogen + (f.fondsvermogenDatum ? ' (per ' + datumNL(f.fondsvermogenDatum) + ')' : '') : null),
      feit('Replicatie', f.replicatie),
      feit('Uitkering', f.uitkering),
      feit('Domicilie', f.domicilie),
      feit('Valuta fonds', f.valuta),
      feit('Risico-indicator (SRI)', f.sri ? f.sri + ' van 7' : null),
      feit('Duurzaamheid (SFDR)', f.sfdr),
      feit('ESG-uitsluitingen', f.esgUitsluitingen === true ? 'Ja, volgens de uitgever' : (f.esgUitsluitingen === false ? 'Nee' : null)),
      feit('Gestart', datumNL(f.start))
    ])]);
    var heeftRend = f.rendement && JAREN.some(function (j) { return typeof f.rendement[j] === 'number'; });
    var gr = el('div', { class: 'grafiek' }, [el('h4', { text: 'Rendement per kalenderjaar' })]);
    if (heeftRend) gr.appendChild(grafiek(f));
    else gr.appendChild(el('p', { class: 'ontbreekt', text: ONTBREEKT }));
    var valutaRend = (f.valuta || '').replace(/\s*\(.*\)/, '');
    gr.appendChild(el('p', { class: 'rend-noot', text: 'Totaalrendement van het fonds in ' + (valutaRend || 'de fondsvaluta') + ', na fondskosten, met herbelegde dividenden. Peildatum 31-12-2025. Zonder brokerkosten en belasting. Vijf jaar laat maar één marktfase zien. Resultaten uit het verleden bieden geen garantie voor de toekomst.' }));
    var bron = el('p', { class: 'bron' }, ['Bron: ', el('a', { href: f.bron, target: '_blank', rel: 'noopener noreferrer', text: f.bronNaam || 'uitgever' }), ', geraadpleegd op ' + datumNL(meta.opgehaald) + '.']);
    det.appendChild(tabel);
    det.appendChild(gr);
    det.appendChild(el('div', { class: 'onder' }, [bron, aanbiedersBlok(f)]));
  }

  function toon() {
    var flt = leesFilters();
    var zicht = fondsen.filter(function (f) { return past(f, flt); });
    if (flt.sort === 'kosten') zicht.sort(function (a, b) { return (a.ter - b.ter) || a.naam.localeCompare(b.naam, 'nl'); });
    else zicht.sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
    $('telling').textContent = zicht.length + ' van ' + fondsen.length + ' fondsen';
    var n = FILTERS.filter(function (k) { return k !== 'sort' && flt[k]; }).length;
    $('actief').textContent = n ? '(' + n + ' actief)' : '';
    var lijst = $('lijst');
    lijst.replaceChildren();
    if (!zicht.length) {
      lijst.appendChild(el('p', { class: 'leeg', text: 'Geen fondsen met deze kenmerken. Pas een filter aan of kies "Alle filters wissen".' }));
      return;
    }
    var frag = document.createDocumentFragment();
    zicht.forEach(function (f) { frag.appendChild(kaart(f)); });
    lijst.appendChild(frag);
  }

  function uniek(fn) {
    var s = {};
    fondsen.forEach(function (f) { var v = fn(f); if (v) s[v] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, 'nl'); });
  }

  function start(data, prov) {
    meta = data;
    fondsen = data.fondsen;
    aanbieders = prov.aanbieders;
    beschikbaarheid = prov.beschikbaarheid;
    $('aantal-totaal').textContent = String(fondsen.length);
    $('versie').textContent = datumNL(data.versie);
    vulOpties('f-regio', uniek(function (f) { return f.regio; }));
    vulOpties('f-soort', uniek(function (f) { return f.soort + ' · ' + soortNaam(f); }));
    vulOpties('f-focus', uniek(function (f) { return f.focus; }));
    aanbieders.forEach(function (a) { $('f-aanbieder').appendChild(el('option', { value: a.id, text: a.naam })); });
    herstel();
    try { if (window.matchMedia('(min-width: 721px)').matches) $('filter-details').open = true; } catch (e) { $('filter-details').open = true; }
    FILTERS.forEach(function (k) {
      var n = $('f-' + k);
      n.addEventListener(n.tagName === 'INPUT' ? 'input' : 'change', function () { bewaar(); toon(); });
    });
    $('wis').addEventListener('click', function () {
      FILTERS.forEach(function (k) { $('f-' + k).value = k === 'sort' ? 'naam' : ''; });
      bewaar(); toon();
    });
    toon();
  }

  Promise.all([
    fetch('data/fondsen.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('fondsen'); return r.json(); }),
    fetch('data/aanbieders.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('aanbieders'); return r.json(); })
  ]).then(function (res) { start(res[0], res[1]); })
    .catch(function () { $('telling').textContent = 'De database kon niet worden geladen. Ververs de pagina of probeer het later opnieuw.'; });
})();
