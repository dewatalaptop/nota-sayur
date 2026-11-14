import { useEffect, useState } from "react";
import { NotaPrint, Paper, dotsFor, logoDotsFor, notaLines } from "./lib/escpos";
import { bitmapToUrl, logoBitmap } from "./lib/logo";

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
