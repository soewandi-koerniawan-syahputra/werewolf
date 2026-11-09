"use strict";

// ---------- Data role ----------
// Isi 'desc' nanti bisa diganti dengan keterangan role masing-masing.
const ROLE_NAMES = {
  good: ["Villager", "Witch", "Virginia Wolf", "Troublemaker", "The Count", "Seer", "Spellcaster",
    "Sasquatch", "Revealer", "Priest", "Mentalist", "Mystic Seer", "Mad Bomber", "Drunk", "Hunter",
    "Leprechaun", "Cursed", "Bodyguard", "Cupid", "Doppelganger"],
  other: ["Vampire", "Tanner", "The Blob", "Nostradamus", "Cult Leader", "Chupacabra", "Count Dracula"],
  bad: ["Werewolf", "Alpha Wolf", "Dire Wolf", "Fruit Brute", "Dream Wolf", "Wolf cub"],
};
const ROLE_DESC = {
  // Good
  "Villager": "Kamu adalah warga desa biasa.",
  "Witch": "Kamu adalah warga desa yang mempunyai dua kekuatan. satu untuk mengetahui siapa yang akan mati dan menyelamatkan salah satu-nya. kedua untuk membunuh satu pemain.",
  "Virginia Wolf": "Kamu hanya warga desa biasa. Pada malam pertama pilih satu pemain. Jika kamu mati, Pemain tersebut juga akan mati.",
  "Troublemaker": "Kamu adalah warga desa biasa. Kamu memiliki satu kesempatan untuk mengganti role 2 pemain.",
  "The Count": "Kamu adalah warga desa biasa. Pada malam pertama, kamu dapat mengetahui jumlah Werewolf yang ada di dalam desa.",
  "Seer": "Kamu adalah warga desa yang tiap malam dapat melihat satu pemain apakah dia Werewolf atau bukan.",
  "Spellcaster": "Kamu adalah warga desa yang tiap malam dapat memilih satu pemain, agar bisu pada hari berikutnya.",
  "Sasquatch": "Kamu adalah warga desa biasa. Jika ada suatu hari yang tanpa korban voting, Kamu akan menjadi Bad Side.",
  "Revealer": "Kamu adalah warga desa biasa. Tiap malam, kamu boleh memilih satu pemain. Jika dia Werewolf, pemain itu akan mati. Jika bukan, kamu yang akan mati.",
  "Priest": "Kamu adalah warga desa biasa. Pada malam kedua, pilih satu pemain agar selalu selamat dari serangan malam.",
  "Mentalist": "Kamu adalah warga desa yang tiap malam dapat melihat antara dua pemain apakah dia satu Side yang sama atau tidak.",
  "Mystic Seer": "Kamu adalah warga desa biasa. Setiap malam kamu dapat mengetahui Role pemain lain.",
  "Mad Bomber": "Kamu adalah warga desa biasa. Jika kamu mati, pemain di sebelah kanan dan kiri-mu ikut mati.",
  "Drunk": "Hingga malam keempat kamu adalah warga desa biasa. Setelah itu, Role mu akan berubah.",
  "Hunter": "Kamu adalah warga desa biasa. Jika kamu mati, kamu bisa membunuh satu pemain lain.",
  "Leprechaun": "Kamu adalah warga desa biasa. Tiap malam kamu dapat mengalihkan serangan Werewolf ke arah kanan atau kiri.",
  "Cursed": "Kamu adalah warga desa biasa. Jika kamu dibunuh Werewolf, Kamu akan menjadi Werewolf pada malam berikutnya.",
  "Bodyguard": "Kamu adalah warga desa yang tiap malam dapat melindungi satu pemain berbeda dari serangan malam.",
  "Cupid": "Kamu adalah warga desa biasa. Pada malam pertama, pilih antara dua pemain untuk menjadi pasangan. Jika salah satunya mati, pasangannya akan ikut mati.",
  "Doppelganger": "Kamu adalah warga desa biasa. Pada malam pertama, pilih satu pemain. Jika suatu saat pemain itu mati, kamu akan mengambil Role pemain tersebut.",
  // Other
  "Vampire": "Kamu terlihat seperti warga biasa. Tiap malam bunuh satu pemain.",
  "Tanner": "Kamu terlihat seperti warga biasa. Kamu menang jika kamu terkena voting eliminasi.",
  "The Blob": "Kamu terlihat seperti warga biasa. Tiap malam, pemain disebelah kananmu akan menjadi bagian dari dirimu. Kamu menang jika seluruh desa menjadi bagian dari dirimu.",
  "Nostradamus": "Kamu terlihat seperti warga biasa. Pada awal permainan, kamu harus prediksi Side mana yang akan menang. Kamu menang jika prediksimu benar dan masih hidup.",
  "Cult Leader": "Kamu terlihat seperti warga biasa. Tiap malam pilih satu pemain agar masuk ke sekte. Kamu menang jika semua warga desa sudah masuk sekte.",
  "Chupacabra": "Kamu terlihat seperti warga biasa. Tiap malam, Bunuh para Werewolf. Kamu bisa membunuh warga biasa hanya jika semua Werewolf telah mati.",
  "Count Dracula": "Kamu terlihat seperti warga biasa. Tiap malam pilih satu pemain untuk menjadi istrimu. Kamu menang jika kamu berhasil mempunyai 3 istri.",
  // Bad
  "Werewolf": "Tiap malam, bangun bersama Werewolf lain-nya dan bunuh semua warga desa.",
  "Alpha Wolf": "Tiap malam, bangun bersama para Werewolf. Jika kamu mati, kamu merubah satu warga desa menjadi Werewolf.",
  "Dire Wolf": "Tiap malam, bangun bersama para Werewolf. Pada malam pertama pilih satu pemain lain, Kamu dan pemain tersebut akan mati jika salah satu diantara kalian mati.",
  "Fruit Brute": "Tiap malam, bangun bersama para Werewolf. Jika kamu Werewolf terakhir, kamu tidak bisa membunuh warga.",
  "Dream Wolf": "Kamu tidak bangun bersama para Werewolf. Kamu akan bangun bersama Werewolf, jika ada satu Werewolf yang mati.",
  "Wolf cub": "Tiap malam, bangun bersama para Werewolf. Jika kamu mati, pada malam berikutnya Werewolf dapat membunuh tambahan satu mangsa.",
};

