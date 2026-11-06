/* Papan juara, statistik pameran, dan pengaturan.
 * Disimpan di perangkat (localStorage), jadi tetap jalan tanpa internet. */
(function () {
  'use strict';
  const KEY_LB = 'pb_penyu_papan_v8';
  const KEY_STAT = 'pb_penyu_stat_v1';
  const KEY_SET = 'pb_penyu_atur_v1';
  const MAX_ENTRIES = 1000;

  let memory = {};

  function read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* abaikan */ }
    return memory[key] !== undefined ? JSON.parse(JSON.stringify(memory[key])) : fallback;
  }

  function write(key, value) {
    memory[key] = value;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* abaikan */ }
  }

  function today() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  const BAD = ['anjing', 'anjg', 'babi', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot', 'entot', 'jancok', 'jancuk', 'cok', 'asu',
    'tolol', 'goblok', 'bego', 'idiot', 'kampret', 'tai', 'taik', 'pantek', 'pepek', 'peler', 'kimak', 'fuck', 'shit', 'dick', 'bitch', 'sex', 'seks'];

  function cleanName(name) {
    let n = String(name || '').replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
    const low = n.toLowerCase().replace(/\s/g, '');
    const leet = low.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
    for (const w of BAD) {
      if (w.length <= 3 ? (leet === w) : leet.indexOf(w) >= 0) { n = ''; break; }
    }
    if (n.length < 2) n = 'Tukik' + Math.floor(100 + Math.random() * 900);
    return n;
  }

  const Store = {
    today: today,
    cleanName: cleanName,

    allEntries: function () { return read(KEY_LB, []); },

    addEntry: function (e) {
      const list = read(KEY_LB, []);
      const entry = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: today(), ts: Date.now() }, e);
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
      write(KEY_LB, list);
      return entry;
    },

    top: function (mode, n) {
      const list = read(KEY_LB, []);
      const d = today();
      const f = mode === 'hari' ? list.filter((e) => e.date === d) : list;
      return f.slice().sort((a, b) => b.score - a.score).slice(0, n || 10);
    },

    rankOf: function (mode, id) {
      const list = read(KEY_LB, []);
      const d = today();
      const f = (mode === 'hari' ? list.filter((e) => e.date === d) : list).slice().sort((a, b) => b.score - a.score);
      const i = f.findIndex((e) => e.id === id);
      return i < 0 ? null : i + 1;
    },

    resetToday: function () {
      const d = today();
      write(KEY_LB, read(KEY_LB, []).filter((e) => e.date !== d));
    },

    resetAll: function () { write(KEY_LB, []); },

    csv: function () {
      const rows = [['tanggal', 'nama', 'skor', 'penyu', 'tingkat', 'telur', 'selesai']];
      for (const e of read(KEY_LB, [])) rows.push([e.date, e.name, e.score, e.speciesName, e.tingkat, e.eggs || 0, e.finished ? 'ya' : 'tidak']);
      return rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    },

    stats: function () {
      return read(KEY_STAT, { main: 0, selesai: 0, totalSkor: 0, spesies: {}, penetasan: {}, kuisBenar: 0, kuisTotal: 0, plastik: 0 });
    },

    track: function (fn) {
      const s = Store.stats();
      fn(s);
      write(KEY_STAT, s);
    },

    resetStats: function () { write(KEY_STAT, { main: 0, selesai: 0, totalSkor: 0, spesies: {}, penetasan: {}, kuisBenar: 0, kuisTotal: 0, plastik: 0 }); },

    settings: function () { return Object.assign({ cepat: false, bisu: false }, read(KEY_SET, {})); },
    saveSettings: function (s) { write(KEY_SET, s); }
  };

  window.PB_STORE = Store;
})();


