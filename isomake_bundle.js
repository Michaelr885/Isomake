// --- armaturen.js --- 
// --- VEKTOREN, MATHEMATIK & BERECHNUNGEN ---
const L = 30;
const dx = L * (Math.sqrt(3) / 2);
const m30 = 1 / Math.sqrt(3);

const VECTORS = [
    { x: 0, y: -1 },
    { x: Math.sqrt(3) / 2, y: 0.5 },
    { x: -Math.sqrt(3) / 2, y: 0.5 }
];
const CROSS_VECTORS = [VECTORS[1], VECTORS[0], VECTORS[0]];

/**
 * Hilfsfunktion: Gibt den Vektor für die Hilfslinien einer Bemaßung zurück.
 * Unterstützt isometrische Achsen (0-2) und den Aligned-Modus (3).
 */
function getDimensionVector(dir, start, end) {
    if (dir === 3 && start && end) {
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        let len = Math.hypot(dx, dy) || 1;
        return { x: -dy / len, y: dx / len };
    }
    return VECTORS[dir] || VECTORS[0];
}

const SYMBOL_DIRS = [
    { v: VECTORS[0], c: VECTORS[1] }, { v: VECTORS[0], c: VECTORS[2] },
    { v: VECTORS[1], c: VECTORS[0] }, { v: VECTORS[1], c: VECTORS[2] },
    { v: VECTORS[2], c: VECTORS[0] }, { v: VECTORS[2], c: VECTORS[1] }
];

const SLOPE_DIRS = [
    { v: VECTORS[1], c: VECTORS[0] }, { v: { x: -VECTORS[1].x, y: -VECTORS[1].y }, c: VECTORS[0] },
    { v: VECTORS[2], c: VECTORS[0] }, { v: { x: -VECTORS[2].x, y: -VECTORS[2].y }, c: VECTORS[0] },
    { v: VECTORS[0], c: VECTORS[1] }, { v: { x: -VECTORS[0].x, y: -VECTORS[0].y }, c: VECTORS[1] }
];

/**
 * Hilfsfunktion: Quadriert eine Zahl.
 */
function sqr(x) { return x * x; }
/**
 * Hilfsfunktion: Berechnet das Quadrat der Entfernung zweier Punkte (bessere Ladezeit da keine Wurzel).
 */
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y); }
/**
 * Bestimmt den kürzesten geradlinigen Abstandsansatz (quadriert) von einem Punkt zu einer Linie.
 */
function distToSegmentSquared(p, v, w) {
    let l2 = dist2(v, w); if (l2 == 0) return dist2(p, v);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

/**
 * Prüft algebraisch, ob sich zwei gerade Linienzüge auf der Ebene schneiden.
 */
function segmentsIntersect(p1, p2, p3, p4) {
    function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

/**
 * Hilfsvektor-Findung, um querlaufende Vektoren orthogonal (im isometrischen Raum) zu einer Linie zu berechnen.
 */
function getCrossVector(dx, dy) {
    let len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return CROSS_VECTORS[0];
    let nx = dx / len; let ny = dy / len;
    let bestDot = -1; let bestIdx = 0;
    VECTORS.forEach((v, i) => {
        let dot = nx * v.x + ny * v.y;
        if (Math.abs(dot) > bestDot) { bestDot = Math.abs(dot); bestIdx = i; }
    });
    return CROSS_VECTORS[bestIdx];
}

/**
 * Entschlüsselt einen nummern-basierten "dir"-Index zurück in isometrische Vektorkomponenten V und C.
 */
function getRenderParams(dir) {
    let d = dir || 0;
    let baseDir = d % 6;
    let flipV = Math.floor(d / 6) % 2 === 1;
    let flipC = Math.floor(d / 12) % 2 === 1;

    let v = { x: SYMBOL_DIRS[baseDir].v.x, y: SYMBOL_DIRS[baseDir].v.y };
    let c = { x: SYMBOL_DIRS[baseDir].c.x, y: SYMBOL_DIRS[baseDir].c.y };

    if (flipV) { v.x = -v.x; v.y = -v.y; }
    if (flipC) { c.x = -c.x; c.y = -c.y; }

    return { v, c };
}

// --- ZEICHENFUNKTIONEN FÜR BAUTEILE ---
/**
 * Zeichnet das genormte Fließbild-Symbol einer Erweiterung / Reduzierung (Trichter).
 */
function drawReducer(ctx, start, end, type, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let dx = end.x - start.x; let dy = end.y - start.y; let len = Math.sqrt(dx * dx + dy * dy); if (len < 5) return;

    ctx.save(); ctx.translate(start.x + dx / 2, start.y + dy / 2);
    if (rotation && rotation !== 0) ctx.rotate(rotation * Math.PI / 180);
    
    // Wir nutzen hier eine Hilfsebene für die Reduzierung, falls rotiert oder im Aligned-Modus
    if (rotation !== 0) {
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 2;
        let S = 15; let W = 12;
        ctx.beginPath(); ctx.moveTo(-S, -W); ctx.lineTo(-S, W); ctx.lineTo(S, 0); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore(); return;
    }
    ctx.restore();

    let cross_v = getCrossVector(dx, dy); let D1 = 24; let p1, p2; let p3 = { x: end.x, y: end.y };

    if (type === 0) { p1 = { x: start.x + cross_v.x * D1 / 2, y: start.y + cross_v.y * D1 / 2 }; p2 = { x: start.x - cross_v.x * D1 / 2, y: start.y - cross_v.y * D1 / 2 }; }
    else if (type === 1) { p1 = { x: start.x + cross_v.x * D1, y: start.y + cross_v.y * D1 }; p2 = { x: start.x, y: start.y }; }
    else if (type === 2) { p1 = { x: start.x, y: start.y }; p2 = { x: start.x - cross_v.x * D1, y: start.y - cross_v.y * D1 }; }

    ctx.save(); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness || 2;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.restore();
}

// --- NEUE FUNKTIONEN FÜR ZUSATZ-WERKZEUGE ---
/**
 * Zeichnet den dicken Strömungspfeil (Pfeilspitze) entlang eines Vektors.
 */
function drawFlowArrow(ctx, x, y, dir, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 15; let W = 6;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.4)' : (color || '#212121');
        ctx.beginPath(); ctx.moveTo(S, 0); ctx.lineTo(-S, W); ctx.lineTo(-S, -W); ctx.closePath(); ctx.fill();
        ctx.restore(); return;
    }
    ctx.beginPath();
    ctx.moveTo(v.x * S, v.y * S); ctx.lineTo(-v.x * S + c.x * W, -v.y * S + c.y * W); ctx.lineTo(-v.x * S - c.x * W, -v.y * S - c.y * W); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.4)' : (color || '#212121'); ctx.fill();
    if (isExisting) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
}

/**
 * Erstellt das Hänger / Halterung Icon (Balken mit Ankerlinien).
 */
function drawSupport(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir);
    let S = 22; // Gesamtlänge der Halterung nach unten
    let W = 10; // Halbe Breite der Grundplatte
    let CW = 8; // Halbe Breite des Sattels am Rohr
    let CD = 5; // Tiefe des Sattels (Abstand vom Rohr-Zentrum)

    // Linienstärken für den CAD-Look
    let pipeLw = thickness || 4;
    let detailLw = 1.5; // Feine Linien für die Halterung
    let baseLw = 2.5;   // Etwas dickere Linie für die stabile Grundplatte

    ctx.save(); ctx.translate(x, y);

    // --- 2D FLAT MODUS (Manuell Rotiert) ---
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 1. Sattel (U-Form unter dem Rohr)
        ctx.lineWidth = detailLw;
        ctx.beginPath();
        ctx.moveTo(-CW, CD - 2); // Start knapp unter Leitungsmitte
        ctx.lineTo(-CW, CD);
        ctx.lineTo(CW, CD);
        ctx.lineTo(CW, CD - 2);
        ctx.stroke();

        // 2. Vertikale Stütze (Profil)
        ctx.beginPath();
        ctx.moveTo(0, CD);
        ctx.lineTo(0, S);
        ctx.stroke();

        // 3. Grundplatte (Boden/Stahlbau)
        ctx.lineWidth = baseLw;
        ctx.beginPath();
        ctx.moveTo(-W, S);
        ctx.lineTo(W, S);
        ctx.stroke();

        ctx.restore(); return;
    }

    // --- ISOMETRISCHER MODUS (Standard) ---
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isExisting) ctx.setLineDash([4, 4]);

    // 1. Sattel (U-Form in der Iso-Perspektive)
    ctx.lineWidth = detailLw;
    ctx.beginPath();
    ctx.moveTo(-v.x * CW + c.x * (CD - 2), -v.y * CW + c.y * (CD - 2)); // Linkes Horn
    ctx.lineTo(-v.x * CW + c.x * CD, -v.y * CW + c.y * CD);             // Boden Links
    ctx.lineTo(v.x * CW + c.x * CD, v.y * CW + c.y * CD);               // Boden Rechts
    ctx.lineTo(v.x * CW + c.x * (CD - 2), v.y * CW + c.y * (CD - 2));   // Rechtes Horn
    ctx.stroke();

    // 2. Stütze (Profil nach unten)
    ctx.beginPath();
    ctx.moveTo(c.x * CD, c.y * CD);
    ctx.lineTo(c.x * S, c.y * S);
    ctx.stroke();

    // 3. Grundplatte (parallel zum Rohr)
    ctx.lineWidth = baseLw;
    ctx.beginPath();
    ctx.moveTo(c.x * S - v.x * W, c.y * S - v.y * W);
    ctx.lineTo(c.x * S + v.x * W, c.y * S + v.y * W);
    ctx.stroke();

    // 4. CAD-Detail: Knotenbleche (Gussets) zur Stabilisierung
    ctx.lineWidth = 1.0; // Extra fein
    ctx.beginPath();
    ctx.moveTo(c.x * S - v.x * (W / 1.5), c.y * S - v.y * (W / 1.5));
    ctx.lineTo(c.x * (S - 5), c.y * (S - 5));
    ctx.lineTo(c.x * S + v.x * (W / 1.5), c.y * S + v.y * (W / 1.5));
    ctx.stroke();

    ctx.setLineDash([]); ctx.restore();
}

/**
 * Zeichnet das Höhensymbol-Fähnchen samt eingegebenem EL-Höhentext abwärts der Rohrachse.
 */
function drawElevationMarker(ctx, x, y, dir, text, color, isPreview = false, isExisting = false, rotation = 0) {
    let { c } = getRenderParams(dir); let S = 12;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, S); ctx.lineTo(5, S); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, S); ctx.lineTo(0, S * 3); ctx.stroke();
        if (text) { ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.font = '500 12px "Roboto", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(text, 5, S * 3); }
        ctx.restore(); return;
    }
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
    ctx.lineWidth = 1.5; if (isExisting) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(c.x * S - c.y * S * 0.5, c.y * S + c.x * S * 0.5); ctx.lineTo(c.x * S + c.y * S * 0.5, c.y * S - c.x * S * 0.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x * S, c.y * S); ctx.lineTo(c.x * S * 3, c.y * S * 3); ctx.stroke(); ctx.setLineDash([]);
    if (text) {
        ctx.save(); ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.font = '500 12px "Roboto", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.translate(c.x * S * 3, c.y * S * 3); let angle = (dir % 6 === 1 || dir % 6 === 4) ? -Math.PI / 6 : Math.PI / 6; ctx.rotate(angle);
        let lines = String(text).split('\n'); lines.forEach((line, i) => ctx.fillText(line, 2, -2 + (i * 14))); ctx.restore();
    }
    ctx.restore();
}

/**
 * Zeichnet den klassischen MSR/PI-Kringel samt Sensorlinie und Kennzeichennummer.
 */
function drawMSR(ctx, x, y, dir, text, color, isPreview = false, isExisting = false, rotation = 0) {
    let { c } = getRenderParams(dir); let S = 20; let R = 12;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, S); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, S + R, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-R, S + R); ctx.lineTo(R, S + R); ctx.stroke();
        if (text) {
            ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.font = '500 10px "Roboto", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            let parts = String(text).split('\n');
            if (parts.length > 0) ctx.fillText(parts[0], 0, S + R - 5);
            if (parts.length > 1) ctx.fillText(parts[1], 0, S + R + 5);
        }
        ctx.restore(); return;
    }
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.5;
    if (isExisting) ctx.setLineDash([4, 4]);
    let cx = c.x * S; let cy = c.y * S;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); ctx.setLineDash([]);
    if (text) {
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.font = '500 10px "Roboto", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let parts = String(text).split('\n');
        if (parts.length > 0) ctx.fillText(parts[0], cx, cy - 5);
        if (parts.length > 1) ctx.fillText(parts[1], cx, cy + 5);
    }
    ctx.restore();
}

/**
 * Konstruiert ein Dreieck mit gefülltem Hintergrund und strichlierten Schraffurlinien quer zur Richtung.
 */
function drawHatch(ctx, p1, p2, p3, dir, color, isPreview = false) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.6)'; ctx.fill(); ctx.clip();
    ctx.beginPath(); let hatchSpacing = 8; let v = VECTORS[dir]; let perp = { x: -v.y, y: v.x }; let diag = 2000;
    for (let i = -diag; i < diag; i += hatchSpacing) {
        let startX = p1.x + perp.x * i - v.x * diag; let startY = p1.y + perp.y * i - v.y * diag;
        let endX = p1.x + perp.x * i + v.x * diag; let endY = p1.y + perp.y * i + v.y * diag;
        ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
    }
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.5)' : color; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.stroke(); ctx.restore();
}

/**
 * Rendert eine parallel zur Leitung verlaufende Maßlinie samt Hilfslinien am Start/Ende und Maßzahl.
 */
function drawDimension(ctx, start, end, dir, dist, text, color, isPreview = false, cutLength = null, mainDir = null) {
    let p1, p2;
    let vExt = getDimensionVector(dir, start, end);

    if (dir === 3) {
        // --- PARALLELE BEMAẞUNG (ALIGNED) ---
        p1 = { x: start.x + vExt.x * dist, y: start.y + vExt.y * dist };
        p2 = { x: end.x + vExt.x * dist, y: end.y + vExt.y * dist };
    } else {
        let vMain = mainDir !== null ? VECTORS[mainDir] : null;

        if (vMain) {
            // --- PROJIZIERTE BEMAẞUNG (CAD-STIL) ---
            p1 = { x: start.x + vExt.x * dist, y: start.y + vExt.y * dist };
            let dx = end.x - p1.x;
            let dy = end.y - p1.y;
            let det = -vMain.x * vExt.y + vExt.x * vMain.y;
            if (Math.abs(det) < 0.001) {
                p2 = { x: end.x + vExt.x * dist, y: end.y + vExt.y * dist };
            } else {
                let t = (dx * (-vExt.y) - (-vExt.x) * dy) / det;
                p2 = { x: p1.x + vMain.x * t, y: p1.y + vMain.y * t };
            }
        } else {
            // --- KLASSISCHE BEMAẞUNG (DIREKT-VERSATZ) ---
            p1 = { x: start.x + vExt.x * dist, y: start.y + vExt.y * dist };
            p2 = { x: end.x + vExt.x * dist, y: end.y + vExt.y * dist };
        }
    }

    ctx.save();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1;

    // --- HILFSLINIEN (EXTENSION LINES) ---
    const drawExtLine = (from, to) => {
        let dx = to.x - from.x; let dy = to.y - from.y;
        let len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        let nx = dx / len; let ny = dy / len;
        ctx.beginPath();
        ctx.moveTo(from.x + nx * 5, from.y + ny * 5);
        ctx.lineTo(to.x + nx * 5, to.y + ny * 5);
        ctx.stroke();
    };

    drawExtLine(start, p1);
    drawExtLine(end, p2);

    // --- MAẞLINIE ---
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Pfeilspitzen
    let lineDx = p2.x - p1.x; let lineDy = p2.y - p1.y; let len = Math.sqrt(sqr(lineDx) + sqr(lineDy));
    if (len > 0) {
        let nx = lineDx / len; let ny = lineDy / len; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x + nx * 10 - ny * 3, p1.y + ny * 10 + nx * 3); ctx.lineTo(p1.x + nx * 10 + ny * 3, p1.y + ny * 10 - nx * 3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2.x - nx * 10 - ny * 3, p2.y - ny * 10 + nx * 3); ctx.lineTo(p2.x - nx * 10 + ny * 3, p2.y - ny * 10 - nx * 3); ctx.fill();
    }

    // Maßzahl-Text
    let mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }; ctx.translate(mid.x, mid.y);
    let angle = Math.atan2(lineDy, lineDx); if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
    if (Math.abs(angle - Math.PI / 2) < 0.05 || Math.abs(angle + Math.PI / 2) < 0.05) { angle = -Math.PI / 2; }

    ctx.rotate(angle); ctx.font = '500 15px "Roboto", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';

    if (layerVis.cutLengths && cutLength !== null) {
        ctx.save(); ctx.fillStyle = '#f57c00'; ctx.font = 'italic 13px "Roboto", Arial, sans-serif'; ctx.fillText(`( ${cutLength} )`, 0, -22); ctx.restore();
    }

    let textW = ctx.measureText(text).width;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-textW / 2 - 4, -18, textW + 8, 22);
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillText(text, 0, -3); ctx.restore();
}

/**
 * Zeichnet das klassische Fliegeln- / Absperrventil (zwei gegenüberliegende Dreiecke).
 */
function drawValve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 22;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 4;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-S, -S / 2); ctx.lineTo(-S, S / 2); ctx.closePath();
        ctx.moveTo(0, 0); ctx.lineTo(S, -S / 2); ctx.lineTo(S, S / 2); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -S); ctx.stroke();
        ctx.restore(); return;
    }
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(v.x * S + c.x * S * 0.5, v.y * S + c.y * S * 0.5); ctx.lineTo(v.x * S - c.x * S * 0.5, v.y * S - c.y * S * 0.5); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(-v.x * S + c.x * S * 0.5, -v.y * S + c.y * S * 0.5); ctx.lineTo(-v.x * S - c.x * S * 0.5, -v.y * S - c.y * S * 0.5); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

/**
 * Rendert ein 3-Wege-Ventil durch Ergänzung eines dritten Dreiecks an der Flankenseite.
 */
function draw3WayValve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 22;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 4;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-S, -S / 2); ctx.lineTo(-S, S / 2); ctx.closePath();
        ctx.moveTo(0, 0); ctx.lineTo(S, -S / 2); ctx.lineTo(S, S / 2); ctx.closePath();
        ctx.moveTo(0, 0); ctx.lineTo(-S / 2, S); ctx.lineTo(S / 2, S); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore(); return;
    }
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(v.x * S + c.x * S * 0.5, v.y * S + c.y * S * 0.5); ctx.lineTo(v.x * S - c.x * S * 0.5, v.y * S - c.y * S * 0.5); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(-v.x * S + c.x * S * 0.5, -v.y * S + c.y * S * 0.5); ctx.lineTo(-v.x * S - c.x * S * 0.5, -v.y * S - c.y * S * 0.5); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(c.x * S + v.x * S * 0.5, c.y * S + v.y * S * 0.5); ctx.lineTo(c.x * S - v.x * S * 0.5, c.y * S - v.y * S * 0.5); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

/**
 * Zeichnet das genormte Drosselklappen-Icon (rechteckig gefüllt, oft im Lüftungsbau parallel genutzt).
 */
function drawDamper(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 18; let W = 10;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 4;
        ctx.beginPath(); ctx.rect(-S, -W, S * 2, W * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-S, W); ctx.lineTo(S, -W); ctx.stroke();
        ctx.restore(); return;
    }

    ctx.beginPath();
    ctx.moveTo(v.x * S + c.x * W, v.y * S + c.y * W);
    ctx.lineTo(-v.x * S + c.x * W, -v.y * S + c.y * W);
    ctx.lineTo(-v.x * S - c.x * W, -v.y * S - c.y * W);
    ctx.lineTo(v.x * S - c.x * W, v.y * S - c.y * W);
    ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(v.x * S + c.x * W, v.y * S + c.y * W); ctx.lineTo(-v.x * S - c.x * W, -v.y * S - c.y * W);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, thickness > 4 ? 4 : 3, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    ctx.restore();
}

/**
 * Zeichnet ein Rückschlagventil-Symbol (Rechteck / Ventilbody mit Rückfluss-Querstrich).
 */
function drawCheckvalve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 18; let W = 10;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 4;
        ctx.beginPath(); ctx.rect(-S, -W, S * 2, W * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-S, W); ctx.lineTo(S, -W); ctx.stroke();
        ctx.beginPath(); ctx.arc(-S * 0.7, W * 0.7, 3, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
        ctx.restore(); return;
    }

    ctx.beginPath();
    ctx.moveTo(v.x * S + c.x * W, v.y * S + c.y * W);
    ctx.lineTo(-v.x * S + c.x * W, -v.y * S + c.y * W);
    ctx.lineTo(-v.x * S - c.x * W, -v.y * S - c.y * W);
    ctx.lineTo(v.x * S - c.x * W, v.y * S - c.y * W);
    ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(v.x * S + c.x * W, v.y * S + c.y * W); ctx.lineTo(-v.x * S - c.x * W, -v.y * S - c.y * W); ctx.stroke();
    ctx.beginPath(); ctx.arc(-v.x * S - c.x * W, -v.y * S - c.y * W, thickness > 4 ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); ctx.restore();
}

/**
 * Zeichnet das Sicherheitsventil-Symbol mit Auslass und rechtwinkligem Dreiecksaufbau.
 */
function drawSafetyValve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 18;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 4;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-S, -S / 2); ctx.lineTo(-S, S / 2); ctx.closePath();
        ctx.moveTo(0, 0); ctx.lineTo(-S / 2, S); ctx.lineTo(S / 2, S); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S, 0); ctx.stroke();
        ctx.lineWidth = (thickness || 4) * 0.5;
        for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(S * 0.3 * i, -5); ctx.lineTo(S * 0.3 * i, 5); ctx.stroke(); }
        ctx.restore(); return;
    }

    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(v.x * S + c.x * S * 0.5, v.y * S + c.y * S * 0.5); ctx.lineTo(v.x * S - c.x * S * 0.5, v.y * S - c.y * S * 0.5); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(c.x * S + v.x * S * 0.5, c.y * S + v.y * S * 0.5); ctx.lineTo(c.x * S - v.x * S * 0.5, c.y * S - v.y * S * 0.5); ctx.closePath();

    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-v.x * S * 1.2, -v.y * S * 1.2); ctx.stroke();
    ctx.lineWidth = (thickness || 4) * 0.5;
    for (let i = 1; i <= 3; i++) {
        let tx = -v.x * (S * 0.35 * i); let ty = -v.y * (S * 0.35 * i);
        ctx.beginPath(); ctx.moveTo(tx + c.x * 5, ty + c.y * 5); ctx.lineTo(tx - c.x * 5, ty - c.y * 5); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, thickness > 4 ? 4 : 3, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    ctx.restore();
}

/**
 * Malt das Standard-Schauglas inkl. Kreismitte über den Ventilen.
 */
function drawSightglass(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 22;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
        ctx.lineWidth = thickness || 4;
        ctx.beginPath(); ctx.rect(-S, -S / 2, S * 2, S); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, S * 0.35, 0, Math.PI * 2); ctx.stroke();
        ctx.restore(); return;
    }
    ctx.beginPath();
    ctx.moveTo(v.x * S + c.x * S * 0.5, v.y * S + c.y * S * 0.5); ctx.lineTo(-v.x * S + c.x * S * 0.5, -v.y * S + c.y * S * 0.5);
    ctx.lineTo(-v.x * S - c.x * S * 0.5, -v.y * S - c.y * S * 0.5); ctx.lineTo(v.x * S - c.x * S * 0.5, v.y * S - c.y * S * 0.5); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, S * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

/**
 * Erstellt den zig-zagförmigen Körper eines Ausdehnungskompensators.
 */
function drawCompensator(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 20; let W = 8;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.lineWidth = thickness || 4;
        ctx.beginPath(); ctx.moveTo(-S, 0); ctx.lineTo(S, 0); ctx.stroke();
        ctx.beginPath();
        for (let i = -3; i <= 3; i++) {
            ctx.moveTo(S * 0.25 * i, -W); ctx.lineTo(S * 0.25 * i, W);
        }
        ctx.stroke();
        ctx.restore(); return;
    }
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(-v.x * S, -v.y * S); ctx.lineTo(-v.x * S * 0.4, -v.y * S * 0.4);
    ctx.moveTo(v.x * S * 0.4, v.y * S * 0.4); ctx.lineTo(v.x * S, v.y * S);
    ctx.stroke();

    ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = -1.5; i <= 1.5; i += 1) {
        let px = v.x * S * 0.15 * i; let py = v.y * S * 0.15 * i;
        ctx.moveTo(px + c.x * W, py + c.y * W); ctx.lineTo(px - c.x * W, py - c.y * W);
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

/**
 * Zieht die einfache Querstrich-Markierung, die einen Flansch repräsentiert.
 */
function drawFlange(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { c } = getRenderParams(dir); let S = 20;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.5)' : color;
        ctx.lineWidth = (thickness || 4) * 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -S); ctx.lineTo(0, S); ctx.stroke();
        ctx.restore(); return;
    }
    ctx.beginPath(); ctx.moveTo(c.x * S, c.y * S); ctx.lineTo(-c.x * S, -c.y * S);
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.5)' : color; ctx.lineWidth = thickness; ctx.lineCap = 'round';
    if (isExisting) ctx.setLineDash([14, 12]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

/**
 * Zeichnet eine Clamp-Stutze (zwei parallele Klammerhälften, oben/unten verbunden).
 */
function drawClamp(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir);
    let S = 12; // Halbe Höhe des Clamps
    let W = 4;  // Halber Abstand der Flansche

    // Linienstärken aufteilen
    let pipeLw = thickness || 4;
    let flangeLw = Math.max(1.5, pipeLw * 0.6); // Etwas dünner als das Rohr
    let detailLw = 1.2; // Sehr feine Linie für die Klammer-Details

    ctx.save(); ctx.translate(x, y);

    // --- 2D FLAT MODUS (Manuell Rotiert) ---
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        // Flansche (mittlere Dicke)
        ctx.lineWidth = flangeLw;
        ctx.beginPath();
        ctx.moveTo(-W, -S); ctx.lineTo(-W, S);
        ctx.moveTo(W, -S); ctx.lineTo(W, S);
        ctx.stroke();

        // Trapez-Klammern (feine Dicke)
        ctx.lineWidth = detailLw;
        ctx.beginPath();
        ctx.moveTo(-W, -S); ctx.lineTo(-W - 2, -S - 3); ctx.lineTo(W + 2, -S - 3); ctx.lineTo(W, -S);
        ctx.moveTo(-W, S); ctx.lineTo(-W - 2, S + 3); ctx.lineTo(W + 2, S + 3); ctx.lineTo(W, S);
        ctx.stroke();

        ctx.restore(); return;
    }

    // --- ISOMETRISCHER MODUS (Standard) ---
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (isExisting) ctx.setLineDash([8, 8]);

    // Flansche (mittlere Dicke)
    ctx.lineWidth = flangeLw;
    ctx.beginPath();
    ctx.moveTo(-v.x * W + c.x * S, -v.y * W + c.y * S); ctx.lineTo(-v.x * W - c.x * S, -v.y * W - c.y * S);
    ctx.moveTo(v.x * W + c.x * S, v.y * W + c.y * S); ctx.lineTo(v.x * W - c.x * S, v.y * W - c.y * S);
    ctx.stroke();

    // Trapez-Klammern (feine Dicke)
    ctx.lineWidth = detailLw;
    ctx.beginPath();
    ctx.moveTo(-v.x * W + c.x * S, -v.y * W + c.y * S);
    ctx.lineTo(-v.x * (W + 2) + c.x * (S + 3), -v.y * (W + 2) + c.y * (S + 3));
    ctx.lineTo(v.x * (W + 2) + c.x * (S + 3), v.y * (W + 2) + c.y * (S + 3));
    ctx.lineTo(v.x * W + c.x * S, v.y * W + c.y * S);

    ctx.moveTo(-v.x * W - c.x * S, -v.y * W - c.y * S);
    ctx.lineTo(-v.x * (W + 2) - c.x * (S + 3), -v.y * (W + 2) - c.y * (S + 3));
    ctx.lineTo(v.x * (W + 2) - c.x * (S + 3), v.y * (W + 2) - c.y * (S + 3));
    ctx.lineTo(v.x * W - c.x * S, v.y * W - c.y * S);
    ctx.stroke();

    ctx.setLineDash([]); ctx.restore();
}
/**
 * Zeichnet eine Blind-Clamp (Seite mit X verschlossen).
 */
function drawBlindClamp(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir);
    let S = 12;
    let W = 4;

    // Linienstärken exakt wie beim normalen Clamp aufteilen
    let pipeLw = thickness || 4;
    let flangeLw = Math.max(1.5, pipeLw * 0.6); // Etwas dünner als das Rohr
    let detailLw = 1.2; // Sehr feine Linie für die Klammer-Details
    let capLw = pipeLw + 1; // Die Kappe ist minimal dicker als das Hauptrohr

    ctx.save(); ctx.translate(x, y);

    // --- 2D FLAT MODUS (Manuell Rotiert) ---
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Linker Flansch (normal)
        ctx.lineWidth = flangeLw;
        ctx.beginPath(); ctx.moveTo(-W, -S); ctx.lineTo(-W, S); ctx.stroke();

        // Trapez Oben & Unten
        ctx.lineWidth = detailLw;
        ctx.beginPath();
        ctx.moveTo(-W, -S); ctx.lineTo(-W - 2, -S - 3); ctx.lineTo(W + 2, -S - 3); ctx.lineTo(W, -S);
        ctx.moveTo(-W, S); ctx.lineTo(-W - 2, S + 3); ctx.lineTo(W + 2, S + 3); ctx.lineTo(W, S);
        ctx.stroke();

        // Rechter Flansch (Blind/Kappe - markant dicker)
        ctx.lineWidth = capLw;
        ctx.beginPath(); ctx.moveTo(W, -S); ctx.lineTo(W, S); ctx.stroke();

        // X Marker für Blindseite
        ctx.lineWidth = detailLw;
        ctx.beginPath();
        ctx.moveTo(W + 4, -3); ctx.lineTo(W + 10, 3);
        ctx.moveTo(W + 10, -3); ctx.lineTo(W + 4, 3);
        ctx.stroke();

        ctx.restore(); return;
    }

    // --- ISOMETRISCHER MODUS (Standard) ---
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isExisting) ctx.setLineDash([8, 8]);

    // Linker Flansch (-v) normal
    ctx.lineWidth = flangeLw;
    ctx.beginPath();
    ctx.moveTo(-v.x * W + c.x * S, -v.y * W + c.y * S);
    ctx.lineTo(-v.x * W - c.x * S, -v.y * W - c.y * S);
    ctx.stroke();

    // Trapez Oben (+c) & Unten (-c)
    ctx.lineWidth = detailLw;
    ctx.beginPath();
    ctx.moveTo(-v.x * W + c.x * S, -v.y * W + c.y * S);
    ctx.lineTo(-v.x * (W + 2) + c.x * (S + 3), -v.y * (W + 2) + c.y * (S + 3));
    ctx.lineTo(v.x * (W + 2) + c.x * (S + 3), v.y * (W + 2) + c.y * (S + 3));
    ctx.lineTo(v.x * W + c.x * S, v.y * W + c.y * S);

    ctx.moveTo(-v.x * W - c.x * S, -v.y * W - c.y * S);
    ctx.lineTo(-v.x * (W + 2) - c.x * (S + 3), -v.y * (W + 2) - c.y * (S + 3));
    ctx.lineTo(v.x * (W + 2) - c.x * (S + 3), v.y * (W + 2) - c.y * (S + 3));
    ctx.lineTo(v.x * W - c.x * S, v.y * W - c.y * S);
    ctx.stroke();

    // Rechter Flansch (+v) markant dicker (Kappe)
    ctx.lineWidth = capLw;
    ctx.beginPath();
    ctx.moveTo(v.x * W + c.x * S, v.y * W + c.y * S);
    ctx.lineTo(v.x * W - c.x * S, v.y * W - c.y * S);
    ctx.stroke();

    // X Marker für Blindseite in Isometrie
    ctx.lineWidth = detailLw;
    let bx = v.x * (W + 7);
    let by = v.y * (W + 7);
    ctx.beginPath();
    ctx.moveTo(bx + c.x * 3 + v.x * 3, by + c.y * 3 + v.y * 3);
    ctx.lineTo(bx - c.x * 3 - v.x * 3, by - c.y * 3 - v.y * 3);
    ctx.moveTo(bx - c.x * 3 + v.x * 3, by - c.y * 3 + v.y * 3);
    ctx.lineTo(bx + c.x * 3 - v.x * 3, by + c.y * 3 - v.y * 3);
    ctx.stroke();

    ctx.setLineDash([]); ctx.restore();
}


/**
 * Erstellt eine Kappe / Abschluss inkl. Flanschdicke am Leitungsende.
 */
function drawBlindcap(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir); let S = 12; let W = thickness + 6;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.lineWidth = thickness || 4;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
        ctx.lineWidth = (thickness || 4) + 4;
        ctx.beginPath(); ctx.moveTo(10, -W); ctx.lineTo(10, W); ctx.stroke();
        ctx.restore(); return;
    }
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(v.x * S, v.y * S); ctx.stroke();
    ctx.lineWidth = thickness + 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(v.x * S + c.x * W, v.y * S + c.y * W); ctx.lineTo(v.x * S - c.x * W, v.y * S - c.y * W); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
}

/**
 * Zeichnet den Nippel oder Anschweißvorgang durch konische, kleine Zacken an einem Flansch.
 */
function drawNipple(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir);
    let S = 15; // Gesamtlänge des Nippels
    let W = 9;  // Breite der Gewindestriche

    ctx.save(); ctx.translate(x, y);

    // --- 2D FLAT MODUS (Manuell Rotiert) ---
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;

        // 1. Basis-Rohrstück zeichnen
        ctx.lineWidth = thickness || 3.5;
        ctx.beginPath(); ctx.moveTo(-S, 0); ctx.lineTo(S, 0); ctx.stroke();
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(-S / 2, -W); ctx.lineTo(-S / 2, W);
        ctx.moveTo(0, -W); ctx.lineTo(0, W);
        ctx.moveTo(S / 2, -W); ctx.lineTo(S / 2, W);
        ctx.stroke();

        ctx.restore(); return;
    }

    // --- ISOMETRISCHER MODUS (Standard) ---
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    if (isExisting) ctx.setLineDash([8, 8]);

    // 1. Basis-Rohrstück zeichnen
    ctx.lineWidth = thickness || 4;
    ctx.beginPath();
    ctx.moveTo(-v.x * S, -v.y * S);
    ctx.lineTo(v.x * S, v.y * S);
    ctx.stroke();

    // 2. Quer-Striche (Gewinde) in isometrischer Flucht zeichnen
    ctx.lineWidth = 1.5; // Extra dünn
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
        let px = v.x * (S / 2 * i);
        let py = v.y * (S / 2 * i);
        ctx.moveTo(px + c.x * W, py + c.y * W);
        ctx.lineTo(px - c.x * W, py - c.y * W);
    }
    ctx.stroke();

    ctx.setLineDash([]); ctx.restore();
}

