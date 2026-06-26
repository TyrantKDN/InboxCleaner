import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('build', { recursive: true })
const svg = readFileSync('build/icon.svg')

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = []
for (const size of icoSizes) {
  pngs.push(await sharp(svg).resize(size, size).png().toBuffer())
}

writeFileSync('build/icon.ico', await pngToIco(pngs))
writeFileSync('build/icon.png', await sharp(svg).resize(512, 512).png().toBuffer())
console.log('Wrote build/icon.ico and build/icon.png')
