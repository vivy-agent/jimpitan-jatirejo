"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

type UserData = {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type PendingUser = {
  id?: number;
  name?: string;
  email: string;
  image?: string;
  role?: string;
  status?: string;
};

export default function ApprovalPage() {
  const { data: session, status } = useSession();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [users, setUsers] = useState<PendingUser[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [approvingEmail, setApprovingEmail] = useState("");

  // ================= USER LOGIN =================
  useEffect(() => {
    if (!session?.user?.email) return;

    fetch(`/api/user?email=${session.user.email}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => setUserData(data))
      .finally(() => setLoadingUser(false));
  }, [session]);

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    try {
      setLoadingPending(true);

      const res = await fetch("/api/admin/pending", {
        cache: "no-store",
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ================= APPROVE =================
  const approveUser = async (email: string) => {
    const confirmApprove = confirm(`Setujui akun ${email} sebagai petugas?`);

    if (!confirmApprove) return;

    try {
      setApprovingEmail(email);

      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.message || "Gagal menyetujui akun");
        return;
      }

      alert("Akun berhasil disetujui");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat approve akun");
    } finally {
      setApprovingEmail("");
    }
  };

  // ================= LOADING =================
  if (status === "loading" || loadingUser) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat data approval...</p>

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
  if (userData?.role !== "master") {
    return (
      <div className="deny-page">
        <div className="deny-card">
          <div>!</div>
          <h2>Akses Ditolak</h2>
          <p>Halaman ini hanya bisa dibuka oleh Master Admin.</p>

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
            <h1>Approval Admin</h1>
          </div>

          <div className="count-badge">{users.length}</div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Persetujuan Akun</p>
              <h2>Admin Pending</h2>
              <span>
                Setujui akun petugas baru agar dapat masuk dan menggunakan
                fitur sistem jimpitan.
              </span>
            </div>

            <div className="hero-icon">✓</div>
          </div>

          <div className="summary-row">
            <div>
              <p>Menunggu Approval</p>
              <strong>{users.length} akun</strong>
            </div>

            <div>
              <p>Akses</p>
              <strong>Master</strong>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="list-card">
          <div className="section-title">
            <div>
              <p>Daftar Pending</p>
              <h3>Akun Petugas Baru</h3>
            </div>

            <button type="button" onClick={fetchUsers}>
              Refresh
            </button>
          </div>

          {loadingPending ? (
            <div className="empty-card">
              <div className="small-spinner" />
              <h4>Memuat akun pending...</h4>
              <p>Mohon tunggu sebentar.</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">✓</div>
              <h4>Tidak ada user pending</h4>
              <p>Semua akun petugas sudah disetujui.</p>
            </div>
          ) : (
            <div className="user-list">
              {users.map((user, index) => (
                <div key={user.email || index} className="user-card">
                  <div className="user-top">
                    <img
                      src={
                        user.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.name || "Admin"
                        )}`
                      }
                      alt="avatar"
                      className="avatar"
                    />

                    <div className="user-info">
                      <h3>{user.name || "Tanpa Nama"}</h3>
                      <p>{user.email}</p>

                      <span>Pending Approval</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => approveUser(user.email)}
                    disabled={approvingEmail === user.email}
                    className="approve-btn"
                  >
                    {approvingEmail === user.email
                      ? "Menyetujui..."
                      : "Approve Petugas"}
                  </button>
                </div>
              ))}
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
          font-size: 26px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .summary-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .summary-row div {
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .summary-row p {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .summary-row strong {
          display: block;
          margin-top: 5px;
          color: #111827;
          font-size: 15px;
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
          background: #dcfce7;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
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

        .user-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .user-card {
          padding: 13px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .user-top {
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

        .user-info {
          min-width: 0;
          flex: 1;
        }

        .user-info h3 {
          margin: 0;
          color: #111827;
          font-size: 15px;
          line-height: 1.3;
          font-weight: 900;
          word-break: break-word;
        }

        .user-info p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 700;
          word-break: break-word;
        }

        .user-info span {
          display: inline-flex;
          margin-top: 8px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.13);
          color: #d97706;
          font-size: 11px;
          font-weight: 900;
        }

        .approve-btn {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: none;
          border-radius: 17px;
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(22, 119, 255, 0.18);
        }

        .approve-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
