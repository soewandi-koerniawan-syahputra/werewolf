"use strict";
// Match Play: alur malam per round (Bad -> Other -> Good), ringkasan, lalu siang.
// Bergantung pada global dari app.js: players, find, alive, ROLES, ROLE_NAMES, ROLE_DESC, SIDE_LABEL, esc, $, render.

// Mulai round ini Drunk boleh Change Card; role baru berlaku setelah malam itu dan aktif mulai malam berikutnya
const DRUNK_FROM_ROUND = 3;
const WOLF_ROLES = ["Werewolf", "Alpha Wolf", "Dire Wolf", "Fruit Brute", "Wolf cub"];
const OTHER_ORDER = [
  { role: "Vampire", action: "kill", label: "Kill" },
  { role: "The Blob", action: "blobed", label: "Blobed" },
  { role: "Chupacabra", action: "kill", label: "Kill" },
  { role: "Cult Leader", action: "culted", label: "Culted" },
  { role: "Count Dracula", action: "charmed", label: "Charmed" },
];

// game: { round, phase: "night"|"summary"|"day", step, steps, night:{actions,witch}, links, witch, notes, lastSummary, prevShield, shieldPick }
let game = JSON.parse(localStorage.getItem("ww_game") || "null");
if (game) { game.handled = game.handled || []; game.pending = game.pending || []; game.night.extra = game.night.extra || {}; }
const saveGame = () => (game ? localStorage.setItem("ww_game", JSON.stringify(game)) : localStorage.removeItem("ww_game"));
const nameOf = (id) => { const p = find(id); return p ? p.name : "?"; };
const isBad = (p) => !!(p && p.role && ROLES[p.role].side === "bad");

// ---------- Susunan langkah malam ----------
function buildSteps(round) {
  const steps = [];
  const A = (r) => players.filter((p) => p.role === r && alive(p));

  // Drunk: mulai round 4 boleh Change Card, aktif di malam itu juga (langkah ini paling awal)
  if (round >= DRUNK_FROM_ROUND) A("Drunk").forEach((p) => steps.push({ group: "good", type: "drunk", role: "Drunk", actor: p.id }));

  // BAD SIDE (semua wolf kecuali Dream Wolf; Dream Wolf ikut bangun jika ada wolf yang mati)
  const dreamAwake = A("Dream Wolf").length > 0 && players.some((p) => WOLF_ROLES.includes(p.role) && !alive(p));
  const wolves = players.filter((p) => alive(p) && (WOLF_ROLES.includes(p.role) || (dreamAwake && p.role === "Dream Wolf")));
  if (wolves.length) {
    // Fruit Brute sebagai satu-satunya Bad Side yang hidup: tidak boleh membunuh warga (Good Side)
    const badAlive = players.filter((p) => alive(p) && isBad(p));
    const fruitLast = badAlive.length === 1 && badAlive[0].role === "Fruit Brute";
    const hasTarget = !fruitLast || players.some((p) => alive(p) && p.id !== wolves[0].id && ROLES[p.role].side !== "good");
    const extra = round >= 2 ? game.cubExtra || 0 : 0; // Wolf cub mati: tambahan 1 korban
    const canKill = round >= 2 && hasTarget;
    steps.push({
      group: "bad", type: canKill ? "wolf" : "info", role: "Werewolf", actors: wolves.map((p) => p.id),
      count: 1 + extra, noGood: fruitLast,
      note: round < 2 ? "Round 1: Werewolf bangun tetapi belum bisa membunuh."
        : fruitLast && !hasTarget ? "Fruit Brute adalah Werewolf terakhir, tidak bisa membunuh warga."
        : "Werewolf memilih korban."
          + (fruitLast ? " Fruit Brute Werewolf terakhir: tidak bisa membunuh warga (Good Side)." : "")
          + (dreamAwake ? " Dream Wolf ikut bangun karena ada Werewolf yang mati." : "")
          + (extra ? ` Wolf cub sudah mati: boleh membunuh ${1 + extra} korban malam ini.` : ""),
    });
    // Dire Wolf (malam 1): pilih pemain yang akan mati bersamanya
    if (round === 1) A("Dire Wolf").forEach((p) => steps.push({ group: "bad", type: "pick", role: "Dire Wolf", actor: p.id, action: "dire", label: "Pilih" }));
  }

  // Alpha Wolf yang sudah mati: di malam berikutnya dia punya satu kesempatan mengubah satu warga jadi Werewolf.
  // Langkah ini tetap muncul walau tidak ada Werewolf yang hidup, dan berlaku sekali per Alpha Wolf.
  game.alphaDone = game.alphaDone || [];
  players.filter((p) => p.role === "Alpha Wolf" && !alive(p) && !game.alphaDone.includes(p.id) && alphaTargets(p.id).length).forEach((p) => steps.push({
    group: "bad", type: "pick", role: "Alpha Wolf", actor: p.id, action: "alpha", label: "Ubah jadi Werewolf",
    note: "Alpha Wolf sudah mati: malam ini dia punya satu kesempatan mengubah satu pemain (selain komplotan Werewolf) menjadi Werewolf.",
  }));

  // OTHER SIDE (mulai round 2)
  if (round >= 2) {
    // Role kembar dalam satu tim: satu langkah, satu aksi per malam
    for (const o of OTHER_ORDER) {
      const a = A(o.role);
      if (a.length) steps.push({ group: "other", type: "pick", role: o.role, actor: a[0].id, actors: a.map((p) => p.id), action: o.action, label: o.label });
    }
  }

  // GOOD SIDE
  const g = (role, type, extra = {}) => A(role).forEach((p) => steps.push({ group: "good", type, role, actor: p.id, ...extra }));
  const info = (role) => { const a = A(role); if (a.length) steps.push({ group: "good", type: "info", role, actors: a.map((p) => p.id) }); };
  if (round === 1) {
    g("Doppelganger", "pick", { action: "doppel", label: "Pilih" });
    g("Cupid", "cupid");
    g("Nostradamus", "nostra");
    g("Virginia Wolf", "pick", { action: "virginia", label: "Pilih" });
  }
  if (round === 2) g("Priest", "pick", { action: "protect", label: "Protected" });
  if (round >= 2) g("Bodyguard", "pick", { action: "shield", label: "Shielded" });
  g("Seer", "pick", { action: "seer", label: "Lihat" });
  g("The Count", "count");
  g("Spellcaster", "pick", { action: "mute", label: "Muted" });
  g("Mentalist", "mental");
  g("Mystic Seer", "pick", { action: "mystic", label: "Lihat Role" });
  if (round >= 2) {
    g("Revealer", "pick", { action: "reveal", label: "Reveal" });
    info("Leprechaun"); // mekanik pengalihan ditunda: hanya dibangunkan
    if (!game.troubleUsed) g("Troublemaker", "swap"); // sekali seumur game: tukar role 2 pemain
    g("Witch", "witch");
  }
  return steps;
}

