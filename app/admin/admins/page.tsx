"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

type LoginUser = {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type AdminUser = {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  role: "master" | "admin" | string;
  status: "approved" | "pending" | string;
};

export default function AdminsPage() {
  const { data: session, status } = useSession();

  const [userData, setUserData] = useState<LoginUser | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [actionEmail, setActionEmail] = useState("");

  const isMaster = userData?.role === "master";

  // ================= LOGIN =================
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

  // ================= FETCH ADMINS =================
  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);

      const res = await fetch("/api/admins", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setAdmins([]);
        return;
      }

      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (userData?.role === "master") {
      fetchAdmins();
    }
  }, [userData]);

  // ================= TOGGLE STATUS =================
  const toggleStatus = async (email: string, currentStatus: string) => {
    const newStatus = currentStatus === "approved" ? "pending" : "approved";

    const confirmText =
      newStatus === "pending"
        ? "Nonaktifkan petugas ini? Akun tidak bisa digunakan sampai diaktifkan kembali."
        : "Aktifkan kembali petugas ini?";

    const ok = confirm(confirmText);
    if (!ok) return;

    try {
      setActionEmail(email);

      const res = await fetch("/api/admin/toggle-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          status: newStatus,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.message || "Gagal mengubah status admin");
        return;
      }

      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengubah status");
    } finally {
      setActionEmail("");
    }
  };

  // ================= DELETE ADMIN =================
  const deleteAdmin = async (email: string, statusAdmin: string) => {
    if (statusAdmin === "approved") {
      alert("Nonaktifkan petugas terlebih dahulu sebelum menghapus akun.");
      return;
    }

    const ok = confirm(
      `Hapus akun ${email}? Akun ini akan hilang dari daftar admin.`
    );

    if (!ok) return;

    try {
      setActionEmail(email);

      const res = await fetch("/api/admins", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.message || "Gagal menghapus admin");
        return;
      }

      alert("Akun petugas berhasil dihapus");
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menghapus admin");
    } finally {
      setActionEmail("");
    }
  };

  const activeAdmins = admins.filter(
    (item) => item.role === "admin" && item.status === "approved"
  ).length;

  const inactiveAdmins = admins.filter(
    (item) => item.role === "admin" && item.status !== "approved"
  ).length;

  const masterCount = admins.filter((item) => item.role === "master").length;

  // ================= LOADING =================
  if (status === "loading" || loadingUser) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat data admin...</p>

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

  // ================= BLOCK =================
  if (!isMaster) {
    return (
      <div className="deny-page">
        <div className="deny-card">
          <div>!</div>
          <h2>Akses Ditolak</h2>
          <p>Halaman ini hanya dapat dibuka oleh Master Admin.</p>

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
            <p>Master Panel</p>
            <h1>Kelola Admin</h1>
          </div>

          <div className="count-badge">{admins.length}</div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Akun Petugas</p>
              <h2>Manajemen Admin</h2>
              <span>
                Atur akun petugas jimpitan. Petugas nonaktif tidak dihitung
                pada leaderboard dan bisa dihapus.
              </span>
            </div>

            <div className="hero-icon">👥</div>
          </div>

          <div className="summary-grid">
            <div>
              <p>Aktif</p>
              <strong>{activeAdmins}</strong>
            </div>

            <div>
              <p>Nonaktif</p>
              <strong>{inactiveAdmins}</strong>
            </div>

            <div>
              <p>Master</p>
              <strong>{masterCount}</strong>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="list-card">
          <div className="section-title">
            <div>
              <p>Daftar Akun</p>
              <h3>Admin & Petugas</h3>
            </div>

            <button type="button" onClick={fetchAdmins}>
              Refresh
            </button>
          </div>

          {loadingAdmins ? (
            <div className="empty-card">
              <div className="small-spinner" />
              <h4>Memuat akun admin...</h4>
              <p>Mohon tunggu sebentar.</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">👤</div>
              <h4>Tidak ada admin</h4>
              <p>Belum ada akun admin yang terdaftar pada sistem.</p>
            </div>
          ) : (
            <div className="admin-list">
              {admins.map((admin) => {
                const isItemMaster = admin.role === "master";
                const isActive = admin.status === "approved";
                const isBusy = actionEmail === admin.email;

                return (
                  <div key={admin.email} className="admin-card">
                    <div className="admin-top">
                      <img
                        src={
                          admin.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            admin.name || "Admin"
                          )}`
                        }
                        alt="avatar"
                        className="avatar"
                      />

                      <div className="admin-info">
                        <div className="name-row">
                          <h3>{admin.name || "Tanpa Nama"}</h3>

                          {isItemMaster && <span className="master-badge">MASTER</span>}
                        </div>

                        <p>{admin.email}</p>

                        <div
                          className={
                            isItemMaster
                              ? "status-badge master"
                              : isActive
                              ? "status-badge active"
                              : "status-badge inactive"
                          }
                        >
                          {isItemMaster
                            ? "Master Admin"
                            : isActive
                            ? "Petugas Aktif"
                            : "Petugas Nonaktif"}
                        </div>
                      </div>
                    </div>

                    {isItemMaster ? (
                      <button type="button" className="master-btn" disabled>
                        Master Admin tidak dapat diubah
                      </button>
                    ) : (
                      <div className="action-grid">
                        <button
                          type="button"
                          onClick={() => toggleStatus(admin.email, admin.status)}
                          disabled={isBusy}
                          className={isActive ? "disable-btn" : "activate-btn"}
                        >
                          {isBusy
                            ? "Memproses..."
                            : isActive
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                        </button>

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => deleteAdmin(admin.email, admin.status)}
                            disabled={isBusy}
                            className="delete-btn"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    )}
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
          font-size: 25px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .hero-card span {
          display: block;
          margin-top: 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
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
          font-size: 23px;
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
          font-size: 16px;
          font-weight: 900;
        }

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

        .empty-card {
          margin-top: 14px;
          padding: 24px 14px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto;
          border-radius: 18px;
          background: #eff6ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
        }

        .empty-card h4 {
          margin: 10px 0 0;
          color: #111827;
          font-size: 14px;
          font-weight: 900;
        }

        .empty-card p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
        }

        .small-spinner {
          width: 32px;
          height: 32px;
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

        .admin-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .admin-card {
          padding: 13px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .admin-top {
          display: flex;
          gap: 11px;
          align-items: flex-start;
        }

        .avatar {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .admin-info {
          min-width: 0;
          flex: 1;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .name-row h3 {
          margin: 0;
          color: #111827;
          font-size: 15px;
          line-height: 1.3;
          font-weight: 900;
          word-break: break-word;
        }

        .admin-info p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 700;
          word-break: break-all;
        }

        .master-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.13);
          color: #f59e0b;
          font-size: 9px;
          font-weight: 900;
        }

        .status-badge {
          display: inline-flex;
          margin-top: 8px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .status-badge.inactive {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        .status-badge.master {
          background: rgba(245, 158, 11, 0.13);
          color: #f59e0b;
        }

        .action-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .action-grid button,
        .master-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 17px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .activate-btn {
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(22, 119, 255, 0.18);
        }

        .disable-btn {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        .delete-btn {
          background: linear-gradient(180deg, #dc2626, #b91c1c);
          color: #ffffff;
        }

        .master-btn {
          margin-top: 12px;
          background: rgba(245, 158, 11, 0.13);
          color: #f59e0b;
          cursor: not-allowed;
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
