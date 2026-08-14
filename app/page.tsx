"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/user?email=${session.user.email}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setUserData(data));
    }
  }, [session]);

  return (
    <div className="page">
      <div className="gradient" />

      <div className="card">
        <div className="logo-box">
          <img src="/logo-desa.png" alt="Logo Desa" />
        </div>

        <p className="mini">PEMERINTAH DESA</p>
        <h1>DESA JATIREJO</h1>
        <p className="desc">
          Sistem digital pengelolaan iuran jimpitan berbasis QR dan transparansi kas warga.
        </p>

        <div className="choice-grid">
          <button
            type="button"
            className="choice-card admin"
            onClick={() => {
              if (!session) {
                signIn("google");
                return;
              }

              if (userData?.status === "approved") {
                window.location.href = "/admin";
                return;
              }
            }}
          >
            <div>🔐</div>
            <section>
              <h3>{session ? "Masuk Dashboard" : "Masuk Sistem"}</h3>
              <p>Untuk Master Admin dan Petugas Jimpitan.</p>
            </section>
          </button>

          <button
            type="button"
            className="choice-card warga"
            onClick={() => (window.location.href = "/warga")}
          >
            <div>🏘️</div>
            <section>
              <h3>Informasi Warga</h3>
              <p>Lihat data iuran warga dan laporan kas publik.</p>
            </section>
          </button>
        </div>

        {session && (
          <>
            <div className="user-card">
              <img
                src={session.user?.image || "https://ui-avatars.com/api/?name=Admin"}
                alt="avatar"
              />
              <div>
                <p>Login sebagai</p>
                <strong>{session.user?.email}</strong>
              </div>
            </div>

            {!userData ? (
              <p className="loading">Memuat data akun...</p>
            ) : userData.status === "pending" ? (
              <div className="pending-box">
                ⏳ Akun kamu sedang menunggu persetujuan Master Admin.
              </div>
            ) : null}

            <button type="button" className="logout-btn" onClick={() => signOut()}>
              Logout
            </button>
          </>
        )}

        <p className="footer">© {new Date().getFullYear()} — Sistem Jimpitan Desa Jatirejo</p>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: #f4f8ff;
          position: relative;
          overflow: hidden;
        }

        .gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #1d4ed8 0%, #2563eb 45%, #f4f8ff 100%);
        }

        .card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 390px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 32px;
          padding: 28px 22px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(37, 99, 235, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.7);
        }

        .logo-box {
          width: 94px;
          height: 94px;
          margin: 0 auto;
          border-radius: 28px;
          background: linear-gradient(180deg, #ffffff, #eff6ff);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
        }

        .logo-box img {
          width: 70px;
          height: 70px;
          object-fit: contain;
        }

        .mini {
          margin: 22px 0 0;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #2563eb;
        }

        h1 {
          margin: 8px 0 0;
          font-size: 31px;
          font-weight: 900;
          color: #111827;
          line-height: 1.1;
        }

        .desc {
          margin: 13px 0 0;
          font-size: 13px;
          line-height: 1.7;
          color: #64748b;
          font-weight: 700;
        }

        .choice-grid {
          margin-top: 24px;
          display: grid;
          gap: 11px;
        }

        .choice-card {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 22px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .choice-card div {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .choice-card h3 {
          margin: 0;
          font-size: 15px;
          color: #111827;
          font-weight: 900;
        }

        .choice-card p {
          margin: 4px 0 0;
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
        }

        .choice-card.admin {
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          box-shadow: 0 12px 28px rgba(22, 119, 255, 0.22);
        }

        .choice-card.admin h3,
        .choice-card.admin p {
          color: #ffffff;
        }

        .choice-card.admin p {
          opacity: 0.78;
        }

        .choice-card.admin div {
          background: rgba(255, 255, 255, 0.18);
        }

        .choice-card.warga {
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .choice-card.warga p {
          color: #64748b;
        }

        .choice-card.warga div {
          background: #eff6ff;
        }

        .user-card {
          margin-top: 18px;
          padding: 13px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }

        .user-card img {
          width: 48px;
          height: 48px;
          border-radius: 17px;
          object-fit: cover;
        }

        .user-card p {
          margin: 0;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 800;
        }

        .user-card strong {
          display: block;
          margin-top: 3px;
          color: #111827;
          font-size: 12px;
          line-height: 1.4;
          word-break: break-word;
        }

        .pending-box {
          margin-top: 14px;
          padding: 13px;
          border-radius: 18px;
          background: rgba(251, 191, 36, 0.12);
          color: #d97706;
          font-weight: 800;
          font-size: 12px;
          line-height: 1.6;
        }

        .loading {
          margin: 14px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .logout-btn {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #111827;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .footer {
          margin: 24px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.6;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
