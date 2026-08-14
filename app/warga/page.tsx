"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type WargaItem = {
  id: number;
  nama: string;
  kode_unik: string;
  tanggal_mulai: string;
  status?: string;
  total_bayar: number;
  tunggakan: number;
  total_seharusnya: number;
  minggu_wajib: number;
  minggu_terbayar: number;
  detail_tunggakan: any[];
  riwayat: any[];
};

type KasData = {
  tahun_aktif?: number;
  ringkasan?: any;
  riwayat_manual?: any[];
};

export default function PublicWargaPage() {
  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());
  const [iuranMingguan, setIuranMingguan] = useState(2000);
  const [warga, setWarga] = useState<WargaItem[]>([]);
  const [selected, setSelected] = useState<WargaItem | null>(null);
  const [kas, setKas] = useState<KasData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllTunggakan, setShowAllTunggakan] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const formatRupiah = (angka: number) => {
  const nilai = Number(angka || 0);

  return (
    "Rp " +
    nilai.toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    })
  );
};

  const formatTanggal = (value: any) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTanggalJam = (value: any) => {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resWarga, resKas] = await Promise.all([
        fetch("/api/public/warga", { cache: "no-store" }),
        fetch("/api/public/kas", { cache: "no-store" }),
      ]);

      const wargaData = await resWarga.json();
      const kasData = await resKas.json();

      setTahunAktif(Number(wargaData?.tahun_aktif || new Date().getFullYear()));
      setIuranMingguan(Number(wargaData?.iuran_mingguan || 2000));
      setWarga(Array.isArray(wargaData?.warga) ? wargaData.warga : []);
      setKas(kasData || null);
    } catch (err) {
      console.error(err);
      setWarga([]);
      setKas(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredWarga = useMemo(() => {
    const keyword = search.toLowerCase();
    return warga.filter((item) => {
      const nama = item.nama?.toLowerCase() || "";
      const kode = item.kode_unik?.toLowerCase() || "";
      return nama.includes(keyword) || kode.includes(keyword);
    });
  }, [warga, search]);

  const statistik = useMemo(() => {
    const total = warga.length;
    const aktif = warga.filter((item) => item.status === "aktif").length;
    const menunggak = warga.filter((item) => Number(item.tunggakan || 0) > 0).length;
    return { total, aktif, menunggak };
  }, [warga]);

  const handleSelect = (item: WargaItem) => {
    setSelected(item);
    setShowAllTunggakan(false);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const tunggakanCompact = useMemo(() => {
    if (!selected) return [];
    if (showAllTunggakan) return selected.detail_tunggakan || [];
    return (selected.detail_tunggakan || []).slice(0, 4);
  }, [selected, showAllTunggakan]);

  return (
    <div className="page">
      <div className="blue-bg" />

      <div className="header">
        <button type="button" className="back-btn" onClick={() => (window.location.href = "/")}>
          ←
        </button>
        <div className="header-text">
          <p>Informasi Warga</p>
          <h1>Iuran Jimpitan</h1>
        </div>
        <div className="year-badge">{tahunAktif}</div>
      </div>

      <div className="hero-card">
        <div className="hero-top">
          <div>
            <p className="mini-title">Transparansi Warga</p>
            <h2>Data Iuran Desa Jatirejo</h2>
            <span>
              Warga dapat melihat status iuran, riwayat pembayaran, serta laporan kas secara read-only.
            </span>
          </div>
          <div className="hero-icon">🏘️</div>
        </div>

        <div className="stats-row">
          <div><p>Total</p><strong>{statistik.total}</strong></div>
          <div><p>Aktif</p><strong>{statistik.aktif}</strong></div>
          <div><p>Menunggak</p><strong>{statistik.menunggak}</strong></div>
        </div>
      </div>

      <div className="search-box">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Cari nama atau kode warga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="list-card">
        <div className="section-title">
          <div>
            <p>Daftar Warga</p>
            <h3>{search ? "Hasil Pencarian" : "Semua Warga"}</h3>
          </div>
          <span className="count-badge">{filteredWarga.length}</span>
        </div>

        {loading ? (
          <div className="empty-box"><div className="spinner" /><h4>Memuat data warga...</h4><p>Mohon tunggu sebentar.</p></div>
        ) : filteredWarga.length === 0 ? (
          <div className="empty-box"><div>🔎</div><h4>Data tidak ditemukan</h4><p>Coba gunakan nama atau kode warga lain.</p></div>
        ) : (
          <div className="warga-list">
            {filteredWarga.map((item) => {
              const isAktif = item.status === "aktif";
              const hasTunggakan = Number(item.tunggakan || 0) > 0;
              return (
                <button key={item.id} type="button" className={selected?.id === item.id ? "warga-card selected" : "warga-card"} onClick={() => handleSelect(item)}>
                  <div className="avatar">{item.nama?.charAt(0)?.toUpperCase() || "W"}</div>
                  <div className="warga-info">
                    <div className="name-row">
                      <h4>{item.nama}</h4>
                      <span className={isAktif ? "badge aktif" : "badge nonaktif"}>{isAktif ? "Aktif" : "Nonaktif"}</span>
                    </div>
                    <p>JTR-{item.kode_unik}</p>
                    <small>{hasTunggakan ? `${item.tunggakan}x tunggakan` : "Tidak ada tunggakan"}</small>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="detail-wrap" ref={detailRef}>
          <div className="detail-card">
            <div className="detail-header">
              <div>
                <p>Detail Warga</p>
                <h3>{selected.nama}</h3>
                <span>JTR-{selected.kode_unik}</span>
              </div>
              <div className={selected.tunggakan > 0 ? "detail-status danger" : "detail-status success"}>
                {selected.tunggakan > 0 ? `${selected.tunggakan}x` : "Lunas"}
              </div>
            </div>
            <div className="meta-grid">
              <div><p>Tanggal Mulai</p><strong>{formatTanggal(selected.tanggal_mulai)}</strong></div>
              <div><p>Iuran</p><strong>{formatRupiah(iuranMingguan)} / minggu</strong></div>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card primary"><p>Total Bayar</p><h3>{formatRupiah(selected.total_bayar)}</h3></div>
            <div className="summary-card"><p>Tunggakan</p><h3 className={selected.tunggakan > 0 ? "red-text" : "green-text"}>{selected.tunggakan}x</h3></div>
            <div className="summary-card"><p>Seharusnya</p><h3>{formatRupiah(selected.total_seharusnya)}</h3></div>
          </div>

          <div className="card">
            <div className="section-title"><div><p>Progress</p><h3>Ringkasan Pembayaran</h3></div></div>
            <div className="progress-row">
              <div><span>Minggu wajib</span><strong>{selected.minggu_wajib} minggu</strong></div>
              <div><span>Sudah dibayar</span><strong>{selected.minggu_terbayar} minggu</strong></div>
            </div>
            <div className="progress-bg"><div className="progress-fill" style={{ width: selected.minggu_wajib > 0 ? `${Math.min((selected.minggu_terbayar / selected.minggu_wajib) * 100, 100)}%` : "0%" }} /></div>
          </div>

          <div className="card">
            <div className="section-title"><div><p>Tunggakan</p><h3>Minggu Belum Terbayar</h3></div><span className="count-badge">{selected.detail_tunggakan?.length || 0}</span></div>
            {!selected.detail_tunggakan?.length ? (
              <div className="empty-box"><div>✅</div><h4>Tidak ada tunggakan</h4><p>Semua kewajiban pada periode {tahunAktif} sudah aman.</p></div>
            ) : (
              <>
                <div className="tunggakan-list">
                  {tunggakanCompact.map((item) => (
                    <div key={item.minggu_ke} className="tunggakan-item">
                      <div className="week-pill">M{item.minggu_ke}</div>
                      <div><h4>{formatTanggal(item.tanggal_awal)} - {formatTanggal(item.tanggal_akhir)}</h4><p>{formatRupiah(item.nominal)}</p></div>
                    </div>
                  ))}
                </div>
                {selected.detail_tunggakan.length > 4 && (
                  <button type="button" className="show-more-btn" onClick={() => setShowAllTunggakan(!showAllTunggakan)}>
                    {showAllTunggakan ? "Tampilkan lebih sedikit" : `Lihat semua ${selected.detail_tunggakan.length} minggu`}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="section-title"><div><p>Riwayat</p><h3>Histori Pembayaran</h3></div><span className="count-badge">{selected.riwayat?.length || 0}</span></div>
            {!selected.riwayat?.length ? (
              <div className="empty-box"><div>📭</div><h4>Belum ada transaksi</h4><p>Belum ada pembayaran pada periode {tahunAktif}.</p></div>
            ) : (
              <div className="histori-list">
                {selected.riwayat.map((trx, index) => (
                  <div key={trx.id || index} className="histori-item">
                    <div><h4>{formatRupiah(Number(trx.jumlah || 0))}</h4><p>{formatTanggalJam(trx.tanggal)}</p></div>
                    <span>{trx.admin_name || "Petugas"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="kas-card">
        <div className="section-title"><div><p>Laporan Kas</p><h3>Input & Output Keuangan</h3></div><span className="count-badge">{kas?.tahun_aktif || tahunAktif}</span></div>
        <div className="kas-balance"><p>Saldo Kas Berjalan</p><h2>{formatRupiah(kas?.ringkasan?.saldo_kas || 0)}</h2></div>
        <div className="kas-grid">
          <div><p>Total Pemasukan</p><strong className="green-text">{formatRupiah(kas?.ringkasan?.total_pemasukan || 0)}</strong></div>
          <div><p>Total Pengeluaran</p><strong className="red-text">{formatRupiah(kas?.ringkasan?.total_pengeluaran || 0)}</strong></div>
        </div>
        <div className="kas-grid">
          <div><p>Masuk Periode</p><strong>{formatRupiah(kas?.ringkasan?.total_pemasukan_periode || 0)}</strong></div>
          <div><p>Keluar Periode</p><strong>{formatRupiah(kas?.ringkasan?.total_pengeluaran_periode || 0)}</strong></div>
        </div>
        <div className="kas-history">
          <div className="section-title small"><div><p>Riwayat Manual</p><h3>Catatan Kas Terbaru</h3></div></div>
          {!kas?.riwayat_manual?.length ? (
            <div className="empty-box"><div>📭</div><h4>Belum ada catatan kas manual</h4><p>Data pemasukan/pengeluaran manual belum tersedia.</p></div>
          ) : (
            <div className="kas-list">
              {kas.riwayat_manual.map((item) => (
                <div key={item.id} className="kas-item">
                  <div><h4>{item.kategori}</h4><p>{formatTanggal(item.tanggal)}{item.keterangan ? ` • ${item.keterangan}` : ""}</p></div>
                  <strong className={item.jenis === "pemasukan" ? "green-text" : "red-text"}>{item.jenis === "pemasukan" ? "+" : "-"}{formatRupiah(Number(item.nominal || 0))}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .page { min-height: 100vh; padding: 20px; padding-bottom: 40px; background: #f4f8ff; background-image: radial-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px); background-size: 18px 18px; color: #111827; position: relative; overflow: hidden; }
        .blue-bg { position: absolute; top: 0; left: 0; right: 0; height: 210px; background: linear-gradient(180deg, #0f6fff 0%, #1677ff 70%, rgba(22, 119, 255, 0.04) 100%); border-bottom-left-radius: 34px; border-bottom-right-radius: 34px; z-index: 0; }
        .header { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .back-btn { width: 42px; height: 42px; border-radius: 15px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.16); color: #fff; font-size: 22px; cursor: pointer; flex-shrink: 0; }
        .header-text { flex: 1; min-width: 0; text-align: center; }
        .header-text p { margin: 0; font-size: 11px; color: rgba(255,255,255,.78); font-weight: 800; }
        .header-text h1 { margin: 2px 0 0; color: #fff; font-size: 21px; font-weight: 900; }
        .year-badge { min-width: 42px; height: 42px; border-radius: 15px; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.25); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; flex-shrink: 0; }
        .hero-card, .list-card, .detail-card, .card, .kas-card { position: relative; z-index: 2; background: #fff; border-radius: 24px; border: 1px solid rgba(226,232,240,.95); box-shadow: 0 10px 25px rgba(15,23,42,.05); }
        .hero-card { margin-top: 22px; padding: 18px; box-shadow: 0 18px 40px rgba(37,99,235,.14); }
        .hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
        .mini-title { margin: 0; color: #1677ff; font-size: 12px; font-weight: 900; }
        .hero-card h2 { margin: 5px 0 0; color: #111827; font-size: 25px; line-height: 1.15; font-weight: 900; }
        .hero-card span { display: block; margin-top: 8px; color: #64748b; font-size: 12px; line-height: 1.5; font-weight: 700; }
        .hero-icon { width: 50px; height: 50px; border-radius: 18px; background: #eaf4ff; display: flex; align-items: center; justify-content: center; font-size: 23px; flex-shrink: 0; }
        .stats-row, .meta-grid, .progress-row, .kas-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
        .stats-row div, .meta-grid div, .progress-row div, .kas-grid div, .summary-card { padding: 12px; border-radius: 17px; background: #f8fafc; border: 1px solid #eef2f7; }
        .stats-row p, .meta-grid p, .progress-row span, .kas-grid p, .summary-card p { margin: 0; color: #94a3b8; font-size: 11px; font-weight: 800; }
        .stats-row strong, .meta-grid strong, .progress-row strong, .kas-grid strong { display: block; margin-top: 5px; color: #111827; font-size: 14px; font-weight: 900; }
        .search-box { position: relative; z-index: 2; margin-top: 16px; padding: 14px 16px; border-radius: 22px; background: #fff; border: 1px solid rgba(226,232,240,.95); box-shadow: 0 10px 25px rgba(15,23,42,.06); display: flex; align-items: center; gap: 10px; }
        .search-box input { width: 100%; border: none; outline: none; background: transparent; color: #111827; font-size: 14px; font-weight: 700; }
        .search-box input::placeholder { color: #9ca3af; }
        .list-card, .detail-card, .card, .kas-card { margin-top: 14px; padding: 17px; }
        .section-title, .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .section-title p, .detail-header p { margin: 0; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; }
        .section-title h3, .detail-header h3 { margin: 4px 0 0; color: #111827; font-size: 17px; line-height: 1.3; font-weight: 900; }
        .detail-header span { display: inline-flex; margin-top: 6px; padding: 5px 9px; border-radius: 999px; background: #eff6ff; color: #1677ff; font-size: 11px; font-weight: 900; }
        .count-badge, .detail-status { min-width: 34px; height: 34px; border-radius: 14px; background: #eff6ff; color: #1677ff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; flex-shrink: 0; }
        .detail-status.success { background: #dcfce7; color: #16a34a; }
        .detail-status.danger { background: #fee2e2; color: #dc2626; }
        .empty-box { margin-top: 14px; padding: 24px 14px; border-radius: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; }
        .empty-box div { font-size: 24px; }
        .empty-box h4 { margin: 8px 0 0; color: #111827; font-size: 14px; font-weight: 900; }
        .empty-box p { margin: 5px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; font-weight: 700; }
        .spinner { width: 30px; height: 30px; margin: 0 auto; border-radius: 999px; border: 4px solid #dbeafe; border-top-color: #1677ff; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .warga-list { margin-top: 14px; display: grid; gap: 10px; }
        .warga-card { width: 100%; padding: 13px; border: none; border-radius: 20px; background: #f8fafc; border: 1px solid #eef2f7; display: flex; gap: 11px; align-items: flex-start; text-align: left; cursor: pointer; }
        .warga-card.selected { background: #eff6ff; border-color: #bfdbfe; }
        .avatar { width: 42px; height: 42px; border-radius: 15px; background: linear-gradient(180deg,#1677ff,#0f6fff); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 900; flex-shrink: 0; }
        .warga-info { flex: 1; min-width: 0; }
        .name-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .name-row h4 { margin: 0; color: #111827; font-size: 15px; line-height: 1.3; font-weight: 900; }
        .warga-info p { margin: 4px 0 0; color: #64748b; font-size: 12px; font-weight: 700; }
        .warga-info small { display: block; margin-top: 4px; color: #94a3b8; font-size: 11px; font-weight: 700; }
        .badge { padding: 5px 8px; border-radius: 999px; font-size: 10px; font-weight: 900; white-space: nowrap; }
        .badge.aktif { background: rgba(34,197,94,.12); color: #16a34a; }
        .badge.nonaktif { background: rgba(239,68,68,.12); color: #dc2626; }
        .detail-wrap { position: relative; z-index: 2; scroll-margin-top: 18px; }
        .summary-grid { position: relative; z-index: 2; margin-top: 14px; display: grid; grid-template-columns: 1fr .8fr 1fr; gap: 9px; }
        .summary-card.primary { background: linear-gradient(180deg,#1677ff,#0f6fff); border: none; }
        .summary-card.primary p { color: rgba(255,255,255,.78); }
        .summary-card h3 { margin: 6px 0 0; color: #111827; font-size: 14px; line-height: 1.25; font-weight: 900; }
        .summary-card.primary h3 { color: #fff; }
        .green-text { color: #16a34a !important; }
        .red-text { color: #dc2626 !important; }
        .progress-bg { margin-top: 12px; height: 9px; border-radius: 999px; background: #e8eefb; overflow: hidden; }
        .progress-fill { height: 9px; border-radius: 999px; background: linear-gradient(90deg,#1677ff,#38bdf8); }
        .tunggakan-list, .histori-list, .kas-list { margin-top: 14px; display: grid; gap: 9px; }
        .tunggakan-item { padding: 12px; border-radius: 18px; background: #fff7ed; border: 1px solid #fed7aa; display: flex; align-items: center; gap: 11px; }
        .week-pill { width: 38px; height: 38px; border-radius: 14px; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; flex-shrink: 0; }
        .tunggakan-item h4, .histori-item h4, .kas-item h4 { margin: 0; color: #111827; font-size: 13px; font-weight: 900; }
        .tunggakan-item p { margin: 4px 0 0; color: #ea580c; font-size: 12px; font-weight: 900; }
        .show-more-btn { width: 100%; margin-top: 12px; padding: 12px; border: none; border-radius: 999px; background: #eff6ff; color: #1677ff; font-size: 12px; font-weight: 900; cursor: pointer; }
        .histori-item, .kas-item { padding: 13px; border-radius: 18px; background: #f8fafc; border: 1px solid #eef2f7; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .histori-item p, .kas-item p { margin: 4px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.4; font-weight: 700; }
        .histori-item span { padding: 7px 10px; border-radius: 999px; background: #eff6ff; color: #1677ff; font-size: 11px; font-weight: 900; white-space: nowrap; }
        .kas-card { margin-top: 16px; }
        .kas-balance { margin-top: 14px; padding: 16px; border-radius: 20px; background: linear-gradient(180deg,#1677ff,#0f6fff); color: #fff; }
        .kas-balance p { margin: 0; color: rgba(255,255,255,.78); font-size: 12px; font-weight: 800; }
        .kas-balance h2 { margin: 7px 0 0; color: #fff; font-size: 25px; line-height: 1.2; font-weight: 900; }
        .kas-grid { grid-template-columns: 1fr 1fr; }
        .kas-history { margin-top: 16px; }
        .section-title.small h3 { font-size: 15px; }
        .kas-item strong { font-size: 12px; font-weight: 900; white-space: nowrap; }
        @media (max-width: 360px) { .summary-grid, .stats-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
