"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

type RingkasanKas = {
  pemasukan_jimpitan: number;
  pemasukan_manual: number;
  total_pemasukan: number;
  total_pengeluaran: number;
  saldo_kas: number;

  pemasukan_jimpitan_periode: number;
  pemasukan_manual_periode: number;
  total_pemasukan_periode: number;
  total_pengeluaran_periode: number;
  saldo_periode: number;
  jumlah_transaksi_jimpitan: number;
};

type RiwayatKas = {
  id: number;
  tanggal: string;
  jenis: "pemasukan" | "pengeluaran";
  kategori: string;
  keterangan: string;
  nominal: number;
  created_by_name?: string;
};

type KasResponse = {
  bulan: number;
  tahun: number;
  ringkasan: RingkasanKas;
  riwayat_manual: RiwayatKas[];
};

const bulanList = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const kategoriPemasukan = [
  "Donasi",
  "Saldo Awal",
  "Bantuan Warga",
  "Kas Tambahan",
  "Lain-lain",
];

const kategoriPengeluaran = [
  "Kebersihan",
  "Keamanan",
  "Kegiatan Warga",
  "Perawatan Fasilitas",
  "Bantuan Sosial",
  "Lain-lain",
];

export default function KasPage() {
  const { data: session } = useSession();

  const role = (session?.user as any)?.role;
  const isMaster = role === "master";

  const now = new Date();

  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const [dataKas, setDataKas] = useState<KasResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tanggal, setTanggal] = useState("");
  const [jenis, setJenis] = useState<"pemasukan" | "pengeluaran">(
    "pengeluaran"
  );
  const [kategori, setKategori] = useState("Kebersihan");
  const [keterangan, setKeterangan] = useState("");
  const [nominal, setNominal] = useState("");
  const [nominalDisplay, setNominalDisplay] = useState("");

  const tahunList = [
    now.getFullYear() - 2,
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1,
  ];

  const ringkasan: RingkasanKas = dataKas?.ringkasan || {
    pemasukan_jimpitan: 0,
    pemasukan_manual: 0,
    total_pemasukan: 0,
    total_pengeluaran: 0,
    saldo_kas: 0,

    pemasukan_jimpitan_periode: 0,
    pemasukan_manual_periode: 0,
    total_pemasukan_periode: 0,
    total_pengeluaran_periode: 0,
    saldo_periode: 0,
    jumlah_transaksi_jimpitan: 0,
  };

  const riwayatManual: RiwayatKas[] = dataKas?.riwayat_manual || [];

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

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatInputRupiah = (value: string) => {
    const angka = value.replace(/\D/g, "");

    if (!angka) {
      return "";
    }

    return new Intl.NumberFormat("id-ID").format(Number(angka));
  };

  const handleNominalChange = (value: string) => {
    const angka = value.replace(/\D/g, "");

    setNominal(angka);
    setNominalDisplay(formatInputRupiah(angka));
  };

  const setNominalCepat = (angka: number) => {
    const value = String(angka);

    setNominal(value);
    setNominalDisplay(formatInputRupiah(value));
  };

  const fetchKas = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/kas?bulan=${bulan}&tahun=${tahun}`, {
        cache: "no-store",
      });

      const result = await res.json();

      if (res.ok) {
        setDataKas(result);
      } else {
        alert(result.message || "Gagal mengambil data kas");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengambil data kas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKas();
  }, [bulan, tahun]);

  const handleJenisChange = (value: "pemasukan" | "pengeluaran") => {
    setJenis(value);

    if (value === "pemasukan") {
      setKategori("Donasi");
    } else {
      setKategori("Kebersihan");
    }
  };

  const handleSubmit = async () => {
    if (!isMaster) {
      alert("Hanya Master Admin yang boleh menambahkan data kas");
      return;
    }

    if (!tanggal || !jenis || !kategori || !nominal) {
      alert("Lengkapi data kas terlebih dahulu");
      return;
    }

    if (Number(nominal) <= 0) {
      alert("Nominal tidak valid");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/kas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggal,
          jenis,
          kategori,
          keterangan,
          nominal: Number(nominal),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Data kas berhasil ditambahkan");

        setTanggal("");
        setJenis("pengeluaran");
        setKategori("Kebersihan");
        setKeterangan("");
        setNominal("");
        setNominalDisplay("");
        setShowForm(false);

        fetchKas();
      } else {
        alert(result.message || "Gagal menambahkan data kas");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan data kas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

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
            <h1>Keuangan Kas</h1>
          </div>

          <div className="role-badge">{isMaster ? "Admin" : "Petugas"}</div>
        </div>

        <div className="saldo-card">
          <div className="saldo-top">
            <div>
              <p>Saldo Kas Berjalan</p>

              <h2>{formatRupiah(ringkasan.saldo_kas)}</h2>

              <span>Total kas dari awal sampai sekarang</span>
            </div>

            <div className="saldo-icon">💰</div>
          </div>

          <div className="saldo-stats">
            <div>
              <p>Total Pemasukan</p>

              <h3 className="green">
                {formatRupiah(ringkasan.total_pemasukan)}
              </h3>
            </div>

            <div>
              <p>Total Pengeluaran</p>

              <h3 className="red">
                {formatRupiah(ringkasan.total_pengeluaran)}
              </h3>
            </div>
          </div>
        </div>

        <div className="filter-card">
          <div>
            <label>Bulan</label>

            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
            >
              {bulanList.map((namaBulan, index) => (
                <option key={namaBulan} value={index + 1}>
                  {namaBulan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Tahun</label>

            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
            >
              {tahunList.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="period-card">
          <div>
            <p>Ringkasan Periode</p>

            <h3>
              {bulanList[bulan - 1]} {tahun}
            </h3>
          </div>

          <div className="period-grid">
            <div>
              <span>Pemasukan</span>
              <strong className="green">
                {formatRupiah(ringkasan.total_pemasukan_periode)}
              </strong>
            </div>

            <div>
              <span>Pengeluaran</span>
              <strong className="red">
                {formatRupiah(ringkasan.total_pengeluaran_periode)}
              </strong>
            </div>

            <div>
              <span>Saldo Periode</span>
              <strong>{formatRupiah(ringkasan.saldo_periode)}</strong>
            </div>

            <div>
              <span>Transaksi</span>
              <strong>{ringkasan.jumlah_transaksi_jimpitan}x</strong>
            </div>
          </div>
        </div>

        <div className="breakdown-card">
          <div className="section-header">
            <div>
              <p>Rincian Pemasukan Periode</p>
              <h3>Sumber Dana</h3>
            </div>

            <span>{ringkasan.jumlah_transaksi_jimpitan}</span>
          </div>

          <div className="breakdown-list">
            <div className="breakdown-item">
              <div className="breakdown-icon auto">↗</div>

              <div className="breakdown-info">
                <h4>Jimpitan Otomatis</h4>
                <p>{ringkasan.jumlah_transaksi_jimpitan} transaksi jimpitan</p>
              </div>

              <strong className="green">
                {formatRupiah(ringkasan.pemasukan_jimpitan_periode)}
              </strong>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-icon manual">+</div>

              <div className="breakdown-info">
                <h4>Pemasukan Manual</h4>
                <p>Donasi, saldo awal, bantuan, atau kas tambahan</p>
              </div>

              <strong className="green">
                {formatRupiah(ringkasan.pemasukan_manual_periode)}
              </strong>
            </div>
          </div>
        </div>

        {isMaster && (
          <div className="add-card">
            <div>
              <h3>Tambah Data Kas</h3>
              <p>Input pemasukan tambahan atau pengeluaran.</p>
            </div>

            <button type="button" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Tutup" : "+ Tambah"}
            </button>
          </div>
        )}

        {isMaster && showForm && (
          <div className="form-card">
            <label>Tanggal</label>

            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />

            <label>Jenis</label>

            <select
              value={jenis}
              onChange={(e) =>
                handleJenisChange(e.target.value as "pemasukan" | "pengeluaran")
              }
            >
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>

            <label>Kategori</label>

            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              {(jenis === "pemasukan"
                ? kategoriPemasukan
                : kategoriPengeluaran
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label>Nominal</label>

            <div className="rupiah-input">
              <span>Rp</span>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Contoh: 200.000"
                value={nominalDisplay}
                onChange={(e) => handleNominalChange(e.target.value)}
              />
            </div>

            <p className="nominal-help">
              Contoh: ketik 200000, otomatis tampil menjadi Rp 200.000.
            </p>

            <div className="quick-row">
              <button type="button" onClick={() => setNominalCepat(10000)}>
                10rb
              </button>

              <button type="button" onClick={() => setNominalCepat(50000)}>
                50rb
              </button>

              <button type="button" onClick={() => setNominalCepat(100000)}>
                100rb
              </button>

              <button type="button" onClick={() => setNominalCepat(200000)}>
                200rb
              </button>
            </div>

            <label>Keterangan</label>

            <textarea
              placeholder="Contoh: Beli kantong sampah"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />

            <button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Data Kas"}
            </button>
          </div>
        )}

        {!isMaster && (
          <div className="info-card">
            <div>ℹ️</div>

            <p>
              Halaman ini bersifat transparansi. Petugas hanya dapat melihat data
              kas. Input pemasukan atau pengeluaran hanya dilakukan oleh Master
              Admin.
            </p>
          </div>
        )}

        <div className="history-card">
          <div className="section-header">
            <div>
              <p>Riwayat Manual Periode</p>
              <h3>Pemasukan & Pengeluaran</h3>
            </div>

            <span>{riwayatManual.length}</span>
          </div>

          {loading ? (
            <div className="empty-box">
              <div>⏳</div>
              <h3>Memuat data...</h3>
              <p>Mohon tunggu sebentar.</p>
            </div>
          ) : riwayatManual.length === 0 ? (
            <div className="empty-box">
              <div>📭</div>
              <h3>Belum ada data manual</h3>
              <p>
                Jika belum ada pengeluaran atau pemasukan manual pada periode
                ini, saldo kas berjalan tetap dihitung dari seluruh transaksi.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {riwayatManual.map((item: RiwayatKas) => {
                const isPemasukan = item.jenis === "pemasukan";

                return (
                  <div key={item.id} className="history-item">
                    <div
                      className={
                        isPemasukan ? "history-icon in" : "history-icon out"
                      }
                    >
                      {isPemasukan ? "+" : "-"}
                    </div>

                    <div className="history-info">
                      <div className="history-top">
                        <h4>{item.kategori}</h4>

                        <strong className={isPemasukan ? "green" : "red"}>
                          {isPemasukan ? "+" : "-"}
                          {formatRupiah(item.nominal)}
                        </strong>
                      </div>

                      <p>{item.keterangan || "Tidak ada keterangan"}</p>

                      <span>
                        {formatTanggal(item.tanggal)}
                        {item.created_by_name
                          ? ` • ${item.created_by_name}`
                          : ""}
                      </span>
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

        .saldo-card,
        .filter-card,
        .period-card,
        .breakdown-card,
        .add-card,
        .form-card,
        .info-card,
        .history-card {
          position: relative;
          z-index: 2;
          margin-top: 16px;
          padding: 18px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
        }

        .saldo-card {
          margin-top: 22px;
          padding: 20px;
          border-radius: 28px;
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.14);
        }

        .saldo-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .saldo-top p {
          margin: 0;
          font-size: 13px;
          color: #1677ff;
          font-weight: 800;
        }

        .saldo-top h2 {
          margin: 6px 0 0;
          font-size: 30px;
          color: #111827;
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .saldo-top span {
          display: inline-flex;
          margin-top: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 12px;
          font-weight: 800;
        }

        .saldo-icon {
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

        .saldo-stats {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .saldo-stats div {
          padding: 14px 12px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .saldo-stats p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .saldo-stats h3 {
          margin: 6px 0 0;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.3;
        }

        .green {
          color: #16a34a;
        }

        .red {
          color: #dc2626;
        }

        .filter-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
        }

        select,
        input,
        textarea {
          width: 100%;
          border: 1px solid #dbe4f0;
          background: #f9fbff;
          color: #111827;
          border-radius: 15px;
          padding: 13px;
          outline: none;
          font-size: 14px;
          font-weight: 600;
        }

        textarea {
          min-height: 82px;
          resize: vertical;
        }

        .period-card p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .period-card h3 {
          margin: 4px 0 0;
          font-size: 18px;
          color: #111827;
          font-weight: 900;
        }

        .period-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .period-grid div {
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .period-grid span {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 800;
        }

        .period-grid strong {
          display: block;
          margin-top: 5px;
          font-size: 13px;
          color: #111827;
          font-weight: 900;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .section-header p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .section-header h3 {
          margin: 3px 0 0;
          font-size: 19px;
          color: #111827;
          font-weight: 900;
        }

        .section-header span {
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

        .breakdown-list {
          margin-top: 14px;
        }

        .breakdown-item {
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .breakdown-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 18px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .breakdown-icon.auto {
          background: #1677ff;
        }

        .breakdown-icon.manual {
          background: #22c55e;
        }

        .breakdown-info {
          flex: 1;
          min-width: 0;
        }

        .breakdown-info h4 {
          margin: 0;
          font-size: 14px;
          color: #111827;
          font-weight: 900;
        }

        .breakdown-info p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
        }

        .breakdown-item strong {
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .add-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
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
        }

        .form-card label {
          margin-top: 12px;
        }

        .form-card label:first-child {
          margin-top: 0;
        }

        .rupiah-input {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          border: 1px solid #dbe4f0;
          background: #f9fbff;
          border-radius: 15px;
          padding: 0 13px;
        }

        .rupiah-input span {
          color: #1677ff;
          font-size: 14px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .rupiah-input input {
          border: none;
          background: transparent;
          padding: 13px 0;
        }

        .nominal-help {
          margin: 6px 0 0;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }

        .quick-row {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .quick-row button {
          border: none;
          padding: 9px 6px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .form-card > button {
          width: 100%;
          margin-top: 14px;
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
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: #eff6ff;
          border-color: #dbeafe;
        }

        .info-card p {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #64748b;
          font-weight: 600;
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
          line-height: 1.5;
        }

        .history-list {
          margin-top: 14px;
        }

        .history-item {
          padding: 14px;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
        }

        .history-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .history-icon.in {
          background: #22c55e;
        }

        .history-icon.out {
          background: #ef4444;
        }

        .history-info {
          flex: 1;
          min-width: 0;
        }

        .history-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .history-top h4 {
          margin: 0;
          font-size: 14px;
          color: #111827;
          font-weight: 900;
        }

        .history-top strong {
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .history-info p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
        }

        .history-info span {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 700;
        }
      `}</style>
    </>
  );
}