const ROLES = {};
for (const side of Object.keys(ROLE_NAMES)) {
  for (const name of ROLE_NAMES[side]) ROLES[name] = { name, side, desc: ROLE_DESC[name] || "Keterangan role belum diisi." };
}
const SIDE_LABEL = { good: "Good Side", bad: "Bad Side", other: "Other Side" };

// ---------- State ----------
let players = JSON.parse(localStorage.getItem("ww_players") || "[]");
// player: { id, name, role: string|null, killed: bool, muted: bool }
const save = () => localStorage.setItem("ww_players", JSON.stringify(players));
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const find = (id) => players.find((p) => p.id === id);

const resetStatus = (p) => { p.killed = p.votedOut = p.muted = p.protected = p.blobed = p.culted = p.charmed = p.shielded = p.witchSaved = false; };
const alive = (p) => !p.killed && !p.votedOut;

// ---------- Render ----------
// Versi ringkas untuk List Pemain: hanya nama + tombol hapus
function compactHtml(p) {
  return `<li class="mini ${alive(p) ? "" : "dead"}">
    <span class="name">${esc(p.name)}</span>
    <button class="small danger" data-act="remove" data-id="${p.id}" title="Hapus pemain">✕</button>
  </li>`;
}

function playerHtml(p, withRole) {
  const role = p.role ? esc(p.role) : "<i>belum ada role</i>";
  return `<li class="player ${alive(p) ? "" : "dead"}">
    <div class="top">
      <span class="name">${esc(p.name)}
        ${p.killed ? '<span class="tag killed">Killed</span>' : ""}
        ${p.votedOut ? '<span class="tag voted">Voted out</span>' : ""}
        ${p.muted ? '<span class="tag muted">Muted</span>' : ""}
        ${p.protected ? '<span class="tag protected">Protected</span>' : ""}
        ${p.blobed ? '<span class="tag blobed">Blobed</span>' : ""}
        ${p.culted ? '<span class="tag culted">Culted</span>' : ""}
        ${p.charmed ? '<span class="tag charmed">Charmed</span>' : ""}
        ${p.shielded ? '<span class="tag shielded">Shielded</span>' : ""}
        ${p.witchSaved ? '<span class="tag witchSaved">Saved</span>' : ""}
      </span>
      <button class="small danger" data-act="remove" data-id="${p.id}" title="Hapus pemain">✕</button>
    </div>
    ${withRole ? `<div class="role">Role: ${role}</div>` : ""}
    <div class="row">
      <button class="small" data-act="reveal" data-id="${p.id}" ${p.role ? "" : "disabled"}>Reveal</button>
      <button class="small secondary" data-act="change" data-id="${p.id}">Change</button>
      <button class="small ${p.killed ? "on" : "secondary"}" data-act="killed" data-id="${p.id}">Killed</button>
      <button class="small ${p.votedOut ? "on" : "secondary"}" data-act="votedOut" data-id="${p.id}">Voted out</button>
      <button class="small ${p.muted ? "on" : "secondary"}" data-act="muted" data-id="${p.id}">Muted</button>
      <button class="small ${p.protected ? "on" : "secondary"}" data-act="protected" data-id="${p.id}">Protected</button>
      <button class="small ${p.blobed ? "on" : "secondary"}" data-act="blobed" data-id="${p.id}">Blobed</button>
      <button class="small ${p.culted ? "on" : "secondary"}" data-act="culted" data-id="${p.id}">Culted</button>
      <button class="small ${p.charmed ? "on" : "secondary"}" data-act="charmed" data-id="${p.id}">Charmed</button>
      <button class="small ${p.shielded ? "on" : "secondary"}" data-act="shielded" data-id="${p.id}">Shielded</button>
    </div>
  </li>`;
}

