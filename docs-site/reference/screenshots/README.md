# Reference Screenshots

Folder ini berisi screenshot dari sistem lain yang dipakai sebagai **referensi visual** oleh tim Seraya. Bukan aset produksi, bukan UI yang akan diimplementasikan.

## Daftar file

| File | Sumber | Konten | Tujuan arsip |
|------|--------|--------|--------------|
| `ibunda-mockup-profil-alamat.jpg` | Ibunda.id (layanan konseling lain) | Mockup form intake **Profil Saya** + **Alamat Saya** (nama, TTL, jenis kelamin, pekerjaan, pendidikan, no. WA, status, agama, negara, provinsi, kota, alamat) | Referensi data klien yang biasa dikumpulkan platform konseling |
| `ibunda-mockup-konseling-pembayaran.jpg` | Ibunda.id (layanan konseling lain) | Mockup form konseling: metode (chat/voice/video), email, topik, deskripsi masalah, harapan, informed consent checkbox, tombol lanjut pembayaran | Referensi alur konseling + payment gate |

## Catatan penting

- **Bukan acuan implementasi.** Seraya punya scope intake yang lebih minimal — lihat [[../baseline/CONTEXT]] (minimum: nama + email + consent; phone opsional). Field-field tambahan di screenshot Ibunda (TTL, JK, pekerjaan, pendidikan, agama, alamat) sengaja tidak dikumpulkan di MVP kecuali di-trigger oleh PRD eksplisit.
- **Bisa dihapus kapan saja.** Folder ini hanya arsip visual. Jika dianggap tidak relevan, hapus folder dan commit — tidak ada sistem lain yang bergantung padanya.
- **Bukan endorsement.** Penyimpanan screenshot ini bukan pernyataan bahwa Seraya mengadopsi UI/UX Ibunda. Hanya referensi "apa yang biasa ditanyakan platform lain".