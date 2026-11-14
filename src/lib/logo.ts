// Logo: simpan gambar asli yang sudah diperkecil (JPEG kecil), lalu saat cetak
// diubah ke hitam-putih (dithering) sesuai lebar kertas printer thermal.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("Gambar tidak bisa dibaca. Coba gambar lain (JPG atau PNG)."));
    im.src = src;
  });
}

/** Perkecil ke maks 480px, latar putih (PNG transparan jadi putih), JPEG ringan (~20-50 KB). */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImage(url);
    const s = Math.min(1, 480 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * s));
    const h = Math.max(1, Math.round(im.naturalHeight * s));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, h);
    g.drawImage(im, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface Bitmap {
  dotWidth: number;
  h: number;
  bpr: number;
  data: Uint8Array;
}

/**
 * Ubah logo jadi bitmap 1-bit selebar kertas (dotWidth), logo di tengah.
 * logoW = lebar logo dalam titik. Floyd-Steinberg supaya foto/gradasi tetap terbaca.
 */
export async function logoBitmap(dataUrl: string, dotWidth: number, logoW: number, maxH = 170): Promise<Bitmap> {
  const im = await loadImage(dataUrl);
  const s = Math.min(logoW / im.naturalWidth, maxH / im.naturalHeight);
  const w = Math.max(1, Math.round(im.naturalWidth * s));
  const h = Math.max(1, Math.round(im.naturalHeight * s));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  g.drawImage(im, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < w * h; i++) {
    const v = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    gray[i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = Math.max(1, hi - lo); // regangkan kontras
  for (let i = 0; i < gray.length; i++) gray[i] = ((gray[i] - lo) / span) * 255;
  const black = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i];
      const nv = old < 128 ? 0 : 255;
      const err = old - nv;
      black[i] = nv === 0 ? 1 : 0;
      if (x + 1 < w) gray[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) gray[i + w - 1] += (err * 3) / 16;
        gray[i + w] += (err * 5) / 16;
        if (x + 1 < w) gray[i + w + 1] += err / 16;
      }
    }
  }
  const bpr = Math.ceil(dotWidth / 8);
  const left = Math.floor((dotWidth - w) / 2);
  const data = new Uint8Array(bpr * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (black[y * w + x]) {
        const X = left + x;
        data[y * bpr + (X >> 3)] |= 0x80 >> (X & 7);
      }
    }
  }
  return { dotWidth, h, bpr, data };
}

/** Gambar bitmap 1-bit ke PNG untuk pratinjau (persis seperti yang akan tercetak). */
export function bitmapToUrl(b: Bitmap): string {
  const c = document.createElement("canvas");
  c.width = b.dotWidth;
  c.height = b.h;
  const g = c.getContext("2d")!;
  const img = g.createImageData(b.dotWidth, b.h);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.dotWidth; x++) {
      const on = b.data[y * b.bpr + (x >> 3)] & (0x80 >> (x & 7));
      const o = (y * b.dotWidth + x) * 4;
      const v = on ? 0 : 255;
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}
