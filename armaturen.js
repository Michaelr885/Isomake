// --- VEKTOREN, MATHEMATIK & BERECHNUNGEN ---
const L = 30; 
const dx = L * (Math.sqrt(3) / 2); 
const m30 = 1 / Math.sqrt(3);      

const VECTORS = [
    { x: 0, y: -1 },                        
    { x: Math.sqrt(3)/2, y: 0.5 },          
    { x: -Math.sqrt(3)/2, y: 0.5 }          
];
const CROSS_VECTORS = [ VECTORS[1], VECTORS[0], VECTORS[0] ];

const SYMBOL_DIRS = [
    { v: VECTORS[0], c: VECTORS[1] }, { v: VECTORS[0], c: VECTORS[2] }, 
    { v: VECTORS[1], c: VECTORS[0] }, { v: VECTORS[1], c: VECTORS[2] }, 
    { v: VECTORS[2], c: VECTORS[0] }, { v: VECTORS[2], c: VECTORS[1] }  
];

const SLOPE_DIRS = [
    { v: VECTORS[1], c: VECTORS[0] }, { v: {x: -VECTORS[1].x, y: -VECTORS[1].y}, c: VECTORS[0] },
    { v: VECTORS[2], c: VECTORS[0] }, { v: {x: -VECTORS[2].x, y: -VECTORS[2].y}, c: VECTORS[0] },
    { v: VECTORS[0], c: VECTORS[1] }, { v: {x: -VECTORS[0].x, y: -VECTORS[0].y}, c: VECTORS[1] }
];

function sqr(x) { return x * x; }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y); }
function distToSegmentSquared(p, v, w) {
    let l2 = dist2(v, w); if (l2 == 0) return dist2(p, v);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

function segmentsIntersect(p1, p2, p3, p4) {
    function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

function getCrossVector(dx, dy) {
    let len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return CROSS_VECTORS[0];
    let nx = dx / len; let ny = dy / len;
    let bestDot = -1; let bestIdx = 0;
    VECTORS.forEach((v, i) => {
        let dot = nx * v.x + ny * v.y;
        if (Math.abs(dot) > bestDot) { bestDot = Math.abs(dot); bestIdx = i; }
    });
    return CROSS_VECTORS[bestIdx];
}

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
function drawReducer(ctx, start, end, type, thickness, color, isPreview = false, isExisting = false) {
    let dx = end.x - start.x; let dy = end.y - start.y; if (Math.sqrt(dx*dx + dy*dy) < 5) return; 
    let cross_v = getCrossVector(dx, dy); let D1 = 24; let p1, p2; let p3 = { x: end.x, y: end.y }; 
    
    if (type === 0) { p1 = { x: start.x + cross_v.x * D1/2, y: start.y + cross_v.y * D1/2 }; p2 = { x: start.x - cross_v.x * D1/2, y: start.y - cross_v.y * D1/2 }; } 
    else if (type === 1) { p1 = { x: start.x + cross_v.x * D1, y: start.y + cross_v.y * D1 }; p2 = { x: start.x, y: start.y }; }
    else if (type === 2) { p1 = { x: start.x, y: start.y }; p2 = { x: start.x - cross_v.x * D1, y: start.y - cross_v.y * D1 }; }
    
    ctx.save(); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness || 2; 
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.restore();
}

// --- NEUE FUNKTIONEN FÜR ZUSATZ-WERKZEUGE ---
function drawFlowArrow(ctx, x, y, dir, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 15; let W = 6;
    ctx.beginPath();
    ctx.moveTo(x + v.x*S, y + v.y*S); ctx.lineTo(x - v.x*S + c.x*W, y - v.y*S + c.y*W); ctx.lineTo(x - v.x*S - c.x*W, y - v.y*S - c.y*W); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.4)' : (color || '#212121'); ctx.fill();
    if (isExisting) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
}

function drawSupport(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {c, v} = getRenderParams(dir); let S = 15; let W = 10;
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness || 2;
    if(isExisting) ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + c.x*S, y + c.y*S);
    ctx.moveTo(x + c.x*S - v.x*W, y + c.y*S - v.y*W); ctx.lineTo(x + c.x*S + v.x*W, y + c.y*S + v.y*W);
    ctx.stroke(); ctx.setLineDash([]);
}

