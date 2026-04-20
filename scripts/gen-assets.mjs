import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="18"/>
      <feOffset dx="0" dy="14"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g filter="url(#shadow)">
    <text x="512" y="512" font-family="Hiragino Sans, Yu Gothic, sans-serif" font-size="640" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="central">絆</text>
  </g>
</svg>`;

const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="white"/>
  <g transform="translate(1366, 1366)">
    <circle r="340" fill="#3B82F6"/>
    <text x="0" y="0" font-family="Hiragino Sans, Yu Gothic, sans-serif" font-size="420" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="central">絆</text>
  </g>
  <text x="1366" y="1900" font-family="Hiragino Sans, Yu Gothic, sans-serif" font-size="90" font-weight="700" fill="#1F2937" text-anchor="middle">Kizuna</text>
</svg>`;

const splashDarkSvg = splashSvg
  .replace('fill="white"', 'fill="#0B1220"')
  .replace('fill="#1F2937"', 'fill="#E5E7EB"');

await mkdir(resolve(root, 'resources'), { recursive: true });

await sharp(Buffer.from(iconSvg)).png().toFile(resolve(root, 'resources/icon.png'));
await sharp(Buffer.from(iconSvg)).png().toFile(resolve(root, 'resources/icon-foreground.png'));

const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#3B82F6"/></svg>`;
await sharp(Buffer.from(bgSvg)).png().toFile(resolve(root, 'resources/icon-background.png'));

await sharp(Buffer.from(splashSvg)).png().toFile(resolve(root, 'resources/splash.png'));
await sharp(Buffer.from(splashDarkSvg)).png().toFile(resolve(root, 'resources/splash-dark.png'));

console.log('Assets generated in ./resources/');
