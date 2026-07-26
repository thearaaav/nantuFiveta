# nantuFive 🤖

Bot Discord untuk membantu manajemen tugas kelas, pengingat deadline, dan pencatatan tugas secara otomatis.

## ✨ Fitur

### 📚 Manajemen Tugas

* Menambahkan tugas baru menggunakan `/tugas add`
* Mengedit tugas menggunakan `/tugas edit`
* Menghapus tugas menggunakan `/tugas delete`
* Sistem konfirmasi sebelum tugas ditambahkan atau dihapus
* Task board otomatis untuk daftar tugas kelas

### 🔔 Sistem Reminder

Bot akan memberikan pengingat deadline secara otomatis:

| Sisa Waktu | Reminder             |
| ---------- | -------------------- |
| H-14       | ✅ Reminder           |
| H-7        | ✅ Reminder           |
| H-3        | ✅ Reminder           |
| H-1        | ✅ Reminder           |
| Hari H     | ❌ Tidak ada reminder |

Jadwal reminder:

* H-14 dan H-7 → pukul 10:00
* H-3 dan H-1 → pukul 10:00 dan 18:00

### 🔐 Permission System

* Command tertentu dapat dibatasi berdasarkan role
* Memastikan hanya pihak yang berwenang dapat mengelola tugas

### 📝 Task Board

* Daftar tugas otomatis dalam bentuk embed
* Menampilkan:

  * Nama tugas
  * Deadline
  * ID tugas

---

## 🛠️ Teknologi

* Node.js
* Discord.js
* Railway (Hosting)
* GitHub (Version Control)

---

## 📂 Struktur Project

```
nantuFive/
│
├── src/
│   ├── commands/
│   ├── buttons/
│   ├── services/
│   ├── events/
│   ├── utils/
│   ├── config/
│   └── data/
│
├── package.json
├── deploy-commands.js
└── README.md
```

---

## ⚙️ Instalasi Lokal

Clone repository:

```bash
git clone https://github.com/username/nantuFive-bot.git
```

Masuk folder:

```bash
cd nantuFive-bot
```

Install dependency:

```bash
npm install
```

Buat file `.env`:

```env
TOKEN=discord_bot_token
CLIENT_ID=discord_application_id
GUILD_ID=discord_server_id
```

Jalankan bot:

```bash
npm start
```

---

## 🚀 Deployment

Bot dapat dijalankan menggunakan platform hosting seperti Railway.

Environment variable yang dibutuhkan:

```
TOKEN
CLIENT_ID
GUILD_ID
```

---

## 📌 Catatan

* Jangan membagikan token bot Discord.
* File `.env` tidak boleh di-upload ke repository.
* Backup data tugas secara berkala karena sistem penyimpanan saat ini menggunakan JSON.

---

## 👨‍💻 Developer

Dibuat untuk kebutuhan manajemen tugas kelas menggunakan Discord.

**nantuFive**