function drawElevationMarker(ctx, x, y, dir, text, color, isPreview = false, isExisting = false) {
    let {c} = getRenderParams(dir); let S = 12;
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff';
    ctx.lineWidth = 1.5; if (isExisting) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c.x*S - c.y*S*0.5, y + c.y*S + c.x*S*0.5); ctx.lineTo(x + c.x*S + c.y*S*0.5, y + c.y*S - c.x*S*0.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + c.x*S, y + c.y*S); ctx.lineTo(x + c.x*S*3, y + c.y*S*3); ctx.stroke(); ctx.setLineDash([]);
    if(text) {
        ctx.save(); ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.font = '500 12px "Roboto", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.translate(x + c.x*S*3, y + c.y*S*3); let angle = (dir % 6 === 1 || dir % 6 === 4) ? -Math.PI/6 : Math.PI/6; ctx.rotate(angle);
        let lines = String(text).split('\n'); lines.forEach((line, i) => ctx.fillText(line, 2, -2 + (i * 14))); ctx.restore();
    }
}

function drawMSR(ctx, x, y, dir, text, color, isPreview = false, isExisting = false) {
    let {c} = getRenderParams(dir); let S = 20; let R = 12;
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.5;
    if(isExisting) ctx.setLineDash([4,4]);
    let cx = x + c.x*S; let cy = y + c.y*S;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); ctx.setLineDash([]);
    if(text) {
        ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.font = '500 10px "Roboto", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let parts = String(text).split('\n');
        if(parts.length > 0) ctx.fillText(parts[0], cx, cy - 5);
        if(parts.length > 1) ctx.fillText(parts[1], cx, cy + 5);
    }
}

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

function drawDimension(ctx, start, end, dir, dist, text, color, isPreview = false) {
    let v = VECTORS[dir];
    let p1 = { x: start.x + v.x * dist, y: start.y + v.y * dist }; let p2 = { x: end.x + v.x * dist, y: end.y + v.y * dist };
    ctx.save(); ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1;
    let gap = 5; let over = 5;
    ctx.beginPath(); ctx.moveTo(start.x + v.x * gap, start.y + v.y * gap); ctx.lineTo(p1.x + v.x * over, p1.y + v.y * over);
    ctx.moveTo(end.x + v.x * gap, end.y + v.y * gap); ctx.lineTo(p2.x + v.x * over, p2.y + v.y * over); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    let lineDx = p2.x - p1.x; let lineDy = p2.y - p1.y; let len = Math.sqrt(sqr(lineDx) + sqr(lineDy));
    if (len > 0) {
        let nx = lineDx/len; let ny = lineDy/len; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x + nx*10 - ny*3, p1.y + ny*10 + nx*3); ctx.lineTo(p1.x + nx*10 + ny*3, p1.y + ny*10 - nx*3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2.x - nx*10 - ny*3, p2.y - ny*10 + nx*3); ctx.lineTo(p2.x - nx*10 + ny*3, p2.y - ny*10 - nx*3); ctx.fill();
    }
    let mid = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 }; ctx.translate(mid.x, mid.y);
    let angle = Math.atan2(lineDy, lineDx); if (angle > Math.PI/2 || angle < -Math.PI/2) angle += Math.PI; 
    
    // NEU: Vertikale Linien immer von unten nach oben lesen (-90 Grad)
    if (Math.abs(angle - Math.PI/2) < 0.05 || Math.abs(angle + Math.PI/2) < 0.05) {
        angle = -Math.PI/2;
    }
    
    ctx.rotate(angle); ctx.font = '500 15px "Roboto", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    
    // --- HIER IST DER FIX ---
    let textW = ctx.measureText(text).width; 
    ctx.fillStyle = '#ffffff'; // Kasten ist jetzt 100% weiß (nicht mehr leicht transparent)
    ctx.fillRect(-textW/2 - 4, -18, textW + 8, 22); // Der Kasten geht jetzt bis Y=+4 und überdeckt die Linie sauber
    
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.fillText(text, 0, -3); ctx.restore();
}