function startRound(n) {
  players.forEach((p) => { p.shielded = false; p.witchSaved = false; }); // shielded & saved (Witch) hanya bertahan 1 ronde
  game.prevShield = game.shieldPick || null;
  game.shieldPick = null;
  // muted dari Spellcaster hanya berlaku 1 hari; simpan untuk larangan memilih orang yang sama 2x berturut
  if (game.mutePick) { const m = find(game.mutePick); if (m) m.muted = false; }
  game.prevMute = game.mutePick || null;
  game.mutePick = null;
  // Wolf cub yang mati sejak round lalu: Werewolf dapat 1 korban tambahan di malam ini
  game.cubCounted = game.cubCounted || [];
  const newCubs = players.filter((p) => p.role === "Wolf cub" && !alive(p) && !game.cubCounted.includes(p.id));
  game.cubExtra = newCubs.length;
  newCubs.forEach((p) => game.cubCounted.push(p.id));
  game.round = n;
  game.step = 0;
  game.night = { actions: {}, witch: null, extra: {} };
  game.steps = buildSteps(n);
  game.notes = [];
  game.phase = game.steps.length ? "night" : "summary";
}

// ---------- Resolusi malam ----------
function resolveNight(n, withWitch, withExtra = true) {
  const events = [];
  const dead = new Set();
  const badAlive = players.some((p) => alive(p) && isBad(p));
  let witchSaved = null; // pemain yang diselamatkan Witch malam ini: kebal dari semua kematian lain juga
  const tryKill = (id, by, o = {}) => {
    const t = find(id);
    if (!t || !alive(t)) return;
    if (o.noGood && ROLES[t.role].side === "good") { events.push({ kind: "fail", text: `${t.name} gagal dibunuh ${by} karena Fruit Brute adalah Werewolf terakhir` }); return; }
    if (o.onlyWolf && badAlive && !isBad(t)) { events.push({ kind: "fail", text: `${t.name} gagal dibunuh ${by} karena bukan Werewolf` }); return; }
    if (t.protected) { events.push({ kind: "fail", text: `${t.name} tidak bisa dibunuh karena dilindungi Priest` }); return; }
    if (t.shielded) { events.push({ kind: "fail", text: `${t.name} gagal dibunuh ${by} karena dilindungi Bodyguard` }); return; }
    if (t.witchSaved || witchSaved === t.id) { events.push({ kind: "fail", text: `${t.name} gagal dibunuh ${by} karena dilindungi Witch` }); return; }
    // Cursed diserang Werewolf: tidak mati, menjadi Werewolf malam berikutnya
    if (o.wolfTeam && t.role === "Cursed") {
      events.push({ kind: "convert", target: t.id, role: "Werewolf", text: `${t.name} (Cursed) diserang Werewolf dan menjadi Werewolf malam berikutnya` });
      return;
    }
    // Vampire menyerang Villager: Villager berubah menjadi Vampire (tidak mati)
    if (o.vampire && t.role === "Villager") {
      events.push({ kind: "convert", target: t.id, role: "Vampire", text: `${t.name} (Villager) diserang Vampire dan berubah menjadi Vampire` });
      return;
    }
    events.push({ kind: "death", target: t.id, text: o.text || `${t.name} dibunuh ${by}` });
    dead.add(t.id);
  };

  // Leprechaun: serangan Werewolf ke dirinya dialihkan ke tetangga (kiri/kanan)
  const redirect = {};
  game.steps.forEach((s, i) => { if (s.type === "lepre" && n.actions[i]) redirect[s.actor] = n.actions[i].targets[0]; });

  const bodyguardDeaths = [];
  game.steps.forEach((s, i) => {
    if (s.type === "drunk" && s.done) events.push({ kind: "info", text: `${nameOf(s.actor)} (Drunk) berubah menjadi ${s.done} (aktif mulai malam ke-${game.round + 1})` });
    const a = n.actions[i];
    if (!a) return;
    const ids = a.targets;
    if (s.type === "wolf") {
      ids.forEach((id) => {
        let tid = id;
        const dir = redirect[id];
        if (dir) {
          const nb = neighborOf(id, dir);
          if (nb) {
            events.push({ kind: "info", text: `Serangan Werewolf ke ${nameOf(id)} dialihkan Leprechaun ke ${nameOf(nb)} (${dir === "left" ? "kiri" : "kanan"})` });
            tid = nb;
          }
        }
        tryKill(tid, "para Werewolf", { wolfTeam: true, noGood: s.noGood });
      });
      return;
    }
    if (s.type === "cupid") { events.push({ kind: "info", text: `Cupid (${nameOf(s.actor)}) memasangkan ${nameOf(ids[0])} & ${nameOf(ids[1])}` }); return; }
    if (s.type === "nostra") { events.push({ kind: "info", text: `Nostradamus (${nameOf(s.actor)}) memprediksi ${SIDE_LABEL[ids[0]]} menang` }); return; }
    if (s.type === "swap") {
      const [x, y] = ids.map(find);
      if (x && y && alive(x) && alive(y)) events.push({ kind: "swap", targets: [x.id, y.id], text: `Troublemaker (${nameOf(s.actor)}) menukar role ${x.name} (${x.role}) dengan ${y.name} (${y.role})` });
      return;
    }
    if (s.type !== "pick") return;
    const t = find(ids[0]);
    if (!t) return;
    switch (s.action) {
      case "kill": tryKill(t.id, s.role, { onlyWolf: s.role === "Chupacabra", vampire: s.role === "Vampire" }); break;
      case "mute": events.push({ kind: "status", status: "muted", target: t.id, text: `${t.name} muted oleh Spellcaster` }); break;
      case "blobed": case "culted": case "charmed":
        if (alive(t)) events.push({ kind: "status", status: s.action, target: t.id, text: `${t.name} ${s.action}` });
        break;
      case "shield":
        events.push({ kind: "info", text: `${t.name} dilindungi Bodyguard (shielded)` });
        if (isBad(t)) bodyguardDeaths.push(s.actor);
        break;
      case "protect": events.push({ kind: "info", text: `${t.name} dilindungi Priest (protected)` }); break;
      case "dire": events.push({ kind: "info", text: `Dire Wolf (${nameOf(s.actor)}) memilih ${t.name}: keduanya mati bersama` }); break;
      case "alpha":
        if (alive(t)) events.push({ kind: "convert", target: t.id, role: "Werewolf", alpha: true, by: s.actor, text: `${t.name} diubah menjadi Werewolf oleh ${nameOf(s.actor)} (Alpha Wolf yang sudah mati)` });
        break;
      case "reveal":
        if (isBad(t)) tryKill(t.id, "Revealer");
        else tryKill(s.actor, "Revealer", { text: `${nameOf(s.actor)} mati karena Revealer salah menebak (${t.name} bukan Werewolf)` });
        break;
      case "doppel": events.push({ kind: "info", text: `Doppelganger (${nameOf(s.actor)}) memilih ${t.name}` }); break;
      case "virginia": events.push({ kind: "info", text: `Virginia Wolf (${nameOf(s.actor)}) memilih ${t.name}` }); break;
    }
  });
  // Bodyguard yang melindungi Werewolf akan mati
  bodyguardDeaths.forEach((id) => {
    const b = find(id);
    if (b) tryKill(id, "Werewolf", { text: `${b.name} killed karena melindungi Werewolf` });
  });

  if (withWitch && n.witch) {
    const w = n.witch;
    if (w.mode === "save") {
      events.forEach((e) => { if (e.kind === "death" && e.target === w.target) e.saved = true; });
      dead.delete(w.target);
      witchSaved = w.target;
      events.push({ kind: "info", text: `Witch menyelamatkan ${nameOf(w.target)}` });
    } else if (w.mode === "kill") {
      tryKill(w.target, "Witch");
    }
  }

  // Mad Bomber / Hunter yang mati: korban tambahan dipilih manual di ringkasan
  if (withExtra && n.extra) {
    Object.keys(n.extra).forEach((aid) => {
      const a = find(aid);
      if (!a || !dead.has(aid)) return;
      n.extra[aid].forEach((tid) => tryKill(tid, a.role, { text: `${nameOf(tid)} ikut terbunuh karena ${a.role} (${a.name})` }));
    });
  }
  return { events, dead };
}
// Urutan duduk = urutan di List Pemain (melingkar). Kanan = berikutnya, kiri = sebelumnya (yang masih hidup).
function neighborOf(id, dir) {
  const i = players.findIndex((p) => p.id === id), len = players.length;
  for (let k = 1; k < len; k++) {
    const j = (((i + (dir === "right" ? k : -k)) % len) + len) % len;
    if (alive(players[j])) return players[j].id;
  }
  return null;
}
const evText = (e) => (e.saved ? `${e.text}, tetapi diselamatkan Witch` : e.text);

