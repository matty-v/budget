import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, 'icon.svg');
const publicDir = join(__dirname, '..', 'public');

const svgBuffer = readFileSync(svgPath);

// Generate 32x32 favicon
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(join(publicDir, 'favicon.png'));

console.log('Generated favicon.png (32x32)');