function drawValve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 22; 
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + v.x * S + c.x * S*0.5, y + v.y * S + c.y * S*0.5); ctx.lineTo(x + v.x * S - c.x * S*0.5, y + v.y * S - c.y * S*0.5); ctx.closePath();
    ctx.moveTo(x, y); ctx.lineTo(x - v.x * S + c.x * S*0.5, y - v.y * S + c.y * S*0.5); ctx.lineTo(x - v.x * S - c.x * S*0.5, y - v.y * S - c.y * S*0.5); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness; 
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
}

function draw3WayValve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 22; 
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + v.x * S + c.x * S*0.5, y + v.y * S + c.y * S*0.5); ctx.lineTo(x + v.x * S - c.x * S*0.5, y + v.y * S - c.y * S*0.5); ctx.closePath();
    ctx.moveTo(x, y); ctx.lineTo(x - v.x * S + c.x * S*0.5, y - v.y * S + c.y * S*0.5); ctx.lineTo(x - v.x * S - c.x * S*0.5, y - v.y * S - c.y * S*0.5); ctx.closePath();
    ctx.moveTo(x, y); ctx.lineTo(x + c.x * S + v.x * S*0.5, y + c.y * S + v.y * S*0.5); ctx.lineTo(x + c.x * S - v.x * S*0.5, y + c.y * S - v.y * S*0.5); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness; 
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
}

function drawDamper(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 18; let W = 10;
    ctx.beginPath();
    ctx.moveTo(x + v.x*S + c.x*W, y + v.y*S + c.y*W);
    ctx.lineTo(x - v.x*S + c.x*W, y - v.y*S + c.y*W);
    ctx.lineTo(x - v.x*S - c.x*W, y - v.y*S - c.y*W);
    ctx.lineTo(x + v.x*S - c.x*W, y + v.y*S - c.y*W);
    ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    
    ctx.beginPath(); ctx.moveTo(x + v.x*S + c.x*W, y + v.y*S + c.y*W); ctx.lineTo(x - v.x*S - c.x*W, y - v.y*S - c.y*W); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, thickness > 4 ? 4 : 3, 0, Math.PI*2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
}

function drawCheckvalve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 18; let W = 10;
    ctx.beginPath();
    ctx.moveTo(x + v.x*S + c.x*W, y + v.y*S + c.y*W);
    ctx.lineTo(x - v.x*S + c.x*W, y - v.y*S + c.y*W);
    ctx.lineTo(x - v.x*S - c.x*W, y - v.y*S - c.y*W);
    ctx.lineTo(x + v.x*S - c.x*W, y + v.y*S - c.y*W);
    ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; 
    ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    
    ctx.beginPath(); ctx.moveTo(x + v.x*S + c.x*W, y + v.y*S + c.y*W); ctx.lineTo(x - v.x*S - c.x*W, y - v.y*S - c.y*W); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - v.x*S - c.x*W, y - v.y*S - c.y*W, thickness > 4 ? 5 : 4, 0, Math.PI*2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
}

