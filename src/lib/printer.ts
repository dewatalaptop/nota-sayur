// Web Bluetooth (BLE) -> printer thermal ESC/POS. Di iPhone butuh browser Bluefy;
// Safari iOS tidak punya Web Bluetooth.
let ch: BluetoothRemoteGATTCharacteristic | null = null;
let dev: BluetoothDevice | null = null;

export const btSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;
export const btConnected = () => !!(dev?.gatt?.connected && ch);
export const btName = () => dev?.name ?? "";

async function findWritable(server: BluetoothRemoteGATTServer) {
  for (const s of await server.getPrimaryServices()) {
    for (const c of await s.getCharacteristics()) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  return null;
}

export async function btConnect(): Promise<string> {
  if (!btSupported()) throw new Error("Browser ini tidak mendukung Bluetooth. Buka aplikasi di Bluefy (iPhone) atau Chrome (Android).");
  try {
    const services = ["000018f0-0000-1000-8000-00805f9b34fb", "0000ff00-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455", "e7810a71-73ae-499d-8c15-faa9aef0c3f2"];
    dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: services });
    const server = await dev.gatt!.connect();
    ch = await findWritable(server);
    if (!ch) { dev.gatt!.disconnect(); throw new Error("Perangkat ini bukan printer yang didukung (tidak ada jalur tulis)."); }
    dev.addEventListener("gattserverdisconnected", () => { ch = null; });
    return dev.name ?? "Printer";
  } catch (e: any) {
    if (e?.name === "NotFoundError") throw new Error("Pemilihan printer dibatalkan.");
    throw new Error(e?.message || "Gagal terhubung ke printer.");
  }
}

export async function btPrint(bytes: Uint8Array) {
  if (!btConnected()) {
    if (dev?.gatt) { const s = await dev.gatt.connect(); ch = await findWritable(s); }
    if (!ch) throw new Error("Printer belum terhubung.");
  }
  const size = 120; // aman di bawah MTU umum; nota gambar ~30-40 KB
  try {
    for (let i = 0; i < bytes.length; i += size) {
      const part = bytes.slice(i, i + size);
      if (ch!.properties.writeWithoutResponse) await ch!.writeValueWithoutResponse(part);
      else await ch!.writeValue(part);
      await new Promise((r) => setTimeout(r, 14));
    }
  } catch {
    throw new Error("Cetak terputus di tengah jalan, nota mungkin tercetak sebagian. Coba cetak ulang.");
  }
}
