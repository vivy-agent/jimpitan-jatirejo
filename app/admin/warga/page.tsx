"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

export default function WargaPage() {
  const { data: session } = useSession();

  const role = (session?.user as any)?.role;
  const isMaster = role === "master";

  const [data, setData] = useState<any[]>([]);
  const [nama, setNama] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTambah, setLoadingTambah] = useState(false);

  // ================= FETCH DATA =================
  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/warga");
      const result = await res.json();

      if (Array.isArray(result)) {
        setData(result);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ================= STATISTIK =================
  const totalWarga = data.length;
  const totalAktif = data.filter((item) => item.status === "aktif").length;
  const totalNonaktif = data.filter((item) => item.status !== "aktif").length;

  // ================= SEARCH =================
  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase();

    return data.filter((item) => {
      const namaWarga = item.nama?.toLowerCase() || "";
      const kodeWarga = item.kode_unik?.toLowerCase() || "";

      return namaWarga.includes(keyword) || kodeWarga.includes(keyword);
    });
  }, [data, search]);

  // ================= FORMAT TANGGAL =================
  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return "-";

    const date = new Date(tanggal);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ================= TAMBAH WARGA =================
  const handleTambah = async () => {
    if (!isMaster) {
      alert("Hanya Master Admin yang boleh menambahkan warga");
      return;
    }

    if (!nama || !tanggalMulai) {
      alert("Lengkapi nama warga dan tanggal mulai");
      return;
    }

    try {
      setLoadingTambah(true);

      const res = await fetch("/api/admin/warga", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama,
          tanggal_mulai: tanggalMulai,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Warga berhasil ditambahkan");

        setNama("");
        setTanggalMulai("");
        setShowForm(false);

        fetchData();
      } else {
        alert(result.message || "Gagal menambahkan warga");
      }
    } catch (err) {
      alert("Terjadi kesalahan");
    } finally {
      setLoadingTambah(false);
    }
  };

  // ================= EDIT WARGA =================
  const handleEdit = async (item: any) => {
    if (!isMaster) {
      alert("Hanya Master Admin yang boleh mengedit warga");
      return;
    }

    const namaBaru = prompt("Nama baru:", item.nama);

    if (!namaBaru) return;

    const tanggalBaru = prompt(
      "Tanggal mulai (YYYY-MM-DD):",
      item.tanggal_mulai?.slice(0, 10)
    );

    if (!tanggalBaru) return;

    try {
      const res = await fetch("/api/admin/warga", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          nama: namaBaru,
          tanggal_mulai: tanggalBaru,
          status: item.status,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Gagal mengedit warga");
        return;
      }

      fetchData();
    } catch (err) {
      alert("Terjadi kesalahan saat mengedit warga");
    }
  };

  // ================= AKTIF / NONAKTIFKAN =================
  const handleToggleStatus = async (item: any) => {
    if (!isMaster) {
      alert("Hanya Master Admin yang boleh mengubah status warga");
      return;
    }

    const newStatus = item.status === "aktif" ? "nonaktif" : "aktif";

    try {
      const res = await fetch("/api/admin/warga", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          nama: item.nama,
          tanggal_mulai: item.tanggal_mulai,
          status: newStatus,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Gagal mengubah status warga");
        return;
      }

      fetchData();
    } catch (err) {
      alert("Terjadi kesalahan saat mengubah status warga");
    }
  };

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

        {/* HEADER */}
        <div className="header">
          <button
            type="button"
            onClick={() => (window.location.href = "/admin")}
            className="back-btn"
          >
            ←
          </button>

          <div className="header-text">
            <p>Sistem Jimpitan</p>
            <h1>Manajemen Warga</h1>
          </div>

          <div className="role-badge">
            {isMaster ? "Admin" : "Petugas"}
          </div>
        </div>

        {/* SUMMARY */}
        <div className="summary-card">
          <div className="summary-top">
            <div>
              <p className="mini-title">Data Warga</p>
              <h2>Desa Jatirejo</h2>
            </div>

            <div className="home-icon">🏘️</div>
          </div>

          <div className="stats-row">
            <div className="stat-box">
              <p>Total</p>
              <h3 className="blue">{totalWarga}</h3>
            </div>

            <div className="stat-box">
              <p>Aktif</p>
              <h3 className="green">{totalAktif}</h3>
            </div>

            <div className="stat-box">
              <p>Nonaktif</p>
              <h3 className="red">{totalNonaktif}</h3>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Cari nama atau kode warga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TOMBOL TAMBAH KHUSUS MASTER */}
        {isMaster && (
          <div className="add-card">
            <div>
              <h3>Tambah Warga</h3>
              <p>Tambahkan data warga baru untuk membuat QR pembayaran.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Tutup" : "+ Tambah"}
            </button>
          </div>
        )}

        {/* FORM TAMBAH KHUSUS MASTER */}
        {isMaster && showForm && (
          <div className="form-card">
            <input
              type="text"
              placeholder="Nama warga"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />

            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
            />

            <button
              type="button"
              onClick={handleTambah}
              disabled={loadingTambah}
            >
              {loadingTambah ? "Menyimpan..." : "Simpan Warga"}
            </button>
          </div>
        )}

        {/* INFO PETUGAS */}
        {!isMaster && (
          <div className="info-card">
            <div>ℹ️</div>

            <p>
              Petugas hanya dapat melihat data dan detail warga. Tambah, edit,
              dan ubah status hanya dapat dilakukan oleh Master Admin.
            </p>
          </div>
        )}

        {/* LIST WARGA */}
        <div className="list-card">
          <div className="list-header">
            <div>
              <p>Daftar Warga</p>
              <h3>{search ? "Hasil Pencarian" : "Semua Warga"}</h3>
            </div>

            <span>{filteredData.length}</span>
          </div>

          {loadingData ? (
            <div className="empty-box">
              <div>⏳</div>
              <h3>Memuat data...</h3>
              <p>Mohon tunggu sebentar.</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="empty-box">
              <div>🔎</div>
              <h3>Data tidak ditemukan</h3>
              <p>Coba gunakan nama atau kode warga lain.</p>
            </div>
          ) : (
            <div className="warga-list">
              {filteredData.map((item, index) => {
                const isAktif = item.status === "aktif";

                return (
                  <div key={index} className="warga-card">
                    <div className="warga-main">
                      <div className="avatar">
                        {item.nama?.charAt(0)?.toUpperCase() || "W"}
                      </div>

                      <div className="warga-info">
                        <div className="warga-name-row">
                          <h3>{item.nama}</h3>

                          <span
                            className={
                              isAktif
                                ? "status-badge aktif"
                                : "status-badge nonaktif"
                            }
                          >
                            {isAktif ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>

                        <p className="kode">JTR-{item.kode_unik}</p>

                        <p className="tanggal">
                          Mulai: {formatTanggal(item.tanggal_mulai)}
                        </p>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="detail-btn"
                        onClick={() =>
                          (window.location.href = `/admin/warga/${item.id}`)
                        }
                      >
                        Detail
                      </button>

                      {isMaster && (
                        <>
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={
                              isAktif ? "status-btn danger" : "status-btn safe"
                            }
                            onClick={() => handleToggleStatus(item)}
                          >
                            {isAktif ? "Nonaktif" : "Aktif"}
                          </button>
                        </>
                      )}
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

        .summary-card {
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

        .summary-top {
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

        .summary-card h2 {
          margin: 5px 0 0;
          font-size: 26px;
          color: #111827;
          font-weight: 900;
        }

        .home-icon {
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

        .stats-row {
          margin-top: 18px;
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

        .add-card {
          position: relative;
          z-index: 2;
          margin-top: 16px;
          padding: 16px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }

        .add-card h3 {
          margin: 0;
          font-size: 15px;
          color: #111827;
          font-weight: 900;
        }

        .add-card p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.5;
          color: #64748b;
        }

        .add-card button {
          border: none;
          border-radius: 16px;
          padding: 12px 14px;
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 10px 20px rgba(22, 119, 255, 0.22);
        }

        .form-card {
          position: relative;
          z-index: 2;
          margin-top: 12px;
          padding: 18px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
        }

        .form-card input {
          width: 100%;
          padding: 15px;
          border-radius: 16px;
          border: 1px solid #dbe4f0;
          background: #f9fbff;
          color: #111827;
          outline: none;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .form-card button {
          width: 100%;
          padding: 15px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(180deg, #22c55e, #16a34a);
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .info-card {
          position: relative;
          z-index: 2;
          margin-top: 16px;
          padding: 14px;
          border-radius: 20px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .info-card p {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #64748b;
          font-weight: 600;
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

        .list-header span {
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

        .warga-list {
          margin-top: 16px;
        }

        .warga-card {
          padding: 15px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
          margin-bottom: 12px;
        }

        .warga-main {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .warga-info {
          flex: 1;
          min-width: 0;
        }

        .warga-name-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .warga-name-row h3 {
          margin: 0;
          font-size: 16px;
          color: #111827;
          font-weight: 900;
          line-height: 1.3;
        }

        .status-badge {
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-badge.aktif {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .status-badge.nonaktif {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        .kode {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .tanggal {
          margin: 4px 0 0;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }

        .card-actions {
          margin-top: 14px;
          display: flex;
          gap: 8px;
        }

        .card-actions button {
          flex: 1;
          padding: 11px;
          border-radius: 14px;
          border: none;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .detail-btn {
          background: rgba(22, 119, 255, 0.09);
          color: #1677ff;
        }

        .edit-btn {
          background: #f59e0b;
          color: #ffffff;
        }

        .status-btn.danger {
          background: #ef4444;
          color: #ffffff;
        }

        .status-btn.safe {
          background: #22c55e;
          color: #ffffff;
        }
      `}</style>
    </>
  );
}