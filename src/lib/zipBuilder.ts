import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { EditState } from '../types'
import { applyEdits } from './applyEdits'
import { rasterizeSvg } from './svgRasterizer'
import { generateIco } from './icoGenerator'

const README = `What's in this zip and what do I do with it?

favicon.ico
Drop this file in the root folder of your website. This is the main favicon
that shows up in browser tabs. Most website builders let you upload this directly
in their settings.

favicon.svg  (only included if you uploaded an SVG)
Modern browsers (Chrome, Firefox, Safari) support SVG favicons and scale them
perfectly at any size. Add to your <head>:
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

browsers/
Use these PNG files if your website builder asks for a PNG favicon instead of an
.ico file. Use favicon-48x48.png for the best quality — it's the minimum size
Google recommends for favicons.

ios/
This is what shows up when someone saves your website to their iPhone or iPad home
screen. Place it in your website's root folder and add this line to your HTML <head>:
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

android/
Same idea but for Android devices and Progressive Web Apps (PWAs). Add these lines
to your HTML <head>:
<link rel="icon" sizes="192x192" href="/android/android-chrome-192x192.png">
<link rel="icon" sizes="512x512" href="/android/android-chrome-512x512.png">

Not sure where to start? Just use the favicon.ico file. It covers most cases.`

async function getImageEl(state: EditState, size: number): Promise<HTMLImageElement | HTMLCanvasElement> {
  if (state.svgString) {
    return rasterizeSvg(state.svgString, size)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = state.imageDataUrl!
  })
}

function renderToCanvas(
  imageEl: HTMLImageElement | HTMLCanvasElement,
  state: EditState,
  size: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  applyEdits(ctx, imageEl, state, size)
  return canvas
}

function canvasToBase64Png(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png')
  const parts = dataUrl.split(',')
  return parts[1] ?? ''
}

export async function buildFaviconZip(state: EditState): Promise<void> {
  async function renderSize(size: number): Promise<HTMLCanvasElement> {
    const imgEl = await getImageEl(state, size)
    return renderToCanvas(imgEl, state, size)
  }

  const [c16, c32, c48, c96, c180, c192, c256, c512] = await Promise.all([
    renderSize(16),
    renderSize(32),
    renderSize(48),
    renderSize(96),
    renderSize(180),
    renderSize(192),
    renderSize(256),
    renderSize(512),
  ])

  // ICO: 16, 32, 48, 256 — covers all Windows / browser legacy cases
  const icoBlob = await generateIco([c16, c32, c48, c256])

  const zip = new JSZip()
  zip.file('favicon.ico', icoBlob)
  zip.file('README.txt', README)

  // Export original SVG if the input was SVG (best quality for modern browsers)
  if (state.svgString) {
    zip.file('favicon.svg', state.svgString)
  }

  const browsers = zip.folder('browsers')!
  browsers.file('favicon-16x16.png', canvasToBase64Png(c16), { base64: true })
  browsers.file('favicon-32x32.png', canvasToBase64Png(c32), { base64: true })
  // 48×48 is Google's recommended minimum favicon size
  browsers.file('favicon-48x48.png', canvasToBase64Png(c48), { base64: true })
  // 96×96 is a 2× retina version of the Google minimum
  browsers.file('favicon-96x96.png', canvasToBase64Png(c96), { base64: true })

  const ios = zip.folder('ios')!
  ios.file('apple-touch-icon.png', canvasToBase64Png(c180), { base64: true })

  const android = zip.folder('android')!
  android.file('android-chrome-192x192.png', canvasToBase64Png(c192), { base64: true })
  android.file('android-chrome-512x512.png', canvasToBase64Png(c512), { base64: true })

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  saveAs(blob, 'favicon-export.zip')
}
