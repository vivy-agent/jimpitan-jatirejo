"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

type LoginUser = {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type TransaksiItem = {
  id: number;
  nama_warga: string;
  jumlah: number;
  tanggal: string;
  admin_name?: string | null;
  admin_email?: string | null;
};

type SummaryData = {
  tahun_aktif: number;
  total_transaksi: number;
  total_uang: number;
};

export default function TransaksiPage() {
  const { data: session, status } = useSession();

  const [userData, setUserData] = useState<LoginUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [data, setData] = useState<TransaksiItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    tahun_aktif: new Date().getFullYear(),
    total_transaksi: 0,
    total_uang: 0,
  });

  const [search, setSearch] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [quickFilter, setQuickFilter] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const isMaster = userData?.role === "master";

  // ================= USER LOGIN =================
  useEffect(() => {
    if (!session?.user?.email) return;

    fetch(`/api/user?email=${session.user.email}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => setUserData(data))
      .catch(() => setUserData(null))
      .finally(() => setLoadingUser(false));
  }, [session]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  const formatTanggal = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchData = async (options?: {
    searchValue?: string;
    filterValue?: string;
    startValue?: string;
    endValue?: string;
  }) => {
    try {
      setLoading(true);

      const finalSearch =
        options?.searchValue !== undefined ? options.searchValue : search;

      const finalFilter =
        options?.filterValue !== undefined ? options.filterValue : quickFilter;

      const finalStart =
        options?.startValue !== undefined ? options.startValue : start;

      const finalEnd = options?.endValue !== undefined ? options.endValue : end;

      const params = new URLSearchParams();

      if (finalSearch.trim()) params.set("search", finalSearch.trim());
      if (finalStart) params.set("start", finalStart);
      if (finalEnd) params.set("end", finalEnd);
      if (finalFilter) params.set("filter", finalFilter);

      const res = await fetch(`/api/admin/transaksi?${params.toString()}`, {
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Gagal mengambil transaksi");
        setData([]);
        return;
      }

      if (Array.isArray(result)) {
        setData(result);
        setSummary({
          tahun_aktif: new Date().getFullYear(),
          total_transaksi: result.length,
          total_uang: result.reduce(
            (total, item) => total + Number(item.jumlah || 0),
            0
          ),
        });
        return;
      }

      setData(Array.isArray(result.data) ? result.data : []);

      setSummary({
        tahun_aktif: Number(result.tahun_aktif) || new Date().getFullYear(),
        total_transaksi: Number(result.summary?.total_transaksi || 0),
        total_uang: Number(result.summary?.total_uang || 0),
      });
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === "master") {
      fetchData();
    }
  }, [userData]);

  const handleQuickFilter = (value: string) => {
    setQuickFilter(value);

    if (value !== "custom") {
      setStart("");
      setEnd("");

      fetchData({
        filterValue: value,
        startValue: "",
        endValue: "",
      });

      return;
    }

    fetchData({
      filterValue: value,
    });
  };

  const handleResetFilter = () => {
    setSearch("");
    setStart("");
    setEnd("");
    setQuickFilter("semua");

    fetchData({
      searchValue: "",
      filterValue: "semua",
      startValue: "",
      endValue: "",
    });
  };

  // ================= DELETE =================
  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Hapus transaksi ini?");
    if (!confirmDelete) return;

    try {
      setActionId(id);

      const res = await fetch("/api/admin/transaksi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Gagal menghapus transaksi");
        return;
      }

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menghapus transaksi");
    } finally {
      setActionId(null);
    }
  };

  // ================= EDIT =================
  const handleEdit = async (id: number, currentJumlah: number) => {
    const newJumlah = prompt("Masukkan jumlah baru:", currentJumlah.toString());

    if (!newJumlah) return;

    const nominal = Number(newJumlah);

    if (isNaN(nominal) || nominal <= 0) {
      alert("Nominal tidak valid");
      return;
    }

    if (nominal % 2000 !== 0) {
      alert("Nominal harus kelipatan Rp2.000");
      return;
    }

    try {
      setActionId(id);

      const res = await fetch("/api/admin/transaksi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          jumlah: nominal,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Gagal mengubah transaksi");
        return;
      }

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengubah transaksi");
    } finally {
      setActionId(null);
    }
  };

  const filteredInfo = useMemo(() => {
    if (quickFilter === "hari_ini") return "Hari ini";
    if (quickFilter === "bulan_ini") return "Bulan ini";
    if (quickFilter === "custom") return "Filter tanggal";
    return "Periode aktif";
  }, [quickFilter]);

  const rataRata = useMemo(() => {
    if (!summary.total_transaksi) return 0;

    return Math.round(summary.total_uang / summary.total_transaksi);
  }, [summary]);

  if (status === "loading" || loadingUser) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat halaman transaksi...</p>

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
            font-weight: 800;
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

  if (!isMaster) {
    return (
      <div className="deny-page">
        <div className="deny-card">
          <div>!</div>
          <h2>Akses Ditolak</h2>
          <p>Halaman Semua Transaksi hanya dapat dibuka oleh Master Admin.</p>

          <button type="button" onClick={() => (window.location.href = "/admin")}>
            Kembali Dashboard
          </button>
        </div>

        <style jsx>{`
          .deny-page {
            min-height: 100vh;
            background: #f4f8ff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .deny-card {
            width: 100%;
            max-width: 340px;
            background: #ffffff;
            border-radius: 28px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          }

          .deny-card div {
            width: 56px;
            height: 56px;
            margin: 0 auto;
            border-radius: 20px;
            background: #fee2e2;
            color: #dc2626;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            font-weight: 900;
          }

          .deny-card h2 {
            margin: 14px 0 0;
            color: #111827;
            font-size: 20px;
            font-weight: 900;
          }

          .deny-card p {
            margin: 7px 0 0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.6;
            font-weight: 700;
          }

          .deny-card button {
            width: 100%;
            margin-top: 18px;
            padding: 14px;
            border: none;
            border-radius: 18px;
            background: linear-gradient(180deg, #111827, #1f2937);
            color: #ffffff;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

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
            <p>Periode {summary.tahun_aktif}</p>
            <h1>Semua Transaksi</h1>
          </div>

          <div className="count-badge">{summary.total_transaksi}</div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Total Pemasukan</p>
              <h2>{formatRupiah(summary.total_uang)}</h2>
              <span>{filteredInfo}</span>
            </div>

            <div className="hero-icon">↕</div>
          </div>

          <div className="summary-grid">
            <div>
              <p>Transaksi</p>
              <strong>{summary.total_transaksi}</strong>
            </div>

            <div>
              <p>Rata-rata</p>
              <strong>{formatRupiah(rataRata)}</strong>
            </div>

            <div>
              <p>Tahun</p>
              <strong>{summary.tahun_aktif}</strong>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div className="filter-card">
          <div className="section-title">
            <div>
              <p>Filter Data</p>
              <h3>Cari Transaksi</h3>
            </div>

            <button type="button" onClick={handleResetFilter}>
              Reset
            </button>
          </div>

          <div className="search-box">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Cari warga, petugas, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchData();
              }}
            />
          </div>

          <div className="quick-filter">
            <button
              type="button"
              className={quickFilter === "semua" ? "active" : ""}
              onClick={() => handleQuickFilter("semua")}
            >
              Semua
            </button>

            <button
              type="button"
              className={quickFilter === "hari_ini" ? "active" : ""}
              onClick={() => handleQuickFilter("hari_ini")}
            >
              Hari Ini
            </button>

            <button
              type="button"
              className={quickFilter === "bulan_ini" ? "active" : ""}
              onClick={() => handleQuickFilter("bulan_ini")}
            >
              Bulan Ini
            </button>

            <button
              type="button"
              className={quickFilter === "custom" ? "active" : ""}
              onClick={() => setQuickFilter("custom")}
            >
              Custom
            </button>
          </div>

          {quickFilter === "custom" && (
            <div className="date-filter">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />

              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          )}

          <button type="button" className="filter-btn" onClick={() => fetchData()}>
            Terapkan Filter
          </button>
        </div>

        {/* LIST */}
        <div className="list-card">
          <div className="section-title">
            <div>
              <p>Riwayat</p>
              <h3>Daftar Transaksi</h3>
            </div>

            <span>{data.length}</span>
          </div>

          {loading ? (
            <div className="empty-box">
              <div className="small-spinner" />
              <h4>Memuat transaksi...</h4>
              <p>Mohon tunggu sebentar.</p>
            </div>
          ) : data.length === 0 ? (
            <div className="empty-box">
              <div>📭</div>
              <h4>Tidak ada transaksi</h4>
              <p>Belum ada transaksi pada filter ini.</p>
            </div>
          ) : (
            <div className="transaksi-list">
              {data.map((item) => {
                const isBusy = actionId === item.id;

                return (
                  <div key={item.id} className="transaksi-card">
                    <div className="trx-top">
                      <div className="trx-left">
                        <div className="trx-icon">Rp</div>

                        <div className="trx-info">
                          <h3>{item.nama_warga}</h3>

                          <p>{formatTanggal(item.tanggal)}</p>

                          <span>{item.admin_name || "Petugas"}</span>
                        </div>
                      </div>

                      <strong>{formatRupiah(Number(item.jumlah || 0))}</strong>
                    </div>

                    <div className="action-row">
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => handleEdit(item.id, item.jumlah)}
                        disabled={isBusy}
                      >
                        {isBusy ? "..." : "Edit"}
                      </button>

                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => handleDelete(item.id)}
                        disabled={isBusy}
                      >
                        {isBusy ? "..." : "Hapus"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
          height: 210px;
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
          flex-shrink: 0;
        }

        .header-text {
          flex: 1;
          min-width: 0;
          text-align: center;
        }

        .header-text p {
          margin: 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.78);
          font-weight: 800;
        }

        .header-text h1 {
          margin: 2px 0 0;
          color: #ffffff;
          font-size: 21px;
          font-weight: 900;
        }

        .count-badge {
          min-width: 42px;
          height: 42px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .hero-card,
        .filter-card,
        .list-card {
          position: relative;
          z-index: 2;
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
        }

        .hero-card {
          margin-top: 22px;
          padding: 18px;
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.14);
        }

        .hero-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .mini-title {
          margin: 0;
          color: #1677ff;
          font-size: 12px;
          font-weight: 900;
        }

        .hero-card h2 {
          margin: 5px 0 0;
          color: #111827;
          font-size: 27px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .hero-card span {
          display: inline-flex;
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 11px;
          font-weight: 900;
        }

        .hero-icon {
          width: 50px;
          height: 50px;
          border-radius: 18px;
          background: #eaf4ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .summary-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .summary-grid div {
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .summary-grid p {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .summary-grid strong {
          display: block;
          margin-top: 5px;
          color: #111827;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.25;
        }

        .filter-card,
        .list-card {
          margin-top: 14px;
          padding: 17px;
        }

        .section-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .section-title p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .section-title h3 {
          margin: 4px 0 0;
          color: #111827;
          font-size: 17px;
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

        .section-title span {
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

        .search-box {
          margin-top: 14px;
          padding: 13px 14px;
          border-radius: 19px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
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
          font-weight: 700;
        }

        .search-box input::placeholder {
          color: #9ca3af;
        }

        .quick-filter {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .quick-filter button {
          padding: 10px 6px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .quick-filter button.active {
          background: #1677ff;
          color: #ffffff;
          border-color: #1677ff;
        }

        .date-filter {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .date-filter input {
          width: 100%;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid #dbe4f0;
          background: #ffffff;
          color: #111827;
          font-size: 12px;
          font-weight: 800;
          outline: none;
        }

        .filter-btn {
          margin-top: 11px;
          width: 100%;
          padding: 13px;
          border-radius: 17px;
          border: none;
          background: linear-gradient(180deg, #111827, #1f2937);
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
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

        .empty-box h4 {
          margin: 7px 0 0;
          color: #111827;
          font-size: 14px;
          font-weight: 900;
        }

        .empty-box p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .small-spinner {
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

        .transaksi-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .transaksi-card {
          padding: 13px;
          border-radius: 19px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .trx-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .trx-left {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .trx-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: #eff6ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .trx-info {
          min-width: 0;
        }

        .trx-info h3 {
          margin: 0;
          color: #111827;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 900;
          word-break: break-word;
        }

        .trx-info p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
          font-weight: 700;
        }

        .trx-info span {
          display: inline-flex;
          margin-top: 6px;
          padding: 5px 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 10px;
          font-weight: 900;
        }

        .trx-top strong {
          color: #111827;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .action-row {
          margin-top: 11px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .action-row button {
          padding: 10px;
          border: none;
          border-radius: 999px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .action-row button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .edit-btn {
          background: #f59e0b;
        }

        .delete-btn {
          background: #dc2626;
        }
      `}</style>
    </>
  );
}