/**
 * Muffen-Symbolik: Rohrverdickung mit umschließenden Ecken.
 */
function drawSocket(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir);
    let S = 12; // Länge der Muffe
    let W = (thickness || 4) + 6; // Etwas breiter als das Rohr für die U-Form

    ctx.save(); ctx.translate(x, y);

    // --- 2D FLAT MODUS (Manuell Rotiert) ---
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
        ctx.lineWidth = thickness || 4;
        ctx.lineCap = 'square';

        // Flache U-Form (offen zur Leitungsmitte)
        ctx.beginPath();
        ctx.moveTo(S, -W);
        ctx.lineTo(-S, -W);
        ctx.lineTo(-S, W);
        ctx.lineTo(S, W);
        ctx.stroke();
        ctx.restore(); return;
    }

    // --- ISOMETRISCHER MODUS (Standard) ---
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    ctx.lineWidth = thickness || 4;
    ctx.lineCap = 'square';
    if (isExisting) ctx.setLineDash([8, 8]);

    // Isometrische U-Form
    ctx.beginPath();
    ctx.moveTo(v.x * S + c.x * W, v.y * S + c.y * W);       // Obere Kante Start
    ctx.lineTo(-v.x * S + c.x * W, -v.y * S + c.y * W);     // Rückwand Oben
    ctx.lineTo(-v.x * S - c.x * W, -v.y * S - c.y * W);     // Rückwand Unten
    ctx.lineTo(v.x * S - c.x * W, v.y * S - c.y * W);       // Untere Kante Start
    ctx.stroke();

    ctx.setLineDash([]); ctx.restore();
}

/**
 * Rendert die im Mini-Editor gespeicherte individuelle Geometrie-Form als Skalier-Icon.
 */
function drawCustom(ctx, el, color, isPreview = false, isExisting = false) {
    ctx.save(); ctx.translate(el.x, el.y); 
    let baseAngle = el.dir * (Math.PI / 3);
    let manualRotation = (el.rotation || 0) * (Math.PI / 180);
    ctx.rotate(baseAngle + manualRotation); 
    ctx.scale(el.scale, el.scale);
    if (isExisting) ctx.setLineDash([6, 6]);
    el.parts.forEach(p => {
        ctx.beginPath(); ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = 2;
        if (p.type === 'line') { ctx.moveTo(p.x1 - 100, p.y1 - 100); ctx.lineTo(p.x2 - 100, p.y2 - 100); }
        else if (p.type === 'rect') { ctx.rect(Math.min(p.x1, p.x2) - 100, Math.min(p.y1, p.y2) - 100, Math.abs(p.x2 - p.x1), Math.abs(p.y2 - p.y1)); }
        else if (p.type === 'circle') { let r = Math.sqrt(sqr(p.x2 - p.x1) + sqr(p.y2 - p.y1)); ctx.arc(p.x1 - 100, p.y1 - 100, r, 0, Math.PI * 2); }
        else if (p.type === 'triangle') { ctx.moveTo(p.x1 - 100, p.y2 - 100); ctx.lineTo((p.x1 + p.x2) / 2 - 100, p.y1 - 100); ctx.lineTo(p.x2 - 100, p.y2 - 100); ctx.closePath(); }
        ctx.stroke();
    });
    ctx.restore();
}

/**
 * Zeichnet das Dreieckssymbol, das Gefälle / Steigung visualisiert.
 */
function drawSlope(ctx, x, y, dir, color, isPreview = false, isExisting = false, rotation = 0) {
    if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) return;
    if (!SLOPE_DIRS[dir]) return;
    let v = SLOPE_DIRS[dir].v; let c = SLOPE_DIRS[dir].c; let S = 40; let H = 10;
    ctx.save(); ctx.translate(x, y);
    if (rotation && rotation !== 0) ctx.rotate(rotation * Math.PI / 180);
    
    ctx.beginPath();
    if (rotation !== 0) {
        ctx.moveTo(0, 0); ctx.lineTo(-S, 0); ctx.lineTo(-S, H);
    } else {
        ctx.moveTo(0, 0); ctx.lineTo(-v.x * S, -v.y * S); ctx.lineTo(-v.x * S + c.x * H, -v.y * S + c.y * H);
    }
    ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.4)' : color; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = 1; if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.restore();
}

/**
 * Platziert dynamischen Freitext in isometrischen Schräglagen auf dem Canvas.
 */
function drawText(ctx, text, x, y, dir, size, color, isPreview = false) {
    ctx.save(); ctx.translate(x + 8, y - 8); let angle = (dir === 1) ? -Math.PI / 6 : (dir === 2) ? Math.PI / 6 : (dir === 3) ? -Math.PI / 2 : 0;
    ctx.rotate(angle); ctx.font = `500 ${size}px "Roboto", Arial, sans-serif`; ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.5)' : color;
    let lines = String(text).split('\n'); let lineHeight = size * 1.2;
    lines.forEach((line, index) => { ctx.fillText(line, 0, index * lineHeight); }); ctx.restore();
}


/**
 * Stempelt den Schweißnaht- oder Positiv-Marker (runder Kreis mit Ziffer und Leitlinie).
 */
function drawNumber(ctx, startX, startY, endX, endY, text, color, isPreview = false) {
    ctx.save();
    if (isPreview) ctx.globalAlpha = 0.6;
    let actualColor = color || '#1976d2';
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.strokeStyle = actualColor; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(endX, endY, 14, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
    ctx.font = '500 14px "Roboto", Arial, sans-serif'; ctx.fillStyle = actualColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, endX, endY);
    ctx.restore();
}

/**
 * Zeichnet das Isolierungs-Symbol (schraffierte Box mit halbtransparentem Hintergrund).
 */
function drawInsulation(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false, rotation = 0) {
    let { v, c } = getRenderParams(dir);
    let S = 25; // Standardlänge der Isolierung
    let W = (thickness || 4) + 8; // Breite etwas großzügiger

    let hatchSpacing = 6;
    let detailLw = 0.8; // Extra feine Schraffur

    ctx.save(); ctx.translate(x, y);

    // --- 2D FLAT MODUS (Manuell Rotiert) ---
    if (rotation && rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
        ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : (color || '#212121');
        
        // Hintergrund: Semi-transparent weiß, damit das Rohr sichtbar bleibt
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath(); ctx.rect(-S, -W, S * 2, W * 2); ctx.fill();

        // Schraffur mit Clipping
        ctx.save(); ctx.clip();
        ctx.lineWidth = detailLw;
        ctx.beginPath();
        for (let i = -S - W * 2; i <= S + W * 2; i += hatchSpacing) {
            ctx.moveTo(i, -W); ctx.lineTo(i + W, W);
        }
        ctx.stroke(); ctx.restore();

        // Rahmen
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-S, -W, S * 2, W * 2);
        ctx.restore(); return;
    }

    // --- ISOMETRISCHER MODUS (Standard) ---
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : (color || '#212121');
    if (isExisting) ctx.setLineDash([4, 4]);

    let p1 = { x: v.x * S + c.x * W, y: v.y * S + c.y * W };
    let p2 = { x: -v.x * S + c.x * W, y: -v.y * S + c.y * W };
    let p3 = { x: -v.x * S - c.x * W, y: -v.y * S - c.y * W };
    let p4 = { x: v.x * S - c.x * W, y: v.y * S - c.y * W };

    // 1. Hintergrund-Füllung (Transparent)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    ctx.closePath(); ctx.fill();

    // 2. Schraffur
    ctx.save(); ctx.clip();
    ctx.lineWidth = detailLw;
    ctx.beginPath();
    let diag = 120; 
    for (let i = -diag; i <= diag; i += hatchSpacing) {
        ctx.moveTo(i - diag, -diag); ctx.lineTo(i + diag, diag);
    }
    ctx.stroke(); ctx.restore();

    // 3. Rahmen
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    ctx.closePath(); ctx.stroke();

    ctx.setLineDash([]); ctx.restore();
}; 
// --- main.js --- 
// --- ZUGRIFFSPRÜFUNG (Domain-Lock & Ablaufdatum) ---
(function () {
    const ALLOWED_HOSTNAME = 'michaelr885.github.io';
    const ALLOWED_FILE_PATHS = [
        'file:///C:/Users/Micha/OneDrive/002-Hobby/Software/Isomake/Auslagerung/Isomake-main/index.html',
        'file:///C:/Users/Rieth/OneDrive%20-%20Bilfinger/Desktop/MainFolder/011-Privat/Coding/Isomake-main/index.html'
    ];
    const EXPIRATION_DATE = new Date(atob('MjAyNi0wNS0zMQ==')).getTime();
    const currentHostname = window.location.hostname;
    const currentHref = window.location.href;
    const currentTime = Date.now();

    const isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
    const isAllowedFile = ALLOWED_FILE_PATHS.some(path => currentHref.startsWith(path));

    if (currentHostname !== ALLOWED_HOSTNAME && !isLocal && !isAllowedFile) {
        document.body.innerHTML = '<div style="background-color: #d32f2f; color: #ffffff; padding: 30px; text-align: center; font-family: sans-serif; font-size: 24px; border: 5px solid #b71c1c; border-radius: 10px; margin: 50px auto; max-width: 600px; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">❌ Zugriff verweigert - Offline-Nutzung untersagt</div>';
        throw new Error("Access Denied: Invalid Domain");
    }

    if (currentTime > EXPIRATION_DATE) {
        document.body.innerHTML = '<div style="background-color: #d32f2f; color: #ffffff; padding: 30px; text-align: center; font-family: sans-serif; font-size: 24px; border: 5px solid #b71c1c; border-radius: 10px; margin: 50px auto; max-width: 600px; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">⏱️ Lizenz abgelaufen - Bitte kontaktieren Sie den Entwickler</div>';
        throw new Error("License Expired");
    }
})();

/**
 * Evaluates a mathematical expression string (e.g., "400+100") and returns the result.
 * If the string is not a valid simple math expression, returns the original string.
 */
function evaluateMath(str) {
    if (typeof str !== 'string') return str;
    let trimmed = str.trim();
    if (!trimmed) return str;

    // Check if it looks like a math expression (contains +, -, *, /)
    // and only contains allowed characters (digits, operators, dots, parens, spaces)
    if (/[+\-*/]/.test(trimmed) && /^[0-9+\-*/.()\s]+$/.test(trimmed)) {
        try {
            // Function constructor is safer than eval()
            const result = new Function(`return ${trimmed}`)();
            if (typeof result === 'number' && isFinite(result)) {
                // Round to 2 decimal places if it's not an integer
                return Number.isInteger(result) ? String(result) : String(Math.round(result * 100) / 100);
            }
        } catch (e) { }
    }
    return str;
}


// --- GLOBALE VARIABLEN & EINSTELLUNGEN ---
const SECRET_PASSWORD = "";
let history = []; let redoStack = [];
let elements = [];
let currentTool = 'pipe';
let currentDir = 2; let currentTextDir = 0; let weldNumCounter = 1;
let currentDN = "DN 50";
let isAdvancedMode = true;
let isPrinting = false; // Neu: Globaler Druckstatus
let showGrid = true; let autoElbows = false; let showSizeInfo = false; let showBalloons = false;

// Dummy-Redraw (wird durch render.js überschrieben), um Fehler beim Laden zu vermeiden
var redraw = () => { };
window.smartSnapEnabled = true; // Neu: Toggle für Objektfang
let layerVis = { pipes: true, dims: true, texts: true, hatches: true, northArrow: true, cutLengths: false };
const globalColors = { pipe: '#212121', weld: '#212121', valve: '#212121', text: '#1976d2', grid: '#e0e0e0', balloon: '#1976d2', weldnum: '#0e4781' };
let activePaintColor = '#ff0000';

// --- ROHRKLASSEN (Pipe Classes) ---
let pipeClassData = [];
let activePipeClass = "";

// Fest integrierte Standard-Tabelle als CSV-Strings
const DEFAULT_PIPE_CLASSES_CSV = `Klasse;Bauteil;DN_1;DN_2;Laenge_1;Laenge_2
10HF01B1;Rohr;25;;;
10HF01B1;Rohr;50;;;
10HF01B1;Flansch;25;;40;
10HF01B1;Flansch;50;;45;
10HF01B1;Bogen;25;;38;38
10HF01B1;Bogen;50;;76;76
10HF01B1;T-Stueck;25;25;38;38
10HF01B1;T-Stueck;50;50;64;64
10HF01B1;Reduzierung;25;15;38;
10HF01B1;Reduzierung;50;25;51;`;

const bomNames = {
    'pipe': 'Rohrleitung', 'valve': 'Absperrventil', 'checkvalve': 'Rückschlagklappe',
    'flange': 'Flansch', 'reducer': 'Reduzierung', 'blindcap': 'Blindkappe',
    'nipple': 'Anschweißnippel', 'socket': 'Muffe', '3wayvalve': '3- Wege Ventil',
    'damper': 'Klappe', 'safetyvalve': 'Sicherheitsventil', 'compensator': 'Kompensator',
    'sightglass': 'Schauglas', 'weld': 'Schweißnaht', 'custom': 'Sonderteil'
};

// --- HISTORY LOGIK ---
/**
 * Speichert den aktuellen Zustand des Modells im History-Array für die Undo-Funktion ab.
 */
function pushState() {
    history.push(JSON.stringify({ elements: elements, weldNumCounter: weldNumCounter, titleBlock: titleBlock, logoPos: logoBgPos, logoSettings: { w: logoW, h: logoBgH }, northArrowPos: northArrowPos, northArrowDir: northArrowDir, layerVis: layerVis, format: currentFormat }));
    if (history.length > 50) history.shift(); redoStack = [];
}
/**
 * Macht die letzte Aktion rückgängig, indem der vorherige History-State geladen wird.
 */
function undo() {
    if (history.length <= 1) return; redoStack.push(history.pop()); const prev = JSON.parse(history[history.length - 1]);
    elements = prev.elements; weldNumCounter = prev.weldNumCounter; titleBlock = prev.titleBlock;
    if (prev.logoPos) logoBgPos = prev.logoPos; if (prev.logoSettings) { logoW = prev.logoSettings.w; logoBgH = prev.logoSettings.h; }
    if (prev.northArrowPos) northArrowPos = prev.northArrowPos;
    if (prev.northArrowDir !== undefined) northArrowDir = prev.northArrowDir;
    if (prev.layerVis) { layerVis = prev.layerVis; if (typeof updateLayerUI === 'function') updateLayerUI(); }
    if (prev.format && prev.format !== currentFormat) {
        setPaperFormat(prev.format);
        // Falls wir im Undo sind, wollen wir das UI-Element (Select) auch aktualisieren
        const fmtSelect = document.getElementById('formatSelect');
        if (fmtSelect) fmtSelect.value = prev.format;
    }
    selectedElementIndices = [];
    updateSelectionFlags();
    redraw();
}
/**
 * Wiederholt eine rückgängig gemachte Aktion anhand des Redo-Stacks.
 */
function redo() {
    if (redoStack.length === 0) return; const state = redoStack.pop(); history.push(state); const data = JSON.parse(state);
    elements = data.elements; weldNumCounter = data.weldNumCounter; titleBlock = data.titleBlock;
    if (data.logoPos) logoBgPos = data.logoPos; if (data.logoSettings) { logoW = data.logoSettings.w; logoBgH = data.logoSettings.h; }
    if (data.northArrowPos) northArrowPos = data.northArrowPos;
    if (data.northArrowDir !== undefined) northArrowDir = data.northArrowDir;
    if (data.layerVis) { layerVis = data.layerVis; if (typeof updateLayerUI === 'function') updateLayerUI(); }
    selectedElementIndices = [];
    updateSelectionFlags();
    redraw();
}

/**
 * Synchronisiert die .selected-Eigenschaft aller Elemente basierend auf selectedElementIndices.
 * Dies wird für die Snap-Engine benötigt, um markierte Elemente beim Fangen zu ignorieren.
 */
function updateSelectionFlags() {
    const selSet = new Set(selectedElementIndices);
    elements.forEach((el, idx) => {
        el.selected = selSet.has(idx);
    });
}

// --- CANVAS SETUP ---
const canvas = document.getElementById('isoCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
const textInput = document.getElementById('inlineTextInput');
const wrapper = document.getElementById('canvasWrapper');
let LOGICAL_WIDTH = 1587; let LOGICAL_HEIGHT = 1123; const PRINT_SCALE = 4;
let currentFormat = 'A4';
canvas.width = LOGICAL_WIDTH * PRINT_SCALE; canvas.height = LOGICAL_HEIGHT * PRINT_SCALE;
canvas.style.width = LOGICAL_WIDTH + 'px'; canvas.style.height = LOGICAL_HEIGHT + 'px';
ctx.scale(PRINT_SCALE, PRINT_SCALE);



const gridCanvas = document.createElement('canvas'); gridCanvas.width = LOGICAL_WIDTH * PRINT_SCALE; gridCanvas.height = LOGICAL_HEIGHT * PRINT_SCALE;
const gridCtx = gridCanvas.getContext('2d'); gridCtx.scale(PRINT_SCALE, PRINT_SCALE);
let isGridValid = false; let lastGridColor = null;

// --- PAN & ZOOM ---
let pzScale = 1; let pzPanX = 0; let pzPanY = 0; let isPanning = false; let panStartX = 0; let panStartY = 0;
/**
 * Wendet die Berechnungen für Panning und Zooming visuell mittels CSS Transform an.
 */
function applyPanZoom() {
    canvas.style.transform = `translate(${pzPanX}px, ${pzPanY}px) scale(${pzScale})`;
    redraw(); // Neu: Redraw auslösen für Culling-Update
}
/**
 * Setzt Zoom auf 100% und den Pan-Offset auf Null.
 */
function resetPanZoom() { pzScale = 1; pzPanX = 0; pzPanY = 0; applyPanZoom(); }

/**
 * Passt das Blatt so in das Fenster ein, dass es komplett sichtbar ist.
 */
function fitPanZoom() {
    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Um flexbox-Zentrierung zu berechnen: Transform resetten und messen
    canvas.style.transform = 'none';
    const cRect = canvas.getBoundingClientRect();
    const baseOffsetX = cRect.left - rect.left;
    const baseOffsetY = cRect.top - rect.top;

    const padding = 45; // Reduzierter Abstand, damit das Blatt größer gerendert wird
    const scaleX = (rect.width - padding) / LOGICAL_WIDTH;
    const scaleY = (rect.height - padding) / LOGICAL_HEIGHT;

    pzScale = Math.min(scaleX, scaleY);
    if (pzScale > 1) pzScale = 1; // Nur verkleinern, wenn nötig

    const targetX = (rect.width - (LOGICAL_WIDTH * pzScale)) / 2;
    let targetY = (rect.height - (LOGICAL_HEIGHT * pzScale)) / 2;
    if (targetY > 40) targetY = 40;

    // pzPan ist die Verschiebung auf Basis der CSS-Ausgangsposition
    pzPanX = targetX - baseOffsetX;
    pzPanY = targetY - baseOffsetY;

    applyPanZoom();
}

wrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; e.preventDefault();
    const rect = wrapper.getBoundingClientRect();
    let mouseX = e.clientX - rect.left; let mouseY = e.clientY - rect.top;
    let canvasX = (mouseX - pzPanX) / pzScale; let canvasY = (mouseY - pzPanY) / pzScale;
    pzScale *= (e.deltaY > 0 ? 0.9 : 1.1);
    pzPanX = mouseX - canvasX * pzScale; pzPanY = mouseY - canvasY * pzScale;
    applyPanZoom();
});

wrapper.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey && e.altKey)) {
        e.preventDefault(); isPanning = true; panStartX = e.clientX - pzPanX; panStartY = e.clientY - pzPanY; canvas.style.cursor = 'grabbing';
    }
});
window.addEventListener('mousemove', (e) => { if (isPanning) { pzPanX = e.clientX - panStartX; pzPanY = e.clientY - panStartY; applyPanZoom(); } });
window.addEventListener('mouseup', (e) => { if (isPanning) { isPanning = false; canvas.style.cursor = 'crosshair'; } });

/**
 * Rechnet die physischen Bildschirm-Koordinaten in das Koordinatensystem des HTML-Canvas um.
 */
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH, y: ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT };
}

// --- UTILITIES & SNAPPING ---
window.currentSnap = null;

/**
 * Berechnet den exakten Lot-Punkt und die Distanz von einem Punkt zu einer Linie.
 */
function getDistanceToSegment(px, py, x1, y1, x2, y2) {
    let l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), x: x1, y: y1 };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    let snapX = x1 + t * (x2 - x1);
    let snapY = y1 + t * (y2 - y1);
    return { dist: Math.hypot(px - snapX, py - snapY), x: snapX, y: snapY };
}

function autoSplitPipe(px, py) {
    for (let i = elements.length - 1; i >= 0; i--) {
        let el = elements[i];

        // ZWINGEND: Nur echte Rohre zerschneiden (verhindert das Zerschneiden von Bemaßungen/Linien)
        if (el.type === 'pipe' && typeof el.startX !== 'undefined' && typeof el.endX !== 'undefined') {
            let dStart = Math.hypot(px - el.startX, py - el.startY);
            let dEnd = Math.hypot(px - el.endX, py - el.endY);

            if (dStart > 2 && dEnd > 2) {
                let lineSnap = getDistanceToSegment(px, py, el.startX, el.startY, el.endX, el.endY);

                if (lineSnap.dist < 2) {
                    let newPipe = { ...el };
                    newPipe.startX = px;
                    newPipe.startY = py;

                    // Phantom-Daten beim Klonen restlos vernichten
                    delete newPipe.midX;
                    delete newPipe.midY;
                    delete newPipe.length;
                    delete el.midX;
                    delete el.midY;
                    delete el.length;

                    el.endX = px;
                    el.endY = py;

                    elements.push(newPipe);
                    break;
                }
            }
        }
    }
}

/**
 * Die Snap-Engine: Berechnet den besten Snap-Punkt basierend auf der Mausposition.
 * Priorität: Endpunkte > Mittelpunkte > Auf Linie > Raster
 */
function calculateSmartSnap(mouseX, mouseY, tool = 'pipe', e = null) {
    if (e && e.altKey) {
        window.currentSnap = { x: mouseX, y: mouseY, type: 'none' };
        return window.currentSnap;
    }

    // --- SPEZIALFALL: Schweißnaht-Nummern (Exklusiver Fang nur beim STARTEN der Nummerierung) ---
    // Wenn das Nummern-Tool aktiv ist und noch nicht gezeichnet wird, schnappen wir exklusiv auf Nähte.
    if ((tool === 'weldnum' || (typeof currentTool !== 'undefined' && currentTool === 'weldnum')) && !isDrawing) {
        const nahtSnapRadius = 40;
        let bestNahtSnap = null;
        let minNahtDist = nahtSnapRadius;

        elements.forEach(el => {
            if (el.selected) return;
            if (el.type === 'weld') {
                let d = Math.hypot(mouseX - el.x, mouseY - el.y);
                if (d < minNahtDist) {
                    minNahtDist = d;
                    bestNahtSnap = { x: el.x, y: el.y, type: 'endpoint', targetElement: el };
                }
            }
        });

        // Falls wir eine Naht gefangen haben, geben wir sie zurück und beenden. 
        if (bestNahtSnap) {
            window.currentSnap = bestNahtSnap;
            return bestNahtSnap;
        } else {
            // "Exklusiv": Wenn das Tool aktiv ist aber keine Naht nah genug, 
            // erzwingen wir "keinen Snap" (ignoriert Raster/Rohre), damit der User weiß, er hat keine Naht getroffen.
            window.currentSnap = { x: mouseX, y: mouseY, type: 'none' };
            return window.currentSnap;
        }
    }

    // --- SPEZIALFALL: Schweißnähte frei auf dem Rohr setzen ---
    if (window.currentTool === 'weld' && !window.smartSnapEnabled) {
        let bestPipeSnap = null;
        let minPipeDist = 30; // Fang-Radius in Pixeln

        elements.forEach(el => {
            if (el.selected) return;
            // Nur Linien-Elemente (also Rohre) prüfen
            if (typeof el.startX !== 'undefined' && typeof el.endX !== 'undefined') {
                let lineSnap = getDistanceToSegment(mouseX, mouseY, el.startX, el.startY, el.endX, el.endY);
                if (lineSnap.dist < minPipeDist) {
                    minPipeDist = lineSnap.dist;
                    bestPipeSnap = { x: lineSnap.x, y: lineSnap.y, type: 'online' };
                }
            }
        });

        // Wenn wir ein Rohr gefunden haben, snappen wir darauf und ignorieren das Raster komplett!
        if (bestPipeSnap) {
            window.currentSnap = bestPipeSnap;
            return bestPipeSnap;
        }
    }
    // --- ENDE SPEZIALFALL ---

    // --- ERWEITERTER FANG: Auch beim normalen Positionsnummer-Tool wollen wir Nähte leichter treffen ---
    if (tool === 'number' && !isDrawing) {
        const nahtSnapRadius = 40;
        let bestNahtSnap = null;
        let minNahtDist = nahtSnapRadius;

        elements.forEach(el => {
            if (el.selected) return;
            if (el.type === 'weld') {
                let d = Math.hypot(mouseX - el.x, mouseY - el.y);
                if (d < minNahtDist) {
                    minNahtDist = d;
                    bestNahtSnap = { x: el.x, y: el.y, type: 'endpoint', targetElement: el };
                }
            }
        });

        if (bestNahtSnap) {
            window.currentSnap = bestNahtSnap;
            return bestNahtSnap; // WICHTIG: Sofort zurückgeben, damit Rohre das nicht überschreiben!
        }
    }
    // --- ENDE SPEZIALFALL ---

    const snapRadius = 20;
    let bestSnap = null;
    let minSnapDist = snapRadius;

    // A) Objektfang (Nur wenn global aktiviert)
    if (window.smartSnapEnabled) {
        elements.forEach(el => {
            if (el.selected) return;
            // 0. Schweißnähte (Prio für Nummern-Tools)
            if (el.type === 'weld') {
                let d = Math.hypot(mouseX - el.x, mouseY - el.y);
                if (d < minSnapDist) {
                    minSnapDist = d;
                    bestSnap = { x: el.x, y: el.y, type: 'endpoint' };
                }
            }

            // 1. Linien-Bauteile (Rohre etc.)
            if (typeof el.startX !== 'undefined' && typeof el.endX !== 'undefined') {
                // Endpunkte
                let d1 = Math.hypot(mouseX - el.startX, mouseY - el.startY);
                let d2 = Math.hypot(mouseX - el.endX, mouseY - el.endY);
                if (d1 < minSnapDist) { minSnapDist = d1; bestSnap = { x: el.startX, y: el.startY, type: 'endpoint' }; }
                if (d2 < minSnapDist) { minSnapDist = d2; bestSnap = { x: el.endX, y: el.endY, type: 'endpoint' }; }

                // Mittelpunkt
                let midX = (el.startX + el.endX) / 2;
                let midY = (el.startY + el.endY) / 2;
                let dMid = Math.hypot(mouseX - midX, mouseY - midY);
                if (dMid < minSnapDist && (!bestSnap || bestSnap.type !== 'endpoint')) {
                    minSnapDist = dMid; bestSnap = { x: midX, y: midY, type: 'midpoint' };
                }

                // Auf der Linie (Lotrecht)
                let lineSnap = getDistanceToSegment(mouseX, mouseY, el.startX, el.startY, el.endX, el.endY);
                if (lineSnap.dist < minSnapDist && !bestSnap) {
                    minSnapDist = lineSnap.dist; bestSnap = { x: lineSnap.x, y: lineSnap.y, type: 'online' };
                }
            }
            // Punkt-Bauteile (Fittings etc.)
            else if (typeof el.x !== 'undefined' && el.type !== 'weld' && el.type !== 'text') {
                let d = Math.hypot(mouseX - el.x, mouseY - el.y);
                if (d < minSnapDist) { minSnapDist = d; bestSnap = { x: el.x, y: el.y, type: 'endpoint' }; }
            }
        });
    }

    // B) Rasterfang (Fallback oder wenn Objektfang aus)
    if (!bestSnap) {
        let snapL = L / 2;
        let snapDx = snapL * (Math.sqrt(3) / 2);
        let col = Math.round(mouseX / snapDx);
        let offsetY = (col % 2 !== 0) ? (snapL / 2) : 0;
        let row = Math.round((mouseY - offsetY) / snapL);
        let gridX = col * snapDx;
        let gridY = row * snapL + offsetY;
        bestSnap = { x: gridX, y: gridY, type: 'grid' };
    }

    window.currentSnap = bestSnap;
    return bestSnap;
}

/**
 * Wrapper für die alte getSmartSnappedPoint Funktion, nutzt nun die neue Snap-Engine.
 */
function getSmartSnappedPoint(x, y, tool = 'pipe', e = null) {
    let snap = calculateSmartSnap(x, y, tool, e);
    return { x: snap.x, y: snap.y };
}


/**
 * Prüft, ob und welches Canvas-Bauteil sich unter gegebener Mausposition befindet (Hit-Detection).
 */
function getHoveredElementIndex(p, preferPipe = false) {
    let minDist = Infinity; let closestIdx = -1; let bestPriority = -1;
    elements.forEach((el, idx) => {
        try {
            let d = Infinity; let priority = 2;
            if (el.type === 'pipe' || el.type === 'smartJump') { d = distToSegmentSquared(p, { x: el.startX, y: el.startY }, { x: el.endX, y: el.endY }); priority = preferPipe ? 10 : 0; }
            else if (el.type === 'reducer') { d = distToSegmentSquared(p, el.start, el.end); priority = 1; }
            else if (['weld', 'blindcap', 'nipple', 'flowarrow', 'support', 'elevation', 'msr', 'clamp', 'blindclamp', 'insulation'].includes(el.type)) d = dist2(p, { x: el.x, y: el.y });
            else if (['flange', 'socket'].includes(el.type)) { let { c } = getRenderParams(el.dir); let S = 20; d = distToSegmentSquared(p, { x: el.x + c.x * S, y: el.y + c.y * S }, { x: el.x - c.x * S, y: el.y - c.y * S }); }
            else if (['valve', 'sightglass', 'checkvalve', '3wayvalve', 'damper', 'safetyvalve', 'compensator'].includes(el.type)) { let { v } = getRenderParams(el.dir); let S = 22; d = distToSegmentSquared(p, { x: el.x + v.x * S, y: el.y + v.y * S }, { x: el.x - v.x * S, y: el.y - v.y * S }); }
            else if (el.type === 'slope') { let v = SLOPE_DIRS[el.dir].v; let S = 40; d = distToSegmentSquared(p, { x: el.x, y: el.y }, { x: el.x - v.x * S, y: el.y - v.y * S }); priority = 1; }
            else if (el.type === 'custom') d = dist2(p, { x: el.x, y: el.y });
            else if (el.type === 'text') { d = dist2(p, { x: el.x + 8, y: el.y - 8 }); priority = 3; }
            else if (el.type === 'number') { d = dist2(p, { x: el.endX, y: el.endY }); priority = 3; }
            else if (el.type === 'dimension') { let v = getDimensionVector(el.dir, el.start, el.end); d = distToSegmentSquared(p, { x: el.start.x + v.x * el.dist, y: el.start.y + v.y * el.dist }, { x: el.end.x + v.x * el.dist, y: el.end.y + v.y * el.dist }); priority = 0; }
            else if (el.type === 'hatch') {
                d = Math.min(distToSegmentSquared(p, el.p1, el.p2), distToSegmentSquared(p, el.p2, el.p3), distToSegmentSquared(p, el.p3, el.p1));
                // Falls d bereits klein ist oder wir grob im Dreieck liegen (sehr einfache Prüfung)
                let avgX = (el.p1.x + el.p2.x + el.p3.x) / 3; let avgY = (el.p1.y + el.p2.y + el.p3.y) / 3;
                if (dist2(p, { x: avgX, y: avgY }) < 400) d = Math.min(d, 100);
                priority = 0;
            }
            else if (el.type === 'revisionCloud') {
                priority = 1; if (el.path && el.path.length > 0) {
                    let dMin = Infinity; for (let i = 0; i < el.path.length; i++) dMin = Math.min(dMin, distToSegmentSquared(p, el.path[i], el.path[(i + 1) % el.path.length]));
                    let cx = 0, cy = 0; el.path.forEach(pt => { cx += pt.x; cy += pt.y; }); cx /= el.path.length; cy /= el.path.length;
                    let tx = el.tagX !== undefined ? el.tagX : cx; let ty = el.tagY !== undefined ? el.tagY : cy;
                    dMin = Math.min(dMin, dist2(p, { x: tx, y: ty })); d = dMin;
                } else { let xMin = Math.min(el.x1, el.x2), xMax = Math.max(el.x1, el.x2), yMin = Math.min(el.y1, el.y2), yMax = Math.max(el.y1, el.y2); if (p.x >= xMin - 10 && p.x <= xMax + 10 && p.y >= yMin - 10 && p.y <= yMax + 10) d = 100; }
            }
            else if (el.type === 'jumpbox') {
                priority = 1; d = dist2(p, el.start);
                let s = el.start, z = el.zPoint, e = el.end, h = s.y - z.y, vx = e.x - s.x, vy = e.y - s.y, cos30 = 0.866025;
                let w1 = (vx / (2 * cos30)) + vy, w2 = vy - (vx / (2 * cos30));
                let p0 = { x: s.x, y: s.y }, p1 = { x: s.x + w1 * cos30, y: s.y + w1 * 0.5 }, p3 = { x: s.x - w2 * cos30, y: s.y + w2 * 0.5 }, t3 = { x: p3.x, y: p3.y - h };
                if (el.valX) { let tx = el.tagXx ?? ((p0.x + p1.x) / 2 + 20), ty = el.tagXy ?? ((p0.y + p1.y) / 2 + 15); d = Math.min(d, dist2(p, { x: tx, y: ty })); }
                if (el.valY) { let tx = el.tagYx ?? ((p0.x + p3.x) / 2 - 20), ty = el.tagYy ?? ((p0.y + p3.y) / 2 + 15); d = Math.min(d, dist2(p, { x: tx, y: ty })); }
                if (el.valZ) { let tx = el.tagZx ?? ((p3.x + t3.x) / 2 - 20), ty = el.tagZy ?? ((p3.y + t3.y) / 2); d = Math.min(d, dist2(p, { x: tx, y: ty })); }
            }
            else if (el.type === 'balloon') { d = dist2(p, { x: el.bx, y: el.by }); priority = 4; }
            else if (el.type === 'weldnum') { d = dist2(p, { x: el.cx, y: el.cy }); priority = 4; }
            if (d < 900) { if (priority > bestPriority || (priority === bestPriority && d < minDist)) { bestPriority = priority; minDist = d; closestIdx = idx; } }
        } catch (err) { console.warn("Fehler bei Hover-Prüfung übersprungen:", el, err); }
    });
    return closestIdx;
}

