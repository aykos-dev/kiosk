/**
 * Builds bellissimo-icon.ico and install-loading.gif from bellissimo-icon.png.
 * Run before Windows packaging (see npm run generate:win-assets).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'assets/images/bellissimo-icon.png');
const icoOut = path.join(root, 'assets/images/bellissimo-icon.ico');
const gifOut = path.join(root, 'assets/images/install-loading.gif');

async function main() {
  if (!fs.existsSync(pngPath)) {
    throw new Error(`Missing source PNG: ${pngPath}`);
  }

  // png-to-ico v3 is ESM-only and requires a square PNG
  const { default: pngToIco } = await import('png-to-ico');

  const tmpSquare = path.join(os.tmpdir(), `bellissimo-ico-square-${Date.now()}.png`);
  await sharp(pngPath)
    .resize(256, 256, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(tmpSquare);

  try {
    const icoBuf = await pngToIco(tmpSquare);
    fs.writeFileSync(icoOut, icoBuf);
  } finally {
    try {
      fs.unlinkSync(tmpSquare);
    } catch {
      /* ignore */
    }
  }

  await sharp(pngPath)
    .resize(480, 400, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .gif()
    .toFile(gifOut);

  console.log('Wrote', path.relative(root, icoOut), path.relative(root, gifOut));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