function drawSafetyValve(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 18;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + v.x*S + c.x*S*0.5, y + v.y*S + c.y*S*0.5); ctx.lineTo(x + v.x*S - c.x*S*0.5, y + v.y*S - c.y*S*0.5); ctx.closePath();
    ctx.moveTo(x, y); ctx.lineTo(x + c.x*S + v.x*S*0.5, y + c.y*S + v.y*S*0.5); ctx.lineTo(x + c.x*S - v.x*S*0.5, y + c.y*S - v.y*S*0.5); ctx.closePath();
    
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - v.x*S*1.2, y - v.y*S*1.2); ctx.stroke();
    for (let i=1; i<=3; i++) {
        let tx = x - v.x*(S*0.35*i); let ty = y - v.y*(S*0.35*i);
        ctx.beginPath(); ctx.moveTo(tx + c.x*5, ty + c.y*5); ctx.lineTo(tx - c.x*5, ty - c.y*5); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, thickness > 4 ? 4 : 3, 0, Math.PI*2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
}

function drawSightglass(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 22;
    ctx.beginPath();
    ctx.moveTo(x + v.x * S + c.x * S*0.5, y + v.y * S + c.y * S*0.5); ctx.lineTo(x - v.x * S + c.x * S*0.5, y - v.y * S + c.y * S*0.5);
    ctx.lineTo(x - v.x * S - c.x * S*0.5, y - v.y * S - c.y * S*0.5); ctx.lineTo(x + v.x * S - c.x * S*0.5, y + v.y * S - c.y * S*0.5); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.2)' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness; 
    if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, S * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
}

function drawCompensator(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 20; let W = 8;
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x - v.x*S, y - v.y*S); ctx.lineTo(x - v.x*S*0.4, y - v.y*S*0.4);
    ctx.moveTo(x + v.x*S*0.4, y + v.y*S*0.4); ctx.lineTo(x + v.x*S, y + v.y*S);
    ctx.stroke();
    
    ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = -1.5; i <= 1.5; i += 1) {
        let px = x + v.x*S*0.15*i; let py = y + v.y*S*0.15*i;
        ctx.moveTo(px + c.x*W, py + c.y*W); ctx.lineTo(px - c.x*W, py - c.y*W);
    }
    ctx.stroke(); ctx.setLineDash([]);
}

function drawFlange(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {c} = getRenderParams(dir); let S = 20; 
    ctx.beginPath(); ctx.moveTo(x + c.x * S, y + c.y * S); ctx.lineTo(x - c.x * S, y - c.y * S);
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.5)' : color; ctx.lineWidth = thickness; ctx.lineCap = 'round'; 
    if (isExisting) ctx.setLineDash([14, 12]); ctx.stroke(); ctx.setLineDash([]);
}

function drawBlindcap(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 12; let W = thickness + 6;
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + v.x * S, y + v.y * S); ctx.stroke();
    ctx.lineWidth = thickness + 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + v.x * S + c.x * W, y + v.y * S + c.y * W); ctx.lineTo(x + v.x * S - c.x * W, y + v.y * S - c.y * W); ctx.stroke();
    ctx.setLineDash([]);
}

function drawNipple(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 20; let W = 6; 
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = thickness;
    if (isExisting) ctx.setLineDash([8, 8]);
    
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + v.x*S*0.4, y + v.y*S*0.4); ctx.stroke();
    
    ctx.lineWidth = 1.5; ctx.beginPath(); 
    let zx = x + v.x*S*0.4; let zy = y + v.y*S*0.4;
    ctx.moveTo(zx, zy);
    ctx.lineTo(zx + c.x*W + v.x*S*0.15, zy + c.y*W + v.y*S*0.15);
    ctx.lineTo(zx - c.x*W + v.x*S*0.30, zy - c.y*W + v.y*S*0.30);
    ctx.lineTo(zx + c.x*W + v.x*S*0.45, zy + c.y*W + v.y*S*0.45);
    ctx.lineTo(zx - c.x*W + v.x*S*0.60, zy - c.y*W + v.y*S*0.60);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawSocket(ctx, x, y, dir, thickness, color, isPreview = false, isExisting = false) {
    let {v, c} = getRenderParams(dir); let S = 20; let W = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + v.x*S*0.5, y + v.y*S*0.5);
    ctx.moveTo(x + v.x*S*0.5 + c.x*W, y + v.y*S*0.5 + c.y*W);
    ctx.lineTo(x + v.x*S*0.5 - c.x*W, y + v.y*S*0.5 - c.y*W);
    ctx.moveTo(x + v.x*S*0.5 + c.x*W, y + v.y*S*0.5 + c.y*W);
    ctx.lineTo(x + v.x*S + c.x*W, y + v.y*S + c.y*W);
    ctx.moveTo(x + v.x*S*0.5 - c.x*W, y + v.y*S*0.5 - c.y*W);
    ctx.lineTo(x + v.x*S - c.x*W, y + v.y*S - c.y*W);
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'square';
    if (isExisting) ctx.setLineDash([8, 8]);
    ctx.stroke(); ctx.setLineDash([]);
}