// Kematian berantai: Cupid, Virginia Wolf, Doppelganger
function cascade() {
  const out = [];
  if (!game) return out;
  // Pemain protected (Priest) atau shielded (Bodyguard) selamat dari kematian berantai; hubungan itu dianggap selesai
  const hit = (t, text, src) => {
    const by = t.protected ? "Priest" : t.shielded ? "Bodyguard" : t.witchSaved ? "Witch" : null;
    if (by) { out.push(`${t.name} selamat dari ${src} karena dilindungi ${by}`); return; }
    t.killed = true;
    out.push(text);
  };
  let changed = true;
  while (changed) {
    changed = false;
    const L = game.links.lovers;
    if (L) {
      const [a, b] = [find(L[0]), find(L[1])];
      if (a && b) {
        if (!alive(a) && alive(b)) { hit(b, `${b.name} ikut mati karena pasangan Cupid (${a.name}) mati`, "pasangan Cupid"); game.links.lovers = null; changed = true; }
        else if (!alive(b) && alive(a)) { hit(a, `${a.name} ikut mati karena pasangan Cupid (${b.name}) mati`, "pasangan Cupid"); game.links.lovers = null; changed = true; }
      }
    }
    const V = game.links.virginia;
    if (V) {
      const f = find(V.from), t = find(V.to);
      if (f && t && !alive(f) && alive(t)) { hit(t, `${t.name} ikut mati karena Virginia Wolf (${f.name}) mati`, "Virginia Wolf"); game.links.virginia = null; changed = true; }
    }
    const DW = game.links.dire;
    if (DW) {
      const [a, b] = [find(DW.from), find(DW.to)];
      if (a && b) {
        if (!alive(a) && alive(b)) { hit(b, `${b.name} ikut mati karena Dire Wolf (${a.name}) mati`, "Dire Wolf"); game.links.dire = null; changed = true; }
        else if (!alive(b) && alive(a)) { hit(a, `${a.name} ikut mati karena Dire Wolf (${b.name}) mati`, "Dire Wolf"); game.links.dire = null; changed = true; }
      }
    }
    const D = game.links.doppel;
    if (D) {
      const f = find(D.from), t = find(D.to);
      if (f && t && alive(f) && !alive(t)) {
        f.role = t.role;
        game.links.doppel = null;
        out.push(`${f.name} (Doppelganger) berubah menjadi ${t.role}`);
        changed = true;
      }
    }
  }
  return out;
}
// Dipanggil app.js saat Killed / Voted out dinyalakan
function afterDeathToggle() {
  if (!game) return;
  const lines = cascade();
  if (lines.length) game.notes.push(...lines);
  collectPending();
}

// Mad Bomber (2 korban) dan Hunter (1 korban) yang mati dan belum memilih korban
const DEATH_TRIGGERS = { "Mad Bomber": 2, "Hunter": 1 };
function collectPending() {
  players.forEach((p) => {
    if (!alive(p) && DEATH_TRIGGERS[p.role] && !game.handled.includes(p.id) && !game.pending.includes(p.id)) game.pending.push(p.id);
  });
}
function resolvePending(id, targets) {
  const a = find(id);
  const lines = [];
  targets.forEach((tid) => {
    const t = find(tid);
    if (!t || !alive(t)) return;
    if (t.protected) { lines.push(`${t.name} selamat dari ${a.role} (${a.name}) karena dilindungi Priest`); return; }
    if (t.shielded) { lines.push(`${t.name} selamat dari ${a.role} (${a.name}) karena dilindungi Bodyguard`); return; }
    if (t.witchSaved) { lines.push(`${t.name} selamat dari ${a.role} (${a.name}) karena dilindungi Witch`); return; }
    t.killed = true;
    lines.push(`${t.name} ikut terbunuh karena ${a.role} (${a.name})`);
  });
  game.handled.push(id);
  game.pending = game.pending.filter((x) => x !== id);
  lines.push(...cascade());
  game.notes.push(...lines);
  collectPending();
}