// --- SMART BALLOON PLACEMENT ---
/**
 * Ermittelt optimale Ablagestellen für Stücklisten-Positionsnummern ohne Rohre zu stark zu überladen.
 */
function buildBalloonElements() {
    const bomResult = getBOMData(); const bomData = bomResult.bom; const posMap = bomResult.posMap; const virtualElements = bomResult.virtualElements || [];
    const SKIP = ['text', 'number', 'dimension', 'hatch', 'slope', 'elevation', 'msr', 'support', 'flowarrow', 'balloon'];
    let candidates = elements.filter(el => !SKIP.includes(el.type) && !el.isExisting).map(el => {
        let size = el.size || 'DN ?'; if (el.type === 'reducer' && el.size2) size += " / " + el.size2;
        let name = el.customName || bomNames[el.type] || el.type; if (el.type === 'pipe' && el.isHose) name = 'Schlauch';
        let ax, ay; if (el.type === 'pipe' || el.type === 'smartJump') { ax = (el.startX + el.endX) / 2; ay = (el.startY + el.endY) / 2; } else if (el.type === 'reducer') { ax = (el.start.x + el.end.x) / 2; ay = (el.start.y + el.end.y) / 2; } else { ax = el.x; ay = el.y; }
        return { key: size + " | " + name, ax, ay };
    });
    virtualElements.forEach(v => candidates.push({ key: v.size + " | " + v.name, ax: v.x, ay: v.y }));
    const pipes = elements.filter(el => el.type === 'pipe' || el.type === 'smartJump');
    const RADII = [40, 60, 85, 110]; const ANGLES = []; for (let i = 0; i < 12; i++) ANGLES.push((i * 2 * Math.PI) / 12);
    let placedBalloons = []; let newBalloons = [];
    candidates.forEach((cand) => {
        let posNum = posMap[cand.key] || 0; if (posNum === 0) return;
        let ax = cand.ax, ay = cand.ay; let bestBx = ax + 45, bestBy = ay - 45, bestScore = Infinity;
        for (let r of RADII) {
            for (let angle of ANGLES) {
                let bx = ax + r * Math.cos(angle); let by = ay + r * Math.sin(angle); let score = 0;
                for (let pipe of pipes) { let p1 = { x: pipe.startX, y: pipe.startY }, p2 = { x: pipe.endX, y: pipe.endY }; if (segmentsIntersect({ x: ax, y: ay }, { x: bx, y: by }, p1, p2)) score += 3; if (distToSegmentSquared({ x: bx, y: by }, p1, p2) < 20 * 20) score += 2; }
                for (let pb of placedBalloons) { let d = Math.sqrt((bx - pb.bx) * (bx - pb.bx) + (by - pb.by) * (by - pb.by)); if (d < 35) score += 4; }
                if (score < bestScore) { bestScore = score; bestBx = bx; bestBy = by; }
            }
            if (bestScore === 0) break;
        }
        placedBalloons.push({ bx: bestBx, by: bestBy }); newBalloons.push({ type: 'balloon', posNum: posNum, anchorX: ax, anchorY: ay, bx: bestBx, by: bestBy });
    });
    return newBalloons;
}

// --- AUTO-DIMENSION ---
/**
 * Sucht nach Rohren mit eingetragener Längenangabe, die noch keine Maßlinie haben, und bemast diese automatisch.
 */
function autoDimension() {
    let added = 0; let updated = 0; window.autoDimErrors = 0;
    elements.forEach(el => {
        if ((el.type === 'pipe' || el.type === 'smartJump') && el.realLength) {
            let existingDim = elements.find(d => d.type === 'dimension' && (
                (dist2(d.start, { x: el.startX, y: el.startY }) < 25 && dist2(d.end, { x: el.endX, y: el.endY }) < 25) ||
                (dist2(d.end, { x: el.startX, y: el.startY }) < 25 && dist2(d.start, { x: el.endX, y: el.endY }) < 25)
            ));

            let startDeduct = 0, endDeduct = 0, cLen = null;
            if (typeof getAttachedFittingLength === 'function') {
                let excludeV = (el.type === 'smartJump');
                startDeduct = getAttachedFittingLength({ x: el.startX, y: el.startY }, excludeV);
                endDeduct = getAttachedFittingLength({ x: el.endX, y: el.endY }, excludeV);

                let internalDeduct = 0;
                if (el.type === 'smartJump') {
                    const jumpRes = calculateSmartJump(el);
                    internalDeduct = 2 * (jumpRes.zMass || 0);
                }

                if (typeof activePipeClass !== 'undefined' && activePipeClass) {
                    cLen = parseFloat(el.realLength) - startDeduct - endDeduct - internalDeduct;
                    if (cLen !== null) cLen = Math.round(cLen * 10) / 10;
                }
            }

            let dimColor = (cLen !== null && cLen < 0) ? '#d32f2f' : globalColors.text;
            if (cLen !== null && cLen < 0) window.autoDimErrors++;

            if (!existingDim) {
                let dx = el.endX - el.startX; let dy = el.endY - el.startY;
                let len = Math.sqrt(dx * dx + dy * dy); if (len === 0) return;
                let nx = dx / len; let ny = dy / len; let bestIdx = 0; let bestDot = -1;
                VECTORS.forEach((v, i) => { let dot = nx * v.x + ny * v.y; if (Math.abs(dot) > bestDot) { bestDot = Math.abs(dot); bestIdx = i; } });
                let dirIdx = (bestIdx === 0) ? 1 : 0; let v = VECTORS[dirIdx]; let dists = [45, -45, 80, -80, 115, -115]; let bestDist = 60;
                for (let d of dists) {
                    let p1 = { x: el.startX + v.x * d, y: el.startY + v.y * d }; let p2 = { x: el.endX + v.x * d, y: el.endY + v.y * d };
                    let collision = elements.some(e2 => { if (e2.type === 'pipe') { let pp1 = { x: e2.startX, y: e2.startY }, pp2 = { x: e2.endX, y: e2.endY }; if (dist2(pp1, { x: el.startX, y: el.startY }) < 10 && dist2(pp2, { x: el.endX, y: el.endY }) < 10) return false; return segmentsIntersect(p1, p2, pp1, pp2); } return false; });
                    if (!collision) { bestDist = d; break; }
                }
                elements.push({ type: 'dimension', start: { x: el.startX, y: el.startY }, end: { x: el.endX, y: el.endY }, dir: dirIdx, dist: bestDist, text: String(el.realLength), color: dimColor, cutLength: cLen });
                added++;
            } else {
                if (existingDim.text !== String(el.realLength) || existingDim.color !== dimColor || existingDim.cutLength !== cLen) {
                    existingDim.text = String(el.realLength); existingDim.color = dimColor; existingDim.cutLength = cLen;
                    updated++;
                }
            }
        }
    });

    if (added > 0 || updated > 0) {
        pushState(); redraw();
        if (window.autoDimErrors > 0) showToast(`Bemaßung aktualisiert.\n\n⚠️ ACHTUNG: ${window.autoDimErrors} Maße sind zu kurz für die anliegenden Bauteile (rot markiert)!`, 'error');
    } else {
        if (window.autoDimErrors > 0) showToast(`Prüfung abgeschlossen.\n\n⚠️ ACHTUNG: Es gibt weiterhin ${window.autoDimErrors} zu kurze Maße!`, 'error');
        else showToast("Alle Bemaßungen sind bereits aktuell und gültig.", 'success');
    }
    window.autoDimErrors = 0;
}

/**
 * Sucht eine freie Position für die Schweißnaht-Nummer in konzentrischen Kreisen.
 */
function findFreeWeldPos(weldX, weldY) {
    const RADII = [40, 60, 80, 100, 120, 140];
    const ANGLES = [];
    for (let i = 0; i < 12; i++) ANGLES.push((i * 30 * Math.PI) / 180);
    const SAFE_DIST = 25; // Pufferradius

    for (let r of RADII) {
        for (let a of ANGLES) {
            let cx = weldX + r * Math.cos(a);
            let cy = weldY + r * Math.sin(a);
            let collision = false;

            for (let el of elements) {
                let d = Infinity;
                if (el.type === 'pipe') {
                    d = Math.sqrt(distToSegmentSquared({ x: cx, y: cy }, { x: el.startX, y: el.startY }, { x: el.endX, y: el.endY }));
                } else if (['valve', 'checkvalve', 'sightglass', 'flange', 'blindcap', 'nipple', 'socket', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'flowarrow', 'support', 'elevation', 'msr', 'weld', 'text', 'custom'].includes(el.type)) {
                    let ex = el.x !== undefined ? el.x : (el.startX !== undefined ? (el.startX + el.endX) / 2 : cx);
                    let ey = el.y !== undefined ? el.y : (el.startY !== undefined ? (el.startY + el.endY) / 2 : cy);
                    d = Math.sqrt(dist2({ x: cx, y: cy }, { x: ex, y: ey }));
                } else if (el.type === 'dimension') {
                    let v = getDimensionVector(el.dir, el.start, el.end);
                    let ds = { x: el.start.x + v.x * el.dist, y: el.start.y + v.y * el.dist };
                    let de = { x: el.end.x + v.x * el.dist, y: el.end.y + v.y * el.dist };
                    d = Math.sqrt(distToSegmentSquared({ x: cx, y: cy }, ds, de));
                } else if (el.type === 'balloon') {
                    d = Math.sqrt(dist2({ x: cx, y: cy }, { x: el.bx, y: el.by }));
                } else if (el.type === 'weldnum') {
                    d = Math.sqrt(dist2({ x: cx, y: cy }, { x: el.cx, y: el.cy }));
                }

                if (d < SAFE_DIST) { collision = true; break; }
            }
            if (!collision) return { cx, cy };
        }
    }
    return { cx: weldX + 45, cy: weldY - 45 }; // Fallback
}

/**
 * Inkrementelle automatische Durchnummerierung neuer Schweißnähte.
 */
function autoNumberWelds() {
    // 1. Vorhandene weldnum-Elemente analysieren, um die höchste Nummer zu finden
    let existingWeldNums = elements.filter(el => el.type === 'weldnum');
    let maxNum = 0;
    existingWeldNums.forEach(wn => {
        let n = parseInt(wn.text);
        if (!isNaN(n) && n > maxNum) maxNum = n;
    });

    // Hilfsfunktion zur Prüfung, ob eine Schweißnaht bereits nummeriert ist (30px Toleranz)
    const hasExistingNumber = (weld) => {
        return existingWeldNums.some(wn => {
            let wx = (wn.weldX !== undefined) ? wn.weldX : wn.cx;
            let wy = (wn.weldY !== undefined) ? wn.weldY : wn.cy;
            return Math.hypot(weld.x - wx, weld.y - wy) < 5; // Verringerter Radius für eng liegende Nähte (z.B. Flansch-Flansch)
        });
    };

    let newCount = 0;
    let startMaxNum = maxNum;

    // 2. Chronologische Verarbeitung durch das elements-Array
    // Da neue Elemente hinten angehängt werden, entspricht dies der Erstellungsreihenfolge.
    // Wir nutzen eine Kopie des Arrays für die Iteration, da wir währenddessen neue Elemente an elements anhängen.
    const elementsSnapshot = [...elements];

    elementsSnapshot.forEach(el => {
        // 3. Filterung & Nummerierung
        if (el.type === 'weld' && !hasExistingNumber(el)) {
            maxNum++;
            newCount++;

            // Nutze findFreeWeldPos für kollisionsfreie Platzierung
            let pos = findFreeWeldPos(el.x, el.y);

            let newWeldNum = {
                type: 'weldnum',
                weldX: el.x,
                weldY: el.y,
                cx: pos.cx,
                cy: pos.cy,
                text: String(maxNum),
                number: String(maxNum), // Alias für Abwärtskompatibilität
                radius: 14,
                width: 28,
                height: 28,
                color: globalColors.weldnum
            };

            elements.push(newWeldNum);

            // Neue Nummer sofort in die Liste der existierenden aufnehmen, 
            // um Dubletten bei der Bestandsprüfung im gleichen Durchlauf zu ignorieren
            existingWeldNums.push(newWeldNum);
        }
    });

    if (newCount === 0) {
        const msg = "ℹ️ Alle Schweißnähte sind bereits nummeriert.";
        const hintEl = document.getElementById('dirHint');
        if (hintEl) {
            hintEl.innerText = msg;
            hintEl.style.display = 'block';
            setTimeout(() => { hintEl.style.display = 'none'; }, 3000);
        } else { showToast(msg); }
        return;
    }

    // 4. Status speichern und aktualisieren
    pushState();
    redraw();

    const msg = `✅ ${newCount} neue Schweißnähte erfolgreich nummeriert (ab Nr. ${startMaxNum + 1}).`;
    const hintEl = document.getElementById('dirHint');
    if (hintEl) {
        hintEl.innerText = msg;
        hintEl.style.display = 'block';
        setTimeout(() => { hintEl.style.display = 'none'; }, 5000);
    } else { showToast(msg, 'success'); }
}

// --- LOGO LOGIK ---
const logoImg = new Image(); logoImg.src = 'abs-referenzlogos-bilfinger.png';
let isLogoLoaded = false; let logoBgPos = { x: 38, y: 75 }; let logoW = 380; let logoBgH = 90; let isDraggingLogo = false;
logoImg.onload = () => { isLogoLoaded = true; redraw(); };

// --- NORDPFEIL LOGIK ---
let northArrowPos = { x: LOGICAL_WIDTH - 80, y: 100 };
let isDraggingNorthArrow = false;
let northArrowDir = 2;

// --- TITLE BLOCK ---
let titleBlock = { kunde: "", gebaeude: "", auftrag: "", bezeichnung: "", isoNr: "", werkstoff: "", beizen: false, spuelen: false, roentgen: "", druckprobe: "", gezName: "", datum: "" };
const TB_W = 480; const TB_H = 200; 
let TB_X = LOGICAL_WIDTH - 38 - TB_W; 
let TB_Y = LOGICAL_HEIGHT - 38 - TB_H;
const TB_CELLS = {
    kunde: { x: 0, y: 0, w: 480, h: 35 }, gebaeude: { x: 0, y: 35, w: 240, h: 35 }, auftrag: { x: 240, y: 35, w: 240, h: 35 },
    bezeichnung: { x: 0, y: 70, w: 320, h: 35 }, werkstoff: { x: 320, y: 70, w: 160, h: 35 }, isoNr: { x: 0, y: 105, w: 480, h: 35 },
    beizen: { x: 0, y: 140, w: 120, h: 30 }, spuelen: { x: 0, y: 170, w: 120, h: 30 }, roentgen: { x: 120, y: 140, w: 180, h: 30 },
    druckprobe: { x: 120, y: 170, w: 180, h: 30 }, gezName: { x: 300, y: 140, w: 180, h: 30 }, datum: { x: 300, y: 170, w: 180, h: 30 }
};
let hoveredTitleBlockField = null; let editingTitleBlockField = null;
/**
 * Gibt das Namens-Layout-Feld zurück (z.B. "kunde"), auf das der User im Plankopf geklickt hat.
 */
function getTitleBlockField(x, y) {
    if (x < TB_X || x > TB_X + TB_W || y < TB_Y || y > TB_Y + TB_H) return null;
    let lx = x - TB_X; let ly = y - TB_Y;
    for (let key in TB_CELLS) { let c = TB_CELLS[key]; if (lx >= c.x && lx < c.x + c.w && ly >= c.y && ly < c.y + c.h) return key; }
    return null;
}

/**
 * Wechselt das Papierformat zwischen DIN A4 und DIN A3.
 * Passt die logische Auflösung und die Positionen der UI-Elemente an.
 */
function setPaperFormat(format) {
    if (format === 'A3') {
        LOGICAL_WIDTH = 2245;
        LOGICAL_HEIGHT = 1588;
        currentFormat = 'A3';
    } else {
        LOGICAL_WIDTH = 1587;
        LOGICAL_HEIGHT = 1123;
        currentFormat = 'A4';
    }

    // Canvas-Größen aktualisieren
    canvas.width = LOGICAL_WIDTH * PRINT_SCALE;
    canvas.height = LOGICAL_HEIGHT * PRINT_SCALE;
    canvas.style.width = LOGICAL_WIDTH + 'px';
    canvas.style.height = LOGICAL_HEIGHT + 'px';
    ctx.scale(PRINT_SCALE, PRINT_SCALE);

    gridCanvas.width = LOGICAL_WIDTH * PRINT_SCALE;
    gridCanvas.height = LOGICAL_HEIGHT * PRINT_SCALE;
    gridCtx.scale(PRINT_SCALE, PRINT_SCALE);
    isGridValid = false;

    // Relative Positionen aktualisieren
    TB_X = LOGICAL_WIDTH - 38 - TB_W;
    TB_Y = LOGICAL_HEIGHT - 38 - TB_H;
    northArrowPos.x = LOGICAL_WIDTH - 80;

    fitPanZoom();
    redraw();
}

// --- STATE & TOOLS ---
/**
 * Generiert die nächsthöhere freie Nummer für Schweißnähte oder generische Positionen.
 */
function getNextNumber() { let usedNums = elements.filter(el => el.type === 'number').map(el => parseInt(el.text)).filter(n => !isNaN(n)); let next = 1; while (usedNums.includes(next)) next++; return next; }
function getNextWeldNumber() { let usedNums = elements.filter(el => el.type === 'weldnum').map(el => parseInt(el.text)).filter(n => !isNaN(n)); let next = 1; while (usedNums.includes(next)) next++; return next; }
let dimStep = 0; let dimStart = null; let dimEnd = null; let dimDir = 0; let dimMainDir = 0; let dimDist = 50; let pendingDimension = null;
let hatchStep = 0; let hatchStart = null; let hatchCorner = null; let hatchDir = 0;
let jumpboxStep = 0; let jumpboxStart = null; let jumpboxZ = null;
let reducerStep = 0; let reducerStart = null; let reducerType = 0;
let editingElementIndex = -1; let pendingCustomPart = null; let pendingSpecialTool = null;
let selectedElementIndices = []; let isSelecting = false; let selectionStart = { x: 0, y: 0 };
let isDraggingGroup = false; let groupDragOriginals = []; let dragStartSnapped = { x: 0, y: 0 }; let clipboard = [];
let dragStartMousePos = { x: 0, y: 0 }; let hasMoved = false; let dragOffset = { x: 0, y: 0 };
let isDrawing = false; let startPoint = null; let currentPoint = null;
let revisionCloudCurrentPath = []; let isDraggingRevisionTag = false; let jumpboxDragTag = null;
let lastMousePos = { x: 0, y: 0 }; let pendingTextPos = null; let hoveredElementIndex = -1;
let isPasting = false; let pastingElements = []; let pasteGrabPoint = { x: 0, y: 0 };

// --- MINI EDITOR ---
const miniCanvas = document.getElementById('miniCanvas'); const mCtx = miniCanvas.getContext('2d');
let miniElements = []; let miniCurrentTool = 'line'; let mIsDrawing = false; let mStartPoint = null; let mCurrentPoint = null;
/**
 * Legt das aktive Zeichenwerkzeug für den Mini-Editor (Sonderteile) fest.
 */
function setMiniTool(tool) { miniCurrentTool = tool; document.querySelectorAll('.mini-tools button').forEach(b => b.classList.remove('active')); document.getElementById('miniBtn' + tool.charAt(0).toUpperCase() + tool.slice(1)).classList.add('active'); }
/**
 * Löscht die Skizze des Sonderbauteils.
 */
function clearMiniCanvas() { miniElements = []; redrawMini(); }
/**
 * Snapping-Funktion speziell für das winzige isometrische Raster des Mini-Editors.
 */
function getMiniSnap(x, y) { let L_mini = 20; let dx_mini = L_mini * (Math.sqrt(3) / 2); let relX = x - 100, relY = y - 100; let col = Math.round(relX / dx_mini); let offsetY = (Math.abs(col) % 2 === 1) ? (L_mini / 2) : 0; let row = Math.round((relY - offsetY) / L_mini); return { x: 100 + col * dx_mini, y: 100 + row * L_mini + offsetY }; }
/**
 * Zeichnet das isometrische Hilfsraster im Mini-Editor.
 */
function drawMiniGrid() { mCtx.strokeStyle = '#e2e8f0'; mCtx.lineWidth = 1; mCtx.beginPath(); let L_mini = 20; let dx_mini = L_mini * (Math.sqrt(3) / 2); for (let i = 0; i <= 6; i++) { mCtx.moveTo(100 + i * dx_mini, 0); mCtx.lineTo(100 + i * dx_mini, 200); mCtx.moveTo(100 - i * dx_mini, 0); mCtx.lineTo(100 - i * dx_mini, 200); } for (let i = -15; i <= 15; i++) { let y30 = 1 / Math.sqrt(3) * (0 - 100) + 100 + i * L_mini; mCtx.moveTo(0, y30); mCtx.lineTo(200, 1 / Math.sqrt(3) * (200 - 100) + 100 + i * L_mini); mCtx.moveTo(0, -1 / Math.sqrt(3) * (0 - 100) + 100 + i * L_mini); mCtx.lineTo(200, -1 / Math.sqrt(3) * (200 - 100) + 100 + i * L_mini); } mCtx.stroke(); mCtx.strokeStyle = '#ef4444'; mCtx.lineWidth = 2; mCtx.beginPath(); mCtx.moveTo(90, 100); mCtx.lineTo(110, 100); mCtx.moveTo(100, 90); mCtx.lineTo(100, 110); mCtx.stroke(); }
/**
 * Hilfsfunktion, um Linien, Kreise, etc. auf den MiniCanvas zu zeichnen.
 */
function drawMiniShape(ctx, el, isPreview = false) { ctx.strokeStyle = isPreview ? '#3b82f6' : '#0f172a'; ctx.lineWidth = 3; ctx.beginPath(); if (el.type === 'line') { ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); } else if (el.type === 'rect') { ctx.rect(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1)); } else if (el.type === 'circle') { ctx.arc(el.x1, el.y1, Math.sqrt(sqr(el.x2 - el.x1) + sqr(el.y2 - el.y1)), 0, Math.PI * 2); } else if (el.type === 'triangle') { ctx.moveTo(el.x1, el.y2); ctx.lineTo((el.x1 + el.x2) / 2, el.y1); ctx.lineTo(el.x2, el.y2); ctx.closePath(); } ctx.stroke(); }
/**
 * Aktualisiert die Anzeige des Mini-Canvas.
 */
function redrawMini() { mCtx.clearRect(0, 0, 200, 200); drawMiniGrid(); miniElements.forEach(el => drawMiniShape(mCtx, el)); if (mIsDrawing) drawMiniShape(mCtx, { type: miniCurrentTool, x1: mStartPoint.x, y1: mStartPoint.y, x2: mCurrentPoint.x, y2: mCurrentPoint.y }, true); }
miniCanvas.addEventListener('mousedown', (e) => { const rect = miniCanvas.getBoundingClientRect(); mStartPoint = getMiniSnap(e.clientX - rect.left, e.clientY - rect.top); mIsDrawing = true; });
miniCanvas.addEventListener('mousemove', (e) => { if (!mIsDrawing) return; const rect = miniCanvas.getBoundingClientRect(); mCurrentPoint = getMiniSnap(e.clientX - rect.left, e.clientY - rect.top); redrawMini(); });
miniCanvas.addEventListener('mouseup', (e) => { if (!mIsDrawing) return; mIsDrawing = false; const rect = miniCanvas.getBoundingClientRect(); let endPt = getMiniSnap(e.clientX - rect.left, e.clientY - rect.top); if (mStartPoint.x !== endPt.x || mStartPoint.y !== endPt.y) miniElements.push({ type: miniCurrentTool, x1: mStartPoint.x, y1: mStartPoint.y, x2: endPt.x, y2: endPt.y }); redrawMini(); });

/**
 * Übernimmt die gemalte Skizze aus dem Mini-Editor für den großen Canvas.
 */
function insertCustomPart() { if (miniElements.length === 0) return showToast('Bitte zeichne zuerst etwas!', 'error'); pendingCustomPart = JSON.parse(JSON.stringify(miniElements)); closeModals(); setTool('custom'); }

// --- HEAL LOGIK ---
/**
 * Versucht beim Löschen einer Armatur die Rohrstücke wieder zusammenzufügen.
 */
function autoHealErase(idx) {
    const el = elements[idx]; const FITTING_TYPES = ['valve', 'checkvalve', 'sightglass', 'flange', 'blindcap', 'nipple', 'socket', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'reducer', 'weld'];
    if (!FITTING_TYPES.includes(el.type)) return elements.splice(idx, 1);
    let fx = el.x !== undefined ? el.x : ((el.start ? el.start.x : el.startX) + (el.end ? el.end.x : el.endX)) / 2;
    let fy = el.y !== undefined ? el.y : ((el.start ? el.start.y : el.startY) + (el.end ? el.end.y : el.endY)) / 2;
    const TOL = 20; let nearPipes = [];
    elements.forEach((e2, i2) => { if (i2 === idx || e2.type !== 'pipe') return; let dStart = dist2({ x: fx, y: fy }, { x: e2.startX, y: e2.startY }), dEnd = dist2({ x: fx, y: fy }, { x: e2.endX, y: e2.endY }); if (dStart < TOL * TOL) nearPipes.push({ idx: i2, pipe: e2, end: 'start' }); else if (dEnd < TOL * TOL) nearPipes.push({ idx: i2, pipe: e2, end: 'end' }); });
    if (nearPipes.length === 2) {
        let a = nearPipes[0], b = nearPipes[1]; let va = a.end === 'start' ? { x: a.pipe.endX - a.pipe.startX, y: a.pipe.endY - a.pipe.startY } : { x: a.pipe.startX - a.pipe.endX, y: a.pipe.startY - a.pipe.endY };
        let vb = b.end === 'start' ? { x: b.pipe.endX - b.pipe.startX, y: b.pipe.endY - b.pipe.startY } : { x: b.pipe.startX - b.pipe.endX, y: b.pipe.startY - b.pipe.endY };
        let lenA = Math.sqrt(va.x * va.x + va.y * va.y), lenB = Math.sqrt(vb.x * vb.x + vb.y * vb.y);
        if (lenA > 0 && lenB > 0 && ((va.x / lenA) * (vb.x / lenB) + (va.y / lenA) * (vb.y / lenB)) < -0.98) {
            let ptA = a.end === 'start' ? { x: a.pipe.endX, y: a.pipe.endY } : { x: a.pipe.startX, y: a.pipe.startY }, ptB = b.end === 'start' ? { x: b.pipe.endX, y: b.pipe.endY } : { x: b.pipe.startX, y: b.pipe.startY };
            let merged = JSON.parse(JSON.stringify(a.pipe)); merged.startX = ptA.x; merged.startY = ptA.y; merged.endX = ptB.x; merged.endY = ptB.y;
            [idx, a.idx, b.idx].sort((x, y) => y - x).forEach(i => elements.splice(i, 1)); elements.push(merged); return;
        }
    }
    elements.splice(idx, 1);
}

/**
 * Erkennt, wenn man eine Armatur mitten auf eine Linie setzt, und zerschneidet sie inkl. Flansch-Paar.
 */
function tryValveSplit(snapped, toolType) {
    const SEG_TOL2 = 10 * 10, END_SAFE = L * 1.5;
    for (let i = 0; i < elements.length; i++) {
        let p = elements[i]; if (p.type !== 'pipe') continue;
        if (distToSegmentSquared(snapped, { x: p.startX, y: p.startY }, { x: p.endX, y: p.endY }) > SEG_TOL2) continue;
        let rdx = p.endX - p.startX, rdy = p.endY - p.startY, rlen = Math.sqrt(rdx * rdx + rdy * rdy);
        // Wir brauchen Platz für zwei Flansche (je 1.0 * L) und das Ventil dazwischen.
        if (rlen < END_SAFE * 2 + 2 * L) continue;
        let nx = rdx / rlen, ny = rdy / rlen;
        let tSnapped = (snapped.x - p.startX) * nx + (snapped.y - p.startY) * ny;
        if (tSnapped < END_SAFE + L || tSnapped > rlen - (END_SAFE + L)) continue;

        let posValve = { x: snapped.x, y: snapped.y };
        let posA = { x: posValve.x - nx * L, y: posValve.y - ny * L };
        let posB = { x: posValve.x + nx * L, y: posValve.y + ny * L };

        let pipeA = JSON.parse(JSON.stringify(p)), pipeB = JSON.parse(JSON.stringify(p));
        pipeA.endX = posA.x; pipeA.endY = posA.y;
        pipeB.startX = posB.x; pipeB.startY = posB.y;

        elements.splice(i, 1, pipeA, pipeB,
            { type: toolType, x: posValve.x, y: posValve.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN },
            { type: 'flange', x: posA.x, y: posA.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN },
            { type: 'flange', x: posB.x, y: posB.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN }
        );
        pushState(); redraw(); return true;
    }
    return false;
}

/**
 * Erkennt, wenn man einen Flansch mitten auf eine Linie setzt, und zerschneidet sie.
 */
function tryFlangeSplit(snapped) {
    const HALF_GAP = L / 2, SEG_TOL2 = 10 * 10, END_SAFE = L * 1.5;
    for (let i = 0; i < elements.length; i++) {
        let p = elements[i]; if (p.type !== 'pipe') continue;
        if (distToSegmentSquared(snapped, { x: p.startX, y: p.startY }, { x: p.endX, y: p.endY }) > SEG_TOL2) continue;
        let rdx = p.endX - p.startX, rdy = p.endY - p.startY, rlen = Math.sqrt(rdx * rdx + rdy * rdy); if (rlen < END_SAFE * 2 + HALF_GAP) continue;
        let nx = rdx / rlen, ny = rdy / rlen; let tA = (snapped.x - p.startX) * nx + (snapped.y - p.startY) * ny; let tB = tA + HALF_GAP;
        if (tA < END_SAFE || tB > rlen - END_SAFE) continue;
        let posA = { x: snapped.x, y: snapped.y }, posB = { x: posA.x + nx * HALF_GAP, y: posA.y + ny * HALF_GAP };
        let pipeA = JSON.parse(JSON.stringify(p)), pipeB = JSON.parse(JSON.stringify(p));
        pipeA.endX = posA.x; pipeA.endY = posA.y; pipeB.startX = posB.x; pipeB.startY = posB.y;
        elements.splice(i, 1, pipeA, pipeB, { type: 'flange', x: posA.x, y: posA.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN }, { type: 'flange', x: posB.x, y: posB.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN });
        pushState(); redraw(); return true;
    }
    return false;
}

/**
 * Erkennt, wenn man eine Armatur mitten auf eine Linie setzt, und zerschneidet sie inkl. Flansch-Paar.
 */
function tryValveSplit(snapped, toolType) {
    const SEG_TOL2 = 10 * 10, END_SAFE = L * 1.5;
    for (let i = 0; i < elements.length; i++) {
        let p = elements[i]; if (p.type !== 'pipe') continue;
        if (distToSegmentSquared(snapped, { x: p.startX, y: p.startY }, { x: p.endX, y: p.endY }) > SEG_TOL2) continue;
        let rdx = p.endX - p.startX, rdy = p.endY - p.startY, rlen = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rlen < END_SAFE * 2 + 2 * L) continue;
        let nx = rdx / rlen, ny = rdy / rlen;
        let tSnapped = (snapped.x - p.startX) * nx + (snapped.y - p.startY) * ny;
        if (tSnapped < END_SAFE + L || tSnapped > rlen - (END_SAFE + L)) continue;

        let posValve = { x: snapped.x, y: snapped.y };
        let posA = { x: posValve.x - nx * L, y: posValve.y - ny * L };
        let posB = { x: posValve.x + nx * L, y: posValve.y + ny * L };

        let pipeA = JSON.parse(JSON.stringify(p)), pipeB = JSON.parse(JSON.stringify(p));
        pipeA.endX = posA.x; pipeA.endY = posA.y;
        pipeB.startX = posB.x; pipeB.startY = posB.y;

        elements.splice(i, 1, pipeA, pipeB,
            { type: toolType, x: posValve.x, y: posValve.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN },
            { type: 'flange', x: posA.x, y: posA.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN },
            { type: 'flange', x: posB.x, y: posB.y, dir: currentDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN }
        );
        pushState(); redraw(); return true;
    }
    return false;
}

/**
 * Erkennt, wenn man einen Clamp / Blind-Clamp mitten auf eine Linie setzt, und zerschneidet sie.
 */
function tryClampSplit(snapped, toolType) {
    const HALF_GAP = 4, SEG_TOL2 = 10 * 10, END_SAFE = L * 1.0;
    for (let i = 0; i < elements.length; i++) {
        let p = elements[i]; if (p.type !== 'pipe') continue;
        if (distToSegmentSquared(snapped, { x: p.startX, y: p.startY }, { x: p.endX, y: p.endY }) > SEG_TOL2) continue;
        let rdx = p.endX - p.startX, rdy = p.endY - p.startY, rlen = Math.sqrt(rdx * rdx + rdy * rdy); 
        if (rlen < END_SAFE * 2 + HALF_GAP * 2) continue;

        let nx = rdx / rlen, ny = rdy / rlen;
        let tSnapped = (snapped.x - p.startX) * nx + (snapped.y - p.startY) * ny;
        if (tSnapped < END_SAFE || tSnapped > rlen - END_SAFE) continue;

        let posClamp = { x: snapped.x, y: snapped.y };
        let posA = { x: posClamp.x - nx * HALF_GAP, y: posClamp.y - ny * HALF_GAP };
        let posB = { x: posClamp.x + nx * HALF_GAP, y: posClamp.y + ny * HALF_GAP };

        let pipeA = JSON.parse(JSON.stringify(p)), pipeB = JSON.parse(JSON.stringify(p));
        pipeA.endX = posA.x; pipeA.endY = posA.y;
        pipeB.startX = posB.x; pipeB.startY = posB.y;

        // Automatische Richtungserkennung für den Clamp basierend auf dem Rohr
        let dx_p = p.endX - p.startX, dy_p = p.endY - p.startY;
        let pLen = Math.hypot(dx_p, dy_p);
        let pDir = currentDir;
        if (pLen > 0) {
            let npx = dx_p / pLen, npy = dy_p / pLen;
            let bestDot = -2, bestDir = 0;
            for (let d = 0; d < 3; d++) {
                let dot = Math.abs(npx * VECTORS[d].x + npy * VECTORS[d].y);
                if (dot > bestDot) { bestDot = dot; bestDir = d; }
            }
            pDir = bestDir;
        }

        elements.splice(i, 1, pipeA, pipeB,
            { type: toolType, x: posClamp.x, y: posClamp.y, dir: pDir, thickness: p.thickness || 4, color: p.color || globalColors.valve, size: p.size || currentDN }
        );
        pushState(); redraw(); return true;
    }
    return false;
}

// --- EVENT HANDLERS ---
/**
 * Bestätigt das Ingame-Text-Feld und pusht den Wert auf den Canvas.
 */
