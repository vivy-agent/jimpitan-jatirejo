"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import TargetCard from "@/components/admin/TargetCard";
import LeaderboardCard from "@/components/admin/LeaderboardCard";

type UserData = {
  name: string;
  email?: string;
  role: "master" | "admin" | string;
  status: "approved" | "pending" | string;
};

type StatistikData = {
  total: number;
  bulan: number;
};

type GrafikItem = {
  bulan: string;
  total: number;
};

type KasData = {
  ringkasan?: {
    saldo_kas: number;
    total_pemasukan: number;
    total_pengeluaran: number;
    total_pemasukan_periode?: number;
    total_pengeluaran_periode?: number;
  };
};

const namaBulanPendek = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export default function AdminPage() {
  const { data: session, status } = useSession();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [statistik, setStatistik] = useState<StatistikData>({
    total: 0,
    bulan: 0,
  });

  const [grafik, setGrafik] = useState<GrafikItem[]>([]);
  const [kas, setKas] = useState<KasData | null>(null);

  const isMaster = userData?.role === "master";

  const now = new Date();
  const bulanSekarang = now.getMonth() + 1;
  const tahunSekarang = now.getFullYear();

  // ================= USER =================
  useEffect(() => {
    if (!session?.user?.email) return;

    fetch(`/api/user?email=${session.user.email}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        setUserData(data);
        setLoadingUser(false);
      })
      .catch(() => {
        setLoadingUser(false);
      });
  }, [session]);

  // ================= STATISTIK ADMIN =================
  useEffect(() => {
    if (!session?.user?.email) return;

    fetch(`/api/admin/statistik?email=${session.user.email}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        setStatistik({
          total: Number(data.total) || 0,
          bulan: Number(data.bulan) || 0,
        });
      });
  }, [session]);

  // ================= GRAFIK PEMASUKAN =================
  useEffect(() => {
    fetch("/api/admin/grafik", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGrafik(data);
        }
      });
  }, []);

  // ================= DATA KAS =================
  useEffect(() => {
    if (!session) return;

    fetch(`/api/kas?bulan=${bulanSekarang}&tahun=${tahunSekarang}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => setKas(data));
  }, [session, bulanSekarang, tahunSekarang]);

  // ================= FORMAT =================
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  const formatBulan = (bulan: string) => {
    const [year, month] = bulan.split("-");
    const indexBulan = Number(month) - 1;

    return `${namaBulanPendek[indexBulan] || month} ${year}`;
  };

  const grafikRingkas = [...grafik]
    .sort((a, b) => String(b.bulan).localeCompare(String(a.bulan)))
    .slice(0, 4)
    .reverse();

  const maxGrafik = Math.max(
    ...grafikRingkas.map((item) => Number(item.total) || 0),
    1
  );

  const goTo = (path: string) => {
    window.location.href = path;
  };

  // ================= LOADING =================
  if (status === "loading") {
    return <LoadingScreen text="Memuat sesi..." />;
  }

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-bg" />

        <div className="login-card">
          <div className="login-logo">J</div>

          <h1>Sistem Jimpitan</h1>

          <p>Silakan login menggunakan akun Google untuk melanjutkan.</p>

          <button
            type="button"
            onClick={() => (window.location.href = "/api/auth/signin/google")}
          >
            Login dengan Google
          </button>
        </div>

        <style jsx>{loginStyle}</style>
      </div>
    );
  }

  if (loadingUser) {
    return <LoadingScreen text="Memuat data user..." />;
  }

  if (userData?.status !== "approved") {
    return (
      <div className="waiting-page">
        <div className="waiting-card">
          <div>⏳</div>
          <h2>Akun menunggu persetujuan</h2>
          <p>Silakan hubungi Master Admin agar akun kamu disetujui.</p>
        </div>

        <style jsx>{waitingStyle}</style>
      </div>
    );
  }

  return (
    <>
      <div className="page">
        <div className="top-bg" />

        {/* ================= HEADER ================= */}
        <div className="topbar">
          <button type="button" className="logout-btn" onClick={() => signOut()}>
            ⎋
          </button>

          <div className="topbar-title">
            <p>Jimpitan Jatirejo</p>
            <h1>Dashboard</h1>
          </div>

          <img
            src={session.user?.image || "https://ui-avatars.com/api/?name=Admin"}
            alt="avatar"
            className="avatar"
          />
        </div>

        {/* ================= HERO ================= */}
        <div className="hero-card">
          <div className="hero-main">
            <p className="hero-mini">Selamat datang 👋</p>

            <h2>{userData?.name || "Admin"}</h2>

            <span>{isMaster ? "Master Admin" : "Petugas Jimpitan"}</span>
          </div>

          <button
            type="button"
            className="hero-action"
            onClick={() => goTo(isMaster ? "/admin/warga" : "/admin/scan")}
          >
            {isMaster ? "Kelola Warga" : "Mulai Scan"}
          </button>
        </div>

        {/* ================= STAT RINGKAS ================= */}
        <div className="summary-grid">
          <div className="summary-card blue">
            <p>Setoran Akun</p>
            <h3>{formatRupiah(statistik.total)}</h3>
            <span>Total uang yang dicatat akun ini</span>
          </div>

          <div className="summary-card">
            <p>Bulan Ini</p>
            <h3>{formatRupiah(statistik.bulan)}</h3>
            <span>Pemasukan akun bulan berjalan</span>
          </div>
        </div>

        {/* ================= KAS BERJALAN ================= */}
        <div className="kas-card">
          <div className="section-title">
            <div>
              <p>Keuangan Kas</p>
              <h3>Saldo Kas Berjalan</h3>
            </div>

            <button type="button" onClick={() => goTo("/admin/kas")}>
              Detail
            </button>
          </div>

          <h2>{formatRupiah(kas?.ringkasan?.saldo_kas || 0)}</h2>

          <div className="kas-mini-grid">
            <div>
              <span>Total Masuk</span>
              <strong className="green">
                {formatRupiah(kas?.ringkasan?.total_pemasukan || 0)}
              </strong>
            </div>

            <div>
              <span>Total Keluar</span>
              <strong className="red">
                {formatRupiah(kas?.ringkasan?.total_pengeluaran || 0)}
              </strong>
            </div>
          </div>
        </div>

        {/* ================= MENU CEPAT ================= */}
        <div className="quick-card">
          <div className="section-title">
            <div>
              <p>Akses Cepat</p>
              <h3>Menu Utama</h3>
            </div>
          </div>

          <div className="quick-grid">
            {!isMaster && (
              <button type="button" onClick={() => goTo("/admin/scan")}>
                <span>⌁</span>
                <p>Scan</p>
              </button>
            )}

            <button type="button" onClick={() => goTo("/admin/iuran")}>
              <span>◎</span>
              <p>Iuran</p>
            </button>

            <button type="button" onClick={() => goTo("/admin/kas")}>
              <span>◈</span>
              <p>Kas</p>
            </button>

            <button type="button" onClick={() => goTo("/admin/report")}>
              <span>▣</span>
              <p>Report</p>
            </button>

            <button type="button" onClick={() => goTo("/admin/warga")}>
              <span>⌂</span>
              <p>Warga</p>
            </button>
          </div>
        </div>

        {/* ================= TARGET TAHUNAN ================= */}
        <TargetCard />

        {/* ================= MASTER MENU ================= */}
        {isMaster && (
          <div className="master-card">
            <div className="section-title master-title">
              <div>
                <p>Master Access</p>
                <h3>Panel Kontrol Admin</h3>
              </div>

              <span className="master-badge">MASTER</span>
            </div>

            <div className="master-grid">
              <button
                type="button"
                onClick={() => goTo("/admin/approval")}
              >
                <span>✓</span>
                <div>
                  <h4>Approval Admin</h4>
                  <p>Setujui akun petugas</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => goTo("/admin/admins")}
              >
                <span>👥</span>
                <div>
                  <h4>Kelola Admin</h4>
                  <p>Data akun petugas</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => goTo("/admin/transaksi")}
              >
                <span>↕</span>
                <div>
                  <h4>Semua Transaksi</h4>
                  <p>Riwayat pembayaran</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => goTo("/admin/periode")}
              >
                <span>⧉</span>
                <div>
                  <h4>Kelola Periode</h4>
                  <p>Tahun aktif sistem</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ================= PEMASUKAN RINGKAS ================= */}
        <div className="chart-card">
          <div className="section-title">
            <div>
              <p>Ringkasan</p>
              <h3>Pemasukan 4 Bulan Terakhir</h3>
            </div>
          </div>

          {grafikRingkas.length === 0 ? (
            <div className="empty-box">
              <div>📭</div>
              <p>Belum ada data pemasukan.</p>
            </div>
          ) : (
            <div className="mini-chart">
              {grafikRingkas.map((item) => {
                const total = Number(item.total) || 0;
                const height = Math.max((total / maxGrafik) * 78, 12);

                return (
                  <div key={item.bulan} className="chart-item">
                    <div className="bar-wrap">
                      <div className="bar" style={{ height: `${height}px` }} />
                    </div>

                    <span>{formatBulan(item.bulan)}</span>
                    <strong>{formatRupiah(total)}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= LEADERBOARD SEMUA PETUGAS ================= */}
        <LeaderboardCard />
      </div>

      <BottomNav />

      <style jsx>{dashboardStyle}</style>
    </>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="loading-page">
      <div className="spinner" />
      <p>{text}</p>

      <style jsx>{`
        .loading-page {
          min-height: 100vh;
          background: #f4f8ff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }

        .spinner {
          width: 34px;
          height: 34px;
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
      `}</style>
    </div>
  );
}

/* ================= LOGIN STYLE ================= */

const loginStyle = `
  .login-page {
    min-height: 100vh;
    background: #f4f8ff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    overflow: hidden;
  }

  .login-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 280px;
    background: linear-gradient(180deg, #0f6fff 0%, #1677ff 70%, transparent 100%);
    border-bottom-left-radius: 40px;
    border-bottom-right-radius: 40px;
  }

  .login-card {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 360px;
    background: #ffffff;
    border-radius: 30px;
    padding: 30px 24px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(37, 99, 235, 0.12);
  }

  .login-logo {
    width: 76px;
    height: 76px;
    border-radius: 24px;
    margin: 0 auto;
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #ffffff;
    font-weight: 900;
    box-shadow: 0 12px 30px rgba(37, 99, 235, 0.28);
  }

  .login-card h1 {
    margin: 20px 0 0;
    font-size: 27px;
    font-weight: 900;
    color: #111827;
  }

  .login-card p {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: #64748b;
  }

  .login-card button {
    margin-top: 22px;
    width: 100%;
    padding: 15px;
    border-radius: 18px;
    border: none;
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    color: #ffffff;
    font-weight: 900;
    font-size: 15px;
    cursor: pointer;
  }
`;

/* ================= WAITING STYLE ================= */

const waitingStyle = `
  .waiting-page {
    min-height: 100vh;
    background: #f4f8ff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .waiting-card {
    width: 100%;
    max-width: 360px;
    background: #ffffff;
    border-radius: 28px;
    padding: 26px;
    text-align: center;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  }

  .waiting-card div {
    font-size: 38px;
  }

  .waiting-card h2 {
    margin: 12px 0 0;
    font-size: 22px;
    color: #111827;
  }

  .waiting-card p {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: #64748b;
  }
`;

/* ================= DASHBOARD STYLE ================= */

const dashboardStyle = `
  .page {
    min-height: 100vh;
    padding: 18px;
    padding-bottom: 118px;
    background: #f4f8ff;
    background-image: radial-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px);
    background-size: 18px 18px;
    color: #111827;
    position: relative;
    overflow: hidden;
  }

  .top-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 174px;
    background: linear-gradient(180deg, #0f6fff 0%, #1677ff 70%, rgba(22, 119, 255, 0.04) 100%);
    border-bottom-left-radius: 32px;
    border-bottom-right-radius: 32px;
    z-index: 0;
  }

  .topbar {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logout-btn {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
    font-size: 20px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .topbar-title {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .topbar-title p {
    margin: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.78);
    font-weight: 800;
  }

  .topbar-title h1 {
    margin: 2px 0 0;
    color: #ffffff;
    font-size: 21px;
    font-weight: 900;
  }

  .avatar {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }

  .hero-card,
  .summary-card,
  .kas-card,
  .quick-card,
  .master-card,
  .chart-card {
    position: relative;
    z-index: 2;
    background: #ffffff;
    border-radius: 24px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  }

  .hero-card {
    margin-top: 20px;
    padding: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    box-shadow: 0 18px 40px rgba(37, 99, 235, 0.14);
  }

  .hero-main {
    min-width: 0;
  }

  .hero-mini {
    margin: 0;
    font-size: 12px;
    color: #1677ff;
    font-weight: 900;
  }

  .hero-card h2 {
    margin: 5px 0 0;
    font-size: 21px;
    color: #111827;
    line-height: 1.15;
    font-weight: 900;
  }

  .hero-card span {
    display: inline-flex;
    margin-top: 9px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1677ff;
    font-size: 11px;
    font-weight: 900;
  }

  .hero-action {
    border: none;
    border-radius: 15px;
    padding: 12px 14px;
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .summary-grid {
    position: relative;
    z-index: 2;
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .summary-card {
    padding: 15px;
  }

  .summary-card.blue {
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    color: #ffffff;
  }

  .summary-card p {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .summary-card.blue p {
    color: rgba(255, 255, 255, 0.8);
  }

  .summary-card h3 {
    margin: 7px 0 0;
    font-size: 17px;
    color: #111827;
    font-weight: 900;
    line-height: 1.25;
  }

  .summary-card.blue h3 {
    color: #ffffff;
  }

  .summary-card span {
    display: block;
    margin-top: 6px;
    color: #94a3b8;
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1.4;
  }

  .summary-card.blue span {
    color: rgba(255, 255, 255, 0.72);
  }

  .kas-card,
  .quick-card,
  .master-card,
  .chart-card {
    margin-top: 14px;
    padding: 17px;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .section-title p {
    margin: 0;
    font-size: 11px;
    color: #64748b;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .section-title h3 {
    margin: 4px 0 0;
    font-size: 17px;
    color: #111827;
    font-weight: 900;
  }

  .section-title button {
    border: none;
    border-radius: 999px;
    padding: 8px 11px;
    background: #eff6ff;
    color: #1677ff;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .kas-card h2 {
    margin: 15px 0 0;
    font-size: 27px;
    color: #111827;
    font-weight: 900;
    letter-spacing: -0.5px;
  }

  .kas-mini-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .kas-mini-grid div {
    padding: 12px;
    border-radius: 17px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
  }

  .kas-mini-grid span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .kas-mini-grid strong {
    display: block;
    margin-top: 5px;
    font-size: 13px;
    font-weight: 900;
  }

  .green {
    color: #16a34a;
  }

  .red {
    color: #dc2626;
  }

  .quick-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
  }

  .quick-grid button {
    border: none;
    border-radius: 18px;
    padding: 13px 8px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
    cursor: pointer;
  }

  .quick-grid span {
    width: 34px;
    height: 34px;
    margin: 0 auto;
    border-radius: 13px;
    background: #eff6ff;
    color: #1677ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .quick-grid p {
    margin: 7px 0 0;
    color: #111827;
    font-size: 11px;
    font-weight: 900;
  }

  .master-card {
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    border: none;
    color: #ffffff;
  }

  .master-card .section-title p,
  .master-card .section-title h3 {
    color: #ffffff;
  }

  .master-badge {
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
    font-size: 11px;
    font-weight: 900;
  }

  .master-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .master-grid button {
    min-height: 112px;
    border: none;
    border-radius: 18px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    text-align: left;
    cursor: pointer;
  }

  .master-grid span {
    width: 36px;
    height: 36px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
  }

  .master-grid h4 {
    margin: 10px 0 0;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.3;
  }

  .master-grid p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.74);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.4;
  }

  .mini-chart {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    align-items: end;
  }

  .chart-item {
    text-align: center;
    min-width: 0;
  }

  .bar-wrap {
    height: 86px;
    border-radius: 16px;
    background: #eff6ff;
    display: flex;
    align-items: end;
    justify-content: center;
    padding: 5px;
  }

  .bar {
    width: 100%;
    border-radius: 12px;
    background: linear-gradient(180deg, #22c55e, #16a34a);
  }

  .chart-item span {
    display: block;
    margin-top: 7px;
    color: #64748b;
    font-size: 10px;
    font-weight: 900;
  }

  .chart-item strong {
    display: block;
    margin-top: 3px;
    color: #111827;
    font-size: 10px;
    font-weight: 900;
    line-height: 1.25;
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
`;