function render() {
  const countText = (list) => `Sisa ${list.filter(alive).length} / ${list.length}`;
  $("playerCount").textContent = countText(players);
  $("playerList").innerHTML = players.map(compactHtml).join("");
  for (const side of ["good", "bad", "other"]) {
    const list = players.filter((p) => p.role && ROLES[p.role].side === side);
    $(side + "List").innerHTML = list.map((p) => playerHtml(p, true)).join("");
    $(side + "Count").textContent = countText(list);
    // Role tersisa (pemain yang masih hidup), dihitung per role
    const tally = {};
    list.filter(alive).forEach((p) => { (tally[p.role] = tally[p.role] || []).push(p); });
    // Nama pemain + semua tag status yang sedang aktif
    const STATUS = [["muted", "Muted"], ["protected", "Protected"], ["shielded", "Shielded"],
      ["witchSaved", "Saved"], ["blobed", "Blobed"], ["culted", "Culted"], ["charmed", "Charmed"]];
    const who = (p) => `<span class="pl">${esc(p.name)}` + STATUS.filter(([k]) => p[k])
      .map(([k, label]) => ` <span class="tag ${k}">${label}</span>`).join("") + "</span>";
    const names = ROLE_NAMES[side].filter((r) => tally[r]);
    $(side + "Remain").innerHTML = names.length
      ? names.map((r) => `<li><span>${esc(r)}<small class="who">${tally[r].map(who).join("")}</small></span><b>×${tally[r].length}</b></li>`).join("")
      : "<li><i>Tidak ada</i></li>";
  }
  save();
  if (typeof renderGame === "function") renderGame();
}

// ---------- Modal ----------
// secret=true: latar belakang di-blur dan digelapkan penuh agar tidak terbaca pemain lain
function openModal(html, secret = false) {
  $("modalContent").innerHTML = html;
  $("modal").classList.toggle("secret", secret);
  $("modal").hidden = false;
}
function closeModal() { $("modal").hidden = true; $("modal").classList.remove("secret"); $("modalContent").innerHTML = ""; }
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Pemilih role berwarna per side (Good hijau, Bad merah, Other kuning)
function rolePicker(selected) {
  return `<div id="picker">` + Object.keys(ROLE_NAMES).map((side) =>
    `<div class="grp ${side}"><div class="group-title">${SIDE_LABEL[side]}</div><div class="chips">` +
    ROLE_NAMES[side].map((r) =>
      `<button type="button" class="chip ${side} ${r === selected ? "sel" : ""}" data-pick="${esc(r)}">${esc(r)}</button>`).join("") +
    `</div></div>`).join("") + `</div>`;
}
// Aktifkan klik pada picker, kembalikan fungsi untuk membaca pilihan saat ini
function bindPicker(selected) {
  let current = selected || null;
  $("picker").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    current = b.dataset.pick;
    $("picker").querySelectorAll(".chip").forEach((c) => c.classList.toggle("sel", c === b));
  });
  return { get: () => current, set: (v) => { current = v; $("picker").querySelectorAll(".chip").forEach((c) => c.classList.toggle("sel", c.dataset.pick === v)); } };
}