function saveText() {
    if (textInput.style.display === 'block') {
        let val = textInput.value.trim();
        if (editingTitleBlockField) {
            titleBlock[editingTitleBlockField] = val;
            pushState();
        } else if (val !== '') {
            if (editingElementIndex !== -1) {
                let el = elements[editingElementIndex];
                if (el.type === 'dimension') {
                    val = evaluateMath(val);
                    let startDeduct = 0, endDeduct = 0, cLen = null;
                    if (typeof getAttachedFittingLength === 'function') {
                        startDeduct = getAttachedFittingLength(el.start);
                        endDeduct = getAttachedFittingLength(el.end);
                        if (typeof activePipeClass !== 'undefined' && activePipeClass) {
                            cLen = parseFloat(val) - startDeduct - endDeduct;
                            if (cLen !== null) cLen = Math.round(cLen * 10) / 10;
                        }
                    }
                    el.color = (cLen !== null && cLen < 0) ? '#d32f2f' : globalColors.text;
                    el.cutLength = cLen;
                }
                el.text = val;
                pushState();
            } else if (pendingSpecialTool && pendingTextPos) {
                elements.push({ type: pendingSpecialTool, x: pendingTextPos.x, y: pendingTextPos.y, text: val, dir: currentDir, color: globalColors.valve });
                pushState();
            } else if (pendingTextPos) {
                elements.push({ type: 'text', text: val, x: pendingTextPos.x, y: pendingTextPos.y, dir: currentTextDir, size: 16, color: globalColors.text });
                pushState();
            } else if (pendingDimension) {
                val = evaluateMath(val);
                let startDeduct = 0, endDeduct = 0, cLen = null;

                // Abzüge berechnen, falls die Funktion existiert
                if (typeof getAttachedFittingLength === 'function') {
                    startDeduct = getAttachedFittingLength(pendingDimension.start);
                    endDeduct = getAttachedFittingLength(pendingDimension.end);
                    if (typeof activePipeClass !== 'undefined' && activePipeClass) {
                        cLen = parseFloat(val) - startDeduct - endDeduct;
                    }
                }

                let dimColor = globalColors.text;

                // Fehler werfen, aber NICHT mit return abbrechen!
                if (cLen !== null && cLen < 0) {
                    showToast("FEHLER: Maß zu kurz! Abzug der Bauteile (" + (startDeduct + endDeduct) + " mm) ist größer als das eingegebene Maß.", 'error');
                    dimColor = '#d32f2f'; // Maß zur Warnung rot färben
                }

                elements.push({
                    type: 'dimension',
                    start: pendingDimension.start,
                    end: pendingDimension.end,
                    dir: pendingDimension.dir,
                    dist: pendingDimension.dist,
                    text: val,
                    color: dimColor,
                    cutLength: cLen,
                    mainDir: pendingDimension.mainDir
                });
                pushState();
            }
        }
        textInput.style.display = 'none';
        textInput.value = '';
        pendingTextPos = null;
        pendingSpecialTool = null;
        pendingDimension = null;
        editingElementIndex = -1;
        editingTitleBlockField = null;
        if (typeof currentTool !== 'undefined' && currentTool === 'dimension' && dimStep === 3) dimStep = 0;
        redraw();
    }
}
textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveText(); } });
textInput.addEventListener('blur', () => setTimeout(saveText, 100));
textInput.addEventListener('input', () => { if (dimStep === 3) redraw(); });

/**
 * Handling Tastatur-Leerzeichen: Bauteile drehen.
 */
function rotateItem() {
    let changed = false;
    if (currentTool === 'edit' && Math.sqrt((lastMousePos.x - northArrowPos.x) ** 2 + (lastMousePos.y - northArrowPos.y) ** 2) <= 28) {
        northArrowDir = (northArrowDir + 1) % 12; changed = true; pushState();
    }
    else if (['checkvalve', 'safetyvalve', '3wayvalve', 'nipple', 'socket', 'blindcap', 'msr', 'flowarrow'].includes(currentTool)) { currentDir = (currentDir + 1) % 24; changed = true; }
    else if (['valve', 'sightglass', 'flange', 'slope', 'custom', 'damper', 'compensator', 'support', 'elevation', 'clamp', 'blindclamp', 'insulation'].includes(currentTool)) { currentDir = (currentDir + 1) % 6; changed = true; }
    else if (currentTool === 'text') { currentTextDir = (currentTextDir + 1) % 4; changed = true; }
    else if (currentTool === 'dimension' && dimStep === 2) { 
        dimDir = (dimDir + 1) % 4;
        if (dimDir < 3 && dimDir === dimMainDir) dimDir = (dimDir + 1) % 4;
        changed = true; 
    }
    else if (currentTool === 'hatch' && hatchStep === 2) { hatchDir = (hatchDir + 1) % 3; changed = true; }
    else if (currentTool === 'reducer' && reducerStep === 1) { reducerType = (reducerType + 1) % 3; changed = true; }
    else if (currentTool === 'edit' && hoveredElementIndex !== -1) {
        let targets = selectedElementIndices.includes(hoveredElementIndex) ? selectedElementIndices : [hoveredElementIndex];
        targets.forEach(idx => {
            let el = elements[idx]; if (['checkvalve', 'safetyvalve', '3wayvalve', 'nipple', 'socket', 'blindcap', 'msr', 'flowarrow'].includes(el.type)) el.dir = (el.dir + 1) % 24;
            else if (['valve', 'sightglass', 'flange', 'slope', 'custom', 'damper', 'compensator', 'support', 'elevation', 'clamp', 'blindclamp', 'insulation'].includes(el.type)) el.dir = (el.dir + 1) % 6;
            else if (el.type === 'reducer') el.rType = ((el.rType || 0) + 1) % 3;
            else if (el.type === 'text') el.dir = ((el.dir || 0) + 1) % 4;
            else if (['dimension', 'hatch'].includes(el.type)) {
                let mod = el.type === 'dimension' ? 4 : 3;
                el.dir = (el.dir + 1) % mod;
                if (el.type === 'dimension' && el.dir < 3 && el.mainDir !== undefined && el.dir === el.mainDir) {
                    el.dir = (el.dir + 1) % 4;
                }
            }
        }); changed = true; pushState();
    }
    if (changed) redraw();
}

/**
 * Leert den kompletten Canvas.
 */
function clearAll() { if (confirm('Möchtest du wirklich die komplette Zeichnung löschen?')) { elements = []; weldNumCounter = 1; selectedElementIndices = []; updateSelectionFlags(); titleBlock = { kunde: "", gebaeude: "", auftrag: "", bezeichnung: "", isoNr: "", werkstoff: "", beizen: false, buersten: false, roentgen: "", druckprobe: "", gezName: "", datum: "" }; pushState(); redraw(); } }

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) return;
    const pos = getMousePos(e); lastMousePos = pos;
    calculateSmartSnap(pos.x, pos.y, currentTool, e);

    hoveredTitleBlockField = getTitleBlockField(pos.x, pos.y); canvas.style.cursor = hoveredTitleBlockField ? 'pointer' : 'crosshair';
    if (isPasting) {
        let snapped = getSmartSnappedPoint(pos.x, pos.y, 'edit', e);
        let dx = snapped.x - pasteGrabPoint.x;
        let dy = snapped.y - pasteGrabPoint.y;

        // Wir berechnen den Versatz relativ zum ursprünglichen GrabPoint
        // Da wir pastingElements jedes Mal neu verschieben (aus dem Original-Clipboard-Stand),
        // müssen wir dx/dy auf die Originalwerte von clipboard anwenden.
        pastingElements = JSON.parse(JSON.stringify(clipboard));
        pastingElements.forEach(el => {
            switch (el.type) {
                case 'pipe': case 'smartJump': case 'number': el.startX += dx; el.startY += dy; el.endX += dx; el.endY += dy; break;
                case 'dimension': case 'reducer':
                    if (el.start) { el.start.x += dx; el.start.y += dy; el.end.x += dx; el.end.y += dy; }
                    if (el.startX !== undefined) { el.startX += dx; el.startY += dy; el.endX += dx; el.endY += dy; }
                    break;
                case 'weldnum': el.weldX += dx; el.weldY += dy; el.cx += dx; el.cy += dy; break;
                case 'hatch': ['p1', 'p2', 'p3'].forEach(p => { if (el[p]) { el[p].x += dx; el[p].y += dy; } }); break;
                case 'revisionCloud': if (el.path) el.path.forEach(pt => { pt.x += dx; pt.y += dy; }); if (el.tagX !== undefined) { el.tagX += dx; el.tagY += dy; } break;
                case 'jumpbox':
                    if (el.start) { el.start.x += dx; el.start.y += dy; }
                    if (el.zPoint) { el.zPoint.x += dx; el.zPoint.y += dy; }
                    if (el.end) { el.end.x += dx; el.end.y += dy; }
                    if (el.tagXx !== undefined) { el.tagXx += dx; el.tagXy += dy; }
                    if (el.tagYx !== undefined) { el.tagYx += dx; el.tagYy += dy; }
                    if (el.tagZx !== undefined) { el.tagZx += dx; el.tagZy += dy; }
                    break;
                case 'balloon': el.anchorX += dx; el.anchorY += dy; el.bx += dx; el.by += dy; break;
                default: el.x += dx; el.y += dy; break;
            }
        });
        redraw();
        return;
    }
    if (isDraggingLogo) { logoBgPos.x = pos.x + dragOffset.x; logoBgPos.y = pos.y + dragOffset.y; redraw(); return; }
    if (isDraggingNorthArrow) { northArrowPos.x = pos.x + dragOffset.x; northArrowPos.y = pos.y + dragOffset.y; redraw(); return; }
    if (isSelecting) { redraw(); return; }
    if (isDraggingGroup) {
        if (!hasMoved && dist2(pos, dragStartMousePos) > 16) hasMoved = true;
        if (hasMoved) {
            let dx, dy;
            if (e.altKey) {
                dx = pos.x - dragStartMousePos.x;
                dy = pos.y - dragStartMousePos.y;
            } else {
                let snappedPos = getSmartSnappedPoint(pos.x, pos.y, 'edit', e);
                dx = snappedPos.x - dragStartSnapped.x;
                dy = snappedPos.y - dragStartSnapped.y;
            }

            selectedElementIndices.forEach((idx, i) => {
                let el = elements[idx], orig = groupDragOriginals[i];
                let isSingleMove = (selectedElementIndices.length === 1);

                // Sonderfall: Revisions-Tag (Textblase) einzeln verschieben
                if (isDraggingRevisionTag && el.type === 'revisionCloud') {
                    el.tagX = (orig.tagX !== undefined ? orig.tagX : (orig.x1 + orig.x2) / 2) + (pos.x - dragStartMousePos.x);
                    el.tagY = (orig.tagY !== undefined ? orig.tagY : (orig.y1 + orig.y2) / 2) + (pos.y - dragStartMousePos.y);
                    return;
                }

                switch (el.type) {
                    case 'pipe':
                    case 'smartJump':
                        el.startX = orig.startX + dx; el.startY = orig.startY + dy;
                        el.endX = orig.endX + dx; el.endY = orig.endY + dy;
                        break;
                    case 'number':
                        if (isSingleMove) {
                            el.endX = orig.endX + (pos.x - dragStartMousePos.x);
                            el.endY = orig.endY + (pos.y - dragStartMousePos.y);
                        } else {
                            el.startX = orig.startX + dx; el.startY = orig.startY + dy;
                            el.endX = orig.endX + dx; el.endY = orig.endY + dy;
                        }
                        break;
                    case 'dimension':
                        // Nur wenn eine ganze Gruppe (Rohre + Maße) verschoben wird, wandern die Anker mit.
                        // Wenn nur das Maß markiert ist, bleibt es am Rohr verankert.
                        if (!isSingleMove) {
                            if (el.start) {
                                el.start.x = orig.start.x + dx; el.start.y = orig.start.y + dy;
                                let ex = (orig.end ? orig.end.x : orig.endX);
                                let ey = (orig.end ? orig.end.y : orig.endY);
                                el.end.x = ex + dx; el.end.y = ey + dy;
                            }
                            if (orig.startX !== undefined) {
                                el.startX = orig.startX + dx; el.startY = orig.startY + dy;
                                el.endX = orig.endX + dx; el.endY = orig.endY + dy;
                            }
                        } else {
                            // Bei Einzel-Selektion wird nur der Offset (die Auslage der Bemaßung) verschoben
                            // getDimensionVector() wird verwendet, da VECTORS[3] für parallele Bemaßungen (dir=3) undefined ist
                            let v = getDimensionVector(el.dir, el.start, el.end);
                            let mouseDx = pos.x - dragStartMousePos.x;
                            let mouseDy = pos.y - dragStartMousePos.y;
                            el.dist = (orig.dist || 0) + (mouseDx * v.x + mouseDy * v.y);
                        }
                        break;
                    case 'reducer':
                        if (el.start) {
                            el.start.x = orig.start.x + dx; el.start.y = orig.start.y + dy;
                            let ex = (orig.end ? orig.end.x : orig.endX);
                            let ey = (orig.end ? orig.end.y : orig.endY);
                            el.end.x = ex + dx; el.end.y = ey + dy;
                        } else {
                            el.startX = orig.startX + dx; el.startY = orig.startY + dy;
                            el.endX = orig.endX + dx; el.endY = orig.endY + dy;
                        }
                        break;
                    case 'weldnum':
                        if (isSingleMove) {
                            el.cx = orig.cx + (pos.x - dragStartMousePos.x);
                            el.cy = orig.cy + (pos.y - dragStartMousePos.y);
                        } else {
                            el.weldX = orig.weldX + dx; el.weldY = orig.weldY + dy;
                            el.cx = orig.cx + dx; el.cy = orig.cy + dy;
                        }
                        break;
                    case 'hatch':
                        ['p1', 'p2', 'p3'].forEach(p => { if (el[p]) { el[p].x = orig[p].x + dx; el[p].y = orig[p].y + dy; } });
                        break;
                    case 'revisionCloud':
                        if (el.path) {
                            el.path.forEach((pt, k) => { pt.x = orig.path[k].x + dx; pt.y = orig.path[k].y + dy; });
                        }
                        if (el.tagX !== undefined) { el.tagX = orig.tagX + dx; el.tagY = orig.tagY + dy; }
                        break;
                    case 'jumpbox':
                        if (jumpboxDragTag && isSingleMove) {
                            if (jumpboxDragTag === 'x') { el.tagXx = orig.tagXx + dx; el.tagXy = orig.tagXy + dy; }
                            else if (jumpboxDragTag === 'y') { el.tagYx = orig.tagYx + dx; el.tagYy = orig.tagYy + dy; }
                            else if (jumpboxDragTag === 'z') { el.tagZx = orig.tagZx + dx; el.tagZy = orig.tagZy + dy; }
                        } else {
                            if (el.start) { el.start.x = orig.start.x + dx; el.start.y = orig.start.y + dy; }
                            if (el.zPoint) { el.zPoint.x = orig.zPoint.x + dx; el.zPoint.y = orig.zPoint.y + dy; }
                            if (el.end) { el.end.x = orig.end.x + dx; el.end.y = orig.end.y + dy; }
                            if (el.tagXx !== undefined) { el.tagXx = orig.tagXx + dx; el.tagXy = orig.tagXy + dy; }
                            if (el.tagYx !== undefined) { el.tagYx = orig.tagYx + dx; el.tagYy = orig.tagYy + dy; }
                            if (el.tagZx !== undefined) { el.tagZx = orig.tagZx + dx; el.tagZy = orig.tagZy + dy; }
                        }
                        break;
                    case 'balloon':
                        if (isSingleMove) {
                            el.bx = orig.bx + (pos.x - dragStartMousePos.x);
                            el.by = orig.by + (pos.y - dragStartMousePos.y);
                        } else {
                            el.anchorX = orig.anchorX + dx; el.anchorY = orig.anchorY + dy;
                            el.bx = orig.bx + dx; el.by = orig.by + dy;
                        }
                        break;
                    default:
                        el.x = orig.x + dx; el.y = orig.y + dy;
                        break;
                }
            });
            redraw();
        }
        return;
    }
    currentPoint = getSmartSnappedPoint(pos.x, pos.y, currentTool, e);
    if (currentTool === 'dimension' && dimStep === 2) {
        let v = getDimensionVector(dimDir, dimStart, dimEnd);
        dimDist = (pos.x - dimStart.x) * v.x + (pos.y - dimStart.y) * v.y;
    }
    hoveredElementIndex = ['edit', 'erase', 'toggleExisting', 'colorize', 'toggleHose'].includes(currentTool) ? getHoveredElementIndex(pos, e.ctrlKey) : -1;
    redraw();
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2 || e.button === 1) return;
    const pos = getMousePos(e);

    if (isPasting) {
        selectedElementIndices = [];
        pastingElements.forEach(el => {
            elements.push(el);
            selectedElementIndices.push(elements.length - 1);
        });
        isPasting = false;
        pastingElements = [];
        updateSelectionFlags();
        pushState();
        redraw();
        return;
    }

    let tb = getTitleBlockField(pos.x, pos.y);
    if (tb) { if (['beizen', 'spuelen'].includes(tb)) { titleBlock[tb] = !titleBlock[tb]; pushState(); redraw(); } else { editingTitleBlockField = tb; textInput.style.display = 'block'; textInput.style.left = (e.clientX - wrapper.getBoundingClientRect().left + 5) + 'px'; textInput.style.top = (e.clientY - wrapper.getBoundingClientRect().top - 15) + 'px'; textInput.value = titleBlock[tb]; setTimeout(() => { textInput.focus(); textInput.select(); }, 10); } return; }
    if (currentTool === 'edit' && isLogoLoaded && pos.x >= logoBgPos.x && pos.x <= logoBgPos.x + logoW && pos.y >= logoBgPos.y && pos.y <= logoBgPos.y + logoBgH) {
        if (e.shiftKey) { logoW = logoW > 400 ? 200 : logoW + 40; logoBgH = logoW * (logoImg.height / logoImg.width); pushState(); redraw(); return; }
        isDraggingLogo = true; dragStartMousePos = { x: pos.x, y: pos.y }; dragOffset = { x: logoBgPos.x - pos.x, y: logoBgPos.y - pos.y }; hasMoved = false; return;
    }
    if (currentTool === 'edit') {
        const NA_R = 28;
        if (Math.sqrt((pos.x - northArrowPos.x) ** 2 + (pos.y - northArrowPos.y) ** 2) <= NA_R) {
            isDraggingNorthArrow = true; dragStartMousePos = { x: pos.x, y: pos.y };
            dragOffset = { x: northArrowPos.x - pos.x, y: northArrowPos.y - pos.y }; hasMoved = false; return;
        }
    }
    hoveredElementIndex = getHoveredElementIndex(pos, e.ctrlKey);
    if (currentTool === 'edit' && hoveredElementIndex === -1) { isSelecting = true; selectionStart = { x: pos.x, y: pos.y }; if (!e.shiftKey) { selectedElementIndices = []; updateSelectionFlags(); } return; }
    if (currentTool === 'edit' && hoveredElementIndex !== -1) {
        let el = elements[hoveredElementIndex];
        if (e.shiftKey) {
            switch (el.type) {
                case 'jumpbox':
                case 'weldnum':
                case 'revisionCloud':
                case 'text':
                case 'number':
                case 'dimension':
                    openTextProperties(hoveredElementIndex);
                    break;
                case 'flange':
                case 'pipe':
                case 'reducer':
                case 'valve':
                case 'checkvalve':
                case 'sightglass':
                case 'blindcap':
                case 'nipple':
                case 'socket':
                case '3wayvalve':
                case 'damper':
                case 'safetyvalve':
                case 'compensator':
                case 'clamp':
                case 'blindclamp':
                    openProperties(hoveredElementIndex);
                    break;
                case 'custom':
                    openCustomProperties(hoveredElementIndex);
                    break;
                case 'weld':
                    openProperties(hoveredElementIndex);
                    break;
            }
            return;
        }
        if (el.type === 'revisionCloud') {
            let cx = 0, cy = 0; el.path.forEach(pt => { cx += pt.x; cy += pt.y; }); cx /= el.path.length; cy /= el.path.length;
            let tx = el.tagX ?? cx, ty = el.tagY ?? cy;
            if (dist2(pos, { x: tx, y: ty }) < 900) { isDraggingRevisionTag = true; if (el.tagX === undefined) { el.tagX = cx; el.tagY = cy; } }
        }
        if (el.type === 'jumpbox') {
            let s = el.start, z = el.zPoint, e = el.end, h = s.y - z.y, vx = e.x - s.x, vy = e.y - s.y, cos30 = 0.866025;
            let w1 = (vx / (2 * cos30)) + vy, w2 = vy - (vx / (2 * cos30));
            let p0 = { x: s.x, y: s.y }, p1 = { x: s.x + w1 * cos30, y: s.y + w1 * 0.5 }, p3 = { x: s.x - w2 * cos30, y: s.y + w2 * 0.5 }, t3 = { x: p3.x, y: p3.y - h };
            if (el.valX) { let tx = el.tagXx ?? ((p0.x + p1.x) / 2 + 20), ty = el.tagXy ?? ((p0.y + p1.y) / 2 + 15); if (dist2(pos, { x: tx, y: ty }) < 900) { jumpboxDragTag = 'x'; if (el.tagXx === undefined) { el.tagXx = tx; el.tagXy = ty; } } }
            if (!jumpboxDragTag && el.valY) { let tx = el.tagYx ?? ((p0.x + p3.x) / 2 - 20), ty = el.tagYy ?? ((p0.y + p3.y) / 2 + 15); if (dist2(pos, { x: tx, y: ty }) < 900) { jumpboxDragTag = 'y'; if (el.tagYx === undefined) { el.tagYx = tx; el.tagYy = ty; } } }
            if (!jumpboxDragTag && el.valZ) { let tx = el.tagZx ?? ((p3.x + t3.x) / 2 - 20), ty = el.tagZy ?? ((p3.y + t3.y) / 2); if (dist2(pos, { x: tx, y: ty }) < 900) { jumpboxDragTag = 'z'; if (el.tagZx === undefined) { el.tagZx = tx; el.tagZy = ty; } } }
        }
        if (!selectedElementIndices.includes(hoveredElementIndex)) {
            selectedElementIndices = [hoveredElementIndex];
            updateSelectionFlags();
        }
        isDraggingGroup = true; dragStartMousePos = { x: pos.x, y: pos.y }; dragStartSnapped = { x: pos.x, y: pos.y }; groupDragOriginals = selectedElementIndices.map(idx => JSON.parse(JSON.stringify(elements[idx]))); hasMoved = false; return;
    }
    let snapped = getSmartSnappedPoint(pos.x, pos.y, currentTool, e);

    const FITTING_TOOLS = ['flange', 'valve', 'checkvalve', 'sightglass', 'blindcap', 'nipple', 'socket', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'reducer', 'custom'];
    if (FITTING_TOOLS.includes(currentTool)) {
        checkPipeClassCompatibility(currentTool, currentDN);
    }
    if (currentTool === 'erase') {
        if (hoveredElementIndex !== -1) { autoHealErase(hoveredElementIndex); pushState(); redraw(); return; }
        // Nordpfeil löschen
        if (layerVis.northArrow && Math.hypot(pos.x - northArrowPos.x, pos.y - northArrowPos.y) < 40) {
            layerVis.northArrow = false;
            if (typeof updateLayerUI === 'function') updateLayerUI();
            pushState(); redraw(); return;
        }
    }
    if (currentTool === 'colorize' && hoveredElementIndex !== -1) { elements[hoveredElementIndex].color = activePaintColor; pushState(); redraw(); return; }
    if (currentTool === 'toggleExisting' && hoveredElementIndex !== -1) { let el = elements[hoveredElementIndex]; if (el.type !== 'text') el.isExisting = !el.isExisting; pushState(); redraw(); return; }
    if (currentTool === 'toggleHose' && hoveredElementIndex !== -1) { let el = elements[hoveredElementIndex]; if (el.type === 'pipe') { el.isHose = !el.isHose; pushState(); redraw(); return; } }
    if (currentTool === 'jumpbox') {
        if (jumpboxStep === 0) { jumpboxStart = snapped; jumpboxStep = 1; }
        else if (jumpboxStep === 1) { jumpboxZ = snapped; jumpboxStep = 2; }
        else if (jumpboxStep === 2) {
            elements.push({ type: 'jumpbox', start: jumpboxStart, zPoint: jumpboxZ, end: snapped, valX: '', valY: '', valZ: '', color: globalColors.text });
            jumpboxStep = 0; pushState();
            openTextProperties(elements.length - 1);
        }
        redraw(); return;
    }
    if (currentTool === 'dimension') {
        if (dimStep === 0) { dimStart = snapped; dimStep = 1; }
        else if (dimStep === 1) { 
            dimEnd = snapped; dimStep = 2;
            // --- AUTOMATISCHE ACHSEN-ERKENNUNG ---
            let dx = dimEnd.x - dimStart.x, dy = dimEnd.y - dimStart.y;
            let bestDot = -1, bestIdx = 1;
            VECTORS.forEach((v, i) => {
                let dot = Math.abs(dx * v.x + dy * v.y);
                if (dot > bestDot) { bestDot = dot; bestIdx = i; }
            });
            dimMainDir = bestIdx;
            dimDir = (dimMainDir === 0) ? 1 : 0;
        }
        else if (dimStep === 2) {
            let dx = dimEnd.x - dimStart.x, dy = dimEnd.y - dimStart.y;
            let actualLen = Math.round(Math.sqrt(dx * dx + dy * dy));

            // NEU: Prüfen, ob das Rohr darunter bereits ein Maß (realLength) hat
            let prefillVal = actualLen;
            let pipeUnderDim = elements.find(p => p.type === 'pipe' && p.realLength && (
                (dist2({ x: p.startX, y: p.startY }, dimStart) < 400 && dist2({ x: p.endX, y: p.endY }, dimEnd) < 400) ||
                (dist2({ x: p.endX, y: p.endY }, dimStart) < 400 && dist2({ x: p.startX, y: p.startY }, dimEnd) < 400)
            ));
            if (pipeUnderDim) {
                prefillVal = pipeUnderDim.realLength;
            }

            pendingDimension = { start: dimStart, end: dimEnd, dir: dimDir, dist: dimDist, mainDir: dimMainDir };
            textInput.style.display = 'block';
            textInput.style.left = (e.clientX - wrapper.getBoundingClientRect().left + 5) + 'px';
            textInput.style.top = (e.clientY - wrapper.getBoundingClientRect().top - 15) + 'px';
            textInput.value = prefillVal; // Nutze die hinterlegte Länge oder den gemessenen Wert
            dimStep = 3;
            setTimeout(() => { textInput.focus(); textInput.select(); }, 10);
        }
        redraw(); return;
    }
    if (currentTool === 'hatch') { if (hatchStep === 0) { hatchStart = snapped; hatchStep = 1; } else if (hatchStep === 1) { hatchCorner = snapped; hatchStep = 2; } else if (hatchStep === 2) { elements.push({ type: 'hatch', p1: hatchStart, p2: hatchCorner, p3: snapped, dir: hatchDir, color: globalColors.pipe }); pushState(); hatchStep = 0; redraw(); } return; }
    if (currentTool === 'reducer') { if (reducerStep === 0) { reducerStart = snapped; reducerStep = 1; } else if (reducerStep === 1) { elements.push({ type: 'reducer', start: reducerStart, end: snapped, rType: reducerType, thickness: 4, color: globalColors.valve, size: currentDN }); pushState(); reducerStep = 0; redraw(); } return; }
    if (['text', 'elevation', 'msr'].includes(currentTool)) {
        if (hoveredElementIndex !== -1 && elements[hoveredElementIndex].type === (currentTool === 'text' ? 'text' : currentTool)) {
            openTextProperties(hoveredElementIndex);
            return;
        }
        textInput.style.display = 'block';
        textInput.style.left = (e.clientX - wrapper.getBoundingClientRect().left + 5) + 'px';
        textInput.style.top = (e.clientY - wrapper.getBoundingClientRect().top - 30) + 'px';
        pendingTextPos = snapped;
        if (currentTool !== 'text') pendingSpecialTool = currentTool;
        setTimeout(() => textInput.focus(), 10);
        return;
    }
    if (currentTool === 'pipe') {
        if (!isDrawing) {
            startPoint = snapped;
            isDrawing = true;
            autoSplitPipe(snapped.x, snapped.y); // <-- NEU: Hier beim Startpunkt schneiden
        } else {
            if (dist2(startPoint, snapped) > 1) {
                elements.push({ type: 'pipe', startX: startPoint.x, startY: startPoint.y, endX: snapped.x, endY: snapped.y, thickness: 4, color: globalColors.pipe, size: currentDN });
                pushState();
                startPoint = snapped;
                autoSplitPipe(snapped.x, snapped.y); // <-- NEU: Hier beim Endpunkt schneiden
            }
        }
        redraw(); return;
    }
    if (currentTool === 'revisionCloud') { if (!isDrawing) { revisionCloudCurrentPath = [snapped]; isDrawing = true; } else { if (dist2(snapped, revisionCloudCurrentPath[0]) < 225) { elements.push({ type: 'revisionCloud', path: [...revisionCloudCurrentPath], text: "Rev. 1", color: '#ff0000' }); pushState(); isDrawing = false; revisionCloudCurrentPath = []; } else { revisionCloudCurrentPath.push(snapped); } } redraw(); return; }
    if (['number', 'weldnum'].includes(currentTool)) { startPoint = snapped; isDrawing = true; return; }
    if (currentTool === 'weld') {
        let size = currentDN;
        // Auto-Size: Prüfe ob eine Pipe in der Nähe des Snapped-Points liegt
        const nearbyPipe = elements.find(p => p.type === 'pipe' && distToSegmentSquared(snapped, { x: p.startX, y: p.startY }, { x: p.endX, y: p.endY }) < 100);
        if (nearbyPipe) size = nearbyPipe.size || currentDN;
        elements.push({ type: 'weld', x: snapped.x, y: snapped.y, color: globalColors.weld, size: size, customName: "Schweißnaht" });
        pushState(); redraw(); return;
    }
    if (currentTool === 'flange') { if ((e.ctrlKey || e.metaKey) && tryFlangeSplit(snapped)) return; elements.push({ type: 'flange', x: snapped.x, y: snapped.y, dir: currentDir, thickness: 4, color: globalColors.valve, size: currentDN }); pushState(); redraw(); return; }
    if (['clamp', 'blindclamp'].includes(currentTool)) {
        if ((e.ctrlKey || e.metaKey) && tryClampSplit(snapped, currentTool)) return;
        let pDir = currentDir;
        let nearbyPipe = elements.find(p => p.type === 'pipe' && distToSegmentSquared(snapped, { x: p.startX, y: p.startY }, { x: p.endX, y: p.endY }) < 25);
        if (nearbyPipe) {
            let dx_p = nearbyPipe.endX - nearbyPipe.startX, dy_p = nearbyPipe.endY - nearbyPipe.startY;
            let pLen = Math.hypot(dx_p, dy_p);
            if (pLen > 0) {
                let npx = dx_p / pLen, npy = dy_p / pLen;
                let bestDot = -2, bestDir = 0;
                for (let d = 0; d < 3; d++) {
                    let dot = Math.abs(npx * VECTORS[d].x + npy * VECTORS[d].y);
                    if (dot > bestDot) { bestDot = dot; bestDir = d; }
                }
                pDir = bestDir;
            }
        }
        elements.push({ type: currentTool, x: snapped.x, y: snapped.y, dir: pDir, thickness: 4, color: globalColors.valve, size: currentDN });
        pushState(); redraw(); return;
    }
    if (['valve', 'checkvalve', 'sightglass', 'blindcap', 'nipple', 'socket', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'flowarrow', 'support', 'insulation'].includes(currentTool)) {
        if ((e.ctrlKey || e.metaKey) && tryValveSplit(snapped, currentTool)) return;
        elements.push({ type: currentTool, x: snapped.x, y: snapped.y, dir: currentDir, thickness: 4, color: globalColors.valve, size: currentDN }); pushState(); redraw(); return;
    }
    if (currentTool === 'custom') { if (pendingCustomPart) { elements.push({ type: 'custom', x: snapped.x, y: snapped.y, dir: currentDir, scale: 1, parts: pendingCustomPart, color: globalColors.valve, size: currentDN }); pushState(); redraw(); } return; }
    if (currentTool === 'slope') { elements.push({ type: 'slope', x: snapped.x, y: snapped.y, dir: currentDir, color: globalColors.valve }); pushState(); redraw(); return; }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2 || e.button === 1) return;
    if (currentTool === 'edit' && isDraggingLogo) { isDraggingLogo = false; if (hasMoved) pushState(); return; }
    if (currentTool === 'edit' && isDraggingNorthArrow) { isDraggingNorthArrow = false; if (hasMoved) pushState(); return; }
    if (isSelecting) {
        isSelecting = false;
        let rx = Math.min(selectionStart.x, lastMousePos.x), ry = Math.min(selectionStart.y, lastMousePos.y),
            rw = Math.abs(selectionStart.x - lastMousePos.x), rh = Math.abs(selectionStart.y - lastMousePos.y);

        elements.forEach((el, idx) => {
            let px, py;
            if (el.startX !== undefined) { px = (el.startX + el.endX) / 2; py = (el.startY + el.endY) / 2; }
            else if (el.start) { px = (el.start.x + (el.end ? el.end.x : el.endX)) / 2; py = (el.start.y + (el.end ? el.end.y : el.endY)) / 2; }
            else if (el.p1) { px = (el.p1.x + el.p2.x + el.p3.x) / 3; py = (el.p1.y + el.p2.y + el.p3.y) / 3; }
            else if (el.path && el.path.length > 0) {
                let cx = 0, cy = 0; el.path.forEach(pt => { cx += pt.x; cy += pt.y; });
                px = cx / el.path.length; py = cy / el.path.length;
            } else if (el.bx !== undefined) { px = el.bx; py = el.by; }
            else if (el.cx !== undefined) { px = el.cx; py = el.cy; }
            else { px = el.x; py = el.y; }

            if (px !== undefined && px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
                if (!selectedElementIndices.includes(idx)) {
                    selectedElementIndices.push(idx);
                }
            }
        });
        updateSelectionFlags();
        redraw();
        return;
    }
    if (isDraggingGroup) {
        if (hasMoved) {
            pushState();
        } else {
            // Falls nur geklickt wurde, stellen wir die Original-Koordinaten absolut sicher wieder her
            selectedElementIndices.forEach((idx, i) => {
                if (groupDragOriginals[i]) elements[idx] = JSON.parse(JSON.stringify(groupDragOriginals[i]));
            });
        }
        isDraggingGroup = false;
        redraw();
        return;
    }
    if (currentTool === 'number' && isDrawing) {
        isDrawing = false;
        if (dist2(startPoint, currentPoint) > 1) {
            // Falls an einer Naht gestartet wurde, erstellen wir ein weldnum-Element statt number-Element
            // BESSER: Toleranz-Check statt striktem ===
            const isOnWeld = elements.some(el => el.type === 'weld' && Math.hypot(el.x - startPoint.x, el.y - startPoint.y) < 5);
            if (isOnWeld) {
                elements.push({ type: 'weldnum', weldX: startPoint.x, weldY: startPoint.y, cx: currentPoint.x, cy: currentPoint.y, text: String(getNextWeldNumber()), number: String(getNextWeldNumber()), radius: 14, width: 28, height: 28, color: globalColors.weldnum });
            } else {
                elements.push({ type: 'number', startX: startPoint.x, startY: startPoint.y, endX: currentPoint.x, endY: currentPoint.y, text: String(getNextNumber()), color: globalColors.weldnum });
            }
            pushState();
        }
        redraw();
    }
    if (currentTool === 'weldnum' && isDrawing) { isDrawing = false; if (dist2(startPoint, currentPoint) > 1) { elements.push({ type: 'weldnum', weldX: startPoint.x, weldY: startPoint.y, cx: currentPoint.x, cy: currentPoint.y, text: String(getNextWeldNumber()), number: String(getNextWeldNumber()), radius: 14, width: 28, height: 28, color: globalColors.weldnum }); pushState(); } redraw(); }
    isDraggingRevisionTag = false; jumpboxDragTag = null;
});