// Drunk: ganti role dan bangun ulang langkah malam ini agar role baru aktif malam itu juga
function changeDrunk(s, newRole) {
  const p = find(s.actor);
  if (!p) return;
  // Role baru berlaku setelah malam ini (saat ringkasan diterapkan), jadi aktif mulai malam berikutnya
  s.done = newRole;
  game.notes.push(`${p.name} (Drunk) akan berubah menjadi ${newRole} mulai malam ke-${game.round + 1}`);
}

// Bangun ulang langkah malam ini (dipakai saat role berubah di tengah malam, mis. Drunk atau Change manual)
// agar role baru langsung ikut dibangunkan. Aksi yang sudah dipilih dipertahankan.
function refreshSteps() {
  if (!game || game.phase !== "night") return;
  const key = (x) => `${x.type}:${x.role}:${x.actor || ""}`;
  const old = game.steps;
  const drunks = old.filter((x) => x.type === "drunk" && (x.done || (find(x.actor) && find(x.actor).role === "Drunk")));
  const steps = [...drunks, ...buildSteps(game.round).filter((x) => x.type !== "drunk")];
  const acts = {};
  Object.keys(game.night.actions).forEach((i) => {
    const ni = steps.findIndex((x) => key(x) === key(old[i]));
    if (ni >= 0) acts[ni] = game.night.actions[i];
  });
  game.steps = steps;
  game.night.actions = acts;
  game.step = Math.max(0, Math.min(game.step, steps.length - 1));
}

function commitNight() {
  const r = resolveNight(game.night, true);
  r.events.forEach((e) => {
    if (e.kind === "swap") {
      const [x, y] = e.targets.map(find);
      if (x && y) { [x.role, y.role] = [y.role, x.role]; game.troubleUsed = true; }
      return;
    }
    const t = find(e.target);
    if (!t) return;
    if (e.kind === "status") { t[e.status] = true; if (e.status === "muted") game.mutePick = t.id; }
    if (e.kind === "convert") { t.role = e.role; if (e.alpha) { game.alphaDone = game.alphaDone || []; game.alphaDone.push(e.by); } }
  });
  r.dead.forEach((id) => { const t = find(id); if (t) t.killed = true; });
  // Drunk: Change Card berlaku sekarang (aktif mulai malam berikutnya)
  game.steps.forEach((s) => { if (s.type === "drunk" && s.done) { const d = find(s.actor); if (d && d.role === "Drunk") d.role = s.done; } });
  // Bodyguard yang melindungi dirinya sendiri: jatah 1x pertandingan terpakai
  game.steps.forEach((s, i) => {
    const a = game.night.actions[i];
    if (s.action === "shield" && a && a.targets[0] === s.actor) { game.bgSelf = game.bgSelf || {}; game.bgSelf[s.actor] = true; }
  });
  const w = game.night.witch;
  if (w && w.mode === "save") {
    game.witch.saveUsed = true;
    const sv = find(w.target);
    if (sv) sv.witchSaved = true; // dilindungi Witch sampai round berikutnya
  }
  if (w && w.mode === "kill") game.witch.killUsed = true;
  // Mad Bomber / Hunter yang sudah memilih korban di ringkasan dianggap selesai
  Object.keys(game.night.extra || {}).forEach((aid) => { if (r.dead.has(aid)) game.handled.push(aid); });
  game.lastSummary = r.events.map(evText);
  game.lastSummary.push(...cascade());
  game.history = game.history || {};
  game.history[game.round] = { night: [...game.lastSummary] };
  collectPending();
  game.dayVoted = players.filter((p) => p.votedOut).map((p) => p.id); // dasar untuk cek "hari tanpa korban voting"
  game.phase = "day";
  render();
}

function applyPick(s, idx, targets) {
  const prev = game.night.actions[idx];
  const old = prev && find(prev.targets[0]);
  if (s.action === "shield") {
    if (old) old.shielded = false;
    find(targets[0]).shielded = true;
    game.shieldPick = targets[0];
  } else if (s.action === "protect") {
    if (old) old.protected = false;
    find(targets[0]).protected = true;
  } else if (s.action === "dire") game.links.dire = { from: s.actor, to: targets[0] };
  else if (s.action === "doppel") game.links.doppel = { from: s.actor, to: targets[0] };
  else if (s.action === "virginia") game.links.virginia = { from: s.actor, to: targets[0] };
  else if (s.type === "cupid") game.links.lovers = targets.slice();
  else if (s.type === "nostra") { game.predictions = game.predictions || {}; game.predictions[s.actor] = targets[0]; }
  game.night.actions[idx] = { targets };
}

// ---------- Tampilan ----------
const playerOpts = (excl, sel) => players.filter((p) => alive(p) && !excl.includes(p.id))
  .map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("");
const listHtml = (lines, empty) => lines.length ? `<ul class="plain log">${lines.map((l) => `<li class="${l.cls || ""}">${esc(l.text || l)}</li>`).join("")}</ul>` : `<p><i>${empty}</i></p>`;

function chosenText(s, a) {
  if (s.type === "nostra") return SIDE_LABEL[a.targets[0]];
  if (s.type === "lepre") return a.targets[0] === "left" ? "Kiri" : "Kanan";
  return a.targets.map(nameOf).join(" & ");
}

// Hasil untuk Seer / Mystic Seer / Mentalist (hanya untuk moderator)
function resultText(s, a) {
  if (s.action === "seer") { const t = find(a.targets[0]); return t ? `${t.name}: ${isBad(t) ? "Werewolf" : "Bukan Werewolf"}` : ""; }
  if (s.action === "mystic") { const t = find(a.targets[0]); return t ? `${t.name}: ${t.role} (${SIDE_LABEL[ROLES[t.role].side]})` : ""; }
  if (s.type === "mental") {
    const [x, y] = a.targets.map(find);
    if (!x || !y) return "";
    return `${x.name} & ${y.name}: ${ROLES[x.role].side === ROLES[y.role].side ? "Satu Side yang sama" : "Side berbeda"}`;
  }
  return "";
}

