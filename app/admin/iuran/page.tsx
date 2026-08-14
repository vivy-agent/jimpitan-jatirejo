"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

export default function IuranPage() {
  const { data: session } = useSession();

  const role = (session?.user as any)?.role;
  const isMaster = role === "master";

  const [warga, setWarga] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());

  const [showFAB, setShowFAB] = useState(true);
  const [lastPaid, setLastPaid] = useState<string | null>(null);

  // ================= GET PERIODE AKTIF =================
  const getPeriodeAktif = async () => {
    try {
      const res = await fetch("/api/periode", {
        cache: "no-store",
      });

      const data = await res.json();

      const tahun = Number(data?.tahun_aktif) || new Date().getFullYear();

      setTahunAktif(tahun);

      return tahun;
    } catch (err) {
      const tahun = new Date().getFullYear();

      setTahunAktif(tahun);

      return tahun;
    }
  };

  // ================= HITUNG TUNGGAKAN PERIODE =================
  const hitungTunggakanPeriode = (
    itemWarga: any,
    totalBayar: number,
    tahun: number
  ) => {
    const iuranMingguan = 2000;

    const mulaiWarga = new Date(itemWarga.tanggal_mulai);
    const sekarang = new Date();

    const tahunSekarang = sekarang.getFullYear();

    const awalPeriode = new Date(tahun, 0, 1);

    let akhirPeriode: Date;

    if (tahun < tahunSekarang) {
      akhirPeriode = new Date(tahun, 11, 31, 23, 59, 59);
    } else if (tahun === tahunSekarang) {
      akhirPeriode = sekarang;
    } else {
      // Jika periode aktif adalah tahun depan, tunggakan belum berjalan.
      akhirPeriode = new Date(tahun, 0, 1);
    }

    const mulaiHitung =
      mulaiWarga > awalPeriode ? mulaiWarga : awalPeriode;

    const periodeSudahBerjalan = tahun <= tahunSekarang;

    if (akhirPeriode < mulaiHitung) {
      return 0;
    }

    const selisihMinggu = Math.floor(
      (akhirPeriode.getTime() - mulaiHitung.getTime()) /
        (1000 * 60 * 60 * 24 * 7)
    );

    const totalSeharusnya = selisihMinggu * iuranMingguan;

    let tunggakan = Math.floor(
      (totalSeharusnya - totalBayar) / iuranMingguan
    );

    // FIX warga baru:
    // Jika periode sudah berjalan dan warga baru belum genap 7 hari,
    // tetap muncul 1x iuran seperti alur sebelumnya.
    if (tunggakan <= 0 && periodeSudahBerjalan) {
      const selisihHari = Math.floor(
        (akhirPeriode.getTime() - mulaiHitung.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (selisihHari < 7 && totalBayar === 0) {
        tunggakan = 1;
      }
    }

    return Math.max(0, tunggakan);
  };

  // ================= FETCH DATA =================
  const fetchData = async (options?: { silent?: boolean }) => {
    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoadingData(true);
      }

      const periode = await getPeriodeAktif();

      const res = await fetch("/api/warga/list");
      const data = await res.json();

      if (!Array.isArray(data)) {
        setWarga([]);
        return;
      }

      const hasil = await Promise.all(
        data.map(async (w: any) => {
          const resTotal = await fetch(
            `/api/transaksi/total?nama=${encodeURIComponent(w.nama)}`
          );

          const totalData = await resTotal.json();
          const totalBayar = Number(totalData.total || 0);

          const tunggakan = hitungTunggakanPeriode(
            w,
            totalBayar,
            periode
          );

          return {
            ...w,
            totalBayar,
            tahunAktif: periode,
            tunggakan,
            nominalTunggakan: Math.max(0, tunggakan) * 2000,
          };
        })
      );

      setWarga(hasil);
    } catch (err) {
      console.error(err);
      setWarga([]);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const last = localStorage.getItem("lastPaidWarga");

    if (last) {
      setLastPaid(last);

      setTimeout(() => {
        localStorage.removeItem("lastPaidWarga");
        setLastPaid(null);
      }, 3000);
    }
  }, []);


  // ================= SCROLL FAB =================
  useEffect(() => {
    let lastScroll = 0;

    const handleScroll = () => {
      const currentScroll = window.scrollY;

      if (currentScroll > lastScroll) {
        setShowFAB(false);
      } else {
        setShowFAB(true);
      }

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ================= FORMAT RUPIAH =================
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // ================= STATISTIK =================
  const totalWarga = warga.length;
  const totalLunas = warga.filter((w) => w.tunggakan === 0).length;
  const totalMenunggak = warga.filter((w) => w.tunggakan > 0).length;

  const totalNominalTunggakan = warga.reduce(
    (total, item) => total + (item.nominalTunggakan || 0),
    0
  );

  // ================= SEARCH + FILTER =================
  const filtered = useMemo(() => {
    return warga.filter((w) => {
      const keyword = search.toLowerCase();
      const nama = w.nama?.toLowerCase() || "";
      const kode = w.kode_unik?.toLowerCase() || "";

      const cocokSearch = nama.includes(keyword) || kode.includes(keyword);

      const cocokStatus =
        filterStatus === "semua" ||
        (filterStatus === "lunas" && w.tunggakan === 0) ||
        (filterStatus === "menunggak" && w.tunggakan > 0);

      return cocokSearch && cocokStatus;
    });
  }, [warga, search, filterStatus]);

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

        {/* HEADER */}
        <div className="header">
          <button
            type="button"
            className="back-btn"
            onClick={() => (window.location.href = "/admin")}
          >
            ←
          </button>

          <div className="header-text">
            <p>Sistem Jimpitan</p>
            <h1>Iuran Warga</h1>
          </div>

          <div className="role-badge">
            {isMaster ? "Admin" : "Petugas"}
          </div>
        </div>

        {/* HERO COMPACT */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Monitoring Iuran</p>
              <h2>Status Pembayaran</h2>
            </div>

            <div className="hero-icon">💳</div>
          </div>

          <div className="saldo-box">
            <p>Total Tunggakan</p>
            <h3>{formatRupiah(totalNominalTunggakan)}</h3>
            <span>Rp2.000 / minggu • Periode {tahunAktif}</span>
          </div>

          <div className="stats-row">
            <div className="stat-box">
              <p>Total</p>
              <h3 className="blue">{totalWarga}</h3>
            </div>

            <div className="stat-box">
              <p>Lunas</p>
              <h3 className="green">{totalLunas}</h3>
            </div>

            <div className="stat-box">
              <p>Menunggak</p>
              <h3 className="red">{totalMenunggak}</h3>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Cari warga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTER */}
        <div className="filter-row">
          <button
            type="button"
            onClick={() => setFilterStatus("semua")}
            className={filterStatus === "semua" ? "active" : ""}
          >
            Semua
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus("lunas")}
            className={filterStatus === "lunas" ? "active green-active" : ""}
          >
            Lunas
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus("menunggak")}
            className={filterStatus === "menunggak" ? "active red-active" : ""}
          >
            Menunggak
          </button>
        </div>

        {/* LIST */}
        <div className="list-card">
          <div className="list-header">
            <div>
              <p>Data Pembayaran Periode {tahunAktif}</p>
              <h3>{search ? "Hasil Pencarian" : "Daftar Iuran"}</h3>
            </div>

            <div className="list-actions">
              <button
                type="button"
                className="refresh-btn"
                onClick={() => fetchData({ silent: true })}
                disabled={refreshing || loadingData}
              >
                {refreshing ? "Update..." : "Refresh"}
              </button>

              <span>{filtered.length}</span>
            </div>
          </div>

          {loadingData ? (
            <div className="empty-box">
              <div>⏳</div>
              <h3>Memuat data...</h3>
              <p>Mohon tunggu sebentar.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-box">
              <div>🔎</div>
              <h3>Data tidak ditemukan</h3>
              <p>Coba gunakan nama atau kode warga lain.</p>
            </div>
          ) : (
            <div className="iuran-list">
              {filtered.map((w, i) => {
                const isLastPaid = w.nama === lastPaid;
                const isLunas = w.tunggakan === 0;

                return (
                  <div
                    key={w.id || i}
                    className={`iuran-card ${isLastPaid ? "last-paid" : ""}`}
                    onClick={() =>
                      (window.location.href = `/admin/warga/${w.id}`)
                    }
                  >
                    <div className="iuran-top">
                      <div className="warga-left">
                        <div className={isLunas ? "avatar lunas" : "avatar menunggak"}>
                          {w.nama?.charAt(0)?.toUpperCase() || "W"}
                        </div>

                        <div>
                          <h3>{w.nama}</h3>

                          <p>
                            {w.kode_unik ? `JTR-${w.kode_unik}` : "Data warga"}
                          </p>

                          {isLastPaid && (
                            <span className="last-paid-text">✔ Baru dibayar</span>
                          )}
                        </div>
                      </div>

                      <div className={isLunas ? "status lunas" : "status menunggak"}>
                        {isLunas ? "Lunas" : `${w.tunggakan}x`}
                      </div>
                    </div>

                    <div className="payment-row">
                      <div>
                        <p>Terbayar</p>
                        <h4>{formatRupiah(w.totalBayar || 0)}</h4>
                      </div>

                      <div>
                        <p>Tunggakan</p>
                        <h4 className={isLunas ? "green-text" : "red-text"}>
                          {isLunas
                            ? "Tidak ada"
                            : formatRupiah(w.nominalTunggakan || 0)}
                        </h4>
                      </div>
                    </div>

                    <div className="card-footer">
                      <span>Klik untuk detail</span>
                      <strong>Detail →</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FAB KHUSUS MASTER */}
      {isMaster && (
        <div className={showFAB ? "fab show" : "fab hide"}>
          <button
            type="button"
            onClick={() => (window.location.href = "/admin/warga")}
          >
            +
          </button>
        </div>
      )}

      <BottomNav />

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 20px;
          padding-bottom: 120px;
          background: #f4f8ff;
          background-image: radial-gradient(
            rgba(37, 99, 235, 0.05) 1px,
            transparent 1px
          );
          background-size: 18px 18px;
          color: #111827;
          position: relative;
          overflow: hidden;
        }

        .blue-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 220px;
          background: linear-gradient(
            180deg,
            #0f6fff 0%,
            #1677ff 70%,
            rgba(22, 119, 255, 0.04) 100%
          );
          border-bottom-left-radius: 34px;
          border-bottom-right-radius: 34px;
          z-index: 0;
        }

        .header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .back-btn {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
          font-size: 22px;
          cursor: pointer;
        }

        .header-text {
          flex: 1;
          min-width: 0;
        }

        .header-text p {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.78);
          font-weight: 700;
        }

        .header-text h1 {
          margin: 2px 0 0;
          font-size: 22px;
          color: #ffffff;
          font-weight: 900;
        }

        .role-badge {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .hero-card {
          position: relative;
          z-index: 2;
          margin-top: 22px;
          padding: 20px;
          border-radius: 28px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.14);
          color: #111827;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .mini-title {
          margin: 0;
          font-size: 13px;
          color: #1677ff;
          font-weight: 800;
        }

        .hero-card h2 {
          margin: 5px 0 0;
          font-size: 25px;
          color: #111827;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .hero-icon {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: #eaf4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .saldo-box {
          margin-top: 16px;
          padding: 16px;
          border-radius: 20px;
          background: linear-gradient(180deg, #f8fbff, #eef6ff);
          border: 1px solid #dbeafe;
        }

        .saldo-box p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .saldo-box h3 {
          margin: 4px 0 0;
          font-size: 22px;
          color: #111827;
          font-weight: 900;
        }

        .saldo-box span {
          display: inline-flex;
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #1677ff;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }

        .stats-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .stat-box {
          padding: 12px 8px;
          border-radius: 18px;
          background: #f6faff;
          border: 1px solid #e5efff;
          text-align: center;
        }

        .stat-box p {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
        }

        .stat-box h3 {
          margin: 5px 0 0;
          font-size: 22px;
          font-weight: 900;
        }

        .blue {
          color: #1677ff;
        }

        .green {
          color: #16a34a;
        }

        .red {
          color: #dc2626;
        }

        .search-box {
          position: relative;
          z-index: 2;
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-box input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #111827;
          font-size: 14px;
          font-weight: 600;
        }

        .search-box input::placeholder {
          color: #9ca3af;
        }

        .filter-row {
          position: relative;
          z-index: 2;
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .filter-row button {
          padding: 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .filter-row button.active {
          background: #1677ff;
          color: #ffffff;
          border-color: #1677ff;
        }

        .filter-row button.green-active {
          background: #16a34a;
          border-color: #16a34a;
        }

        .filter-row button.red-active {
          background: #dc2626;
          border-color: #dc2626;
        }

        .list-card {
          position: relative;
          z-index: 2;
          margin-top: 18px;
          padding: 18px;
          border-radius: 26px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
          color: #111827;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .list-header p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .list-header h3 {
          margin: 3px 0 0;
          font-size: 19px;
          color: #111827;
          font-weight: 900;
        }

        .list-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .refresh-btn {
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: none;
          background: #eff6ff;
          color: #1677ff;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .refresh-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .list-actions span {
          min-width: 34px;
          height: 34px;
          border-radius: 14px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 14px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-box {
          margin-top: 16px;
          padding: 26px 14px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          text-align: center;
        }

        .empty-box h3 {
          margin: 8px 0 0;
          font-size: 15px;
          color: #111827;
          font-weight: 900;
        }

        .empty-box p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .iuran-list {
          margin-top: 16px;
        }

        .iuran-card {
          padding: 15px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .iuran-card.last-paid {
          background: #ecfdf5;
          border-color: #22c55e;
          transform: scale(1.01);
        }

        .iuran-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .warga-left {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          min-width: 0;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .avatar.lunas {
          background: linear-gradient(180deg, #22c55e, #16a34a);
        }

        .avatar.menunggak {
          background: linear-gradient(180deg, #ef4444, #dc2626);
        }

        .warga-left h3 {
          margin: 0;
          font-size: 16px;
          color: #111827;
          font-weight: 900;
          line-height: 1.3;
        }

        .warga-left p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .last-paid-text {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: #16a34a;
          font-weight: 800;
        }

        .status {
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status.lunas {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .status.menunggak {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        .payment-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .payment-row div {
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .payment-row p {
          margin: 0;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 800;
        }

        .payment-row h4 {
          margin: 5px 0 0;
          font-size: 13px;
          color: #111827;
          font-weight: 900;
        }

        .green-text {
          color: #16a34a !important;
        }

        .red-text {
          color: #dc2626 !important;
        }

        .card-footer {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-footer span {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 700;
        }

        .card-footer strong {
          font-size: 13px;
          color: #1677ff;
          font-weight: 900;
        }

        .fab {
          position: fixed;
          right: 20px;
          bottom: 92px;
          z-index: 999;
          transition: all 0.3s ease;
        }

        .fab.show {
          opacity: 1;
          transform: translateY(0);
        }

        .fab.hide {
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
        }

        .fab button {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(180deg, #22c55e, #16a34a);
          color: #ffffff;
          font-size: 34px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(34, 197, 94, 0.35);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
          }

          70% {
            box-shadow: 0 0 0 14px rgba(34, 197, 94, 0);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
      `}</style>
    </>
  );
}