window.addEventListener('keydown', (e) => {
    // Wenn der Nutzer in einem Input- oder Textarea-Feld ist, 
    // blockiere keine Tasten, sondern lass den Browser normal arbeiten.
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
    }

    if (e.key === 'Escape') {
        isDrawing = false;
        dimStep = 0;
        hatchStep = 0;
        jumpboxStep = 0;
        textInput.style.display = 'none';
        textInput.value = '';
        pendingTextPos = null;
        pendingDimension = null;
        editingElementIndex = -1;
        editingTitleBlockField = null;
        if (isPasting) { isPasting = false; pastingElements = []; }
        updateHint();
        redraw();
    }
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); rotateItem(); }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }

    // --- KOPIEREN (STRG + C) ---
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedElementIndices.length > 0) {
            // Aktuell markierte Elemente tiefenkopieren
            clipboard = selectedElementIndices.map(idx => JSON.parse(JSON.stringify(elements[idx])));
            console.log(clipboard.length + " Elemente kopiert.");
        }
    }

    // --- EINFÜGEN (STRG + V) - ENTER PREVIEW MODE ---
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (clipboard.length > 0) {
            isPasting = true;
            pastingElements = JSON.parse(JSON.stringify(clipboard)); // Tiefe Kopie für Vorschau

            // Referenzpunkt der Kopie ermitteln
            let ref = pastingElements[0];
            pasteGrabPoint.x = ref.startX !== undefined ? ref.startX : (ref.start ? ref.start.x : (ref.x !== undefined ? ref.x : (ref.cx !== undefined ? ref.cx : 0)));
            pasteGrabPoint.y = ref.startY !== undefined ? ref.startY : (ref.start ? ref.start.y : (ref.y !== undefined ? ref.y : (ref.cy !== undefined ? ref.cy : 0)));

            redraw();
            if (typeof updateHint === 'function') updateHint();
        }
    }

    if (e.key === 'Delete' && currentTool === 'edit') {
        selectedElementIndices.sort((a, b) => b - a).forEach(idx => elements.splice(idx, 1));
        selectedElementIndices = [];
        updateSelectionFlags();
        pushState(); redraw();
    }

    // Toggle für Objektfang mit Taste 'S'
    if ((e.key === 's' || e.key === 'S') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        window.smartSnapEnabled = !window.smartSnapEnabled;
        if (typeof updateHint === 'function') updateHint();
        if (typeof redraw === 'function') redraw();
    }
});

function cancelDrag() {
    if (isDraggingGroup) {
        selectedElementIndices.forEach((idx, i) => {
            if (groupDragOriginals[i]) elements[idx] = JSON.parse(JSON.stringify(groupDragOriginals[i]));
        });
        isDraggingGroup = false; hasMoved = false;
    }
    isDraggingLogo = false; isDraggingNorthArrow = false; isSelecting = false; jumpboxDragTag = null;
}

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (isDrawing || dimStep > 0 || hatchStep > 0 || jumpboxStep > 0 || textInput.style.display === 'block') {
        isDrawing = false;
        dimStep = 0;
        hatchStep = 0;
        jumpboxStep = 0;
        textInput.style.display = 'none';
        textInput.value = '';
        pendingTextPos = null;
        pendingDimension = null;
        editingElementIndex = -1;
        editingTitleBlockField = null;
        updateHint();
        redraw();
    } else {
        showRadialMenu(e.clientX, e.clientY);
    }
});

/**
 * Zeigt das asymmetrische Werkzeug-Halbmondmenü an Cursorstelle an.
 */
function showRadialMenu(x, y) { const menu = document.getElementById('radialMenu'); menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.classList.add('active'); }
/**
 * Versteckt das Kontext-Rad-Menü.
 */
function hideRadialMenu() { document.getElementById('radialMenu').classList.remove('active'); }
window.addEventListener('mousedown', (e) => { if (!e.target.closest('#radialMenu')) hideRadialMenu(); }, true);

// App bereit zur Initialisierung (wird in index.html aufgerufen)

// --- ROHRKLASSEN FUNKTIONEN ---

// Parst einen CSV String in ein Array von Objekten
function parsePipeClassCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';');
    let data = [];
    let classes = new Set();
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        if (values.length < 5) continue;
        let entry = {};
        headers.forEach((h, idx) => entry[h.trim()] = values[idx] ? values[idx].trim() : null);
        data.push(entry);
        if (entry.Klasse) classes.add(entry.Klasse);
    }
    return { data, classes: Array.from(classes) };
}

