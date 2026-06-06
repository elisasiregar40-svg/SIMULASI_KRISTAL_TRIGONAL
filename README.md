# Simulasi Kristal Trigonal

Ringkasan singkat:
- Visualisasi 3D struktur kristal trigonal menggunakan Three.js
- Kontrol interaktif: a, c, radius atom, tampilkan/ sembunyikan sel/atom
- Tombol `Unduh PNG` untuk menyimpan tampilan saat ini

Cara menjalankan (direkomendasikan server lokal sederhana):

```powershell
python -m http.server 8000
# buka http://localhost:8000/ di browser
```

Atau buka `index.html` langsung jika browser Anda memperbolehkan.

File utama:
- `index.html` — UI dan kontrol
- `style.css` — styling
- `script.js` — scene Three.js dan logika interaksi

Butuh fitur tambahan seperti ekspor GLTF, label atom, atau anotasi? Beri tahu saya fitur mana yang mau ditambahkan.