function stepHtml(s, idx) {
  const act = game.night.actions[idx];
  const actors = (s.actors || [s.actor]).map(nameOf).join(", ");
  const desc = s.note || ROLE_DESC[s.role] || "";
  let ctl = "";
  const res = act ? resultText(s, act) : "";
  const chosen = act ? `<p class="chosen">Dipilih: <b>${esc(chosenText(s, act))}</b></p>${res ? `<p class="result">Hasil: <b>${esc(res)}</b></p>` : ""}` : "";

  if (s.type === "wolf") {
    const n = s.count || 1;
    // Tidak bisa memilih sesama Werewolf yang bangun (Dream Wolf yang belum bangun masih boleh jadi target)
    const ex = [...(s.actors || [])];
    if (s.noGood) ex.push(...players.filter((p) => ROLES[p.role].side === "good").map((p) => p.id));
    ctl = Array.from({ length: n }, (_, k) => `<select id="sel${k + 1}" aria-label="Korban ${k + 1}">${playerOpts(ex, act && act.targets[k])}</select>`).join(" ")
      + ` <button id="actBtn">Kill</button>${chosen}`;
  } else if (s.type === "count") {
    ctl = `<p class="result">Jumlah Werewolf (Bad Side) yang masih hidup: <b>${players.filter((p) => alive(p) && isBad(p)).length}</b></p>`;
  } else if (s.type === "mental" || s.type === "swap") {
    ctl = `<select id="sel1" aria-label="Pemain 1">${playerOpts([], act && act.targets[0])}</select>
      <select id="sel2" aria-label="Pemain 2">${playerOpts([], act && act.targets[1])}</select>
      <button id="actBtn">${s.type === "swap" ? "Tukar Role" : "Bandingkan"}</button>${chosen}
      ${s.type === "swap" ? '<p class="muted">Role keduanya bertukar saat ringkasan diterapkan. Kekuatan ini sekali seumur game.</p>' : ""}`;
  } else if (s.type === "lepre") {
    const L = neighborOf(s.actor, "left"), R = neighborOf(s.actor, "right");
    ctl = `<p class="muted">Urutan duduk mengikuti List Pemain. Kiri: <b>${esc(nameOf(L))}</b> · Kanan: <b>${esc(nameOf(R))}</b>. Jika Werewolf menyerang Leprechaun, serangan dialihkan ke arah yang dipilih.</p>
      <select id="sel1" aria-label="Arah"><option value="left" ${act && act.targets[0] === "left" ? "selected" : ""}>Kiri</option>
      <option value="right" ${act && act.targets[0] === "right" ? "selected" : ""}>Kanan</option></select>
      <button id="actBtn">Alihkan</button>${chosen}`;
  } else if (s.type === "pick") {
    // Priest tidak bisa melindungi diri sendiri; Bodyguard boleh 1x per pertandingan
    let ex = s.action === "shield" && !(game.bgSelf || {})[s.actor] ? [] : [s.actor];
    // Vampire / Chupacabra tidak bisa menyerang diri sendiri maupun sesama rolenya
    if (s.action === "kill") ex.push(...players.filter((p) => p.role === s.role).map((p) => p.id));
    if (s.actors) ex.push(...s.actors); // anggota tim tidak jadi target
    // Pemain yang sudah blobed / culted tidak muncul lagi sebagai pilihan
    if (s.action === "blobed" || s.action === "culted") ex.push(...players.filter((p) => p[s.action]).map((p) => p.id));
    if (s.action === "alpha") { const ok = alphaTargets(s.actor).map((p) => p.id); ex.push(...players.filter((p) => !ok.includes(p.id)).map((p) => p.id)); } // semua kecuali komplotan Werewolf
    if (s.action === "shield" && game.prevShield) ex.push(game.prevShield);
    if (s.action === "mute" && game.prevMute) ex.push(game.prevMute);
    ctl = `<select id="sel1" aria-label="Target">${playerOpts(ex, act && act.targets[0])}</select> <button id="actBtn">${s.label}</button>${chosen}`;
    if (s.action === "mute") ctl += `<p class="muted">Tidak bisa memilih pemain yang sama 2x berturut-turut. Muted berlaku untuk hari berikutnya.</p>`;
    if (s.action === "shield") ctl += `<p class="muted">${(game.bgSelf || {})[s.actor] ? "Perlindungan diri sendiri sudah dipakai. " : "Boleh melindungi diri sendiri 1x per pertandingan. "}Tidak bisa melindungi pemain yang sama 2x berturut-turut. Status shielded hilang di ronde berikutnya.</p>`;
  } else if (s.type === "drunk") {
    ctl = s.done
      ? `<p class="chosen">Akan berubah menjadi <b>${esc(s.done)}</b>. Role baru berlaku setelah malam ini dan aktif mulai malam ke-${game.round + 1}.</p>`
      : `<p>Pilih role baru (Change Card):</p>${rolePicker()}<button id="drunkBtn">Change Card</button>`;
  } else if (s.type === "cupid") {
    ctl = `<select id="sel1" aria-label="Pemain 1">${playerOpts([], act && act.targets[0])}</select>
      <select id="sel2" aria-label="Pemain 2">${playerOpts([], act && act.targets[1])}</select>
      <button id="actBtn">Pasangkan</button>${chosen}`;
  } else if (s.type === "nostra") {
    ctl = `<select id="sel1" aria-label="Side">${["good", "bad", "other"].map((k) =>
      `<option value="${k}" ${act && act.targets[0] === k ? "selected" : ""}>${SIDE_LABEL[k]}</option>`).join("")}</select>
      <button id="actBtn">Prediksi</button>${chosen}`;
  } else if (s.type === "witch") {
    const pre = [...resolveNight(game.night, false).dead];
    const w = game.night.witch;
    const wc = game.witch;
    ctl = `<p>Akan mati malam ini: <b>${pre.length ? esc(pre.map(nameOf).join(", ")) : "tidak ada"}</b></p>
      <p class="muted">Selamatkan: ${wc.saveUsed ? "sudah dipakai" : "tersedia"} · Bunuh: ${wc.killUsed ? "sudah dipakai" : "tersedia"} · Hanya satu kekuatan per malam.</p>`;
    if (!wc.saveUsed && pre.length) {
      ctl += `<div class="row"><select id="wSaveSel" aria-label="Selamatkan">${pre.map((id) => `<option value="${id}">${esc(nameOf(id))}</option>`).join("")}</select>
        <button id="wSave">Selamatkan</button></div>`;
    }
    if (!wc.killUsed) {
      ctl += `<div class="row"><select id="wKillSel" aria-label="Bunuh">${playerOpts([s.actor])}</select><button id="wKill" class="danger">Bunuh</button></div>`;
    }
    if (w) ctl += `<p class="chosen">Pilihan malam ini: <b>${w.mode === "save" ? "Selamatkan" : "Bunuh"} ${esc(nameOf(w.target))}</b> <button id="wClear" class="small secondary">Batal</button></p>`;
  }

  const next = game.steps[idx + 1];
  const nextLabel = !next ? "Selesai → Ringkasan" : next.group !== s.group ? `Next → ${SIDE_LABEL[next.group]}` : "Next";
  return `<div class="step ${s.group}">
    <div class="step-head"><span class="chip ${s.group} sel">${SIDE_LABEL[s.group]}</span><small>Langkah ${idx + 1} / ${game.steps.length}</small></div>
    <h3>Bangunkan: ${esc(s.type === "wolf" || (s.type === "info" && s.group === "bad") ? "Werewolf (tim)" : s.role)}</h3>
    <p>Pemain: <b>${esc(actors)}</b></p>
    <p class="muted">${esc(desc)}</p>
    ${ctl}
    <div class="modal-actions">
      <button class="secondary" id="prevBtn" ${idx === 0 ? "disabled" : ""}>Kembali</button>
      <button id="nextBtn">${nextLabel}</button>
    </div>
  </div>`;
}

