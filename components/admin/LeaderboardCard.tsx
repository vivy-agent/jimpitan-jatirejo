"use client";

import { useEffect, useState } from "react";

type LeaderboardItem = {
  admin_name?: string;
  admin_email?: string;
  image?: string;
  role?: string;
  uang_bulan?: number;
  total_uang?: number;
  jumlah_scan?: number;
  jumlah_transaksi?: number;
  jumlah_scan_bulan?: number;
  total_scan?: number;
  scan_count?: number;
};

export default function LeaderboardCard() {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/leaderboard", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((res) => {
        if (Array.isArray(res)) {
          setData(res);
        } else {
          setData([]);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  const getRank = (index: number) => {
    if (index === 0) return "1";
    if (index === 1) return "2";
    if (index === 2) return "3";

    return index + 1;
  };

  const getJumlahScan = (item: LeaderboardItem) => {
    return (
      item.jumlah_scan ||
      item.jumlah_transaksi ||
      item.total_scan ||
      item.scan_count ||
      0
    );
  };

  const sortedData = [...data].sort(
    (a, b) => Number(b.total_uang || 0) - Number(a.total_uang || 0)
  );

  const maxTotal = Math.max(
    ...sortedData.map((item) => Number(item.total_uang || 0)),
    1
  );

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <div>
          <p>Petugas Aktif</p>
          <h3>Kontribusi Petugas</h3>
        </div>

        <span>{sortedData.length}</span>
      </div>

      {loading ? (
        <div className="empty-box">
          <div className="spinner" />
          <p>Memuat kontribusi petugas...</p>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="empty-box">
          <div>📭</div>
          <p>Belum ada data kontribusi petugas aktif.</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {sortedData.map((item, index) => {
            const totalUang = Number(item.total_uang || 0);
            const uangBulan = Number(item.uang_bulan || 0);
            const width = Math.max((totalUang / maxTotal) * 100, 5);
            const jumlahScan = getJumlahScan(item);

            return (
              <div key={`${item.admin_email || item.admin_name}-${index}`} className="leader-row">
                <div className="leader-top">
                  <div className="leader-left">
                    <div className={index === 0 ? "rank rank-top" : "rank"}>
                      {getRank(index)}
                    </div>

                    <img
                      src={
                        item.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          item.admin_name || "Petugas"
                        )}`
                      }
                      alt="avatar"
                      className="avatar"
                    />

                    <div className="leader-name">
                      <h4>{item.admin_name || "Petugas"}</h4>

                      <p>
                        Bulan ini: {formatRupiah(uangBulan)}
                        {jumlahScan ? ` • ${jumlahScan} transaksi` : ""}
                      </p>
                    </div>
                  </div>

                  <strong>{formatRupiah(totalUang)}</strong>
                </div>

                <div className="progress-bg">
                  <div className="progress-fill" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .leaderboard-card {
          position: relative;
          z-index: 2;
          margin-top: 14px;
          padding: 17px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
        }

        .leaderboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .leaderboard-header p {
          margin: 0;
          font-size: 11px;
          color: #64748b;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .leaderboard-header h3 {
          margin: 4px 0 0;
          font-size: 17px;
          color: #111827;
          font-weight: 900;
        }

        .leaderboard-header > span {
          min-width: 34px;
          height: 34px;
          border-radius: 14px;
          background: #eff6ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
        }

        .empty-box {
          margin-top: 14px;
          padding: 22px 12px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          text-align: center;
        }

        .empty-box div {
          font-size: 24px;
        }

        .empty-box p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .spinner {
          width: 30px;
          height: 30px;
          margin: 0 auto;
          border-radius: 999px;
          border: 4px solid #dbeafe;
          border-top-color: #1677ff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .leaderboard-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .leader-row {
          padding: 13px;
          border-radius: 19px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .leader-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .leader-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .rank {
          width: 30px;
          height: 30px;
          border-radius: 12px;
          background: #eff6ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .rank-top {
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          box-shadow: 0 8px 20px rgba(22, 119, 255, 0.2);
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 13px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .leader-name {
          min-width: 0;
        }

        .leader-name h4 {
          margin: 0;
          font-size: 13px;
          color: #111827;
          font-weight: 900;
          line-height: 1.3;
          word-break: break-word;
        }

        .leader-name p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.4;
        }

        .leader-top strong {
          color: #111827;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .progress-bg {
          margin-top: 10px;
          height: 7px;
          background: #e8eefb;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 7px;
          background: linear-gradient(90deg, #1677ff, #38bdf8);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