// ---------- Aksi ----------
$("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("nameInput").value.trim();
  if (!name) return;
  players.push({ id: crypto.randomUUID(), name, role: null, killed: false, muted: false, protected: false, blobed: false, culted: false });
  $("nameInput").value = "";
  render();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const p = find(btn.dataset.id);
  if (!p) return;
  const act = btn.dataset.act;
  if (act === "remove") { if (confirm(`Hapus ${p.name}?`)) { players = players.filter((x) => x !== p); render(); } }
  else if (act === "killed") { p.killed = !p.killed; if (p.killed) afterDeathToggle(); render(); }
  else if (act === "votedOut") { if (!p.votedOut && typeof canVoteOut === "function" && !canVoteOut()) return alert("Voted out tidak bisa saat ini: Round 1 tidak ada voting, atau hari ini sudah ada pemain yang di-vote out (maksimal 1)."); p.votedOut = !p.votedOut; if (p.votedOut) afterDeathToggle(); render(); }
  else if (["muted", "protected", "blobed", "culted", "charmed", "shielded"].includes(act)) { p[act] = !p[act]; render(); }
  else if (act === "change") openChange(p);
  else if (act === "reveal") openReveal(p);
});

// Change role di tengah permainan
function openChange(p) {
  openModal(`<h3>Change role: ${esc(p.name)}</h3>
    ${rolePicker(p.role)}
    <div class="modal-actions">
      <button class="secondary" id="cancelBtn">Batal</button>
      <button id="okBtn">Simpan</button>
    </div>`);
  const pick = bindPicker(p.role);
  $("cancelBtn").onclick = closeModal;
  $("okBtn").onclick = () => {
    if (pick.get()) p.role = pick.get();
    if (typeof refreshSteps === "function") refreshSteps(); // role baru langsung ikut dibangunkan malam ini
    closeModal();
    render();
  };
}

// Reveal: 2 langkah supaya pemain lain tidak melihat tanpa sengaja
function openReveal(p) {
  openModal(`<h3>Reveal untuk ${esc(p.name)}</h3>
    <p>Pastikan hanya <b>${esc(p.name)}</b> yang melihat layar, lalu tekan tombol di bawah.</p>
    <div class="modal-actions">
      <button class="secondary" id="cancelBtn">Batal</button>
      <button id="showBtn">Tampilkan Role</button>
    </div>`, true);
  $("cancelBtn").onclick = closeModal;
  $("showBtn").onclick = () => {
    const r = ROLES[p.role];
    openModal(`<h3>${esc(p.name)}</h3>
      <div class="reveal-role">${esc(r.name)}</div>
      <div class="reveal-side">${SIDE_LABEL[r.side]}</div>
      <p class="reveal-desc">${esc(r.desc)}</p>
      <div class="modal-actions"><button id="hideBtn">Sembunyikan</button></div>`, true);
    $("hideBtn").onclick = closeModal;
  };
}

// Manual: pilih pemain + pilih kartu
$("manualBtn").addEventListener("click", () => {
  if (!players.length) return alert("Tambahkan pemain dulu.");
  openModal(`<h3>Manual</h3>
    <label>Pemain<br><select id="mPlayer">${players.map((p) =>
      `<option value="${p.id}">${esc(p.name)}${p.role ? " (" + esc(p.role) + ")" : ""}</option>`).join("")}</select></label>
    <p style="margin-bottom:0">Kartu:</p>
    ${rolePicker()}
    <div class="modal-actions">
      <button class="secondary" id="cancelBtn">Tutup</button>
      <button id="okBtn">Set Role</button>
    </div>`);
  const pick = bindPicker();
  $("cancelBtn").onclick = closeModal;
  $("okBtn").onclick = () => {
    if (!pick.get()) return alert("Pilih kartu dulu.");
    const p = find($("mPlayer").value);
    p.role = pick.get();
    pick.set(null);
    const idx = $("mPlayer").selectedIndex;
    render();
    // lanjut ke pemain berikutnya
    $("mPlayer").innerHTML = players.map((q) =>
      `<option value="${q.id}">${esc(q.name)}${q.role ? " (" + esc(q.role) + ")" : ""}</option>`).join("");
    $("mPlayer").selectedIndex = Math.min(idx + 1, players.length - 1);
  };
});