function bindStep(s, idx) {
  const act = $("actBtn");
  if (act) act.onclick = () => {
    const n = s.type === "wolf" ? s.count || 1 : ["cupid", "mental", "swap"].includes(s.type) ? 2 : 1;
    const t = Array.from({ length: n }, (_, k) => $("sel" + (k + 1)).value);
    if (!validTargets(t)) return alert(n > 1 ? "Pilih target yang berbeda." : "Pilih target dulu.");
    applyPick(s, idx, t);
    render();
  };
  if ($("drunkBtn")) {
    const pick = bindPicker();
    $("drunkBtn").onclick = () => {
      if (!pick.get()) return alert("Pilih role dulu.");
      changeDrunk(s, pick.get());
      render();
    };
  }
  if ($("wSave")) $("wSave").onclick = () => { game.night.witch = { mode: "save", target: $("wSaveSel").value }; render(); };
  if ($("wKill")) $("wKill").onclick = () => { if ($("wKillSel").value) { game.night.witch = { mode: "kill", target: $("wKillSel").value }; render(); } };
  if ($("wClear")) $("wClear").onclick = () => { game.night.witch = null; render(); };
}

// Lanjut ke malam berikutnya
// ---------- Riwayat (History) ----------
// game.history[round] = { night: [...ringkasan malam], notes: [...catatan], vote: "..." }
const voteText = (pending) => {
  if (!votingOpen()) return `Tidak ada voting (voting dimulai dari Round ${VOTING_FROM_ROUND})`;
  const v = players.filter((p) => p.votedOut && !(game.dayVoted || []).includes(p.id));
  return v.length ? `${v.map((p) => `${p.name} (${p.role})`).join(", ")} di-vote out` : pending ? "Belum ada voting" : "Seri / tidak ada yang di-vote out";
};
// Simpan catatan dan hasil voting siang sebelum pindah ke round berikutnya
function archiveDay() {
  game.history = game.history || {};
  const h = (game.history[game.round] = game.history[game.round] || {});
  h.notes = [...game.notes];
  h.vote = voteText(false);
}
function historyText() {
  const h = game.history || {};
  const live = game.phase === "day" ? game.round : null; // round yang malamnya sudah selesai tapi siangnya belum
  const rounds = new Set(Object.keys(h).map(Number));
  if (live) rounds.add(live);
  if (!rounds.size) return "";
  const out = ["RIWAYAT WEREWOLF"];
  [...rounds].sort((a, b) => a - b).forEach((r) => {
    const e = h[r] || {};
    const isLive = r === live && !e.vote;
    const night = e.night || (isLive ? game.lastSummary : []) || [];
    const notes = isLive ? game.notes : e.notes || [];
    out.push("", `Round ${r}`, "Malam:");
    out.push(...(night.length ? night : ["Tidak ada kejadian"]).map((l) => `- ${l}`));
    if (notes.length) out.push("Catatan:", ...notes.map((l) => `- ${l}`));
    out.push(`Siang: ${isLive ? voteText(true) : e.vote || "-"}`);
  });
  return out.join("\n");
}
async function copyText(text, ta) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fallback */ }
  try { ta.focus(); ta.select(); return document.execCommand("copy"); } catch (_) { return false; }
}
function openHistory() {
  const text = historyText();
  if (!text) return alert("Belum ada riwayat. Selesaikan minimal satu malam (Terapkan & lanjut ke Siang).");
  openModal(`<h3>History</h3>
    <textarea id="histText" class="hist" readonly aria-label="Riwayat permainan">${esc(text)}</textarea>
    <p id="histStatus" class="muted"></p>
    <div class="modal-actions">
      <button class="secondary" id="histClose">Tutup</button>
      <button id="histCopy">Salin lagi</button>
    </div>`);
  const ta = $("histText");
  const doCopy = async () => { $("histStatus").textContent = (await copyText(text, ta)) ? "✓ Tersalin ke clipboard." : "Gagal menyalin otomatis. Teks sudah terpilih, tekan Ctrl+C."; };
  $("histClose").onclick = closeModal;
  $("histCopy").onclick = doCopy;
  doCopy();
}

function advanceRound() {
  archiveDay();
  // Sasquatch: hari tanpa korban voting -> menjadi Bad Side (Werewolf)
  const msgs = [];
  if (votingOpen() && noVoteToday()) {
    players.filter((p) => p.role === "Sasquatch" && alive(p)).forEach((p) => {
      p.role = "Werewolf";
      msgs.push(`${p.name} (Sasquatch) menjadi Werewolf karena hari tanpa korban voting`);
    });
  }
  startRound(game.round + 1);
  game.notes.push(...msgs);
  render();
}
// Voting dimulai dari round 2 (Round 1 tidak ada voting)
const VOTING_FROM_ROUND = 2;
const votingOpen = () => !game || game.round >= VOTING_FROM_ROUND;
// Hanya 1 pemain yang boleh di-vote out per hari, dan hanya jika voting sudah dibuka
const canVoteOut = () => !game || game.phase !== "day" || (votingOpen() && noVoteToday());

// Hari ini tanpa korban voting = tidak ada pemain baru yang Voted out sejak awal siang
const noVoteToday = () => !players.some((p) => p.votedOut && !(game.dayVoted || []).includes(p.id));
function sasquatchHint() {
  const sas = players.filter((p) => p.role === "Sasquatch" && alive(p));
  if (!sas.length) return "";
  const names = sas.map((p) => p.name).join(", ");
  return noVoteToday()
    ? `<p class="muted">Belum ada Voted out hari ini. Jika tetap tanpa korban voting, ${esc(names)} (Sasquatch) menjadi Werewolf (Bad Side) saat round berikutnya dimulai.</p>`
    : `<p class="muted">Sudah ada korban voting hari ini, Sasquatch tidak berubah.</p>`;
}

