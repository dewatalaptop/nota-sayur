import { useEffect, useMemo, useState } from "react";
import { NotaPrint, Paper, dotsFor, logoDotsFor, notaLines } from "./lib/escpos";
import { renderReceipt } from "./lib/receiptImage";
import { Bitmap, bitmapToUrl, logoBitmap } from "./lib/logo";

/** Logo hitam-putih persis seperti yang akan tercetak (dipakai pratinjau & cetak). */
export function useLogoBitmap(logo: string | undefined, paper: Paper) {
  const [bm, setBm] = useState<Awaited<ReturnType<typeof logoBitmap>> | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    let dead = false;
    if (!logo) {
      setBm(null);
      setUrl("");
      return;
    }
    logoBitmap(logo, dotsFor(paper), logoDotsFor(paper))
      .then((b) => {
        if (!dead) {
          setBm(b);
          setUrl(bitmapToUrl(b));
        }
      })
      .catch(() => {
        if (!dead) {
          setBm(null);
          setUrl("");
        }
      });
    return () => {
      dead = true;
    };
  }, [logo, paper]);
  return { bm, url };
}

/** Pratinjau nota: sama persis dengan hasil cetak (dari notaLines yang sama). */
export function Receipt({ data, paper, logoUrl }: { data: NotaPrint; paper: Paper; logoUrl: string }) {
  return (
    <div className="receipt-wrap">
      <div className="receipt" style={{ width: `${paper + 4}ch` }}>
        {logoUrl && <img src={logoUrl} alt="Logo" className="receipt-logo" />}
        {notaLines(data, paper).map((l, i) => (
          <div key={i} className={`rl${l.b ? " rb" : ""}${l.big ? " rbig" : ""}`} style={{ textAlign: l.a === "c" ? "center" : "left" }}>
            {l.t || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Nota-gambar: bitmap yang akan dicetak + pratinjau PNG yang persis sama. */
export function useReceiptImage(data: NotaPrint, paper: Paper, logo: Bitmap | null) {
  const key = JSON.stringify([data.shop.name, data.shop.address, data.shop.phone, data.buyer, data.no, data.date.getTime(), data.items, data.paid]);
  return useMemo(() => {
    try {
      const bm = renderReceipt(data, dotsFor(paper), logo);
      return { bm, url: bitmapToUrl(bm) };
    } catch {
      return { bm: null as Bitmap | null, url: "" };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, paper, logo]);
}

export function ReceiptImage({ url, paper }: { url: string; paper: Paper }) {
  return (
    <div className="receipt-wrap">
      <img src={url} alt="Pratinjau nota" className="receipt-img" style={{ maxWidth: paper === 32 ? 384 : 576 }} />
    </div>
  );
}