function drawCustom(ctx, el, color, isPreview = false, isExisting = false) {
    ctx.save(); ctx.translate(el.x, el.y); let angle = el.dir * (Math.PI / 3); ctx.rotate(angle); ctx.scale(el.scale, el.scale);
    if(isExisting) ctx.setLineDash([6, 6]);
    el.parts.forEach(p => {
        ctx.beginPath(); ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = 2;
        if(p.type === 'line') { ctx.moveTo(p.x1 - 100, p.y1 - 100); ctx.lineTo(p.x2 - 100, p.y2 - 100); }
        else if (p.type === 'rect') { ctx.rect(Math.min(p.x1, p.x2) - 100, Math.min(p.y1, p.y2) - 100, Math.abs(p.x2-p.x1), Math.abs(p.y2-p.y1)); }
        else if (p.type === 'circle') { let r = Math.sqrt(sqr(p.x2-p.x1) + sqr(p.y2-p.y1)); ctx.arc(p.x1 - 100, p.y1 - 100, r, 0, Math.PI*2); }
        else if (p.type === 'triangle') { ctx.moveTo(p.x1 - 100, p.y2 - 100); ctx.lineTo((p.x1+p.x2)/2 - 100, p.y1 - 100); ctx.lineTo(p.x2 - 100, p.y2 - 100); ctx.closePath(); }
        ctx.stroke();
    });
    ctx.restore();
}

function drawSlope(ctx, x, y, dir, color, isPreview = false, isExisting = false) {
    let v = SLOPE_DIRS[dir].v; let c = SLOPE_DIRS[dir].c; let S = 40; let H = 10; 
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - v.x * S, y - v.y * S); ctx.lineTo(x - v.x * S + c.x * H, y - v.y * S + c.y * H); ctx.closePath();
    ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.4)' : color; ctx.fill();
    ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = 1; if (isExisting) ctx.setLineDash([8, 8]); ctx.stroke(); ctx.restore();
}

function drawText(ctx, text, x, y, dir, size, color, isPreview = false) {
    ctx.save(); ctx.translate(x + 8, y - 8); let angle = (dir === 1) ? -Math.PI/6 : (dir === 2) ? Math.PI/6 : (dir === 3) ? -Math.PI/2 : 0;
    ctx.rotate(angle); ctx.font = `500 ${size}px "Roboto", Arial, sans-serif`; ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.5)' : color;
    let lines = String(text).split('\n'); let lineHeight = size * 1.2;
    lines.forEach((line, index) => { ctx.fillText(line, 0, index * lineHeight); }); ctx.restore();
}


function drawNumber(ctx, startX, startY, endX, endY, text, color, isPreview = false) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.strokeStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(endX, endY, 14, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
    ctx.font = '500 14px "Roboto", Arial, sans-serif'; ctx.fillStyle = isPreview ? 'rgba(25, 118, 210, 0.8)' : color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, endX, endY); ctx.restore();
}