// ---------- Kondisi menang ----------
// Mengembalikan daftar pemenang berdasarkan kondisi saat ini: [{ side, text }]
function checkWin() {
  const al = players.filter(alive);
  const total = al.length;
  if (!total) return [];
  const half = Math.ceil(total / 2);
  const cnt = (f) => al.filter(f).length;
  const wins = [];

  const bad = cnt(isBad), vamp = cnt((p) => p.role === "Vampire"), chupa = cnt((p) => p.role === "Chupacabra");
  if (bad > 0 && bad >= half) wins.push({ side: "bad", text: `Bad Side menang (${bad} dari ${total} pemain tersisa)` });
  if (vamp > 0 && vamp >= half) wins.push({ side: "other", text: `Vampire menang (${vamp} dari ${total} pemain tersisa)` });
  if (chupa > 0 && chupa >= half) wins.push({ side: "other", text: `Chupacabra menang (${chupa} dari ${total} pemain tersisa)` });
  // Alpha Wolf yang sudah mati tapi belum memakai kekuatannya: Good Side belum menang
  if (bad === 0 && vamp === 0 && chupa === 0 && !alphaPending()) wins.push({ side: "good", text: "Good Side menang (semua Bad Side, Vampire, dan Chupacabra sudah mati)" });

  // Tanner: di-vote out
  players.filter((p) => p.role === "Tanner" && p.votedOut)
    .forEach((p) => wins.push({ side: "other", text: `Tanner (${p.name}) menang karena di-vote out` }));

  // Blob / Cult Leader: semua pemain hidup sudah blobed / culted (yang mati diabaikan)
  if (cnt((p) => p.role === "The Blob") && al.every((p) => p.blobed || p.role === "The Blob")) wins.push({ side: "other", text: "The Blob menang (semua pemain hidup sudah blobed)" });
  if (cnt((p) => p.role === "Cult Leader") && al.every((p) => p.culted || p.role === "Cult Leader")) wins.push({ side: "other", text: "Cult Leader menang (semua pemain hidup sudah culted)" });
  // Count Dracula: punya 3 istri (charmed)
  if (cnt((p) => p.role === "Count Dracula") && players.filter((p) => p.charmed).length >= 3) wins.push({ side: "other", text: "Count Dracula menang (3 istri)" });

  // Nostradamus: prediksi benar dan masih hidup
  const winSides = new Set(wins.map((w) => w.side));
  al.filter((p) => p.role === "Nostradamus").forEach((p) => {
    const pred = (game.predictions || {})[p.id];
    if (pred && winSides.has(pred)) wins.push({ side: "other", text: `Nostradamus (${p.name}) menang: prediksi ${SIDE_LABEL[pred]} benar` });
  });
  return wins;
}
// Target Alpha Wolf yang sudah mati: semua pemain hidup kecuali komplotan Werewolf (bisa Good Side atau Other Side).
// Dream Wolf termasuk komplotan hanya jika sudah ada Werewolf lain yang mati sebelum Alpha Wolf ini;
// jika Alpha Wolf ini Werewolf pertama yang mati, Dream Wolf belum bangun dan boleh dipilih.
function alphaTargets(alphaId) {
  const otherDeadWolf = players.some((p) => !alive(p) && WOLF_ROLES.includes(p.role) && p.id !== alphaId);
  return players.filter((p) => {
    if (!alive(p) || p.id === alphaId) return false;
    if (WOLF_ROLES.includes(p.role)) return false;
    if (p.role === "Dream Wolf") return !otherDeadWolf;
    return true;
  });
}
// Ada Alpha Wolf yang sudah mati tapi belum memakai kekuatannya (dan masih ada target yang bisa dipilih)
function alphaPending() {
  const done = (game && game.alphaDone) || [];
  return players.some((p) => p.role === "Alpha Wolf" && !alive(p) && !done.includes(p.id) && alphaTargets(p.id).length > 0);
}
function winHtml() {
  const wins = checkWin();
  const noEnemy = !players.some((p) => alive(p) && (isBad(p) || p.role === "Vampire" || p.role === "Chupacabra"));
  if (!wins.length && noEnemy && alphaPending()) {
    return `<div class="pending"><b>Alpha Wolf sudah mati, tetapi masih punya satu kesempatan mengubah satu warga menjadi Werewolf di malam berikutnya. Good Side belum menang.</b></div>`;
  }
  return wins.length ? `<div class="win"><b>🏆 Pemenang</b><ul class="plain">${wins.map((w) => `<li class="${w.side}">${esc(w.text)}</li>`).join("")}</ul></div>` : "";
}

const readSelects = (root, attr, id) => [...root.querySelectorAll(`[${attr}="${id}"]`)].map((s) => s.value);
const validTargets = (vals) => vals.every(Boolean) && new Set(vals).size === vals.length;

// Mad Bomber / Hunter yang mati di luar ringkasan malam (voted out, rantai, dll.)
function pendingHtml() {
  game.pending = game.pending.filter((id) => { const p = find(id); return p && !alive(p) && DEATH_TRIGGERS[p.role]; });
  if (!game.pending.length) return "";
  return `<div class="pending"><h3>Kematian khusus</h3>` + game.pending.map((id) => {
    const p = find(id), n = DEATH_TRIGGERS[p.role];
    const sels = Array.from({ length: n }, (_, k) => `<select data-pend-sel="${id}" aria-label="Korban ${k + 1}">${playerOpts([])}</select>`).join(" ");
    return `<div class="row"><span><b>${esc(p.name)}</b> (${esc(p.role)}) mati. Pilih ${n} korban:</span>${sels}<button class="small danger" data-pend-btn="${id}">Bunuh</button></div>`;
  }).join("") + `</div>`;
}

// Di ringkasan: Mad Bomber / Hunter yang akan mati malam ini memilih korban tambahan
function extraTargets() {
  const base = resolveNight(game.night, true, false);
  return { base, list: [...base.dead].map(find).filter((p) => p && DEATH_TRIGGERS[p.role]) };
}
function extrasHtml() {
  const { base, list } = extraTargets();
  if (!list.length) return "";
  game.night.extra = game.night.extra || {};
  return `<div class="pending"><h3>Kematian khusus</h3>` + list.map((p) => {
    const n = DEATH_TRIGGERS[p.role], cur = game.night.extra[p.id];
    const excl = [p.id, ...base.dead];
    const sels = Array.from({ length: n }, (_, k) => `<select data-ex-sel="${p.id}" aria-label="Korban ${k + 1}">${playerOpts(excl, cur && cur[k])}</select>`).join(" ");
    return `<div class="row"><span><b>${esc(p.name)}</b> (${esc(p.role)}) akan mati. Pilih ${n} korban:</span>${sels}
      <button class="small danger" data-ex-btn="${p.id}">Set</button></div>
      ${cur ? `<p class="chosen">Dipilih: <b>${esc(cur.map(nameOf).join(" & "))}</b></p>` : ""}`;
  }).join("") + `</div>`;
}

