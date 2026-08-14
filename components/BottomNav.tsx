"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();

  const { data: session } =
    useSession();

  const [userData, setUserData] =
    useState<any>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetch(
        `/api/user?email=${session.user.email}`
      )
        .then((res) => res.json())
        .then((data) =>
          setUserData(data)
        );
    }
  }, [session]);

  const isActive = (path: string) =>
    pathname === path;

  const isMaster =
    userData?.role === "master";

  const handleScanClick = () => {
    if (isMaster) {
      alert(
        "Fitur Scan hanya dapat digunakan oleh Petugas Jimpitan."
      );

      return;
    }

    window.location.href =
      "/admin/scan";
  };

  return (
    <div style={wrapperStyle}>
      <div style={navStyle}>

        {/* DASHBOARD */}
        <Link
          href="/admin"
          style={linkStyle}
        >
          <div style={menuStyle}>
            <div
              style={{
                ...iconStyle,
                opacity:
                  isActive("/admin")
                    ? 1
                    : 0.45,
              }}
            >
              ⌂
            </div>

            <span
              style={{
                ...textStyle,
                opacity:
                  isActive("/admin")
                    ? 1
                    : 0.45,

                fontWeight:
                  isActive("/admin")
                    ? 700
                    : 500,
              }}
            >
              Dashboard
            </span>
          </div>
        </Link>

        {/* SCAN */}
        <div
          onClick={handleScanClick}
          style={{
            ...scanMenuStyle,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              ...scanIconStyle,

              background: isMaster
                ? "#9ca3af"
                : "linear-gradient(180deg,#2563eb,#1d4ed8)",
            }}
          >
            ⌁
          </div>

          <span
            style={{
              ...textStyle,

              color: isMaster
                ? "#9ca3af"
                : "#111",

              fontWeight: 700,
            }}
          >
            Scan
          </span>
        </div>

        {/* IURAN */}
        <Link
          href="/admin/iuran"
          style={linkStyle}
        >
          <div style={menuStyle}>
            <div
              style={{
                ...iconStyle,
                opacity:
                  isActive(
                    "/admin/iuran"
                  )
                    ? 1
                    : 0.45,
              }}
            >
              ◎
            </div>

            <span
              style={{
                ...textStyle,
                opacity:
                  isActive(
                    "/admin/iuran"
                  )
                    ? 1
                    : 0.45,

                fontWeight:
                  isActive(
                    "/admin/iuran"
                  )
                    ? 700
                    : 500,
              }}
            >
              Iuran
            </span>
          </div>
        </Link>

        {/* KEUANGAN */}
        <Link
          href="/admin/kas"
          style={linkStyle}
        >
          <div style={menuStyle}>
            <div
              style={{
                ...iconStyle,
                opacity:
                  isActive(
                    "/admin/kas"
                  )
                    ? 1
                    : 0.45,
              }}
            >
              ◈
            </div>

            <span
              style={{
                ...textStyle,
                opacity:
                  isActive(
                    "/admin/kas"
                  )
                    ? 1
                    : 0.45,

                fontWeight:
                  isActive(
                    "/admin/kas"
                  )
                    ? 700
                    : 500,
              }}
            >
              Kas
            </span>
          </div>
        </Link>

      </div>
    </div>
  );
}

/* ================= STYLE ================= */

const wrapperStyle = {
  position: "fixed" as const,

  bottom: "18px",

  left: "16px",

  right: "16px",

  zIndex: 9999,
};

const navStyle = {
  height: "74px",

  display: "flex",

  alignItems: "center",

  justifyContent:
    "space-evenly",

  borderRadius: "24px",

  background:
    "rgba(255,255,255,0.94)",

  backdropFilter:
    "blur(18px)",

  WebkitBackdropFilter:
    "blur(18px)",

  border:
    "1px solid rgba(255,255,255,0.8)",

  boxShadow:
    "0 10px 40px rgba(0,0,0,0.08)",
};

const linkStyle = {
  textDecoration: "none",

  color: "black",
};

const menuStyle = {
  width: "60px",

  display: "flex",

  flexDirection: "column" as const,

  alignItems: "center",

  justifyContent: "center",

  gap: "4px",
};

const scanMenuStyle = {
  width: "60px",

  display: "flex",

  flexDirection: "column" as const,

  alignItems: "center",

  justifyContent: "center",

  gap: "4px",
};

const iconStyle = {
  fontSize: "20px",

  color: "#111",
};

const scanIconStyle = {
  width: "42px",

  height: "42px",

  borderRadius: "14px",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  color: "white",

  fontSize: "18px",

  boxShadow:
    "0 8px 18px rgba(37,99,235,0.25)",
};

const textStyle = {
  fontSize: "11px",

  color: "#111",

  transition: "all .2s ease",
};