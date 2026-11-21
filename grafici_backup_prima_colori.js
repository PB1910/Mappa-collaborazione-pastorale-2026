/* ==========================================================
   GRAFICI - tab "Grafici" del pannello informazioni
   Richiede Chart.js (CDN) caricato prima di questo file.
   Dati letti da jsonData.grafici (vedi info/*.json)
   ========================================================== */
(function () {
    const COL = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100' };
    const INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781', GRID = '#e1e0d9', BASE = '#c3c2b7';
    const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    // scala ordinale (blu, dal chiaro allo scuro) per i livelli qualitativi
    const LEVELS = [
        ['nulla',       '#86b6ef', INK],
        ['molto bassa', '#5598e7', INK],
        ['bassa',       '#2a78d6', '#fff'],
        ['media',       '#1c5cab', '#fff'],
        ['alta',        '#104281', '#fff']
    ];
    // "molto alta" (se compare) condivide il colore di "alta": la scala validata ha 5 passi
    const LEVEL_ALIAS = { 'molto alta': 'alta' };
    const findLevel = v => { v = String(v).toLowerCase(); return LEVELS.find(l => l[0] === (LEVEL_ALIAS[v] || v)); };
    const ND = 'n.d.';
    let charts = [];

    const nf = (v, d = 0) => {
        const [i, f] = Math.abs(v).toFixed(d).split('.');
        return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : '');
    };
    const has = v => v !== null && v !== undefined && !Number.isNaN(v);
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

    // media ponderata sui residenti, solo sui dati dichiarati
    function wavg(zone, key) {
        let a = 0, b = 0;
        zone.forEach(z => { if (has(z[key]) && has(z.residenti)) { a += z[key] * z.residenti; b += z.residenti; } });
        return b ? a / b : null;
    }

    function injectStyle() {
        if (document.getElementById('graficiStyle')) return;
        const s = document.createElement('style');
        s.id = 'graficiStyle';
        s.textContent = `
        .viz-root { font-family:${FONT}; color:${INK}; }
        .viz-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:4px 0 14px; }
        .viz-tile { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 8px 7px; }
        .viz-tile .k { font-size:10.5px; color:${INK2}; }
        .viz-tile .v { font-size:20px; font-weight:600; line-height:1.15; margin-top:2px; }
        .viz-tile .s { font-size:10px; color:${MUTED}; margin-top:2px; line-height:1.25; }
        .viz-title { font-size:12px; font-weight:600; margin:14px 0 4px; color:${INK}; }
        .viz-sub { font-size:10.5px; color:${MUTED}; margin:-2px 0 4px; }
        .viz-chart { position:relative; width:100%; }
        .viz-note { font-size:10.5px; color:${MUTED}; margin:4px 0 0; }
        .viz-heat { display:grid; gap:2px; margin-top:4px; }
        .viz-heat .h { font-size:10px; color:${INK2}; padding:0 2px 3px; align-self:end; line-height:1.15; }
        .viz-heat .r { font-size:11px; color:${INK2}; align-self:center; padding-right:4px; }
        .viz-heat .c { height:26px; border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:10.5px; }
        .viz-heat .c.nd { background:#f1f5f9; color:${MUTED}; border:1px dashed ${BASE}; }
        .viz-legend { display:flex; flex-wrap:wrap; gap:4px 10px; margin-top:6px; font-size:10px; color:${INK2}; }
        .viz-legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
        .viz-details { margin-top:14px; font-size:11px; color:${INK2}; }
        .viz-details summary { cursor:pointer; font-weight:600; }
        .viz-details table { border-collapse:collapse; width:100%; margin-top:6px; }
        .viz-details th, .viz-details td { border-bottom:1px solid ${GRID}; padding:3px 4px; text-align:right; }
        .viz-details th:first-child, .viz-details td:first-child { text-align:left; }
        `;
        document.head.appendChild(s);
    }

    // etichette di valore a fine barra (solo grafici a serie singola) + "n.d." per i dati mancanti
    const valueLabels = {
        id: 'valueLabels',
        afterDatasetsDraw(chart, args, opts) {
            if (!opts || !opts.on) return;
            const { ctx, chartArea, scales } = chart;
            const meta = chart.getDatasetMeta(0);
            ctx.save();
            ctx.font = `11px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            chart.data.datasets[0].data.forEach((v, i) => {
                const y = scales.y.getPixelForValue(i);
                if (!has(v)) { ctx.fillStyle = MUTED; ctx.fillText(ND, chartArea.left + 4, y); }
                else { ctx.fillStyle = INK; ctx.fillText(opts.fmt(v), meta.data[i].x + 5, y); }
            });
            ctx.restore();
        }
    };

    function addChart(host, height, config) {
        const box = document.createElement('div');
        box.className = 'viz-chart'; box.style.height = height + 'px';
        const cv = document.createElement('canvas');
        box.appendChild(cv); host.appendChild(box);
        config.plugins = (config.plugins || []).concat([valueLabels]);
        charts.push(new Chart(cv, config));
    }

    function baseOptions(fmt, labelsOn, legend) {
        return {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            layout: { padding: { right: labelsOn ? 40 : 6 } },
            plugins: {
                legend: legend ? { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, color: INK2, font: { family: FONT, size: 10.5 }, padding: 10 } } : { display: false },
                tooltip: { callbacks: { label: c => `${c.dataset.label ? c.dataset.label + ': ' : ''}${has(c.parsed.x) ? fmt(c.parsed.x) : ND}` } },
                valueLabels: { on: labelsOn, fmt }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: GRID }, border: { color: BASE }, ticks: { color: MUTED, font: { family: FONT, size: 10 }, precision: 0, callback: v => nf(v) } },
                y: { grid: { display: false }, border: { color: BASE }, ticks: { color: INK2, font: { family: FONT, size: 11 } } }
            }
        };
    }

    function title(host, t, sub) {
        const h = document.createElement('div'); h.className = 'viz-title'; h.textContent = t; host.appendChild(h);
        if (sub) { const s = document.createElement('div'); s.className = 'viz-sub'; s.textContent = sub; host.appendChild(s); }
    }

    function barSingle(host, t, sub, zone, key, fmt) {
        title(host, t, sub);
        const sorted = zone.slice().sort((a, b) => (has(b[key]) ? b[key] : -1) - (has(a[key]) ? a[key] : -1));
        addChart(host, sorted.length * 24 + 30, {
            type: 'bar',
            data: { labels: sorted.map(z => z.nome), datasets: [{ data: sorted.map(z => has(z[key]) ? z[key] : null), backgroundColor: COL.blue, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'start', barThickness: 14 }] },
            options: baseOptions(fmt, true, false)
        });
    }

    const SAC = [
        ['battesimi', 'Battesimi', COL.blue],
        ['comunioni', 'Comunioni / Cresime', COL.orange],
        ['matrimoni', 'Matrimoni', COL.aqua],
        ['funerali', 'Funerali', COL.yellow]
    ];

    function sacramenti(host, zone) {
        title(host, 'Sacramenti e funerali (2025)', 'Numero di celebrazioni. n.d. = dato non dichiarato');
        const f = v => nf(v);
        if (zone.length === 1) {
            const z = zone[0];
            addChart(host, SAC.length * 26 + 30, {
                type: 'bar',
                data: { labels: SAC.map(s => s[1]), datasets: [{ data: SAC.map(s => has(z[s[0]]) ? z[s[0]] : null), backgroundColor: COL.blue, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'start', barThickness: 14 }] },
                options: baseOptions(f, true, false)
            });
            return;
        }
        addChart(host, zone.length * 56 + 70, {
            type: 'bar',
            data: {
                labels: zone.map(z => z.nome),
                datasets: SAC.map(s => ({ label: s[1], data: zone.map(z => has(z[s[0]]) ? z[s[0]] : null), backgroundColor: s[2], borderColor: '#fff', borderWidth: 1, borderRadius: { topRight: 3, bottomRight: 3 }, borderSkipped: 'start', barThickness: 9 }))
            },
            options: baseOptions(f, false, true)
        });
        const senza = zone.filter(z => SAC.every(s => !has(z[s[0]]))).map(z => z.nome);
        if (senza.length) {
            const n = document.createElement('p'); n.className = 'viz-note';
            n.textContent = 'Nessun dato dichiarato: ' + senza.join(', ') + '.'; host.appendChild(n);
        }
    }

    function heat(host, zone) {
        title(host, 'Presenze sul territorio', 'Livello dichiarato dalla parrocchia');
        const cols = [['studenti', 'Studenti fuori sede'], ['industriali', 'Stabilimenti industriali'], ['commerciali', 'Esercizi commerciali']];
        const g = document.createElement('div'); g.className = 'viz-heat';
        g.style.gridTemplateColumns = (zone.length > 1 ? '92px ' : '') + 'repeat(3,1fr)';
        if (zone.length > 1) g.appendChild(document.createElement('div'));
        cols.forEach(c => { const h = document.createElement('div'); h.className = 'h'; h.textContent = c[1]; g.appendChild(h); });
        zone.forEach(z => {
            if (zone.length > 1) { const r = document.createElement('div'); r.className = 'r'; r.textContent = z.nome; g.appendChild(r); }
            cols.forEach(c => {
                const lv = findLevel(z[c[0]]);
                const d = document.createElement('div');
                if (lv) { d.className = 'c'; d.style.background = lv[1]; d.style.color = lv[2]; d.textContent = cap(String(z[c[0]]).toLowerCase()); }
                else { d.className = 'c nd'; d.textContent = ND; }
                d.title = `${z.nome} - ${c[1]}: ${lv ? String(z[c[0]]).toLowerCase() : ND}`;
                g.appendChild(d);
            });
        });
        host.appendChild(g);
        const lg = document.createElement('div'); lg.className = 'viz-legend';
        LEVELS.forEach(l => { const s = document.createElement('span'); s.innerHTML = `<i style="background:${l[1]}"></i>${cap(l[0])}`; lg.appendChild(s); });
        const s = document.createElement('span'); s.innerHTML = `<i style="background:#f1f5f9;border:1px dashed ${BASE}"></i>${ND}`; lg.appendChild(s);
        host.appendChild(lg);
    }

    function tiles(host, g) {
        const zone = g.zone, multi = zone.length > 1, cp = g.cp;
        const resTot = zone.reduce((a, z) => a + (has(z.residenti) ? z.residenti : 0), 0);
        const eta = wavg(zone, 'eta'), str = wavg(zone, 'stranieri');
        const T = [
            ['Residenti', nf(resTot), multi ? 'totale su ' + zone.length + ' parrocchie' : nf(resTot / cp.residenti * 100, 1) + '% della CP'],
            ['Et\u00e0 media', has(eta) ? nf(eta, 1) : ND, (multi ? 'anni, media ponderata' : 'anni (CP: ' + nf(cp.eta, 1) + ')')],
            ['Stranieri', has(str) ? nf(str, 1) + '%' : ND, multi ? 'media ponderata' : 'CP: ' + nf(cp.stranieri, 1) + '%']
        ];
        const w = document.createElement('div'); w.className = 'viz-tiles';
        T.forEach(t => { const d = document.createElement('div'); d.className = 'viz-tile'; d.innerHTML = `<div class="k">${t[0]}</div><div class="v">${t[1]}</div><div class="s">${t[2]}</div>`; w.appendChild(d); });
        host.appendChild(w);
    }

    function table(host, zone) {
        const d = document.createElement('details'); d.className = 'viz-details';
        const rows = zone.map(z => `<tr><td>${z.nome}</td><td>${has(z.residenti) ? nf(z.residenti) : ND}</td><td>${has(z.eta) ? nf(z.eta, 1) : ND}</td><td>${has(z.stranieri) ? nf(z.stranieri, 1) : ND}</td>` +
            SAC.map(s => `<td>${has(z[s[0]]) ? nf(z[s[0]]) : ND}</td>`).join('') + '</tr>').join('');
        d.innerHTML = '<summary>Tabella dei dati</summary><table><thead><tr><th>Zona</th><th>Resid.</th><th>Et\u00e0</th><th>Str. %</th><th>Bat.</th><th>Com./Cre.</th><th>Matr.</th><th>Fun.</th></tr></thead><tbody>' + rows + '</tbody></table>';
        host.appendChild(d);
    }

    window.distruggiGrafici = function () { charts.forEach(c => c.destroy()); charts = []; };

    window.renderGrafici = function (g, container) {
        window.distruggiGrafici();
        container.innerHTML = '';
        if (!g || !g.zone || !g.zone.length) {
            container.innerHTML = '<p style="color:#64748b;font-style:italic;">Dati per i grafici non disponibili per questa zona.</p>'; return;
        }
        if (typeof Chart === 'undefined') {
            container.innerHTML = '<p style="color:#64748b;font-style:italic;">Libreria grafici non caricata (serve la connessione internet).</p>'; return;
        }
        injectStyle();
        const host = document.createElement('div'); host.className = 'viz-root'; container.appendChild(host);
        const zone = g.zone, multi = zone.length > 1;
        tiles(host, g);
        if (multi) {
            barSingle(host, 'Residenti', null, zone, 'residenti', v => nf(v));
            barSingle(host, 'Et\u00e0 media', 'anni', zone, 'eta', v => nf(v, 1));
            barSingle(host, 'Stranieri', '% sui residenti', zone, 'stranieri', v => nf(v, 1) + '%');
        }
        sacramenti(host, zone);
        heat(host, zone);
        table(host, zone);
    };
})();