function renderGame() {
  const panel = $("gamePanel");
  const btn = $("matchBtn");
  if (!game) { panel.hidden = true; panel.innerHTML = ""; btn.textContent = "Match Play"; saveGame(); return; }
  btn.textContent = "Match Play (berjalan)";
  panel.hidden = false;
  const phaseLabel = { night: "Malam", summary: "Ringkasan", day: "Siang" }[game.phase];
  let body = "";
  if (game.phase === "night") {
    body = stepHtml(game.steps[game.step], game.step);
  } else if (game.phase === "summary") {
    const lines = resolveNight(game.night, true).events.map((e) => ({ text: evText(e), cls: e.kind }));
    body = `<h3>Ringkasan Round ${game.round}</h3>${listHtml(lines, "Tidak ada kejadian malam ini.")}
      ${extrasHtml()}
      <div class="modal-actions">
        ${game.steps.length ? '<button class="secondary" id="prevBtn">Kembali</button>' : ""}
        <button id="commitBtn">Terapkan &amp; lanjut ke Siang</button>
      </div>`;
  } else {
    body = `<h3>Hasil malam Round ${game.round}</h3>${listHtml(game.lastSummary || [], "Tidak ada kejadian.")}
      <h3>${votingOpen() ? "Diskusi &amp; Voting" : "Siang"}</h3>
      ${!votingOpen()
        ? `<p class="muted">Tidak ada voting di Round ${game.round}. Voting dimulai dari Round ${VOTING_FROM_ROUND}.</p>`
        : noVoteToday()
        ? `<p class="muted">Hanya 1 pemain yang bisa di-vote out. Jika suara seri, tidak ada yang di-vote out: langsung lanjut ke malam berikutnya.</p>
          <ul class="plain vote-list">${players.filter(alive).map((p) =>
            `<li class="mini"><span class="name">${esc(p.name)}</span><button class="small danger" data-vote="${p.id}">Voted out</button></li>`).join("")}</ul>
          ${sasquatchHint()}`
        : `<p class="muted">Voting selesai: ${esc(players.filter((p) => p.votedOut && !(game.dayVoted || []).includes(p.id)).map((p) => p.name).join(", "))} di-vote out.</p>`}
      ${game.notes.length ? `<h3>Catatan</h3>${listHtml(game.notes, "")}` : ""}
      <div class="modal-actions"><button id="nextRoundBtn">${votingOpen() && noVoteToday() ? "Seri / tanpa Voted out" : "Lanjut"} → Malam Round ${game.round + 1}</button></div>`;
  }
  const notesNight = game.phase !== "day" && game.notes.length ? `<h3>Catatan</h3>${listHtml(game.notes, "")}` : "";
  panel.innerHTML = `<div class="game-head"><h2>Match Play · Round ${game.round} <span class="badge">${phaseLabel}</span></h2>
    <span class="row"><button class="small secondary" id="histBtn">History</button><button class="small danger" id="endBtn">Akhiri Match</button></span></div>${winHtml()}${pendingHtml()}${body}${notesNight}`;

  panel.querySelectorAll("[data-pend-btn]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.pendBtn, vals = readSelects(panel, "data-pend-sel", id);
      if (!validTargets(vals)) return alert("Pilih korban yang berbeda.");
      resolvePending(id, vals);
      render();
    };
  });
  panel.querySelectorAll("[data-vote]").forEach((b) => {
    b.onclick = () => {
      const p = find(b.dataset.vote);
      if (!p) return;
      if (!canVoteOut()) return;
      p.votedOut = true;
      afterDeathToggle(); // kematian berantai (Cupid, Virginia Wolf, dll.)
      // Langsung ke malam berikutnya, kecuali ada kematian khusus (Hunter/Mad Bomber) yang perlu dipilih atau ada pemenang
      if (game.pending.length || checkWin().length) render();
      else advanceRound();
    };
  });
  panel.querySelectorAll("[data-ex-btn]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.exBtn, vals = readSelects(panel, "data-ex-sel", id);
      if (!validTargets(vals)) return alert("Pilih korban yang berbeda.");
      game.night.extra[id] = vals;
      render();
    };
  });

  $("histBtn").onclick = openHistory;
  $("endBtn").onclick = () => { if (confirm("Akhiri match? Role & status pemain tidak diubah.")) { endGame(); render(); } };
  if (game.phase === "night") {
    bindStep(game.steps[game.step], game.step);
    $("prevBtn").onclick = () => { if (game.step > 0) { game.step--; render(); } };
    $("nextBtn").onclick = () => { game.step++; if (game.step >= game.steps.length) { game.step = game.steps.length - 1; game.phase = "summary"; } render(); };
  } else if (game.phase === "summary") {
    if ($("prevBtn")) $("prevBtn").onclick = () => { game.phase = "night"; render(); };
    $("commitBtn").onclick = () => {
      const missing = extraTargets().list.filter((p) => !game.night.extra[p.id]);
      if (missing.length && !confirm(`${missing.map((p) => p.name).join(", ")} belum memilih korban. Lanjut? (bisa dipilih nanti di fase Siang)`)) return;
      commitNight();
    };
  } else {
    $("nextRoundBtn").onclick = advanceRound;
  }
  saveGame();
}

function endGame() { game = null; saveGame(); }

$("matchBtn").addEventListener("click", () => {
  if (game) return $("gamePanel").scrollIntoView({ behavior: "smooth" });
  if (!players.length) return alert("Tambahkan pemain dulu.");
  if (players.some((p) => !p.role)) return alert("Semua pemain harus punya role (Manual / Random Card) sebelum Match Play.");
  game = { round: 1, phase: "night", step: 0, steps: [], night: { actions: {}, witch: null, extra: {} }, notes: [], lastSummary: [],
    handled: players.filter((p) => !alive(p)).map((p) => p.id), pending: [],
    cubCounted: players.filter((p) => p.role === "Wolf cub" && !alive(p)).map((p) => p.id), cubExtra: 0, alphaDone: [], troubleUsed: false, dayVoted: [], mutePick: null, prevMute: null,
    links: { lovers: null, virginia: null, doppel: null }, witch: { saveUsed: false, killUsed: false }, prevShield: null, shieldPick: null };
  startRound(1);
  render();
  $("gamePanel").scrollIntoView({ behavior: "smooth" });
});

render();