// Random card
// Susunan kartu terakhir yang dipakai di Random Card (dipakai ulang oleh Rematch)
const loadDeck = () => JSON.parse(localStorage.getItem("ww_deck") || "null");

// Bagikan kartu secara acak sesuai counts { role: jumlah }; sisa pemain jadi Villager
function dealDeck(counts) {
  const deck = [];
  Object.keys(counts).forEach((r) => { for (let n = 0; n < counts[r]; n++) deck.push(r); });
  if (deck.length > players.length) { alert(`Jumlah kartu (${deck.length}) melebihi jumlah pemain (${players.length}).`); return false; }
  while (deck.length < players.length) deck.push("Villager");
  // Fisher-Yates dengan crypto
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  endGame();
  players.forEach((p, i) => { p.role = deck[i]; resetStatus(p); });
  render();
  return true;
}

$("rematchBtn").addEventListener("click", () => {
  const counts = loadDeck();
  if (!counts) return alert("Belum ada susunan kartu. Gunakan Random Card dulu.");
  if (!players.length) return alert("Tambahkan pemain dulu.");
  if (!confirm("Rematch: acak ulang semua kartu dengan susunan sebelumnya? Match & status saat ini direset.")) return;
  dealDeck(counts);
});

$("randomBtn").addEventListener("click", () => {
  if (!players.length) return alert("Tambahkan pemain dulu.");
  const saved = loadDeck() || {};
  const groups = Object.keys(ROLE_NAMES).map((side) =>
    `<div class="grp ${side}"><div class="group-title">${SIDE_LABEL[side]}</div>` + ROLE_NAMES[side].map((r) =>
      `<div class="card-row"><span>${esc(r)}</span>
        <input type="number" min="0" value="${saved[r] || 0}" data-role="${esc(r)}" aria-label="Jumlah ${esc(r)}"></div>`).join("") + "</div>").join("");
  openModal(`<h3>Random Card</h3>
    <p>Total kartu: <b id="total">${Object.values(saved).reduce((a, b) => a + b, 0)}</b> / ${players.length} pemain. Sisa pemain otomatis jadi Villager.</p>
    <div class="error" id="err"></div>
    ${groups}
    <div class="modal-actions">
      <button class="secondary" id="cancelBtn">Batal</button>
      <button id="okBtn">Acak</button>
    </div>`);
  const inputs = () => [...document.querySelectorAll("#modalContent input[data-role]")];
  const total = () => inputs().reduce((s, i) => s + (parseInt(i.value, 10) || 0), 0);
  const update = () => {
    const t = total();
    $("total").textContent = t;
    $("err").textContent = t > players.length ? "Jumlah kartu melebihi jumlah pemain." : "";
  };
  inputs().forEach((i) => i.addEventListener("input", update));
  $("cancelBtn").onclick = closeModal;
  $("okBtn").onclick = () => {
    if (total() > players.length) return update();
    const counts = {};
    inputs().forEach((i) => { const n = parseInt(i.value, 10) || 0; if (n > 0) counts[i.dataset.role] = n; });
    localStorage.setItem("ww_deck", JSON.stringify(counts)); // simpan untuk Rematch
    closeModal();
    dealDeck(counts);
  };
});

$("resetRolesBtn").addEventListener("click", () => {
  if (!confirm("Reset semua role & status?")) return;
  endGame();
  players.forEach((p) => { p.role = null; resetStatus(p); });
  render();
});
$("resetAllBtn").addEventListener("click", () => {
  if (!confirm("Hapus semua pemain?")) return;
  endGame();
  players = [];
  render();
});

render();
