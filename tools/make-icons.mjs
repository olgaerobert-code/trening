// Generuje icon-192.png i icon-512.png — sztanga na ciemnym tle.
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

const BG = [14, 17, 22];
const FG = [78, 163, 255];

// Sztanga: gryf przez srodek + po dwa talerze z kazdej strony.
function draw(size) {
  const u = size / 32;                       // jednostka siatki 32×32
  const inRect = (x, y, a, b, c, d) => x >= a * u && x < c * u && y >= b * u && y < d * u;
  return (x, y) => {
    const bar = inRect(x, y, 4, 15, 28, 17);
    const inner = inRect(x, y, 6, 11, 9, 21) || inRect(x, y, 23, 11, 26, 21);
    const outer = inRect(x, y, 3, 13, 5.5, 19) || inRect(x, y, 26.5, 13, 29, 19);
    return bar || inner || outer ? FG : BG;
  };
}

for (const size of [192, 512]) {
  const file = `icon-${size}.png`;
  fs.writeFileSync(file, png(size, draw(size)));
  console.log('OK  ' + file);
}
