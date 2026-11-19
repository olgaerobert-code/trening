// Generuje icon-192.png i icon-512.png — znak stawów na żółtym polu.
// Zero zaleznosci: wlasny enkoder PNG na zlib z Node.
//   node tools/make-icons.mjs

import fs from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return buf => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, draw) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // filtr 0 + RGB
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x, y);
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bitow, truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ZOLTY = [255, 210, 31];   // --acc
const CZARNY = [16, 16, 17];    // --ink jasnego motywu

// Znak aplikacji: noga z boku — biodro, kolano, kostka — jako trzy pierścienie
// połączone kością. Ten sam rysunek co mapa stawów na ekranie Dziś.
// Wszystko mieści się w środkowych 80% pola, więc ikona maskowalna nic nie traci.
const STAWY = [[11.5, 7.5], [20.5, 16], [13.5, 24.5]];
const PALCE = [21.5, 26.5];
const doOdcinka = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
function kolor(gx, gy) {
  // pierścień stawu: czarny krąg z żółtym środkiem
  for (const [sx, sy] of STAWY) {
    const d = Math.hypot(gx - sx, gy - sy);
    if (d <= 1.7) return ZOLTY;
    if (d <= 3.9) return CZARNY;
  }
  const kosci = [[STAWY[0], STAWY[1]], [STAWY[1], STAWY[2]], [STAWY[2], PALCE]];
  if (kosci.some(([a, b]) => doOdcinka(gx, gy, a, b) <= 1.45)) return CZARNY;
  return ZOLTY;
}
// Wygładzanie krawędzi: 4 × 4 próbki na piksel.
function draw(size) {
  const u = size / 32, N = 4;
  return (x, y) => {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const c = kolor((x + (i + 0.5) / N) / u, (y + (j + 0.5) / N) / u);
      r += c[0]; g += c[1]; b += c[2];
    }
    return [Math.round(r / (N * N)), Math.round(g / (N * N)), Math.round(b / (N * N))];
  };
}

for (const size of [192, 512]) {
  const file = `icon-${size}.png`;
  fs.writeFileSync(file, png(size, draw(size)));
  console.log('OK  ' + file);
}