// Lädt die Daten ins Dropdown
function loadPipeClassesToUI(csvText) {
    const parsed = parsePipeClassCSV(csvText);
    pipeClassData = parsed.data;
    const select = document.getElementById('pipeClassSelect');
    if (select) {
        select.innerHTML = '<option value="">Keine Rohrklasse aktiv</option>';
        parsed.classes.forEach(c => {
            select.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
}

// Wechselt die aktive Klasse
function changePipeClass() {
    activePipeClass = document.getElementById('pipeClassSelect').value;
    console.log("Aktive Rohrklasse:", activePipeClass || "Deaktiviert");
}

// Verarbeitet den Upload einer eigenen CSV
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        loadPipeClassesToUI(e.target.result);
        showToast("Neue Rohrklassen erfolgreich geladen!", 'success');
    };
    reader.readAsText(file);

    // Reset des Input-Feldes, damit das Change-Event bei derselben Datei wieder auslöst
    event.target.value = '';
}

// Ermittelt die Länge eines Bauteils aus der aktiven Rohrklasse
function getPipeClassLength(element, isBranch = false) {
    if (!activePipeClass || !element) return 0;

    // Mapping von Element-Typ auf CSV-Bezeichnung (z.B. 'flange' -> 'Flansch')
    const typeName = bomNames[element.type] || element.type;
    const dn = (element.size || "").replace("DN ", "").trim();

    const entry = pipeClassData.find(d =>
        String(d.Klasse) === String(activePipeClass) &&
        String(d.Bauteil) === String(typeName) &&
        String(d.DN_1) === String(dn)
    );

    if (!entry) {
        console.warn(`Bauteil "${typeName}" (${dn}) in Rohrklasse "${activePipeClass}" nicht gefunden!`);
        return 0;
    }

    return isBranch ? (parseFloat(entry.Laenge_2) || 0) : (parseFloat(entry.Laenge_1) || 0);
}

/**
 * Prüft, ob ein Bauteil in der aktuellen Rohrklasse vorhanden ist und warnt den User live.
 */
function checkPipeClassCompatibility(toolType, size) {
    if (typeof activePipeClass === 'undefined' || !activePipeClass) return true;
    let searchName = bomNames[toolType] || toolType;

    // Schweißnähte, Rohre und Hilfslinien ignorieren
    if (['pipe', 'weld', 'text', 'dimension', 'number', 'weldnum', 'slope', 'revisionCloud', 'jumpbox', 'hatch'].includes(toolType)) return true;

    // Normalisierung der Größe (DN entfernen für Vergleich)
    const normalizedSize = (size || "").replace("DN ", "").trim();

    if (typeof pipeClassData !== 'undefined' && pipeClassData.length > 0) {
        let match = pipeClassData.find(entry =>
            String(entry.Klasse) === String(activePipeClass) &&
            String(entry.Bauteil) === String(searchName) &&
            String(entry.DN_1) === String(normalizedSize)
        );

        if (!match) {
            showToast(`⚠️ Rohrklassen-Warnung:\nDas Bauteil "${searchName}" in Größe "${size}" ist in der aktuellen Rohrklasse "${activePipeClass}" nicht hinterlegt!\n\nEs wird trotzdem gezeichnet, aber bei Bemaßungen wird kein Längen-Abzug berechnet.`, 'error');
            return false;
        }
    }
    return true;
}

// Hilfsfunktion: Findet ein physikalisches Bauteil an einer Koordinate (für Bemaßungs-Andocken)
function findElementAtPoint(point) {
    if (!point) return null;
    const TOL = 2; // Sehr enge Toleranz, da Bemaßungen exakt auf Snappoints sitzen
    return elements.find(el => {
        if (['pipe', 'dimension', 'hatch', 'balloon', 'weldnum', 'revisionCloud', 'jumpbox', 'text', 'number'].includes(el.type)) return false;

        if (el.type === 'reducer') {
            if (dist2(point, el.start) < TOL * TOL) return true;
            if (dist2(point, el.end) < TOL * TOL) return true;
            return false;
        }

        let p = { x: el.x, y: el.y };
        return dist2(point, p) < TOL * TOL;
    });
}

/** 
 * Hilfsfunktion: Ermittelt die Abzugslänge eines Bauteils (real oder virtuell) an einem Punkt.
 */
function getAttachedFittingLength(pt, excludeVirtual = false) {
    if (!pt || !activePipeClass) return 0;
    const TOL = 10;

    // 1. Suche in realen Elementen (Flansch, Ventil, etc.)
    let realEl = elements.find(el => {
        if (['pipe', 'smartJump', 'dimension', 'hatch', 'balloon', 'weldnum', 'revisionCloud', 'jumpbox', 'text', 'number'].includes(el.type)) return false;
        let p = { x: el.x, y: el.y };
        if (el.type === 'reducer') {
            if (dist2(pt, el.start) < TOL * TOL) return true;
            if (dist2(pt, el.end) < TOL * TOL) return true;
            return false;
        }
        return dist2(pt, p) < TOL * TOL;
    });

    if (realEl) return getPipeClassLength(realEl);

    // 2. Suche in virtuellen Elementen (Bögen, T-Stücke)
    if (!excludeVirtual && typeof getBOMData === 'function') {
        const { virtualElements } = getBOMData();
        let virtEl = virtualElements.find(v => dist2(pt, { x: v.x, y: v.y }) < 100); // 10px Radius

        if (virtEl) {
            // Bevorzugt wird direkt Z-Mass vom Smart Jump genutzt
            if (virtEl.zMass !== undefined) {
                return virtEl.zMass;
            }

            let mappedType = virtEl.type === 'bend' ? 'Bogen' : (virtEl.type === 'tee' ? 'T-Stueck' : virtEl.name);
            return getPipeClassLength({ type: mappedType, size: virtEl.size });
        }
    }

    return 0;
}

// --- AUTO-SAVE REMINDER (Alle 5 Minuten) ---
function showSaveReminder() {
    // 1. Speichern-Button finden (Passe die ID an deine index.html an, z.B. 'btnSave' oder 'btnExportJSON')
    const saveBtn = document.getElementById('btnSave') || document.querySelector('.top-right button:nth-child(4)');

    if (!saveBtn) return; // Abbruch, falls Button nicht gefunden

    // 2. Verhindern, dass sich Blasen stapeln
    if (document.getElementById('saveReminderBubble')) return;

    // 3. Blase erstellen
    const reminder = document.createElement('div');
    reminder.id = 'saveReminderBubble';
    reminder.innerText = "💾 Speichern nicht vergessen!";

    // Modernes Styling, passend zur neuen UI
    reminder.style.cssText = `
        position: fixed; 
        background-color: var(--primary, #2563eb); 
        color: white;
        padding: 6px 12px; 
        border-radius: 8px; 
        font-size: 13px; 
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
        pointer-events: none; 
        opacity: 0;
        transition: opacity 0.5s ease; 
        z-index: 10000;
        white-space: nowrap;
    `;

    // 4. Position exakt unter dem Button berechnen
    const rect = saveBtn.getBoundingClientRect();
    reminder.style.top = (rect.bottom + 12) + 'px';
    reminder.style.left = (rect.left + (rect.width / 2)) + 'px';
    reminder.style.transform = 'translateX(-50%)';

    // 5. Kleines Dreieck (Pfeil) nach oben
    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute; 
        top: -4px; 
        left: 50%; 
        transform: translateX(-50%) rotate(45deg);
        width: 8px; 
        height: 8px; 
        background-color: var(--primary, #2563eb);
    `;
    reminder.appendChild(arrow);

    // 6. Ins Dokument einfügen
    document.body.appendChild(reminder);

    // 7. Animation starten (Einblenden -> Warten -> Ausblenden -> Löschen)
    setTimeout(() => { reminder.style.opacity = '1'; }, 100);
    setTimeout(() => {
        reminder.style.opacity = '0';
        setTimeout(() => reminder.remove(), 500); // Warten bis CSS Transition fertig ist
    }, 5000); // 5 Sekunden sichtbar
}

// Intervall starten: 5 Minuten = 300.000 Millisekunden
setInterval(showSaveReminder, 300000);

// Beim ersten Laden das Blatt optimal einpassen
window.addEventListener('load', () => {
    setTimeout(fitPanZoom, 50); // Kurze Verzögerung, damit CSS gerendert ist
});
 
// --- smartJump.js --- 
// --- SMART JUMP / VERSATZ LOGIK (Isomake) ---

/**
 * Standard-Fitting-Winkel in Grad (erweiterbar).
 */
const STANDARD_FITTING_ANGLES = [90, 45, 30, 22.5, 15, 11.25];
const SNAP_TOLERANCE_DEG = 0.5;

function snapToStandardFitting(rawAngle) {
    for (let stdAngle of STANDARD_FITTING_ANGLES) {
        if (Math.abs(rawAngle - stdAngle) <= SNAP_TOLERANCE_DEG) {
            return { angle: stdAngle, isStandard: true };
        }
    }
    // Sonderwinkel: auf 0.1° runden
    return { angle: Math.round(rawAngle * 10) / 10, isStandard: false };
}

function getR90ForDN(dn) {
    if (!activePipeClass || !pipeClassData || pipeClassData.length === 0) return 0;

    const dnNum = String(dn).replace('DN ', '').trim();

    const entry = pipeClassData.find(d =>
        String(d.Klasse) === String(activePipeClass) &&
        String(d.Bauteil) === 'Bogen' &&
        String(d.DN_1) === dnNum
    );

    if (!entry) {
        console.warn(`Bogen R_90 für DN ${dnNum} in Klasse "${activePipeClass}" nicht gefunden.`);
        return 0;
    }

    return parseFloat(entry.Laenge_1) || 0;
}

function getBogenName(angle) {
    if (angle === 90) return 'Bogen';
    return `Bogen ${angle}°`;
}

function calculateSmartJump(params) {
    const dx = parseFloat(params.deltas?.dx || params.dx || 0);
    const dy = parseFloat(params.deltas?.dy || params.dy || 0);
    const dz = parseFloat(params.deltas?.dz || params.dz || 0);
    const size = params.size || 'DN 50';

    // 1. Echte Rohrlänge (Systemlänge)
    const jumpLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // 2. Sprung-Typ erkennen
    const nonZeroCount = [dx, dy, dz].filter(v => v !== 0).length;
    const jumpType = nonZeroCount <= 2 ? 'etage' : 'raumsprung';

    // 3. Dominante Achse ermitteln (größtes |Delta| = Hauptlaufrichtung)
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const absDz = Math.abs(dz);
    const maxDelta = Math.max(absDx, absDy, absDz);

    let dominantAxis, hauptDelta, versatz;
    if (maxDelta === absDx) {
        dominantAxis = 'dx';
        hauptDelta = absDx;
        versatz = Math.sqrt(dy * dy + dz * dz);
    } else if (maxDelta === absDy) {
        dominantAxis = 'dy';
        hauptDelta = absDy;
        versatz = Math.sqrt(dx * dx + dz * dz);
    } else {
        dominantAxis = 'dz';
        hauptDelta = absDz;
        versatz = Math.sqrt(dx * dx + dy * dy);
    }

    // 4. Winkel berechnen (α = atan2(versatz, hauptDelta))
    let rawAngle = 0;
    if (hauptDelta > 0) {
        rawAngle = Math.atan2(versatz, hauptDelta) * (180 / Math.PI);
    }

    // 5. Auf Standard-Fitting snappen
    const snapped = snapToStandardFitting(rawAngle);

    // 6. Z-Maß berechnen: Z = R_90 × tan(α/2 × π/180)
    const R90 = getR90ForDN(size);
    const alphaRad = (snapped.angle / 2) * (Math.PI / 180);
    const zMass = R90 * Math.tan(alphaRad);

    // 7. Schnittmaß: Rohrlänge minus 2× Z-Maß (zwei Bögen am Ein-/Austritt)
    const cutLength = Math.round((jumpLength - 2 * zMass) * 10) / 10;

    return {
        jumpLength: Math.round(jumpLength * 10) / 10,
        rawAngle: Math.round(rawAngle * 100) / 100,
        snappedAngle: snapped.angle,
        isStandard: snapped.isStandard,
        zMass: Math.round(zMass * 10) / 10,
        cutLength,
        dominantAxis,
        jumpType,
        R90
    };
}

function drawSmartJumpHelpers(ctx, el, color, isPreview = false) {
    // Rendern als reine Linie in render.js
}
 
// --- bom.js --- 
// --- STÜCKLISTEN-LOGIK (BOM) (Isomake) ---

let bomBatchNumbers = {}; // Speichert Chargennummern während der Sitzung

/**
 * Sammelt und berechnet alle Stücklisten-Daten aus dem gezeichneten Modell. Erkennt automatisch Bögen und T-Stücke.
 */
function getBOMData() {
    let bom = {}; 
    let virtualElements = [];
    const centroids = [];

    const findCentroid = (p) => {
        let c = centroids.find(node => dist2(node, p) < 100);
        if (!c) {
            c = { x: p.x, y: p.y };
            centroids.push(c);
        }
        return c;
    };

    // 1. Grunddaten erfassen und Knotenpunkte (Centroids) identifizieren
    elements.forEach(el => {
        if (['text', 'number', 'dimension', 'hatch', 'elevation', 'msr', 'support', 'flowarrow', 'balloon', 'revisionCloud', 'weldnum', 'slope', 'jumpbox'].includes(el.type)) return;
        if (el.isExisting) return;

        let size = el.size || 'DN ?';
        if (el.type === 'reducer' && el.size2) { size = size + " / " + el.size2; }
        
        // Schweißnaht-Größe von angrenzendem Rohr holen falls DN ?
        if (el.type === 'weld' && (!el.size || el.size === 'DN ?')) {
            const pipe = elements.find(p => p.type === 'pipe' && distToSegmentSquared({x: el.x, y: el.y}, {x: p.startX, y: p.startY}, {x: p.endX, y: p.endY}) < 25);
            if (pipe) size = pipe.size || 'DN ?';
        }

        let name = el.customName || bomNames[el.type] || el.type;
        if (el.type === 'weld' && name.startsWith('Schweißnaht')) { name = 'Schweißnaht'; }
        
        if (el.type === 'smartJump') {
            let sP = { x: el.startX, y: el.startY };
            let eP = { x: el.endX, y: el.endY };
            findCentroid(sP);
            findCentroid(eP);
            
            let pipeKey = size + " | Rohrleitung";
            if (!bom[pipeKey]) bom[pipeKey] = { name: 'Rohrleitung', size: size, totalLength: 0, count: 0, missingLength: false };
            let sLen = parseFloat(el.cutLength) || 0;
            if (sLen > 0) bom[pipeKey].totalLength += sLen;
            bom[pipeKey].count++;

            let fallBackAngle = typeof el.calculatedAngle !== 'undefined' ? el.calculatedAngle : (el.snappedAngle || 90);
            let bName = typeof getBogenName === 'function' ? getBogenName(fallBackAngle) : `Bogen ${fallBackAngle}°`;
            if (bName === 'Bogen 90°') bName = 'Bogen';
            let bendKey = size + " | " + bName;
            if (!bom[bendKey]) bom[bendKey] = { name: bName, size: size, count: 0 };
            bom[bendKey].count += 2;

            const jumpRes = typeof calculateSmartJump === 'function' ? calculateSmartJump(el) : { zMass: el.zMass };
            virtualElements.push({ type: 'bend', name: bName, size: size, x: sP.x, y: sP.y, isJump: true, zMass: jumpRes.zMass });
            virtualElements.push({ type: 'bend', name: bName, size: size, x: eP.x, y: eP.y, isJump: true, zMass: jumpRes.zMass });
        } else if (el.type === 'pipe') {
            if (el.isHose) name = 'Schlauch';
            let key = size + " | " + name;
            if (!bom[key]) bom[key] = { name: name, size: size, totalLength: 0, count: 0, missingLength: false };
            
            let l = el.type === 'pipe' ? parseFloat(el.realLength) : 0;
            if (!isNaN(l) && l > 0) bom[key].totalLength += l; 
            else if (el.type === 'pipe') bom[key].missingLength = true;
            
            bom[key].count++; 
            
            let sP = { x: el.startX !== undefined ? el.startX : (el.start ? el.start.x : 0), y: el.startY !== undefined ? el.startY : (el.start ? el.start.y : 0) };
            let eP = { x: el.endX !== undefined ? el.endX : (el.end ? el.end.x : 0), y: el.endY !== undefined ? el.endY : (el.end ? el.end.y : 0) };
            findCentroid(sP); 
            findCentroid(eP);
        } else {
            let key = size + " | " + name; 
            if (!bom[key]) bom[key] = { name: name, size: size, count: 0 }; 
            bom[key].count++;
        }
    });

    // 2. Virtuelle Elemente (Bögen/T-Stücke) an den Knotenpunkten berechnen
    centroids.forEach(node => {
        let connectedPipes = [];
        elements.forEach(el => {
            if ((el.type === 'pipe' || el.type === 'smartJump') && !el.isExisting) {
                let sP = { x: el.startX !== undefined ? el.startX : (el.start ? el.start.x : 0), y: el.startY !== undefined ? el.startY : (el.start ? el.start.y : 0) };
                let eP = { x: el.endX !== undefined ? el.endX : (el.end ? el.end.x : 0), y: el.endY !== undefined ? el.endY : (el.end ? el.end.y : 0) };
                
                let dStart = dist2(node, sP); 
                let dEnd = dist2(node, eP); 
                let dSeg = el.type === 'pipe' ? distToSegmentSquared(node, sP, eP) : 9999;
                
                if (dStart < 100) connectedPipes.push({ size: el.size || 'DN ?', vx: eP.x - sP.x, vy: eP.y - sP.y });
                else if (dEnd < 100) connectedPipes.push({ size: el.size || 'DN ?', vx: sP.x - eP.x, vy: sP.y - eP.y });
                else if (dSeg < 100) { 
                    let vx = eP.x - sP.x; let vy = eP.y - sP.y; 
                    connectedPipes.push({ size: el.size || 'DN ?', vx: vx, vy: vy }); 
                    connectedPipes.push({ size: el.size || 'DN ?', vx: -vx, vy: -vy }); 
                }
            }
        });

        let connectedSizes = connectedPipes.map(p => p.size);
        if (connectedPipes.length === 2) {
            let p1 = connectedPipes[0]; 
            let p2 = connectedPipes[1]; 
            let len1 = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy); 
            let len2 = Math.sqrt(p2.vx * p2.vx + p2.vy * p2.vy);
            if (len1 > 0 && len2 > 0) {
                let dot = (p1.vx / len1) * (p2.vx / len2) + (p1.vy / len1) * (p2.vy / len2);
                if (dot > -0.99) { 
                    let bSize = (p1.size === p2.size) ? p1.size : p1.size + " / " + p2.size; 
                    let key = bSize + " | Bogen"; 
                    if (!bom[key]) bom[key] = { name: "Bogen", size: bSize, count: 0 }; 
                    bom[key].count++; 
                    virtualElements.push({ type: 'bend', name: "Bogen", size: bSize, x: node.x, y: node.y }); 
                }
            }
        }
        if (connectedSizes.length === 3 || connectedSizes.length === 4) {
            connectedSizes.sort((a, b) => (parseInt(b.replace(/\D/g, '')) || 0) - (parseInt(a.replace(/\D/g, '')) || 0));
            let tName = connectedSizes.length === 3 ? "T-Stück" : "Kreuzstück"; 
            let tSize = (connectedSizes[0] === connectedSizes[connectedSizes.length - 1]) ? connectedSizes[0] : connectedSizes[0] + " / " + connectedSizes[connectedSizes.length - 1]; 
            let key = tSize + " | " + tName;
            if (!bom[key]) bom[key] = { name: tName, size: tSize, count: 0 }; 
            bom[key].count++; 
            virtualElements.push({ type: 'tee', name: tName, size: tSize, x: node.x, y: node.y });
        }
    });

    const sortOrder = { 'Rohr': 1, 'Flansch': 2, 'Bogen': 3, 'T-Stück': 4, 'Kreuzstück': 5, 'Reduzierung': 6, 'Absperrventil': 7, 'Rückschlagklappe': 7, 'Klappe': 7, 'Sicherheitsventil': 7, '3-Wege Ventil': 7, 'Kompensator': 7, 'Schauglas': 7, 'Muffe': 8, 'Anschweißnippel': 8, 'Blindkappe': 9, 'Sonderteil': 10, 'Schweißnaht': 11 };
    let sortedKeys = Object.keys(bom).sort((a, b) => {
        let orderA = sortOrder[bom[a].name] || 99; 
        let orderB = sortOrder[bom[b].name] || 99; 
        if (orderA !== orderB) return orderA - orderB;
        let numA = parseInt(bom[a].size.replace(/\D/g, '')) || 0; 
        let numB = parseInt(bom[b].size.replace(/\D/g, '')) || 0; 
        if (numA !== numB) return numB - numA;
        return a.localeCompare(b);
    });

    let posMap = {}; 
    sortedKeys.forEach((key, idx) => posMap[key] = idx + 1);
    
    return { bom, sortedKeys, posMap, virtualElements };
}

/**
 * Erstellt das HTML-Tabellen-Layout für die Stücklisten-Ansicht und injiziert die Daten.
 */
function generateBOM() {
    const { bom, sortedKeys, posMap } = getBOMData(); let tbody = document.getElementById('bomTableBody'); tbody.innerHTML = '';
    let headerText = "Stückliste Iso-Nr.: " + (titleBlock.isoNr || "");
    document.getElementById('bomModalTitle').innerText = headerText;
    sortedKeys.forEach((key) => {
        let item = bom[key]; let posNum = posMap[key];
        let rowKey = `${item.name}_${item.size}`;
        let row = `<tr style="border-bottom: 1px solid var(--border);">` +
            `<td style="padding: 8px; font-weight: bold; color: var(--primary); text-align: center; min-width: 32px; border: 1px solid var(--border);">${posNum}</td>` +
            `<td style="padding: 8px; border: 1px solid var(--border);">${item.name}</td>` +
            `<td style="padding: 8px; font-weight: bold; border: 1px solid var(--border);">${item.size}</td>` +
            `<td style="padding: 8px; border: 1px solid var(--border);">`;
        if (item.name === 'Rohrleitung') { row += `${item.totalLength} mm `; if (item.missingLength) row += `<span style="color: var(--danger); font-size: 12px;"><br>(Nicht alle Längen erfasst)</span>`; }
        else { row += `${item.count} Stück`; }
        row += `</td><td style="border: 1px solid var(--border); min-width: 100px; padding: 0;">` +
               `<input type="text" value="${bomBatchNumbers[rowKey] || ''}" onchange="bomBatchNumbers['${rowKey}'] = this.value" style="width: 100%; height: 100%; border: none; background: transparent; padding: 8px; color: inherit; font-family: inherit; box-sizing: border-box;">` +
               `</td></tr>`; 
        tbody.innerHTML += row;
    });
    document.getElementById('colorModalOverlay').style.display = 'block'; document.getElementById('bomModal').style.display = 'block';
}

/**
 * Öffnet ein reines HTML-Fenster mit der Stückliste und ruft den Druckdialog auf.
 */
function printBOM() {
    const { bom, sortedKeys, posMap } = getBOMData();
    
    // Aufbau der Druckseite
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Stückliste ${titleBlock.isoNr || ''}</title>`;
    html += `<style>
        body { font-family: "Segoe UI", Arial, sans-serif; padding: 40px; color: #000; background: #fff; }
        h2 { font-size: 20pt; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000 !important; padding: 10px; text-align: left; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        th { background-color: #f2f2f2 !important; font-weight: bold; text-transform: uppercase; }
        tr:nth-child(even) { background-color: #fafafa !important; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        @media print { 
            body { padding: 0; } 
            @page { margin: 1cm; }
        }
    </style></head><body>`;
    
    html += `<h2>Stückliste Iso-Nr.: ${titleBlock.isoNr || ''}</h2>`;
    html += '<table><thead><tr><th>Pos</th><th>Bauteil</th><th>DN / Größe</th><th>Menge / Länge</th><th>Chargennummer</th></tr></thead>';
    html += '<tbody>';
    
    sortedKeys.forEach((key, idx) => {
        let item = bom[key]; let posNum = posMap[key];
        let rowKey = `${item.name}_${item.size}`;
        let quantity = (item.name === 'Rohrleitung') ? `${item.totalLength} mm` : `${item.count} Stück`;
        if (item.name === 'Rohrleitung' && item.missingLength) quantity += ' *';
        
        html += `<tr>
            <td class="text-center bold">${posNum}</td>
            <td>${item.name}</td>
            <td class="bold">${item.size}</td>
            <td>${quantity}</td>
            <td>${bomBatchNumbers[rowKey] || '&nbsp;'}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    if (sortedKeys.some(k => bom[k].missingLength)) html += '<p style="font-size: 9pt; color: #666; margin-top: 15px;">* Nicht alle Längen erfasst</p>';
    html += '</body></html>';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'height=800,width=1000');
    
    if (printWindow) {
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                URL.revokeObjectURL(url);
                printWindow.close();
            }, 1000);
        };
    }
}

/**
 * Alias-Funktion, um die Stückliste über die UI anzuzeigen.
 */
function showBOM() { generateBOM(); }

/**
 * Erzeugt das Schweißnaht-Protokoll basierend auf den vorhandenen Naht-Nummern.
 * Identifiziert automatisch die verbundenen Bauteile pro Naht.
 */
function generateWeldProtocol() {
    // Hole Stücklisten-Daten, um auch virtuelle Bauteile (Bögen, T-Stücke) zur Verfügung zu haben
    const { virtualElements } = getBOMData();
    
    const weldNums = elements.filter(el => el.type === 'weldnum').sort((a, b) => {
        return (parseInt(a.text) || 0) - (parseInt(b.text) || 0);
    });

    const tbody = document.getElementById('weldTableBody');
    tbody.innerHTML = '';
    const TOL_RADIUS = 40; 
    const TOL_DIST2 = TOL_RADIUS * TOL_RADIUS;

    weldNums.forEach(wn => {
        const wX = wn.weldX !== undefined ? wn.weldX : wn.cx;
        const wY = wn.weldY !== undefined ? wn.weldY : wn.cy;
        let connected = [];
        let weldElement = elements.find(el => el.type === 'weld' && Math.abs(el.x - wX) < 10 && Math.abs(el.y - wY) < 10);
        let fallbackSize = weldElement ? weldElement.size : '';

        // 1. Physische Bauteile aus dem elements-Array prüfen
        elements.forEach((el, idx) => {
            if (el.isExisting) return;
            let dist = 99999;
            let otherX = el.x || 0;
            if (el.type === 'pipe') {
                let dStart = dist2({x: wX, y: wY}, {x: el.startX, y: el.startY});
                let dEnd = dist2({x: wX, y: wY}, {x: el.endX, y: el.endY});
                let dSeg = distToSegmentSquared({x: wX, y: wY}, {x: el.startX, y: el.startY}, {x: el.endX, y: el.endY});
                dist = Math.min(dStart, dEnd);
                if (dSeg < 100) dist = Math.min(dist, dSeg);
                otherX = (dStart < dEnd) ? el.endX : el.startX;
            } else if (el.type === 'reducer') {
                let dStart = dist2({x: wX, y: wY}, el.start);
                let dEnd = dist2({x: wX, y: wY}, el.end);
                dist = Math.min(dStart, dEnd);
                otherX = (dStart < dEnd) ? el.end.x : el.start.x;
            } else if (['flange', 'valve', 'socket', 'nipple', 'blindcap', 'sightglass', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'custom', 'slope'].includes(el.type)) {
                dist = dist2({x: wX, y: wY}, {x: el.x, y: el.y});
                otherX = el.x;
            }
            if (dist < 4900) { 
                connected.push({ id: idx, name: el.customName || bomNames[el.type] || el.type, size: el.size || fallbackSize, otherX: otherX, distSize: dist });
            }
        });

        // 2. Virtuelle Bauteile (Bögen, T-Stücke) prüfen
        virtualElements.forEach((v, vIdx) => {
            let dist = dist2({x: wX, y: wY}, {x: v.x, y: v.y});
            if (dist < 4900) {
                connected.push({ id: 'v' + vIdx + v.x + v.y, name: v.name, size: v.size, otherX: v.x, distSize: dist });
            }
        });

        // Dubletten-Filter basierend auf der internen ID
        connected = connected.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        // 3. Sortierung: Die nähesten Bauteile finden
        if (connected.length > 2) {
            connected.sort((a, b) => {
                // Bei exakt gleichem Abstand haben Formteile immer Vorrang vor Rohren
                if (Math.abs(a.distSize - b.distSize) < 5) {
                    let aIsPipe = (a.name === 'Rohrleitung' || a.name === 'Rohr') ? 1 : 0;
                    let bIsPipe = (b.name === 'Rohrleitung' || b.name === 'Rohr') ? 1 : 0;
                    return aIsPipe - bIsPipe;
                }
                return a.distSize - b.distSize;
            });
            
            // Absoluter Priorisierungs-Filter: Formteile verdrängen Rohre
            let pipes = connected.filter(c => c.name === 'Rohrleitung' || c.name === 'Rohr');
            let nonPipes = connected.filter(c => c.name !== 'Rohrleitung' && c.name !== 'Rohr');
            
            // WICHTIG: Nur Formteile priorisieren, die wirklich DIREKT an der Schweißnaht liegen (< 30px)
            let closeNonPipes = nonPipes.filter(c => c.distSize < 900);

            if (closeNonPipes.length >= 2) {
                // Zwei Formteile (z.B. T-Stück und Flansch) sind am selben Punkt.
                // Das (meist kurze) Rohr dazwischen wird für die Dokumentation ignoriert.
                connected = [closeNonPipes[0], closeNonPipes[1]];
            } else if (closeNonPipes.length === 1 && pipes.length >= 1) {
                // Ein Formteil liegt an, ansonsten nur Rohre.
                connected = [closeNonPipes[0], pipes[0]];
            } else {
                // Nur Rohre (oder weiter entfernte Flansche jenseits der Lücke). Nimm die 2 nächsten.
                connected = connected.slice(0, 2);
            }
        }
        
        if (connected.length >= 2) {
            connected.sort((a, b) => a.otherX - b.otherX);
        }

        // Auffüllen falls nötig (Fokus auf Schweißnähte mitten auf Leitungen)
        if (connected.length === 1 && (connected[0].name === 'Rohr' || connected[0].name === 'Rohrleitung')) {
            connected.push({ name: 'Rohr', size: connected[0].size, otherX: connected[0].otherX + 1 });
        }

        while (connected.length < 2) {
            connected.push({ name: connected.length === 0 ? 'Nicht gefunden' : 'Offenes Ende', size: fallbackSize });
        }

        // 4. Clean Naming (Namens-Bereinigung)
        for (let i = 0; i < 2; i++) {
            let n = connected[i].name;
            if (n === 'Rohrleitung') n = 'Rohr';
            else if (n === 'Rohrbogen') n = 'Bogen';
            else if (n === 'Anschweißnippel') n = 'Nippel';
            else if (n === 'Anschweißmuffe' || n === 'Muffe') n = 'Muffe';
            else if (n && n.startsWith('Schweißnaht')) n = 'Schweißnaht'; // Fallback für Altlasten
            connected[i].name = n;
        }

        let rawSize = fallbackSize || connected[0].size || connected[1].size || '0';
        let matchSize = String(rawSize).match(/\d+/);
        const cleanSize = matchSize ? matchSize[0] : '0';

        tbody.innerHTML += `<tr>
            <td style="padding: 10px; border: 1px solid var(--border); text-align: center; font-weight: bold; background: white;">${wn.text}</td>
            <td style="padding: 10px; border: 1px solid var(--border); background: white;">${connected[0].name}</td>
            <td style="padding: 10px; border: 1px solid var(--border); text-align: center; background: white;">${cleanSize}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid var(--border); text-align: center; font-weight: bold; background: white;">${wn.text}</td>
            <td style="padding: 10px; border: 1px solid var(--border); background: white;">${connected[1].name}</td>
            <td style="padding: 10px; border: 1px solid var(--border); text-align: center; background: white;">${cleanSize}</td>
        </tr>`;
    });

    document.getElementById('bomModal').style.display = 'none';
    document.getElementById('weldModal').style.display = 'block';
}
 
// --- render.js --- 
// --- RENDER-LOGIK (Isomake) ---

let isRedrawing = false;

redraw = function () {
    if (isRedrawing) return;
    isRedrawing = true;
    requestAnimationFrame(() => {
        try {
            performRedraw();
        } finally {
            isRedrawing = false;
        }
    });
}

/**
 * Haupt-Renderschleife. Führt Culling durch und zeichnet Grid, Rohre, Armaturen, Texte und UI nacheinander auf den Canvas.
 */
function performRedraw() {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT); drawGrid();

    let hoverCol = (currentTool === 'erase') ? '#ef5350' : ((currentTool === 'toggleExisting' || currentTool === 'toggleHose') ? '#8e24aa' : (currentTool === 'colorize' ? activePaintColor : '#f57c00'));

    let pipesToDraw = []; let pipeHoverList = []; let pipeSelectList = [];

    elements.forEach((el, index) => {
        try {
            let isEditMode = (document.getElementById('propModal').style.display === 'block' || document.getElementById('textPropModal').style.display === 'block');
            let selCol = isEditMode ? '#d32f2f' : '#1976d2';
            if (el.type === 'hatch' && layerVis.hatches) drawHatch(ctx, el.p1, el.p2, el.p3, el.dir, (selectedElementIndices.includes(index) ? selCol : (index === hoveredElementIndex ? hoverCol : (el.color || globalColors.pipe))), false);
            if (el.type === 'revisionCloud') drawRevisionCloud(ctx, el, index, index === hoveredElementIndex, selectedElementIndices.includes(index), false);
        } catch (err) { console.warn("Fehler beim Zeichnen (Loop1) übersprungen:", el, err); }
    });

    elements.forEach((el, index) => {
        try {
            if (!['dimension', 'number', 'slope', 'weldnum'].includes(el.type)) return;
            if (!layerVis.dims) return;
            
            let isSelected = selectedElementIndices.includes(index); 
            let isHovered = (index === hoveredElementIndex) || isSelected;
            let isEditMode = document.getElementById('propModal').style.display === 'block';
            let col = isSelected ? (isEditMode ? '#d32f2f' : '#1976d2') : (isHovered ? hoverCol : undefined);
            
            // NEU: Beim Drucken die rote Warnfarbe (#d32f2f) durch die Standard-Textfarbe ersetzen
            let drawColor = el.color;
            if (typeof isPrinting !== 'undefined' && isPrinting && el.type === 'dimension' && drawColor === '#d32f2f') {
                drawColor = globalColors.text;
            }

            if (el.type === 'slope') drawSlope(ctx, el.x, el.y, el.dir, col || drawColor || globalColors.valve, false, el.isExisting);
            else if (el.type === 'number') drawNumber(ctx, el.startX, el.startY, el.endX, el.endY, el.text, col || drawColor || globalColors.weldnum);
            else if (el.type === 'dimension') drawDimension(ctx, el.start, el.end, el.dir, el.dist, el.text, col || drawColor || globalColors.text, false, el.cutLength, el.mainDir);
            else if (el.type === 'weldnum') drawNumber(ctx, el.weldX, el.weldY, el.cx, el.cy, el.text, col || drawColor || globalColors.weldnum);
        } catch (err) { console.warn("Fehler beim Zeichnen (Loop2) übersprungen:", el, err); }
    });

    elements.forEach((el, index) => {
        try {
            if (['hatch', 'dimension', 'number', 'slope'].includes(el.type)) return;
            if (el.type === 'text' && !layerVis.texts) return;
            if (el.type !== 'text' && !layerVis.pipes) return;

            let isSelected = selectedElementIndices.includes(index); let isHovered = (index === hoveredElementIndex) || isSelected;
            let isEditMode = document.getElementById('propModal').style.display === 'block';
            let col = isSelected ? (isEditMode ? '#d32f2f' : '#1976d2') : (isHovered ? hoverCol : undefined);

            if (el.type === 'pipe' || el.type === 'smartJump') {
                if (autoElbows) { pipesToDraw.push(el); pipeHoverList.push(isHovered); pipeSelectList.push(isSelected); return; }
                ctx.lineWidth = el.thickness || 4; ctx.lineCap = 'round'; ctx.strokeStyle = col || el.color || globalColors.pipe;
                if (el.isExisting) ctx.setLineDash([8, 8]); else ctx.setLineDash([]);
                if (el.isHose) {
                    let dx = el.endX - el.startX; let dy = el.endY - el.startY; let len = Math.sqrt(dx * dx + dy * dy); let angle = Math.atan2(dy, dx);
                    ctx.save(); ctx.translate(el.startX, el.startY); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0);
                    for (let i = 0; i <= len; i += 1) ctx.lineTo(i, Math.sin(i / 12 * Math.PI * 2) * 4);
                    ctx.stroke(); ctx.restore();
                } else { ctx.beginPath(); ctx.moveTo(el.startX, el.startY); ctx.lineTo(el.endX, el.endY); ctx.stroke(); }
                ctx.setLineDash([]);
            }
        } catch (err) { console.warn("Fehler beim Zeichnen (Loop3) übersprungen:", el, err); }
    });

    if (autoElbows && pipesToDraw.length > 0) drawPipesWithElbows(ctx, pipesToDraw, null, globalColors.pipe, pipeHoverList, pipeSelectList);

    elements.forEach((el, index) => {
        try {
            if (['hatch', 'dimension', 'number', 'slope', 'pipe', 'smartJump'].includes(el.type)) return;
            if (el.type === 'text' && !layerVis.texts) return;
            if (el.type !== 'text' && !layerVis.pipes) return;

            let isSelected = selectedElementIndices.includes(index); let isHovered = (index === hoveredElementIndex) || isSelected;
            let isEditMode = document.getElementById('propModal').style.display === 'block';
            let col = isSelected ? (isEditMode ? '#d32f2f' : '#1976d2') : (isHovered ? hoverCol : undefined);

            if (el.type === 'reducer') drawReducer(ctx, el.start, el.end, el.rType, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'weld') { ctx.fillStyle = col || el.color || globalColors.weld; ctx.beginPath(); ctx.arc(el.x, el.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = isHovered ? 2 : 1; ctx.strokeStyle = col || el.color || globalColors.weld; if (el.isExisting) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
            else if (el.type === 'valve') drawValve(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === '3wayvalve') draw3WayValve(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'damper') drawDamper(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'checkvalve') drawCheckvalve(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'safetyvalve') drawSafetyValve(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'compensator') drawCompensator(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'sightglass') drawSightglass(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'blindcap') drawBlindcap(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'nipple') drawNipple(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'socket') drawSocket(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'clamp') drawClamp(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'blindclamp') drawBlindClamp(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'custom') drawCustom(ctx, el, col || el.color || globalColors.valve, false, el.isExisting);
            else if (el.type === 'flange') drawFlange(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'text') drawText(ctx, el.text, el.x, el.y, el.dir || 0, el.size || 16, col || el.color || globalColors.text);
            else if (el.type === 'flowarrow') drawFlowArrow(ctx, el.x, el.y, el.dir, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'support') drawSupport(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'elevation') drawElevationMarker(ctx, el.x, el.y, el.dir, el.text, col || el.color || globalColors.text, false, el.isExisting, el.rotation);
            else if (el.type === 'msr') drawMSR(ctx, el.x, el.y, el.dir, el.text, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
            else if (el.type === 'jumpbox') drawJumpbox(ctx, el, col || el.color || globalColors.text, false);
            else if (el.type === 'insulation') drawInsulation(ctx, el.x, el.y, el.dir, el.thickness || 4, col || el.color || globalColors.valve, false, el.isExisting, el.rotation);
        } catch (err) { console.warn("Fehler beim Zeichnen (Loop4) übersprungen:", el, err); }
    });

    // --- NEU: Vorschau beim Einfügen (Ghosting) ---
    if (isPasting && pastingElements.length > 0 && !isPrinting) {
        ctx.globalAlpha = 0.5;
        let previewCol = '#1976d2';
        pastingElements.forEach(el => {
            try {
                if (el.type === 'pipe' || el.type === 'smartJump') {
                    ctx.lineWidth = el.thickness || 4; ctx.lineCap = 'round'; ctx.strokeStyle = previewCol;
                    ctx.beginPath(); ctx.moveTo(el.startX, el.startY); ctx.lineTo(el.endX, el.endY); ctx.stroke();
                } else if (el.type === 'valve') drawValve(ctx, el.x, el.y, el.dir, el.thickness || 4, previewCol, true);
                else if (el.type === '3wayvalve') draw3WayValve(ctx, el.x, el.y, el.dir, el.thickness || 4, previewCol, true);
                else if (el.type === 'flange') drawFlange(ctx, el.x, el.y, el.dir, el.thickness || 4, previewCol, true);
                else if (el.type === 'weld') { ctx.fillStyle = previewCol; ctx.beginPath(); ctx.arc(el.x, el.y, 5, 0, Math.PI * 2); ctx.fill(); }
                else if (el.type === 'reducer') drawReducer(ctx, el.start, el.end, el.rType, el.thickness || 4, previewCol, true);
                else if (el.type === 'number') drawNumber(ctx, el.startX, el.startY, el.endX, el.endY, el.text, previewCol);
                else if (el.type === 'dimension') drawDimension(ctx, el.start, el.end, el.dir, el.dist, el.text, previewCol, true);
                else if (el.type === 'text') drawText(ctx, el.text, el.x, el.y, el.dir || 0, el.size || 16, previewCol);
                else if (el.type === 'hatch') drawHatch(ctx, el.p1, el.p2, el.p3, el.dir, previewCol, true);
                else if (el.type === 'custom') drawCustom(ctx, el, previewCol, true);
                else if (el.type === 'checkvalve') drawCheckvalve(ctx, el.x, el.y, el.dir, el.thickness || 4, previewCol, true);
                else if (el.type === 'nipple') drawNipple(ctx, el.x, el.y, el.dir, el.thickness || 4, previewCol, true);
                else if (el.type === 'socket') drawSocket(ctx, el.x, el.y, el.dir, el.thickness || 4, previewCol, true);
                else if (el.type === 'weldnum') drawNumber(ctx, el.weldX, el.weldY, el.cx, el.cy, el.text, previewCol);
            } catch (err) { }
        });
        ctx.globalAlpha = 1.0;
    }
    // --- NEU: Rohr-Kreuzungs-Sprünge (Hop-Over-Bögen) ---
    if (layerVis.pipes && !isPrinting) {
        const pipes = elements.filter(el => el.type === 'pipe' && !el.isHose);

        function getSegmentIntersection(p1, p2, p3, p4) {
            let d1x = p2.x - p1.x, d1y = p2.y - p1.y;
            let d2x = p4.x - p3.x, d2y = p4.y - p3.y;
            let cross = d1x * d2y - d1y * d2x;
            if (Math.abs(cross) < 1e-8) return null; // parallel
            let t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
            let u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
            if (t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95) {
                return { x: p1.x + t * d1x, y: p1.y + t * d1y, t };
            }
            return null;
        }

        for (let i = 0; i < pipes.length; i++) {
            try {
                let pA = pipes[i];
                let crossings = [];

                for (let j = 0; j < pipes.length; j++) {
                    if (i === j) continue;
                    let pB = pipes[j];
                    let pt = getSegmentIntersection(
                        { x: pA.startX, y: pA.startY }, { x: pA.endX, y: pA.endY },
                        { x: pB.startX, y: pB.startY }, { x: pB.endX, y: pB.endY }
                    );
                    if (pt && j > i) crossings.push(pt);
                }

                if (crossings.length === 0) continue;

                let dx = pA.endX - pA.startX;
                let dy = pA.endY - pA.startY;
                let len = Math.sqrt(dx * dx + dy * dy);
                if (len < 1) continue;
                let nx = dx / len, ny = dy / len;
                let R = 7;

                for (let pt of crossings) {
                    let pipeColor = pA.color || globalColors.pipe;
                    let lineThick = pA.thickness || 4;

                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, R + 1, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(pA.startX, pA.startY);
                    ctx.lineTo(pt.x - nx * R, pt.y - ny * R);
                    ctx.strokeStyle = pipeColor;
                    ctx.lineWidth = lineThick;
                    ctx.lineCap = 'round';
                    if (pA.isExisting) ctx.setLineDash([8, 8]); else ctx.setLineDash([]);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(pt.x + nx * R, pt.y + ny * R);
                    ctx.lineTo(pA.endX, pA.endY);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    let angle = Math.atan2(ny, nx);
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, R, angle + Math.PI, angle, false);
                    ctx.strokeStyle = pipeColor;
                    ctx.lineWidth = lineThick;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
            } catch (err) { console.warn("Fehler bei Rohr-Kreuzung übersprungen:", pipes[i], err); }
        }
    }


    if (showSizeInfo) {
        let infoBoxes = [];
        let allCenters = [];

        elements.forEach(el => {
            try {
                if (['text', 'number', 'dimension', 'hatch', 'slope', 'elevation', 'msr', 'support', 'flowarrow'].includes(el.type)) return;
                let cpx, cpy;
                if (el.type === 'pipe' || el.type === 'smartJump') { cpx = (el.startX + el.endX) / 2; cpy = (el.startY + el.endY) / 2; }
                else if (el.type === 'reducer') { cpx = (el.start.x + el.end.x) / 2; cpy = (el.start.y + el.end.y) / 2; }
                else { cpx = el.x || 0; cpy = el.y || 0; }
                allCenters.push({ x: cpx, y: cpy });
            } catch (err) { console.warn("Fehler beim SizeInfo-Zentrum übersprungen:", el, err); }
        });

        const angles = [-Math.PI / 6, -5 * Math.PI / 6, -Math.PI / 2, Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6, 0, Math.PI, Math.PI / 4, -Math.PI / 4];
        ctx.font = 'bold 12px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        elements.forEach(el => {
            try {
                if (['text', 'number', 'dimension', 'hatch', 'slope', 'elevation', 'msr', 'support', 'flowarrow'].includes(el.type)) return;
                let px, py;
                if (el.type === 'pipe' || el.type === 'smartJump') { px = (el.startX + el.endX) / 2; py = (el.startY + el.endY) / 2; }
                else if (el.type === 'reducer') { px = (el.start.x + el.end.x) / 2; py = (el.start.y + el.end.y) / 2; }
                else { px = el.x || 0; py = el.y || 0; }

                let infoText = ""; let isMissing = false;
                if (el.type === 'pipe' || el.type === 'smartJump') {
                    if (!el.size || !el.realLength) isMissing = true;
                    infoText = (el.size || "?") + " L=" + (el.realLength || "?");
                } else if (el.type === 'reducer') {
                    if (!el.size || !el.size2) isMissing = true;
                    infoText = (el.size || "?") + "/" + (el.size2 || "?");
                } else {
                    if (!el.size) isMissing = true;
                    let typeName = bomNames[el.type] || el.type;
                    infoText = typeName + " " + (el.size || "?");
                }

                if (isMissing) infoText = "❗️ " + infoText;

                let tw = ctx.measureText(infoText).width; let th = 16; let fx = px, fy = py; let found = false;

                for (let r = 25; r <= 150; r += 25) {
                    for (let a of angles) {
                        let tx = px + r * Math.cos(a); let ty = py + r * Math.sin(a);
                        let intersect = false;
                        for (let b of infoBoxes) { if (Math.abs(tx - b.x) < (tw / 2 + b.w / 2 + 6) && Math.abs(ty - b.y) < (th / 2 + b.h / 2 + 6)) { intersect = true; break; } }
                        if (!intersect) { for (let c of allCenters) { if (Math.abs(tx - c.x) < (tw / 2 + 10) && Math.abs(ty - c.y) < (th / 2 + 10)) { intersect = true; break; } } }
                        if (!intersect) { fx = tx; fy = ty; found = true; break; }
                    }
                    if (found) break;
                }
                if (!found) { fx = px + 30; fy = py - 30; }
                infoBoxes.push({ x: fx, y: fy, w: tw, h: th });

                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(fx, fy);
                let drawColor = isMissing ? '#d32f2f' : '#4CAF50';
                ctx.strokeStyle = drawColor; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.fillRect(fx - tw / 2 - 3, fy - 9, tw + 6, 18);
                ctx.fillStyle = drawColor; ctx.fillText(infoText, fx, fy);
            } catch (err) { console.warn("Fehler beim SizeInfo-Platzer übersprungen:", el, err); }
        });
    }

    if (showBalloons || elements.some(e => e.type === 'balloon')) drawBalloons();

    if (isSelecting && !isPrinting) { ctx.fillStyle = 'rgba(25, 118, 210, 0.1)'; ctx.strokeStyle = 'rgba(25, 118, 210, 0.8)'; ctx.lineWidth = 1; let rx = Math.min(selectionStart.x, lastMousePos.x); let ry = Math.min(selectionStart.y, lastMousePos.y); let rw = Math.abs(selectionStart.x - lastMousePos.x); let rh = Math.abs(selectionStart.y - lastMousePos.y); ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh); }

    if (currentPoint && !isDraggingGroup && !isSelecting && !isPrinting) {
        let previewCol = 'rgba(25, 118, 210, 0.8)';
        if (currentTool === 'pipe' && isDrawing && startPoint) { ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = previewCol; ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(currentPoint.x, currentPoint.y); ctx.stroke(); }
        else if (currentTool === 'reducer' && reducerStep === 1 && reducerStart) drawReducer(ctx, reducerStart, currentPoint, reducerType, 4, previewCol, true);
        else if (currentTool === 'hatch' && layerVis.hatches) { if (hatchStep === 1 && hatchStart) { ctx.beginPath(); ctx.moveTo(hatchStart.x, hatchStart.y); ctx.lineTo(currentPoint.x, currentPoint.y); ctx.setLineDash([5, 5]); ctx.strokeStyle = previewCol; ctx.stroke(); ctx.setLineDash([]); } else if (hatchStep === 2 && hatchStart && hatchCorner) drawHatch(ctx, hatchStart, hatchCorner, currentPoint, hatchDir, previewCol, true); }
        else if (currentTool === 'dimension' && layerVis.dims) { 
            if (dimStep === 1 && dimStart) { 
                ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(25, 118, 210, 0.4)'; ctx.beginPath(); ctx.moveTo(dimStart.x, dimStart.y); ctx.lineTo(currentPoint.x, currentPoint.y); ctx.stroke(); 
            } else if (dimStep === 2 && dimStart && dimEnd) { 
                let v = getDimensionVector(dimDir, dimStart, dimEnd);
                let previewDist = (lastMousePos.x - dimStart.x) * v.x + (lastMousePos.y - dimStart.y) * v.y; 
                drawDimension(ctx, dimStart, dimEnd, dimDir, previewDist, "???", null, true, null, dimMainDir); 
            } else if (dimStep === 3 && pendingDimension) {
                let rawVal = evaluateMath(textInput.value);
                let numVal = parseFloat(rawVal);
                
                let startDeduct = getAttachedFittingLength(pendingDimension.start);
                let endDeduct = getAttachedFittingLength(pendingDimension.end);
                let cutL = numVal - startDeduct - endDeduct;
                
                let displayColor = null;
                if (activePipeClass && !isNaN(numVal) && cutL < 0) {
                    displayColor = "#d32f2f";
                }
                
                drawDimension(ctx, pendingDimension.start, pendingDimension.end, pendingDimension.dir, pendingDimension.dist, String(rawVal), displayColor, true, (activePipeClass && !isNaN(cutL)) ? cutL : null, pendingDimension.mainDir); 
            }
        }
        else if (currentTool === 'jumpbox') { if (jumpboxStep === 1 && jumpboxStart) { ctx.lineWidth = 1; ctx.strokeStyle = previewCol; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(jumpboxStart.x, jumpboxStart.y); ctx.lineTo(currentPoint.x, currentPoint.y); ctx.stroke(); ctx.setLineDash([]); } else if (jumpboxStep === 2 && jumpboxStart && jumpboxZ) { drawJumpbox(ctx, { start: jumpboxStart, zPoint: jumpboxZ, end: currentPoint, valX: 'X', valY: 'Y', valZ: 'Z' }, previewCol, true); } }
        else if (currentTool === 'number' && isDrawing && startPoint && layerVis.dims) drawNumber(ctx, startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, String(getNextNumber()), globalColors.weldnum, true);
        else if (currentTool === 'weldnum' && isDrawing && startPoint && layerVis.dims) drawNumber(ctx, startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, String(getNextWeldNumber()), globalColors.weldnum, true);
        else if (currentTool === 'weld' && layerVis.pipes) { ctx.fillStyle = globalColors.weld; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(currentPoint.x, currentPoint.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = globalColors.weld; ctx.stroke(); ctx.globalAlpha = 1.0; }
        else if (currentTool === 'valve' && layerVis.pipes) drawValve(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === '3wayvalve' && layerVis.pipes) draw3WayValve(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'damper' && layerVis.pipes) drawDamper(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'checkvalve' && layerVis.pipes) drawCheckvalve(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'safetyvalve' && layerVis.pipes) drawSafetyValve(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'compensator' && layerVis.pipes) drawCompensator(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'sightglass' && layerVis.pipes) drawSightglass(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'blindcap' && layerVis.pipes) drawBlindcap(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'nipple' && layerVis.pipes) drawNipple(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'socket' && layerVis.pipes) drawSocket(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'clamp' && layerVis.pipes) drawClamp(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'blindclamp' && layerVis.pipes) drawBlindClamp(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'flange' && layerVis.pipes) drawFlange(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'slope' && layerVis.dims) drawSlope(ctx, currentPoint.x, currentPoint.y, currentDir, null, true);
        else if (currentTool === 'text' && pendingTextPos === null && layerVis.texts) drawText(ctx, "T", currentPoint.x, currentPoint.y, currentTextDir, 16, null, true);
        else if (currentTool === 'custom' && pendingCustomPart && layerVis.pipes) drawCustom(ctx, { x: currentPoint.x, y: currentPoint.y, dir: currentDir, scale: 1, parts: pendingCustomPart }, null, true);
        else if (currentTool === 'flowarrow' && layerVis.pipes) drawFlowArrow(ctx, currentPoint.x, currentPoint.y, currentDir, null, true);
        else if (currentTool === 'support' && layerVis.pipes) drawSupport(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'elevation' && pendingSpecialTool === null && layerVis.pipes) drawElevationMarker(ctx, currentPoint.x, currentPoint.y, currentDir, "EL", null, true);
        else if (currentTool === 'msr' && pendingSpecialTool === null && layerVis.pipes) drawMSR(ctx, currentPoint.x, currentPoint.y, currentDir, "PI", null, true);
        else if (currentTool === 'insulation' && layerVis.pipes) drawInsulation(ctx, currentPoint.x, currentPoint.y, currentDir, 4, null, true);
        else if (currentTool === 'revisionCloud' && isDrawing && revisionCloudCurrentPath.length > 0) drawRevisionCloud(ctx, { path: [], color: '#ff0000' }, -1, false, false, true);

        // --- NEU: CAD-Snap-Indikatoren ---
        if (window.currentSnap) {
            ctx.save();
            ctx.strokeStyle = '#f59e0b'; // Markantes Orange für Objektfang
            ctx.lineWidth = 2;
            let sx = window.currentSnap.x;
            let sy = window.currentSnap.y;
            let size = 6;

            ctx.beginPath();
            if (!window.smartSnapEnabled || window.currentSnap.type === 'grid') {
                // Grid (normaler Kreis)
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6'; ctx.fill();
            } else if (window.currentSnap.type === 'endpoint') {
                // Quadrat
                ctx.rect(sx - size, sy - size, size * 2, size * 2);
            } else if (window.currentSnap.type === 'midpoint') {
                // Dreieck
                ctx.moveTo(sx, sy - size); ctx.lineTo(sx + size, sy + size); ctx.lineTo(sx - size, sy + size); ctx.closePath();
            } else if (window.currentSnap.type === 'online') {
                // X / Sanduhr
                ctx.moveTo(sx - size, sy - size); ctx.lineTo(sx + size, sy + size);
                ctx.moveTo(sx - size, sy + size); ctx.lineTo(sx + size, sy - size);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    const mt = 57, mb = 38, ml = 38, mr = 38;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, LOGICAL_WIDTH, mt); ctx.fillRect(0, LOGICAL_HEIGHT - mb, LOGICAL_WIDTH, mb); ctx.fillRect(0, 0, ml, LOGICAL_HEIGHT); ctx.fillRect(LOGICAL_WIDTH - mr, 0, mr, LOGICAL_HEIGHT);
    drawTitleBlock(ctx);

    if (isLogoLoaded) {
        let ratio = logoImg.height / logoImg.width; let imgH = logoW * ratio;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(logoBgPos.x, logoBgPos.y, logoW, logoBgH); let imgY = logoBgPos.y + (logoBgH - imgH) / 2; ctx.drawImage(logoImg, logoBgPos.x, imgY, logoW, imgH);
        if (currentTool === 'edit' && (isDraggingLogo || (!isDraggingGroup && lastMousePos.x >= logoBgPos.x && lastMousePos.x <= logoBgPos.x + logoW && lastMousePos.y >= logoBgPos.y && lastMousePos.y <= logoBgPos.y + logoBgH))) { ctx.strokeStyle = 'rgba(25, 118, 210, 0.5)'; ctx.lineWidth = 1; ctx.strokeRect(logoBgPos.x, logoBgPos.y, logoW, logoBgH); }
    }

    let isArrowHovered = false;
    if (currentTool === 'edit' && Math.sqrt((lastMousePos.x - northArrowPos.x) ** 2 + (lastMousePos.y - northArrowPos.y) ** 2) <= 28 && !isDraggingGroup) isArrowHovered = true;
    if (isDraggingNorthArrow) isArrowHovered = true;
    drawNorthArrow(ctx, northArrowPos.x, northArrowPos.y, isArrowHovered, northArrowDir);

    ctx.strokeStyle = '#212121'; ctx.lineWidth = 1.5; ctx.strokeRect(ml, mt, LOGICAL_WIDTH - ml - mr, LOGICAL_HEIGHT - mt - mb);
}

/**
 * Malt das isometrische Punktraster in einem Offscreen-Canvas, um es blitzschnell im Hauptcanvas wiederzuverwenden.
 */
function drawGrid() {
    if (!showGrid) return;
    if (!isGridValid || lastGridColor !== globalColors.grid) {
        gridCtx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        gridCtx.strokeStyle = globalColors.grid; gridCtx.lineWidth = 1; gridCtx.beginPath();
        for (let x = 0; x <= LOGICAL_WIDTH + dx; x += dx) { gridCtx.moveTo(x, 0); gridCtx.lineTo(x, LOGICAL_HEIGHT); }
        let startB30 = Math.floor((-LOGICAL_WIDTH * m30) / L) * L;
        for (let b = startB30; b < LOGICAL_HEIGHT; b += L) { gridCtx.moveTo(0, b); gridCtx.lineTo(LOGICAL_WIDTH, LOGICAL_WIDTH * m30 + b); }
        let endB150 = Math.ceil((LOGICAL_HEIGHT + LOGICAL_WIDTH * m30) / L) * L;
        for (let b = 0; b < endB150; b += L) { gridCtx.moveTo(0, b); gridCtx.lineTo(LOGICAL_WIDTH, -LOGICAL_WIDTH * m30 + b); }
        gridCtx.stroke();
        lastGridColor = globalColors.grid; isGridValid = true;
    }
    ctx.drawImage(gridCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

/**
 * Zeichnet den Plankopf unten rechts mit allen Texten (Kunde, Iso-Nr.) und Checkboxen.
 */
function drawTitleBlock(ctx) {
    ctx.save(); ctx.translate(TB_X, TB_Y); ctx.strokeStyle = '#212121'; ctx.lineWidth = 1.5; ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, TB_W, TB_H); ctx.strokeRect(0, 0, TB_W, TB_H); ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(0, 35); ctx.lineTo(TB_W, 35); ctx.moveTo(0, 70); ctx.lineTo(TB_W, 70); ctx.moveTo(0, 105); ctx.lineTo(TB_W, 105); ctx.moveTo(0, 140); ctx.lineTo(TB_W, 140); ctx.moveTo(0, 170); ctx.lineTo(TB_W, 170);
    ctx.moveTo(240, 35); ctx.lineTo(240, 70); ctx.moveTo(320, 70); ctx.lineTo(320, 105); ctx.moveTo(120, 140); ctx.lineTo(120, 200); ctx.moveTo(300, 140); ctx.lineTo(300, 200); ctx.stroke();
    if (hoveredTitleBlockField) { let c = TB_CELLS[hoveredTitleBlockField]; ctx.fillStyle = 'rgba(25, 118, 210, 0.1)'; ctx.fillRect(c.x, c.y, c.w, c.h); }

    function drawField(label, value, x, y, w, h, suffix = "") {
        ctx.fillStyle = '#757575'; ctx.font = '400 10px "Inter", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label, x + 5, y + 5);
        ctx.fillStyle = '#212121'; ctx.font = '500 15px "Inter", sans-serif'; ctx.textBaseline = 'middle';
        if (value) ctx.fillText(value, x + 5, y + h / 2 + 6);
        if (suffix) { ctx.fillStyle = '#757575'; ctx.textAlign = 'right'; ctx.fillText(suffix, x + w - 8, y + h / 2 + 6); }
    }
    function drawCheckboxField(label, isChecked, x, y, w, h) {
        ctx.fillStyle = '#757575'; ctx.font = '400 13px "Inter", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 5, y + h / 2);
        ctx.strokeStyle = '#212121'; ctx.lineWidth = 1; ctx.strokeRect(x + 90, y + h / 2 - 8, 16, 16);
        if (isChecked) { ctx.beginPath(); ctx.moveTo(x + 93, y + h / 2); ctx.lineTo(x + 97, y + h / 2 + 5); ctx.lineTo(x + 104, y + h / 2 - 6); ctx.strokeStyle = '#1976d2'; ctx.lineWidth = 2.5; ctx.stroke(); }
    }

    drawField("Kunde", titleBlock.kunde, 0, 0, 480, 35); drawField("Gebäude", titleBlock.gebaeude, 0, 35, 240, 35); drawField("Auftrag", titleBlock.auftrag, 240, 35, 240, 35);
    drawField("Bezeichnung", titleBlock.bezeichnung, 0, 70, 320, 35); drawField("Werkstoff / Rohrklasse", titleBlock.werkstoff, 320, 70, 160, 35); drawField("Iso-Nr.:", titleBlock.isoNr, 0, 105, 480, 35);
    drawCheckboxField("Beizen:", titleBlock.beizen, 0, 140, 120, 30); drawCheckboxField("Spülen:", titleBlock.spuelen, 0, 170, 120, 30);
    drawField("1. Röntgen", titleBlock.roentgen, 120, 140, 180, 30, "%"); drawField("2. Druckprobe", titleBlock.druckprobe, 120, 170, 180, 30, "bar");
    drawField("Gez.-Name", titleBlock.gezName, 300, 140, 180, 30); drawField("Datum", titleBlock.datum, 300, 170, 180, 30);
    ctx.restore();
}

/**
 * Algorithmus zum Rendern von welligen Revisionswolken-Pfaden.
 */
function drawRevisionCloud(ctx, el, index, isHovered, isSelected, isPreview) {
    let path = isPreview ? revisionCloudCurrentPath : el.path;
    if (!path || path.length < 1) return;

    ctx.save(); ctx.strokeStyle = isSelected ? '#1976d2' : (isHovered ? '#f57c00' : (el.color || '#ff0000')); ctx.lineWidth = 2;
    const arcSize = 9.5;

    function drawWavySegment(p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y; const len = Math.sqrt(dx * dx + dy * dy); if (len < 2) return;
        const steps = Math.max(1, Math.round(len / arcSize)); const stepX = dx / steps, stepY = dy / steps;
        for (let i = 0; i < steps; i++) {
            const cx = p1.x + stepX * i + stepX / 2; const cy = p1.y + stepY * i + stepY / 2;
            ctx.beginPath(); ctx.arc(cx, cy, arcSize / 1.5, 0, Math.PI * 2); ctx.stroke();
        }
    }

    if (!isPreview) {
        for (let i = 0; i < path.length; i++) { drawWavySegment(path[i], path[(i + 1) % path.length]); }
        let cx = 0, cy = 0; path.forEach(pt => { cx += pt.x; cy += pt.y; }); cx /= path.length; cy /= path.length;
        let tx = el.tagX !== undefined ? el.tagX : cx; let ty = el.tagY !== undefined ? el.tagY : cy;
        ctx.fillStyle = '#ff0000'; ctx.font = 'bold 15px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(el.text || "Rev. 1", tx, ty);
    } else {
        for (let i = 0; i < path.length - 1; i++) { drawWavySegment(path[i], path[i + 1]); }
        if (currentPoint && path.length > 0) {
            const lastPt = path[path.length - 1]; ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1976d2'; ctx.moveTo(lastPt.x, lastPt.y); ctx.lineTo(currentPoint.x, currentPoint.y); ctx.stroke();
            if (path.length >= 2 && dist2(currentPoint, path[0]) < 15 * 15) { ctx.beginPath(); ctx.arc(path[0].x, path[0].y, 10, 0, Math.PI * 2); ctx.strokeStyle = '#4CAF50'; ctx.stroke(); }
        }
    }
    ctx.restore();
}

/**
 * Zieht Strichlinien und füllt Kreise, um die vergebenen Stücklisten-Positionen an den Bauteilen darzustellen.
 */
function drawBalloons() {
    const isEditMode = currentTool === 'edit';
    elements.forEach((el, idx) => {
        if (el.type !== 'balloon') return;
        let ax = el.anchorX, ay = el.anchorY; let bx = el.bx, by = el.by;
        let isHov = (idx === hoveredElementIndex); let isSel = selectedElementIndices.includes(idx);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.strokeStyle = isSel ? '#f57c00' : (globalColors.balloon || '#1976d2'); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        const R = 12; ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fillStyle = isSel ? '#f57c00' : (isHov && isEditMode ? '#f57c00' : (globalColors.balloon || '#1976d2')); ctx.fill();
        if (isHov && isEditMode) { ctx.strokeStyle = '#e65100'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.font = 'bold 12px "Inter", sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(el.posNum), bx, by);
    });
}

/**
 * Nimmt einzelne gerade Rohrstücke, verknüpft sie logisch und rendert abgerundete Ecken zwischen ihnen.
 */
function drawPipesWithElbows(ctx, pipes, col, globalColor, isHoveredList, isSelectedList) {
    let R = 15; let groups = {};
    pipes.forEach((p, index) => {
        let actualCol = isSelectedList[index] ? '#1976d2' : (isHoveredList[index] ? (currentTool === 'erase' ? '#ef5350' : '#f57c00') : (col || p.color || globalColor));
        let thick = p.thickness || 4; let key = `${thick}_${actualCol}_${p.isExisting}_${p.isHose}`;
        if (!groups[key]) groups[key] = { props: p, lines: [], actualCol, thick };
        groups[key].lines.push({ startX: p.startX, startY: p.startY, endX: p.endX, endY: p.endY });
    });
    for (let key in groups) {
        let g = groups[key]; ctx.lineWidth = g.thick; ctx.strokeStyle = g.actualCol; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (g.props.isExisting) ctx.setLineDash([8, 8]); else ctx.setLineDash([]);
        if (g.props.isHose) { /* Hose drawing logic... */ g.lines.forEach(l => { let dx = l.endX - l.startX; let dy = l.endY - l.startY; let len = Math.sqrt(dx * dx + dy * dy); let angle = Math.atan2(dy, dx); ctx.save(); ctx.translate(l.startX, l.startY); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 0; i <= len; i += 1) ctx.lineTo(i, Math.sin(i / 12 * Math.PI * 2) * 4); ctx.stroke(); ctx.restore(); }); continue; }
        let lines = [...g.lines];
        while (lines.length > 0) {
            let startLine = lines.pop(); let path = [{ x: startLine.startX, y: startLine.startY }, { x: startLine.endX, y: startLine.endY }]; let found;
            do { found = false; for (let i = 0; i < lines.length; i++) { let l = lines[i]; let head = path[0]; let tail = path[path.length - 1]; let merge = (pt, isHead) => { if (dist2(pt, { x: l.startX, y: l.startY }) < 1) { if (isHead) path.unshift({ x: l.endX, y: l.endY }); else path.push({ x: l.endX, y: l.endY }); lines.splice(i, 1); found = true; return true; } if (dist2(pt, { x: l.endX, y: l.endY }) < 1) { if (isHead) path.unshift({ x: l.startX, y: l.startY }); else path.push({ x: l.startX, y: l.startY }); lines.splice(i, 1); found = true; return true; } return false; }; if (merge(head, true)) break; if (merge(tail, false)) break; } } while (found);
            ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
            if (path.length > 2) {
                for (let i = 1; i < path.length - 1; i++) {
                    let pt = path[i];
                    let connectedPipesCount = elements.filter(e => e.type === 'pipe' && 
                        ((Math.abs(e.startX - pt.x) < 1 && Math.abs(e.startY - pt.y) < 1) || 
                         (Math.abs(e.endX - pt.x) < 1 && Math.abs(e.endY - pt.y) < 1))
                    ).length;
                    
                    if (connectedPipesCount !== 2) {
                        ctx.lineTo(pt.x, pt.y);
                    } else {
                        ctx.arcTo(pt.x, pt.y, path[i + 1].x, path[i + 1].y, R);
                    }
                }
            }
            ctx.lineTo(path[path.length - 1].x, path[path.length - 1].y); ctx.stroke();
        }
        ctx.setLineDash([]);
    }
}

/**
 * Rendert den Nordpfeil mit dem Buchstaben N, inklusive der eingestellten Rotation in den Isometrie-Achsen.
 */
function drawNorthArrow(ctx, x, y, isHovered, dir = 0) {
    if (!layerVis.northArrow) return;

    ctx.save();
    ctx.translate(x - 45, y + 20);
    ctx.rotate(dir * (Math.PI / 6));

    // Das neue "Papierflieger"-Design des Nordpfeils
    ctx.beginPath();
    ctx.moveTo(0, -60);      // Spitze (ca. 70% von -45)
    ctx.lineTo(17, 18);      // Rechts hinten (ca. 70% von 24, 25)
    ctx.lineTo(0, 1);        // Mitte hinten (Einbuchtung) (ca. 70% von 10)
    ctx.lineTo(-17, 18);     // Links hinten
    ctx.closePath();

    ctx.fillStyle = '#212121'; // Schwarz ausgemalt
    ctx.fill();

    ctx.lineWidth = 4;       // Etwas dünnere Linie wegen der geringeren Größe
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isHovered ? '#1976d2' : '#212121';
    ctx.stroke();

    // Der Buchstabe 'N' wird über der Spitze platziert
    ctx.rotate(-dir * (Math.PI / 6)); // Rotation für Text aufheben, damit er lesbar bleibt
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = isHovered ? '#1976d2' : '#212121';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // N-Position dynamisch basierend auf Rotation berechnen, damit es immer über der Spitze ist
    let rot = dir * (Math.PI / 6);
    let dist = 75;           // Kürzere Distanz wegen der geringeren Größe (ca. 70% von 65)
    let nx = Math.sin(rot) * dist;
    let ny = -Math.cos(rot) * dist;
    ctx.fillText('N', nx, ny);

    ctx.restore();
}

function drawJumpbox(ctx, el, col, isPreview = false) {
    let s = el.start;
    let z = el.zPoint;
    let e = el.end;

    // Höhe in der Canvas-Ebene ermitteln (y-Achse nach unten positiv)
    let h = s.y - z.y;

    let vx = e.x - s.x;
    let vy = e.y - s.y;

    let cos30 = 0.866025; // cos(30°)

    // Projizierte Längen entlang der Iso-Achsen berechnen
    let w1 = (vx / (2 * cos30)) + vy;
    let w2 = vy - (vx / (2 * cos30));

    let p0 = { x: s.x, y: s.y };
    let p1 = { x: s.x + w1 * cos30, y: s.y + w1 * 0.5 };
    let p2 = { x: e.x, y: e.y };
    let p3 = { x: s.x - w2 * cos30, y: s.y + w2 * 0.5 };

    let t0 = { x: p0.x, y: p0.y - h };
    let t1 = { x: p1.x, y: p1.y - h };
    let t2 = { x: p2.x, y: p2.y - h };
    let t3 = { x: p3.x, y: p3.y - h };

    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    // Bodenplatte
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
    // Deckplatte
    ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y); ctx.closePath();
    // Pfeiler
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(t0.x, t0.y);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(t1.x, t1.y);
    ctx.moveTo(p2.x, p2.y); ctx.lineTo(t2.x, t2.y);
    ctx.moveTo(p3.x, p3.y); ctx.lineTo(t3.x, t3.y);

    ctx.stroke();
    ctx.setLineDash([]);

    if (!isPreview && (el.valX || el.valY || el.valZ)) {
        ctx.fillStyle = col;
        ctx.font = '14px "Inter", sans-serif';
        ctx.textAlign = "center";

        if (el.valX !== "") {
            let mx = (p0.x + p1.x) / 2; let my = (p0.y + p1.y) / 2;
            let tx = el.tagXx !== undefined ? el.tagXx : mx + 20;
            let ty = el.tagXy !== undefined ? el.tagXy : my + 15;
            ctx.fillText(el.valX, tx, ty);
        }
        if (el.valY !== "") {
            let mx = (p0.x + p3.x) / 2; let my = (p0.y + p3.y) / 2;
            let tx = el.tagYx !== undefined ? el.tagYx : mx - 20;
            let ty = el.tagYy !== undefined ? el.tagYy : my + 15;
            ctx.fillText(el.valY, tx, ty);
        }
        if (el.valZ !== "") {
            let mx = (p3.x + t3.x) / 2; let my = (p3.y + t3.y) / 2;
            let tx = el.tagZx !== undefined ? el.tagZx : mx - 20;
            let ty = el.tagZy !== undefined ? el.tagZy : my;
            ctx.fillText(el.valZ, tx, ty);
        }
    }
}
 
// --- ui.js --- 
// --- UI & INTERAKTIONS-LOGIK (Isomake) ---

/**
 * Wechselt den Eingabemodus (falls vorhanden).
 */
function toggleMode() {
    isAdvancedMode = !isAdvancedMode;
    document.getElementById('btnToggleMode').innerHTML = isAdvancedMode ? '🛠️ Basic Modus' : '🚀 Advanced Modus';
    let displayStr = isAdvancedMode ? '' : 'none';
    let flexDisplayStr = isAdvancedMode ? 'flex' : 'none';

    // Toggle new CSS classes from floating panels
    document.querySelectorAll('.advanced-only').forEach(el => {
        // preserve flex layouts if it's a tool-group
        if (el.classList.contains('tool-group')) {
            el.style.display = flexDisplayStr;
        } else {
            el.style.display = displayStr;
        }
    });

    // Fallback for explicitly hardcoded legacy IDs
    const legacyIds = ['dnSelect', 'btnBOM', 'btnToggleInfo', 'btnAutoDim', 'btnAutoWeld', 'btnAutoBalloon', 'pipeClassSelect', 'btnUploadCSV'];
    legacyIds.forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).style.display = displayStr;
    });

    if (document.getElementById('btnGroupLayers') && document.getElementById('btnGroupLayers').parentElement) {
        document.getElementById('btnGroupLayers').parentElement.style.display = displayStr;
    }
}

/**
 * Aktualisiert den Hinweis-Text, der dem Benutzer neben der Maus oder in der UI anzeigt, was jetzt zu tun ist.
 */
function updateHint() {
    let hint = "";
    if (currentTool === 'flange') hint = "Leertaste = Drehen | ALT = Frei platzieren | ✨ STRG + Klick auf Rohr = Flansch-Paar einfügen";
    else if (['valve', 'checkvalve', 'sightglass', 'slope', 'blindcap', 'nipple', 'socket', 'custom', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'support', 'elevation', 'msr', 'flowarrow', 'reducer', 'insulation'].includes(currentTool)) hint = "Leertaste = Drehen | ALT = Frei platzieren | ✨ STRG + Klick auf Rohr = Armatur inkl. Flansch-Paar einfügen";
    else if (currentTool === 'pipe') hint = "Klick: Eckpunkt setzen | ESC / Rechtsklick (Abbr.): Beenden | ALT: Frei zeichnen";
    else if (currentTool === 'weld') hint = "Klick = Schweißnaht setzen | ALT = Frei platzieren";
    else if (currentTool === 'text') hint = "Leertaste = Text drehen";
    else if (currentTool === 'number') hint = "Klicken & Ziehen für Nummer";
    else if (currentTool === 'edit') hint = "Klick: Auswählen | Shift+Klick: Eigenschaften (**Batch-Edit bei Mehrfachauswahl**) | Rahmen: Mehrfachauswahl | ALT + Ziehen: Frei Verschieben | Entf: Löschen";
    else if (currentTool === 'colorize') hint = "Linksklick: Weist dem Element die aktuell eingestellte Farbe zu | ✨ STRG + Klick: Rohr bevorzugen";
    else if (currentTool === 'erase') hint = "Klick: Element löschen | ✨ STRG + Klick: Rohr bevorzugen (Auto-Heal bei Armaturen)";
    else if (currentTool === 'toggleExisting') hint = "Klick: Bauteil zwischen Bestand und Neu umschalten | ✨ STRG + Klick: Rohr bevorzugen";
    else if (currentTool === 'toggleHose') hint = "Klick: Rohr in Schlauch umwandeln | ✨ STRG + Klick: Rohr bevorzugen";
    else if (currentTool === 'dimension') { if (dimStep === 0) hint = "1. Klick: Startpunkt"; else if (dimStep === 1) hint = "2. Klick: Endpunkt"; else if (dimStep === 2) hint = "Maus: Abstand | Leertaste: Achse | Klick: Bestätigen"; else if (dimStep === 3) hint = "Text eintragen & Enter drücken"; }
    else if (currentTool === 'revisionCloud') hint = "Klicken & Ziehen: Revisionswolke | Shift+Klick (Edit): Text ändern";
    else if (currentTool === 'hatch') { if (hatchStep === 0) hint = "1. Klick: Startpunkt"; else if (hatchStep === 1) hint = "2. Klick: Projektion"; else if (hatchStep === 2) hint = "3. Klick: Endpunkt | Leertaste: Drehen"; }
    else if (currentTool === 'jumpbox') hint = "1. Klick: Startpunkt | 2. Klick: Höhe (Z) | 3. Klick: Endpunkt";
    const hintEl = document.getElementById('dirHint');
    let snapStatus = `🧲 S = Objekt-Snap: ${window.smartSnapEnabled ? 'AN' : 'AUS'}`;
    let finalHint = hint ? `💡 ${hint} | ${snapStatus}` : `💡 ${snapStatus}`;

    hintEl.style.display = 'flex';
    hintEl.innerText = finalHint;
}

function checkPassword() {
    const input = document.getElementById('loginPassword').value;
    if (input === SECRET_PASSWORD) {
        document.getElementById('loginOverlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loginOverlay').style.display = 'none';
            pushState();
            redraw();

            // AUTOMATISCHER FIX: Initialisierungstoggle nach Login
            setTimeout(() => {
                toggleSizeInfo(); // Aktivieren
                setTimeout(() => {
                    toggleSizeInfo(); // Deaktivieren
                }, 100);
            }, 300);
        }, 300);
    } else document.getElementById('loginError').style.display = 'block';
}

/**
 * Öffnet das Modal zur Farbanpassung der Elemente.
 */
function openColorMenu() { document.getElementById('colorModalOverlay').style.display = 'block'; document.getElementById('colorModal').style.display = 'block'; }
function saveColors() { globalColors.pipe = document.getElementById('colPipe').value; globalColors.weld = document.getElementById('colWeld').value; globalColors.valve = document.getElementById('colValve').value; globalColors.text = document.getElementById('colText').value; globalColors.grid = document.getElementById('colGrid').value; globalColors.balloon = document.getElementById('colBalloon').value; globalColors.weldnum = document.getElementById('colWeldNum').value; closeModals(); redraw(); }
function openCustomModal() { document.getElementById('colorModalOverlay').style.display = 'block'; document.getElementById('customPartModal').style.display = 'block'; redrawMini(); }
function openLegal() { document.getElementById('colorModalOverlay').style.display = 'block'; document.getElementById('legalModal').style.display = 'block'; }

/**
 * Öffnet ein spezielles Eigenschaften-Fenster für Texte, Maße, Wolken und Nummern.
 */
function openTextProperties(idx) {
    editingElementIndex = idx;
    const el = elements[idx];
    const valInput = document.getElementById('textPropValue');
    const sizeRow = document.getElementById('textPropSizeRow');
    const titleEl = document.getElementById('textPropTitle');
    const labelEl = document.getElementById('textPropLabel');

    valInput.value = el.text || "";
    sizeRow.style.display = (el.type === 'text') ? 'flex' : 'none';
    if (el.type === 'text') document.getElementById('textPropSize').value = el.size || 16;

    if (el.type === 'dimension') { titleEl.innerText = '📏 Maß-Eigenschaften'; labelEl.innerText = 'Maß (mm):'; }
    else if (el.type === 'revisionCloud') { titleEl.innerText = '☁️ Wolken-Eigenschaften'; labelEl.innerText = 'Revision:'; }
    else if (el.type === 'number') { titleEl.innerText = '🏷️ Nummern-Eigenschaften'; labelEl.innerText = 'Position:'; }
    else if (el.type === 'weldnum') { titleEl.innerText = '🏷️ Naht-Nummer'; labelEl.innerText = 'Nummer:'; }
    else if (el.type === 'jumpbox') {
        titleEl.innerText = '📦 3D-Box Maße';
        document.getElementById('textPropJumpboxX').value = el.valX || "";
        document.getElementById('textPropJumpboxY').value = el.valY || "";
        document.getElementById('textPropJumpboxZ').value = el.valZ || "";
    }
    else { titleEl.innerText = '📝 Text-Eigenschaften'; labelEl.innerText = 'Text:'; }

    const mainRow = document.getElementById('textPropValueRow');
    const jumpRow = document.getElementById('textPropJumpboxRow');
    if (mainRow) mainRow.style.display = (el.type === 'jumpbox') ? 'none' : 'flex';
    if (jumpRow) jumpRow.style.display = (el.type === 'jumpbox') ? 'flex' : 'none';

    document.getElementById('colorModalOverlay').style.display = 'block';
    document.getElementById('textPropModal').style.display = 'block';
    setTimeout(() => valInput.focus(), 150);
}

function saveTextProperties() {
    if (editingElementIndex !== -1) {
        let el = elements[editingElementIndex];
        let val = document.getElementById('textPropValue').value;
        if (el.type === 'dimension') val = evaluateMath(val);
        if (el.type !== 'jumpbox') el.text = val;
        if (el.type === 'weldnum') el.number = val;
        if (el.type === 'text') el.size = parseInt(document.getElementById('textPropSize').value) || 16;
        if (el.type === 'jumpbox') {
            el.valX = document.getElementById('textPropJumpboxX').value;
            el.valY = document.getElementById('textPropJumpboxY').value;
            el.valZ = document.getElementById('textPropJumpboxZ').value;
        }
        pushState(); redraw();
    }
    closeModals();
}

/**
 * Schließt alle Overlay-Modals auf der Benutzeroberfläche.
 */
function closeModals() {
    document.getElementById('colorModalOverlay').style.display = 'none';
    document.getElementById('colorModal').style.display = 'none';
    document.getElementById('customPartModal').style.display = 'none';
    document.getElementById('legalModal').style.display = 'none';
    document.getElementById('propModal').style.display = 'none';
    document.getElementById('textPropModal').style.display = 'none';
    document.getElementById('customPropModal').style.display = 'none';
    document.getElementById('bomModal').style.display = 'none';
    document.getElementById('weldModal').style.display = 'none';
    document.getElementById('smartJumpModal').style.display = 'none';
}

function triggerColorizePicker() { setTool('colorize'); document.getElementById('colorizeInput').click(); }
function activateColorizeTool(e) { activePaintColor = e.target.value; setTool('colorize'); }

function resetColors() {
    globalColors.pipe = '#212121'; globalColors.weld = '#212121'; globalColors.valve = '#212121'; globalColors.text = '#1976d2'; globalColors.grid = '#e0e0e0'; globalColors.balloon = '#1976d2'; globalColors.weldnum = '#0e4781';
    document.getElementById('colPipe').value = globalColors.pipe; document.getElementById('colWeld').value = globalColors.weld; document.getElementById('colValve').value = globalColors.valve; document.getElementById('colText').value = globalColors.text; document.getElementById('colGrid').value = globalColors.grid; if (globalColors.balloon) document.getElementById('colBalloon').value = globalColors.balloon; if (globalColors.weldnum) document.getElementById('colWeldNum').value = globalColors.weldnum;
    closeModals(); redraw();
}

const renderDelay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Bereitet das Layout für den Ausdruck vor und ruft den Druckdialog (window.print) des Browsers auf.
 */
async function triggerPrint() {
    if (isPrinting) return;

    // Tool auf 'pipe' zurücksetzen (schließt auch offene Menüs/Inputs)
    setTool('pipe');

    // UI-Elemente wie Hover-Punkte oder Cad-Snap verbergen
    window.currentSnap = null;
    if (typeof currentPoint !== 'undefined') currentPoint = null;
    if (typeof hoveredElementIndex !== 'undefined') hoveredElementIndex = -1;
    if (typeof selectedElementIndices !== 'undefined') selectedElementIndices = [];

    // 1. Aktuellen Zoom speichern, falls wir danach zurückspringen wollen
    const previousScale = typeof pzScale !== 'undefined' ? pzScale : 1;
    const previousPanX = typeof pzPanX !== 'undefined' ? pzPanX : 0;
    const previousPanY = typeof pzPanY !== 'undefined' ? pzPanY : 0;

    // 2. Zoom auf 1:1 (Standard) setzen
    if (typeof resetPanZoom === 'function') {
        resetPanZoom();
    }

    // UI vorübergehend unsichtbar machen (ohne Layout zu zerstören)
    const uiElements = document.querySelectorAll('.floating-panel, .instruction-pill');
    uiElements.forEach(el => el.style.visibility = 'hidden');

    // 3. Canvas mit den neuen 1:1 Werten sofort neu zeichnen
    if (typeof performRedraw === 'function') {
        performRedraw();
    } else if (typeof redraw === 'function') {
        redraw();
    }

    // 4. Kurz warten, damit der Browser den Canvas-Buffer in 1:1 fertig rendern kann, bevor das PDF das Bild greift
    await renderDelay(300);

    // Status setzen
    isPrinting = true;

    // WICHTIG: Den Canvas sofort synchron neu zeichnen, 
    // damit der isPrinting-Status in Loop 2 von render.js berücksichtigt wird.
    if (typeof performRedraw === 'function') {
        performRedraw();
    }

    // Ein minimaler Timeout gibt dem Browser Zeit, den Canvas-Buffer zu flashen
    setTimeout(() => {
        window.print();

        // Nach dem Schließen des Druck-Dialogs (oder Abbruch)
        // Setzen wir den Status zurück und zeichnen wieder normal (mit Warnungen)
        setTimeout(async () => {
            isPrinting = false;

            // Ansicht wiederherstellen
            if (typeof applyPanZoom === 'function') {
                pzScale = previousScale;
                pzPanX = previousPanX;
                pzPanY = previousPanY;
                applyPanZoom();
            }

            if (typeof redraw === 'function') redraw();

            // UI wieder einblenden
            uiElements.forEach(el => el.style.visibility = 'visible');
        }, 500);
    }, 100);
}


/**
 * Exportiert das gesamte Projekt (Modell, Variablen, Einstellungen) als JSON-Datei und triggert den Download.
 */
function saveProject() {
    const projectData = { version: 1, elements: elements, weldNumCounter: weldNumCounter, globalColors: globalColors, titleBlock: titleBlock, logoPos: logoBgPos, logoSettings: { w: logoW, h: logoBgH }, northArrowPos: northArrowPos, northArrowDir: northArrowDir, layerVis: layerVis, format: currentFormat };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));

    // Dynamischer Dateiname basierend auf ISO-Nummer
    let fileName = (titleBlock.isoNr && titleBlock.isoNr.trim() !== "") ? titleBlock.isoNr.trim() : "Isomake";
    // Bereinigung von illegalen Zeichen
    fileName = fileName.replace(/[<>:"\/\\|?*]/g, '_');

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

/**
 * Liest eine hochgeladene JSON-Datei ein, extrahiert die Isomake-Struktur und rendert den Canvas neu.
 */
function loadProject(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const projectData = JSON.parse(e.target.result);
            if (projectData.elements) elements = projectData.elements; if (projectData.weldNumCounter) weldNumCounter = projectData.weldNumCounter;
            if (projectData.titleBlock) titleBlock = projectData.titleBlock; if (projectData.logoPos) logoBgPos = projectData.logoPos;
            if (projectData.logoSettings) { logoW = projectData.logoSettings.w; logoBgH = projectData.logoSettings.h; }
            if (projectData.northArrowPos) northArrowPos = projectData.northArrowPos;
            if (projectData.northArrowDir !== undefined) northArrowDir = projectData.northArrowDir;
            if (projectData.layerVis) { layerVis = projectData.layerVis; updateLayerUI(); }
            if (projectData.format) { 
                setPaperFormat(projectData.format); 
                const fmtSelect = document.getElementById('formatSelect');
                if (fmtSelect) fmtSelect.value = projectData.format;
            }
            if (projectData.globalColors) { Object.assign(globalColors, projectData.globalColors); document.getElementById('colPipe').value = globalColors.pipe; document.getElementById('colWeld').value = globalColors.weld; document.getElementById('colValve').value = globalColors.valve; document.getElementById('colText').value = globalColors.text; document.getElementById('colGrid').value = globalColors.grid; if (globalColors.balloon) document.getElementById('colBalloon').value = globalColors.balloon; }
            showBalloons = elements.some(el => el.type === 'balloon');
            document.getElementById('btnAutoBalloon').classList.toggle('active', showBalloons);
            pushState(); redraw();
        } catch (err) { showToast('Fehler beim Laden der Datei.', 'error'); }
    }; reader.readAsText(file); event.target.value = '';
}

function toggleTheme() { document.body.classList.toggle('dark-mode'); const btn = document.getElementById('btnThemeToggle'); btn.innerText = document.body.classList.contains('dark-mode') ? '☀️' : '🌙'; }

function toggleGrid() { cancelDrag(); showGrid = !showGrid; document.getElementById('btnToggleGrid').classList.toggle('active', showGrid); redraw(); }
function toggleElbows() { cancelDrag(); autoElbows = !autoElbows; document.getElementById('btnToggleElbows').classList.toggle('active', autoElbows); redraw(); }
function toggleSizeInfo() { cancelDrag(); showSizeInfo = !showSizeInfo; document.getElementById('btnToggleInfo').classList.toggle('active', showSizeInfo); redraw(); }
function toggleBalloons() {
    cancelDrag();
    showBalloons = !showBalloons;
    document.getElementById('btnAutoBalloon').classList.toggle('active', showBalloons);
    elements = elements.filter(el => el.type !== 'balloon');
    if (showBalloons) { let newBalloons = buildBalloonElements(); elements.push(...newBalloons); }
    pushState(); redraw();
}
function toggleLayer(layer) {
    layerVis[layer] = !layerVis[layer];
    updateLayerUI();
    redraw();
}

/**
 * Synchronisiert die Checkbox-Häkchen im Ebenen-Menü mit dem internen layerVis-Zustand.
 */
function updateLayerUI() {
    let names = { pipes: "Rohre & Armaturen", dims: "Bemaßungen", texts: "Texte", hatches: "Schraffuren", northArrow: "Nordpfeil", cutLengths: "Schnittmaße" };
    for (let layer in names) {
        let el = document.getElementById('layer_' + layer);
        if (el) el.innerHTML = (layerVis[layer] ? '✔️ ' : '❌ ') + names[layer];
    }
}

/**
 * Aktiviert ein neues Werkzeug (z.B. Rohr, Flansch, Löschen) und ändert CSS-Button-Klassen entsprechend.
 */
function setTool(tool) {
    cancelDrag();
    if (tool === 'delete') tool = 'erase';
    currentTool = tool; hideRadialMenu();
    document.querySelectorAll('.floating-panel button').forEach(b => b.classList.remove('active'));
    if (document.getElementById('btnToggleGrid')) document.getElementById('btnToggleGrid').classList.toggle('active', showGrid);
    if (document.getElementById('btnToggleElbows')) document.getElementById('btnToggleElbows').classList.toggle('active', autoElbows);
    if (document.getElementById('btnToggleInfo')) document.getElementById('btnToggleInfo').classList.toggle('active', showSizeInfo);
    if (document.getElementById('btnAutoBalloon')) document.getElementById('btnAutoBalloon').classList.toggle('active', showBalloons);

    if (['valve', 'sightglass', 'checkvalve', '3wayvalve', 'damper', 'safetyvalve', 'compensator'].includes(tool)) {
        document.getElementById('btnGroupValve').classList.add('active'); let name = '⚙️ Armatur ▼';
        if (tool === 'valve') name = 'Ventil ▼'; else if (tool === 'checkvalve') name = 'Rückschlagklappe ▼'; else if (tool === 'sightglass') name = '🔍 Schauglas ▼';
        else if (tool === '3wayvalve') name = '3-Wege Ventil ▼'; else if (tool === 'damper') name = 'Klappe ▼'; else if (tool === 'safetyvalve') name = 'Sicherheitsventil ▼'; else if (tool === 'compensator') name = 'Kompensator ▼';
        document.getElementById('btnGroupValve').innerHTML = name;
    } else if (['reducer', 'blindcap', 'nipple', 'socket', 'clamp', 'blindclamp'].includes(tool)) {
        document.getElementById('btnGroupFitting').classList.add('active'); let name = '🪈 Formteil ▼';
        if (tool === 'reducer') name = '🔽 Reduz. ▼'; if (tool === 'blindcap') name = '🛑 Blindkappe ▼'; if (tool === 'nipple') name = '🔩 Nippel ▼'; if (tool === 'socket') name = '🛢️ Muffe ▼'; if (tool === 'clamp') name = '🔗 Clamp ▼'; if (tool === 'blindclamp') name = '🚫 B-Clamp ▼';
        document.getElementById('btnGroupFitting').innerHTML = name;
    } else if (['flowarrow', 'support', 'elevation', 'msr', 'insulation'].includes(tool)) {
        document.getElementById('btnGroupExtras').classList.add('active'); let name = '➕ Zusatz ▼';
        if (tool === 'flowarrow') name = '➡️ Pfeil ▼'; if (tool === 'support') name = '🗜️ Halter ▼'; if (tool === 'elevation') name = '📐 Höhe ▼'; if (tool === 'msr') name = '🌡️ MSR ▼'; if (tool === 'insulation') name = '❄️ Isolierung ▼';
        document.getElementById('btnGroupExtras').innerHTML = name;
    } else { let btn = document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1)); if (btn) btn.classList.add('active'); }

    isDrawing = false; startPoint = null; revisionCloudCurrentPath = []; isDraggingRevisionTag = false; hoveredElementIndex = -1; dimStep = 0; dimStart = null; dimEnd = null; pendingDimension = null; hatchStep = 0; hatchStart = null; hatchCorner = null; reducerStep = 0; reducerStart = null; jumpboxStep = 0; jumpboxStart = null; jumpboxZ = null; pendingSpecialTool = null; selectedElementIndices = []; updateSelectionFlags(); isSelecting = false; isDraggingGroup = false;

    if (tool === 'smartJump') window.smartJumpStartPoint = null;

    // Genereller Reset für ausstehende Texteingaben
    saveText(); // Falls was offenes bestätigt werden soll
    if (typeof textInput !== 'undefined' && textInput) {
        textInput.style.display = 'none';
        textInput.value = '';
    }
    if (typeof pendingTextPos !== 'undefined') pendingTextPos = null;
    if (typeof editingElementIndex !== 'undefined') editingElementIndex = -1;

    updateHint(); redraw();
}

/**
 * Öffnet den Eigenschaften-Dialog (Nennweite, Farbe, Länge) für ein angewähltes Bauteil.
 */
function openProperties(idx) {
    // FALL: Mehrfachauswahl (Batch-Edit)
    if (selectedElementIndices.length > 1) {
        openBatchProperties();
        return;
    }

    editingElementIndex = idx;
    const el = elements[idx];

    // UI auf Single-Edit zurücksetzen
    const titleEl = document.querySelector('#propModal h2');
    if (titleEl) titleEl.innerText = '⚙️ Eigenschaften';
    const saveBtn = document.querySelector('#propModal button.contained');
    if (saveBtn) saveBtn.innerText = '💾 Speichern';
    document.getElementById('propLengthRow').style.display = 'none';
    document.getElementById('propDN2Row').style.display = 'none';
    if (document.getElementById('propSmartJumpInfo')) {
        document.getElementById('propSmartJumpInfo').style.display = 'none';
    }

    document.getElementById('propDN').value = el.size || currentDN;
    document.getElementById('propName').value = el.customName || "";
    if (document.getElementById('propThickness')) document.getElementById('propThickness').value = el.thickness || 4;

    const rotationRow = document.getElementById('propRotationRow');
    if (rotationRow) {
        if (el.type === 'pipe' || el.type === 'smartJump' || el.type === 'weld' || el.type === 'dimension' || el.type === 'text' || el.type === 'revisionCloud') {
            rotationRow.style.display = 'none';
        } else {
            rotationRow.style.display = 'flex';
            const rot = el.rotation || 0;
            document.getElementById('propRotationSlider').value = rot;
            document.getElementById('propRotationNum').value = rot;
        }
    }

    if (el.type === 'pipe' || el.type === 'smartJump') {
        document.getElementById('propLengthRow').style.display = 'flex';
        document.getElementById('propLength').value = el.realLength || "";

        if (el.type === 'smartJump' && document.getElementById('propSmartJumpInfo')) {
            document.getElementById('propSmartJumpInfo').style.display = 'block';

            // Live-Recalculation beim Öffnen (falls Rohrklasse gewechselt wurde)
            const jumpResult = calculateSmartJump(el);

            const dx = el.deltas?.dx || 0;
            const dy = el.deltas?.dy || 0;
            const dz = el.deltas?.dz || 0;
            document.getElementById('propSjDeltas').textContent = `${dx} / ${dy} / ${dz}`;
            document.getElementById('propSjAngle').textContent = jumpResult.snappedAngle + '°';
            document.getElementById('propSjCut').textContent = jumpResult.cutLength + ' mm';
        }
    } else if (el.type === 'reducer') {
        document.getElementById('propDN2Row').style.display = 'block';
        document.getElementById('propDN2').value = el.size2 || currentDN;
    }
    document.getElementById('colorModalOverlay').style.display = 'block';
    document.getElementById('propModal').style.display = 'block';
    if (el.type === 'pipe' || el.type === 'smartJump') setTimeout(() => document.getElementById('propLength').focus(), 50);
}

function saveProperties() {
    if (editingElementIndex === -2) {
        saveBatchProperties();
        return;
    }

    if (editingElementIndex !== -1) {
        let el = elements[editingElementIndex];
        el.size = document.getElementById('propDN').value;
        el.customName = document.getElementById('propName').value;
        if (document.getElementById('propThickness')) {
            el.thickness = parseFloat(document.getElementById('propThickness').value) || 4;
        }
        if (el.type === 'pipe' || el.type === 'smartJump') {
            let res = evaluateMath(document.getElementById('propLength').value);
            el.realLength = isNaN(parseFloat(res)) ? res : parseFloat(res);

            // Spezial-Logik für SmartJump: Werte neu berechnen (falls DN geändert wurde)
            if (el.type === 'smartJump') {
                const jumpResult = calculateSmartJump(el);
                el.calculatedAngle = jumpResult.snappedAngle;
                el.zMass = jumpResult.zMass;
                el.cutLength = jumpResult.cutLength;
                el.realLength = jumpResult.jumpLength; // Systemlänge L synchron halten
            }

            // Radar für Schweißnähte und anliegende Formteile aktivieren (nur bei Standard-Pipes relevant)
            if (el.type === 'pipe') {
                elements.forEach(item => {
                    if (item.type === 'weld' || ['flange', 'nipple', 'socket', 'reducer'].includes(item.type)) {
                        let checkDist = distToSegmentSquared({ x: item.x || item.start?.x, y: item.y || item.start?.y }, { x: el.startX, y: el.startY }, { x: el.endX, y: el.endY });
                        if (checkDist !== undefined && checkDist < 9) { // Toleranz 3 Pixel
                            item.size = el.size;
                            if (item.type === 'weld') item.customName = "Schweißnaht";
                        }
                    }
                });
            }
        }
        if (el.type === 'reducer') { el.size2 = document.getElementById('propDN2').value; }
        if (el.type !== 'pipe' && el.type !== 'smartJump' && el.type !== 'weld') {
            el.rotation = parseFloat(document.getElementById('propRotationNum').value) || 0;
        }
        if (el.type === 'weld') { el.customName = "Schweißnaht"; }

        const FITTING_TOOLS = ['flange', 'valve', 'checkvalve', 'sightglass', 'blindcap', 'nipple', 'socket', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'reducer', 'custom', 'clamp', 'blindclamp', 'insulation'];
        if (FITTING_TOOLS.includes(el.type)) {
            checkPipeClassCompatibility(el.type, el.size);
        }
        pushState(); redraw();
    }
    closeModals();
}

/**
 * Öffnet den Eigenschaften-Dialog für mehrere markierte Bauteile gleichzeitig.
 */
function openBatchProperties() {
    editingElementIndex = -2; // Spezial-Flag für Batch-Mode
    const selElements = selectedElementIndices.map(idx => elements[idx]);

    const titleEl = document.querySelector('#propModal h2');
    if (titleEl) titleEl.innerText = `⚙️ Batch-Edit (${selElements.length} Teile)`;
    const saveBtn = document.querySelector('#propModal button.contained');
    if (saveBtn) saveBtn.innerText = '💾 Alle aktualisieren';

    // Gemeinsame Werte ermitteln
    const getCommonValue = (prop) => {
        const val = selElements[0][prop];
        return selElements.every(el => el[prop] === val) ? val : "";
    };

    document.getElementById('propDN').value = getCommonValue('size') || "DN 50";
    document.getElementById('propName').value = getCommonValue('customName') || "";
    if (document.getElementById('propThickness')) {
        document.getElementById('propThickness').value = getCommonValue('thickness') || 4;
    }

    // Zeilen ein/ausblenden: Batch-Edit ist primär für DN/Name/Dicke/Rotation gedacht
    document.getElementById('propLengthRow').style.display = 'none';
    document.getElementById('propDN2Row').style.display = 'none';
    if (document.getElementById('propSmartJumpInfo')) {
        document.getElementById('propSmartJumpInfo').style.display = 'none';
    }

    const rotationRow = document.getElementById('propRotationRow');
    if (rotationRow) {
        // Rotation nur zeigen, wenn keine Rohre dabei sind (Rohre haben keine Rotationseigenschaft)
        const hasPipes = selElements.some(el => el.type === 'pipe' || el.type === 'smartJump');
        if (hasPipes) {
            rotationRow.style.display = 'none';
        } else {
            rotationRow.style.display = 'flex';
            const commonRot = getCommonValue('rotation') || 0;
            document.getElementById('propRotationSlider').value = commonRot;
            document.getElementById('propRotationNum').value = commonRot;
        }
    }

    document.getElementById('colorModalOverlay').style.display = 'block';
    document.getElementById('propModal').style.display = 'block';
}

/**
 * Speichert die Änderungen für alle aktuell markierten Bauteile.
 */
function saveBatchProperties() {
    const newDN = document.getElementById('propDN').value;
    const newName = document.getElementById('propName').value;
    const newThickness = parseFloat(document.getElementById('propThickness').value) || 4;

    const rotationRow = document.getElementById('propRotationRow');
    const hasRotation = rotationRow && rotationRow.style.display !== 'none';
    const newRotation = hasRotation ? parseFloat(document.getElementById('propRotationNum').value) || 0 : null;

    selectedElementIndices.forEach(idx => {
        let el = elements[idx];
        el.size = newDN;
        if (newName.trim() !== "") el.customName = newName;
        el.thickness = newThickness;

        if (newRotation !== null && el.type !== 'pipe' && el.type !== 'smartJump' && el.type !== 'weld' && el.type !== 'dimension' && el.type !== 'text' && el.type !== 'revisionCloud') {
            el.rotation = newRotation;
        }

        // Falls es Rohre sind, müssen wir eventuelle SmartJumps oder Schweißnähte nachziehen
        if (el.type === 'smartJump') {
            const jumpResult = calculateSmartJump(el);
            el.calculatedAngle = jumpResult.snappedAngle;
            el.zMass = jumpResult.zMass;
            el.cutLength = jumpResult.cutLength;
            el.realLength = jumpResult.jumpLength;
        }

        if (el.type === 'pipe') {
            elements.forEach(item => {
                if (item.type === 'weld' || ['flange', 'nipple', 'socket', 'reducer'].includes(item.type)) {
                    let checkDist = distToSegmentSquared({ x: item.x || item.start?.x, y: item.y || item.start?.y }, { x: el.startX, y: el.startY }, { x: el.endX, y: el.endY });
                    if (checkDist !== undefined && checkDist < 9) {
                        item.size = el.size;
                    }
                }
            });
        }
    });

    pushState();
    redraw();
    closeModals();
    showToast(`${selectedElementIndices.length} Bauteile aktualisiert.`, 'success');
}

function saveAndNextUnmeasuredPipe() {
    if (editingElementIndex !== -1) {
        let el = elements[editingElementIndex];
        el.size = document.getElementById('propDN').value;
        el.customName = document.getElementById('propName').value;
        if (document.getElementById('propThickness')) {
            el.thickness = parseFloat(document.getElementById('propThickness').value) || 4;
        }
        if (el.type === 'pipe' || el.type === 'smartJump') {
            let res = evaluateMath(document.getElementById('propLength').value);
            el.realLength = isNaN(parseFloat(res)) ? res : parseFloat(res);

            // Spezial-Logik für SmartJump: Werte neu berechnen
            if (el.type === 'smartJump') {
                const jumpResult = calculateSmartJump(el);
                el.calculatedAngle = jumpResult.snappedAngle;
                el.zMass = jumpResult.zMass;
                el.cutLength = jumpResult.cutLength;
                el.realLength = jumpResult.jumpLength;
            }

            // Radar für Schweißnähte (nur bei Standard-Pipes)
            if (el.type === 'pipe') {
                elements.forEach(item => {
                    if (item.type === 'weld' || ['flange', 'nipple', 'socket', 'reducer'].includes(item.type)) {
                        let checkDist = distToSegmentSquared({ x: item.x || item.start?.x, y: item.y || item.start?.y }, { x: el.startX, y: el.startY }, { x: el.endX, y: el.endY });
                        if (checkDist !== undefined && checkDist < 9) { // Toleranz 3 Pixel
                            item.size = el.size;
                            if (item.type === 'weld') item.customName = "Schweißnaht";
                        }
                    }
                });
            }
        }
        if (el.type === 'reducer') { el.size2 = document.getElementById('propDN2').value; }
        if (el.type === 'weld') { el.customName = "Schweißnaht"; }
        pushState();
    }

    let nextIdx = -1;
    const CONNECT_TOL2 = 20 * 20;
    const isUnmeasured = (el) => el.type === 'pipe' && (!el.realLength || String(el.realLength || "").trim() === '') && !el.isExisting;

    if (editingElementIndex !== -1) {
        const cur = elements[editingElementIndex];
        if (cur && cur.type === 'pipe') {
            const ends = [{ x: cur.startX, y: cur.startY }, { x: cur.endX, y: cur.endY }];
            let connectedCandidates = [];
            elements.forEach((el, idx) => {
                if (idx === editingElementIndex || !isUnmeasured(el)) return;
                let pts = [{ x: el.startX, y: el.startY }, { x: el.endX, y: el.endY }];
                for (let end of ends) { for (let pt of pts) { if (dist2(end, pt) < CONNECT_TOL2) { connectedCandidates.push(idx); return; } } }
            });
            if (connectedCandidates.length > 0) nextIdx = connectedCandidates[0];
        }
    }

    if (nextIdx === -1) {
        let startIdx = (editingElementIndex !== -1) ? editingElementIndex : 0;
        for (let i = 1; i <= elements.length; i++) {
            let idx = (startIdx + i) % elements.length;
            if (isUnmeasured(elements[idx])) { nextIdx = idx; break; }
        }
    }

    if (nextIdx !== -1) {
        selectedElementIndices = [nextIdx];
        updateSelectionFlags();
        editingElementIndex = nextIdx; let el = elements[nextIdx];
        document.getElementById('propDN').value = el.size || currentDN;
        document.getElementById('propLengthRow').style.display = 'flex'; document.getElementById('propLength').value = "";
        document.getElementById('propDN2Row').style.display = 'none';
        let px = (el.startX + el.endX) / 2; let py = (el.startY + el.endY) / 2; let rect = wrapper.getBoundingClientRect();
        pzPanX = (rect.width / 2) - px * pzScale; pzPanY = (rect.height / 2) - py * pzScale + 150; applyPanZoom();
        redraw(); setTimeout(() => document.getElementById('propLength').focus(), 50);
    } else {
        closeModals();
        selectedElementIndices = [];
        updateSelectionFlags();
        resetPanZoom(); redraw();
        showToast("Fertig! Es wurden allen Rohren eine Länge zugewiesen.", 'success');
    }
}

/**
 * Öffnet ein spezielles Eigenschaften-Fenster für Sonderteile (Skalierung, Größe).
 */
function openCustomProperties(idx) {
    editingElementIndex = idx;
    const el = elements[idx];
    document.getElementById('customPropDN').value = el.size || currentDN;
    document.getElementById('customPropScale').value = Math.round((el.scale || 1) * 100);
    const rot = el.rotation || 0;
    document.getElementById('customPropRotationSlider').value = rot;
    document.getElementById('customPropRotationNum').value = rot;
    document.getElementById('colorModalOverlay').style.display = 'block';
    document.getElementById('customPropModal').style.display = 'block';
}

function saveCustomProperties() {
    if (editingElementIndex !== -1) {
        let el = elements[editingElementIndex];
        el.size = document.getElementById('customPropDN').value;
        el.scale = (parseFloat(document.getElementById('customPropScale').value) || 100) / 100;
        el.rotation = parseFloat(document.getElementById('customPropRotationNum').value) || 0;
        pushState(); redraw();
    }
    closeModals();
}

/**
 * Universal Drag-and-Drop Logik für alle freischwebenden Modalfenster.
 */
function makeDraggable(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const header = modal.querySelector('h2');
    if (!header) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; // Klicks auf Buttons nicht als Drag werten
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = modal.getBoundingClientRect();
        // Hebe das initiale "translate(-50%, -50%)" auf und setze harte Pixelwerte
        if (modal.style.transform !== 'none') {
            modal.style.transform = 'none';
            modal.style.left = rect.left + 'px';
            modal.style.top = rect.top + 'px';
        }

        initialLeft = parseFloat(modal.style.left) || rect.left;
        initialTop = parseFloat(modal.style.top) || rect.top;

        function onMouseMove(moveEvent) {
            if (!isDragging) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            modal.style.left = (initialLeft + dx) + 'px';
            modal.style.top = (initialTop + dy) + 'px';
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Sobald der DOM geladen ist, machen wir die Modals ziehbar:
window.addEventListener('DOMContentLoaded', () => {
    makeDraggable('colorModal');
    makeDraggable('customPartModal');
    makeDraggable('legalModal');
    makeDraggable('propModal');
    makeDraggable('textPropModal');
    makeDraggable('customPropModal');
    makeDraggable('bomModal');
    makeDraggable('weldModal');
});

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icons passend zum Typ
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // Nach 4 Sekunden automatisch entfernen
    setTimeout(() => {
        toast.style.animation = 'toast-out-left 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// --- SMART JUMP UI ---
function openSmartJumpForSelected() {
    let pipeIdx = -1;
    for (let idx of selectedElementIndices) {
        if (elements[idx] && (elements[idx].type === 'pipe' || elements[idx].type === 'smartJump')) {
            pipeIdx = idx;
            break;
        }
    }

    if (pipeIdx === -1) {
        showToast('Bitte zuerst ein Rohr auswählen (Edit-Modus → Klick auf Rohr).', 'error');
        return;
    }

    editingElementIndex = pipeIdx;
    const el = elements[pipeIdx];

    document.getElementById('sjDx').value = el.deltas?.dx || '';
    document.getElementById('sjDy').value = el.deltas?.dy || '';
    document.getElementById('sjDz').value = el.deltas?.dz || '';

    previewSmartJump();

    document.getElementById('colorModalOverlay').style.display = 'block';
    document.getElementById('smartJumpModal').style.display = 'block';
    setTimeout(() => document.getElementById('sjDx').focus(), 150);
}

function previewSmartJump() {
    const dx = parseFloat(document.getElementById('sjDx').value) || 0;
    const dy = parseFloat(document.getElementById('sjDy').value) || 0;
    const dz = parseFloat(document.getElementById('sjDz').value) || 0;

    const preview = document.getElementById('sjPreview');

    if (dx === 0 && dy === 0 && dz === 0) {
        preview.style.display = 'none';
        return;
    }

    let dn = 'DN 50';
    if (editingElementIndex !== -1) {
        dn = elements[editingElementIndex].size || currentDN || 'DN 50';
    }

    const result = calculateSmartJump({ dx, dy, dz, size: dn });

    preview.style.display = 'block';
    document.getElementById('sjTypeLabel').textContent = result.jumpType === 'etage' ? '📐 Etage (2D)' : '🧊 Raumsprung (3D)';
    document.getElementById('sjLengthLabel').textContent = result.jumpLength + ' mm';

    const angleLabel = document.getElementById('sjAngleLabel');
    if (result.isStandard) {
        angleLabel.textContent = result.snappedAngle + '° ✅';
        angleLabel.style.color = '#4CAF50';
    } else {
        angleLabel.textContent = result.snappedAngle + '° (Sonderbogen)';
        angleLabel.style.color = '#f57c00';
    }

    document.getElementById('sjZLabel').textContent = result.R90 > 0 ? result.zMass + ' mm' : '— (kein Bogen in Rohrklasse)';
    document.getElementById('sjCutLabel').textContent = result.R90 > 0 ? result.cutLength + ' mm' : result.jumpLength + ' mm';
}

function saveSmartJump() {
    if (editingElementIndex === -1) { closeModals(); return; }

    const el = elements[editingElementIndex];
    const dx = parseFloat(document.getElementById('sjDx').value) || 0;
    const dy = parseFloat(document.getElementById('sjDy').value) || 0;
    const dz = parseFloat(document.getElementById('sjDz').value) || 0;

    if (dx === 0 && dy === 0 && dz === 0) {
        showToast('Mindestens ein Delta-Wert muss eingegeben werden.', 'error');
        return;
    }

    el.type = 'smartJump';
    el.deltas = { dx, dy, dz };

    const result = calculateSmartJump(el);
    el.calculatedAngle = result.snappedAngle;
    el.jumpLength = result.jumpLength;
    el.zMass = result.zMass;
    el.cutLength = result.cutLength;
    el.jumpType = result.jumpType;
    el.realLength = result.jumpLength;

    pushState();
    closeModals();
    redraw();
    showToast(`Sprung gespeichert: ${result.snappedAngle}° | L=${result.jumpLength} mm`, 'success');
}

window.updateRotationLive = function (source) {
    if (editingElementIndex === -1) return;
    const slider = document.getElementById('propRotationSlider');
    const num = document.getElementById('propRotationNum');
    const val = source === 'slider' ? slider.value : num.value;
    if (source === 'slider') num.value = val; else slider.value = val;
    elements[editingElementIndex].rotation = parseFloat(val) || 0;
    redraw();
};

window.resetRotation = function () {
    if (editingElementIndex === -1) return;
    document.getElementById('propRotationSlider').value = 0;
    document.getElementById('propRotationNum').value = 0;
    elements[editingElementIndex].rotation = 0;
    redraw();
};

window.updateCustomRotationLive = function (source) {
    if (editingElementIndex === -1) return;
    const slider = document.getElementById('customPropRotationSlider');
    const num = document.getElementById('customPropRotationNum');
    const val = source === 'slider' ? slider.value : num.value;
    if (source === 'slider') num.value = val; else slider.value = val;
    elements[editingElementIndex].rotation = parseFloat(val) || 0;
    redraw();
};

window.resetCustomRotation = function () {
    if (editingElementIndex === -1) return;
    document.getElementById('customPropRotationSlider').value = 0;
    document.getElementById('customPropRotationNum').value = 0;
    elements[editingElementIndex].rotation = 0;
    redraw();
};
 
// --- 3dview.js --- 
// --- 3D VIEW LOGIK ---

let scene, camera, renderer, controls;
let is3DVisible = false;
let threeContainer = null; // wird erst beim ersten Aufruf gesetzt (DOM muss geladen sein)

/**
 * Schaltet die 3D-Vorschau ein oder aus.
 */
function toggle3DPreview() {
    const win = document.getElementById('preview3D');
    is3DVisible = !is3DVisible;
    
    if (is3DVisible) {
        win.style.display = 'flex';
        if (!scene) initThree();
        update3DView();
        document.getElementById('toggle3D').classList.add('active');
        document.getElementById('toggle3D').style.background = '#498794';
        document.getElementById('toggle3D').style.color = '#fff';
    } else {
        win.style.display = 'none';
        document.getElementById('toggle3D').classList.remove('active');
        document.getElementById('toggle3D').style.background = 'transparent';
        document.getElementById('toggle3D').style.color = '#498794';
    }
}

/**
 * Initialisiert die Three.js Szene.
 */
function initThree() {
    threeContainer = document.getElementById('threeJsContainer'); // DOM sicher geladen
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);

    const width = threeContainer.clientWidth;
    const height = threeContainer.clientHeight;

    camera = new THREE.PerspectiveCamera(45, width / height, 1, 20000);
    camera.position.set(800, 800, 800);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    threeContainer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(500, 1000, 500);
    scene.add(dirLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const gridHelper = new THREE.GridHelper(2000, 40, 0x333333, 0x222222);
    scene.add(gridHelper);

    animate();

    // Resize-Handling für das Fenster
    const resizeObserver = new ResizeObserver(() => {
        if (is3DVisible && renderer && camera) {
            const w = threeContainer.clientWidth;
            const h = threeContainer.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
    });
    resizeObserver.observe(document.getElementById('preview3D'));

    initDraggable(document.getElementById('preview3D'), document.getElementById('preview3DHeader'));
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

/**
 * Übersetzt die 2D-Elemente in echte orthogonale 3D-Objekte.
 */
function update3DView() {
    if (!scene || !is3DVisible) return;

    // SnapKey global verfügbar machen für Render-Funktionen
    window._snapKey = null;

    // Alte Objekte entfernen
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const obj = scene.children[i];
        if (obj.type === 'Mesh' || obj.type === 'Group') {
            scene.remove(obj);
        }
    }

    const pipeMaterial = new THREE.MeshPhongMaterial({ color: 0x498794, specular: 0x111111, shininess: 30 });
    const previewMaterial = new THREE.MeshPhongMaterial({ color: 0x1976d2, transparent: true, opacity: 0.7 });
    const existingMaterial = new THREE.MeshPhongMaterial({ color: 0x498794, transparent: true, opacity: 0.4 });
    const valveMaterial = new THREE.MeshPhongMaterial({ color: 0x5ba1ae });

    // --- 3D REKONSTRUKTION ---
    if (elements.length === 0 && !isDrawing) return;

    const pointMap = new Map();
    window._snapKey = null; // Reset

    // Hilfsfunktion: einfacher Key aus Koordinaten
    function sk(x, y) { return `${Math.round(x)},${Math.round(y)}`; }
    window._snapKey = sk;

    // Anker: Start des ersten Rohrs = Ursprung
    const firstPipe = elements.find(el => el.type === 'pipe' || el.type === 'smartJump' || el.type === 'reducer');
    if (firstPipe) {
        const pts = getPoints(firstPipe);
        pointMap.set(sk(pts.s.x, pts.s.y), new THREE.Vector3(0, 0, 0));
    }

    for (let iteration = 0; iteration < 80; iteration++) {
        let changed = false;

        // A) Exakte Propagation (vorwärts + rückwärts)
        elements.forEach(el => {
            if (el.type !== 'pipe' && el.type !== 'smartJump' && el.type !== 'reducer') return;
            const pts = getPoints(el);
            const sKey = sk(pts.s.x, pts.s.y);
            const eKey = sk(pts.e.x, pts.e.y);
            const sVal = pointMap.get(sKey);
            const eVal = pointMap.get(eKey);

            if (sVal && !eVal) {
                const d = calculate3DDelta(el);
                pointMap.set(eKey, new THREE.Vector3(sVal.x + d.x, sVal.y + d.y, sVal.z + d.z));
                changed = true;
            } else if (!sVal && eVal) {
                const d = calculate3DDelta(el);
                pointMap.set(sKey, new THREE.Vector3(eVal.x - d.x, eVal.y - d.y, eVal.z - d.z));
                changed = true;
            }
        });

        // Live-Preview
        if (isDrawing && startPoint && currentPoint) {
            const sK = sk(startPoint.x, startPoint.y);
            const eK = sk(currentPoint.x, currentPoint.y);
            if (pointMap.get(sK) && !pointMap.get(eK)) {
                const d = calculate3DDelta({ type: currentTool, startX: startPoint.x, startY: startPoint.y, endX: currentPoint.x, endY: currentPoint.y });
                pointMap.set(eK, new THREE.Vector3(pointMap.get(sK).x + d.x, pointMap.get(sK).y + d.y, pointMap.get(sK).z + d.z));
                changed = true;
            }
        }

        // B) Brücken-Suche: Unverbundene Rohre an nächsten bekannten Punkt andocken
        if (!changed) {
            const BRIDGE_TOL_SQ = 80 * 80;
            for (const el of elements) {
                if (el.type !== 'pipe' && el.type !== 'smartJump' && el.type !== 'reducer') continue;
                const pts = getPoints(el);
                const sKey = sk(pts.s.x, pts.s.y);
                const eKey = sk(pts.e.x, pts.e.y);
                if (pointMap.get(sKey) || pointMap.get(eKey)) continue;

                // Finde den nächsten aufgelösten Punkt
                let best = null;
                for (const [k, v] of pointMap) {
                    if (!v) continue;
                    const [kx, ky] = k.split(',').map(Number);
                    const ds = (pts.s.x - kx) ** 2 + (pts.s.y - ky) ** 2;
                    const de = (pts.e.x - kx) ** 2 + (pts.e.y - ky) ** 2;
                    if (ds < (best ? best.dist : BRIDGE_TOL_SQ)) best = { key: sKey, dist: ds, pos: v };
                    if (de < (best ? best.dist : BRIDGE_TOL_SQ)) best = { key: eKey, dist: de, pos: v };
                }
                if (best) {
                    pointMap.set(best.key, best.pos.clone());
                    changed = true;
                    break;
                }
            }

            // Fallback: komplett isolierte Insel
            if (!changed) {
                const lonely = elements.find(el => {
                    if (el.type !== 'pipe' && el.type !== 'smartJump' && el.type !== 'reducer') return false;
                    const p = getPoints(el);
                    return !pointMap.get(sk(p.s.x, p.s.y)) && !pointMap.get(sk(p.e.x, p.e.y));
                });
                if (lonely) {
                    const p = getPoints(lonely);
                    pointMap.set(sk(p.s.x, p.s.y), new THREE.Vector3(p.s.x * 0.5, 0, -p.s.y * 0.5));
                    changed = true;
                }
            }
        }
        if (!changed) break;
    }

    // --- ZEICHNEN ---
    elements.forEach(el => {
        if (el.type === 'pipe' || el.type === 'smartJump' || el.type === 'reducer') {
            render3DPipe(el, pointMap, el.isExisting ? existingMaterial : pipeMaterial);
        } else if (['valve', 'checkvalve', '3wayvalve', 'damper', 'safetyvalve', 'compensator', 'sightglass', 'gatevalve'].includes(el.type)) {
            render3DFitting(el, pointMap, valveMaterial, 'box');
        } else if (el.type === 'flange') {
            render3DFitting(el, pointMap, pipeMaterial, 'cylinder');
        }
    });

    // --- ÜBERGÄNGE (Spheres an den Knotenpunkten für saubere Kurven) ---
    pointMap.forEach((pos, key) => {
        if (!pos) return;

        // Kein Ball wenn hier ein festes Bauteil sitzt
        const hasFitting = elements.some(el => {
            if (['pipe', 'smartJump', 'weld', 'dimension', 'text', 'number', 'hatch', 'revisionCloud', 'weldnum', 'balloon'].includes(el.type)) return false;
            return sk(el.x || 0, el.y || 0) === key;
        });
        if (hasFitting) return;

        const connectedPipe = elements.find(el => {
            if (el.type !== 'pipe' && el.type !== 'smartJump') return false;
            const pts = getPoints(el);
            return (sk(pts.s.x, pts.s.y) === key) || (sk(pts.e.x, pts.e.y) === key);
        });

        if (connectedPipe) {
            const radius = getPipeRadius(connectedPipe);
            const sphereGeom = new THREE.SphereGeometry(radius, 16, 16);
            const sphere = new THREE.Mesh(sphereGeom, connectedPipe.isExisting ? existingMaterial : pipeMaterial);
            sphere.position.copy(pos);
            scene.add(sphere);
        }
    });

    if (isDrawing && typeof startPoint !== 'undefined' && startPoint && typeof currentPoint !== 'undefined' && currentPoint) {
        render3DPipe({ type: currentTool, startX: startPoint.x, startY: startPoint.y, endX: currentPoint.x, endY: currentPoint.y, thickness: 5 }, pointMap, previewMaterial);
    }
}

function getPoints(el) {
    const sX = el.startX !== undefined ? el.startX : (el.start ? el.start.x : el.x);
    const sY = el.startY !== undefined ? el.startY : (el.start ? el.start.y : el.y);
    const eX = el.endX !== undefined ? el.endX : (el.end ? el.end.x : el.x);
    const eY = el.endY !== undefined ? el.endY : (el.end ? el.end.y : el.y);
    return { s: { x: Math.round(sX), y: Math.round(sY) }, e: { x: Math.round(eX), y: Math.round(eY) } };
}

function getPipeRadius(el) {
    // Standard-Fallback (falls gar nichts gefunden wird)
    let radius = (el.thickness || 4) * 2; 
    
    // Wir prüfen el.size (z.B. "DN 25")
    let sizeStr = el.size;
    
    // Falls das Element keine eigene Größe hat, schauen wir, ob global eine gesetzt ist
    if (!sizeStr && typeof currentDN !== 'undefined') {
        sizeStr = currentDN;
    }

    if (sizeStr) {
        // Extrahiere die Zahl (z.B. aus "DN 25" -> 25, oder "50" -> 50)
        const match = String(sizeStr).match(/(\d+)/);
        if (match) {
            const dnValue = parseFloat(match[1]);
            if (!isNaN(dnValue) && dnValue > 0) {
                radius = dnValue / 2; 
            }
        }
    }
    return radius;
}

function processSegment(el, pointMap) {
    const pts = getPoints(el);
    const sKey = `${pts.s.x},${pts.s.y}`;
    const eKey = `${pts.e.x},${pts.e.y}`;
    if (pointMap.has(sKey) && pointMap.get(sKey)) {
        const delta = calculate3DDelta(el);
        const s3d = pointMap.get(sKey);
        pointMap.set(eKey, new THREE.Vector3(s3d.x + delta.x, s3d.y + delta.y, s3d.z + delta.z));
    }
}

function calculate3DDelta(el) {
    // 1. Wenn es ein SmartJump ist, nutzen wir die ECHTEN Maße aus dem Dialog
    if (el.type === 'smartJump') {
        const dx = parseFloat(el.deltas?.dx || el.dx || 0);
        const dy = parseFloat(el.deltas?.dy || el.dy || 0);
        const dz = parseFloat(el.deltas?.dz || el.dz || 0);
        return { x: dx, y: dz, z: -dy };
    }

    const pts = getPoints(el);
    const dx = pts.e.x - pts.s.x;
    const dy = pts.e.y - pts.s.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const drawLen = Math.sqrt(dx * dx + dy * dy);
    
    // --- NEU: Echte Länge aus Eigenschaften priorisieren ---
    let len = drawLen;
    
    // 1. Check auf numerische Eigenschaften (aus dem Modal)
    // In Isomake wird die Länge oft in 'realLength' gespeichert.
    const propLen = parseFloat(el.realLength || el.length || el.cutLength);
    if (!isNaN(propLen) && propLen > 0) {
        len = propLen;
    } 
    // 2. Check auf Text-Feld (als Fallback)
    else if (el.text) {
        const match = el.text.match(/(\d+[\.,]?\d*)/);
        if (match) {
            const val = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) {
                len = val;
            }
        }
    }

    // A) Vertikal
    if (Math.abs(angle + 90) < 10) return { x: 0, y: len, z: 0 };
    if (Math.abs(angle - 90) < 10) return { x: 0, y: -len, z: 0 };

    // B) Rechts-Achse (-30° Oben-Rechts)
    if (Math.abs(angle + 30) < 10) return { x: len, y: 0, z: 0 };
    if (Math.abs(angle - 150) < 10) return { x: -len, y: 0, z: 0 };

    // C) Links-Achse (-150° Oben-Links)
    if (Math.abs(angle + 150) < 10) return { x: 0, y: 0, z: -len };
    if (Math.abs(angle - 30) < 10) return { x: 0, y: 0, z: len };

    // Fallback für Schrägen
    const ratio = len / (drawLen || 1);
    return { x: dx * ratio, y: 0, z: dy * ratio };
}

function render3DPipe(el, pointMap, material) {
    const pts = getPoints(el);
    const sk = window._snapKey || ((x,y) => `${Math.round(x)},${Math.round(y)}`);
    const s3d = pointMap.get(sk(pts.s.x, pts.s.y));
    const e3d = pointMap.get(sk(pts.e.x, pts.e.y));
    if (!s3d || !e3d) return;
    
    const distance = s3d.distanceTo(e3d);
    if (distance < 1) return;

    // Radius basierend auf DN-Größe berechnen
    const radius = getPipeRadius(el);
    
    const geometry = new THREE.CylinderGeometry(radius, radius, distance, 16);
    const mesh = new THREE.Mesh(geometry, material);
    
    const position = e3d.clone().add(s3d).divideScalar(2);
    mesh.position.copy(position);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e3d.clone().sub(s3d).normalize());
    
    scene.add(mesh);
}


function render3DFitting(el, pointMap, material, shape) {
    const sk = window._snapKey || ((x,y) => `${Math.round(x)},${Math.round(y)}`);
    const key = sk(el.x || 0, el.y || 0);
    const pos = pointMap.get(key);
    if (!pos) return;

    let geom;
    if (shape === 'box') {
        geom = new THREE.BoxGeometry(25, 25, 25);
    } else if (shape === 'cylinder') {
        // Flansche: 50% dünner und exakt 60% größer als das Rohr (Faktor 1.6)
        const r = getPipeRadius(el) * 1.6;
        geom = new THREE.CylinderGeometry(r, r, 6, 24);
    } else {
        geom = new THREE.SphereGeometry(8, 16, 16);
    }

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.copy(pos);

    // Ausrichtung für Flansche (Cylinder): Automatisch am Rohr ausrichten
    if (shape === 'cylinder') {
        // Wir suchen das Rohr, das an diesem Punkt hängt, um die Richtung zu übernehmen
        const connectedPipe = elements.find(el => {
            if (el.type !== 'pipe' && el.type !== 'smartJump') return false;
            const pts = getPoints(el);
            const sk = window._snapKey || ((x,y) => `${Math.round(x)},${Math.round(y)}`);
            return (sk(pts.s.x, pts.s.y) === key) || (sk(pts.e.x, pts.e.y) === key);
        });

        if (connectedPipe) {
            const pts = getPoints(connectedPipe);
            const sk2 = window._snapKey || ((x,y) => `${Math.round(x)},${Math.round(y)}`);
            const s3d = pointMap.get(sk2(pts.s.x, pts.s.y));
            const e3d = pointMap.get(sk2(pts.e.x, pts.e.y));
            if (s3d && e3d) {
                const dirVec = e3d.clone().sub(s3d).normalize();
                // Der Zylinder (Standard Y-Up) wird in Richtung des Rohres gedreht
                mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec);
            }
        } else {
            // Fallback auf el.dir falls kein Rohr gefunden wurde
            if (el.dir === 0) mesh.rotation.z = Math.PI / 2;
            else if (el.dir === 1) mesh.rotation.x = Math.PI / 2;
        }
    }

    // Manuelle Zusatz-Rotation vom User (Y-Achse)
    if (el.rotation) {
        mesh.rotation.y += el.rotation * Math.PI / 180;
    }

    scene.add(mesh);
}

function initDraggable(el, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.onmousedown = (e) => {
        e = e || window.event; e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
            e = e || window.event; e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.bottom = "auto"; el.style.right = "auto";
        };
    };
}

// --- GLOBAL REDRAW HOOK ---
// Wird nach vollständigem DOM-Load gesetzt, damit der Obfuskator-Bundle korrekt funktioniert
function _install3DRedrawHook() {
    var _originalRedraw = window.redraw;
    window.redraw = function () {
        if (typeof isRedrawing !== 'undefined' && isRedrawing) return;
        if (typeof isRedrawing !== 'undefined') window.isRedrawing = true;
        
        requestAnimationFrame(function() {
            try {
                if (typeof performRedraw === 'function') performRedraw();
                if (is3DVisible) update3DView();
            } finally {
                if (typeof isRedrawing !== 'undefined') window.isRedrawing = false;
            }
        });
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _install3DRedrawHook);
} else {
    _install3DRedrawHook();
}
 
