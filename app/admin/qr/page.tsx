"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRPage() {
  const [warga, setWarga] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/warga")
      .then((res) => res.json())
      .then((data) => setWarga(data));
  }, []);

  const downloadQR = (kode: string) => {
    const canvas = document.getElementById(kode) as HTMLCanvasElement;
    const url = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = url;
    link.download = `${kode}.png`;
    link.click();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Manajemen QR Warga</h1>
      <p style={{ color: "gray" }}>
        Download dan cetak QR untuk setiap rumah
      </p>

      {warga.map((item, index) => (
        <div
          key={index}
          style={{
            marginTop: "20px",
            padding: "15px",
            border: "1px solid #ccc",
            borderRadius: "10px",
          }}
        >
          <p><strong>{item.nama}</strong></p>
          <p style={{ fontSize: "12px", color: "gray" }}>
            {item.kode_unik}
          </p>

          <div style={{ marginTop: "10px" }}>
            <QRCodeCanvas
              id={item.kode_unik}
              value={item.kode_unik}
              size={120}
            />
          </div>

          <button
            onClick={() => downloadQR(item.kode_unik)}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              backgroundColor: "blue",
              color: "white",
              border: "none",
              borderRadius: "6px",
            }}
          >
            Download QR
          </button>
        </div>
      ))}
    </div>
  );
}