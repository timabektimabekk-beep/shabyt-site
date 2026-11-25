// Шабыт: built-in alert sounds (synthesized, no audio files, no copyright) and animations (CSS).
// Used by the alert widget and by the cabinet for previews.
window.FX = (() => {
  let ctx = null;
  const N = n => 440 * 2 ** ((n - 69) / 12); // MIDI note → Hz
  const ac = () => { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = ctx || new C(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  // one note: frequency (optionally sliding to f2), waveform, length, loudness;
  // extras: h hold, det detune, lp/lp2/q lowpass (sweep), vib/vd vibrato, wob/wd filter wobble
  const tone = (c, out, t, f, o = {}) => {
    const osc = c.createOscillator(), g = c.createGain(), d = o.d || .3, v = o.v || .25, a = o.a || .01;
    osc.type = o.w || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.det) osc.detune.value = o.det;
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a);
    if (o.h) g.gain.setValueAtTime(v, t + a + o.h);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let node = osc;
    if (o.lp) {
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.q) fl.Q.value = o.q;
      if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t + d);
      if (o.wob) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.wob; lg.gain.value = o.wd || 500; l.connect(lg).connect(fl.frequency); l.start(t); l.stop(t + d + .05); }
      node.connect(fl); node = fl;
    }
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vd || f * .02; l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + d + .05); }
    node.connect(g).connect(out); osc.start(t); osc.stop(t + d + .05);
  };
  // filtered white noise: type/f (sweep to f2)/q, loudness v, attack a
  const nz = (c, out, t, d, o = {}) => {
    const b = c.createBuffer(1, Math.max(1, c.sampleRate * d | 0), c.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), v = o.v || .2;
    s.buffer = b; fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d); fl.Q.value = o.q || 1;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl).connect(g).connect(out); s.start(t); s.stop(t + d + .02);
  };
  const chord = (c, out, t, ns, o) => ns.forEach(n => tone(c, out, t, N(n), o));
  const mel = (c, out, t, ns, o = {}) => ns.forEach(([n, s, d]) => tone(c, out, t + s, N(n), { ...o, d: d || o.d }));
  const kick = (c, out, t, v = .7) => tone(c, out, t, 150, { f2: 40, d: .35, v });
  const snare = (c, out, t, v = .35) => { nz(c, out, t, .18, { type: 'highpass', f: 1500, v }); tone(c, out, t, 180, { w: 'triangle', d: .1, v: v * .6 }); };
  const hat = (c, out, t, v = .12) => nz(c, out, t, .05, { type: 'highpass', f: 7000, v });
  const noise = (c, out, t, d, v, hp) => {
    const b = c.createBuffer(1, Math.max(1, c.sampleRate * d | 0), c.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 1000; s.buffer = b; g.gain.value = v;
    s.connect(f).connect(g).connect(out); s.start(t);
  };
  const SOUNDS = {
    chime:  { kk: 'Қоңырау', ru: 'Колокольчик', len: .7, fn: (c, o, t) => [76, 79, 84].forEach((n, i) => tone(c, o, t + i * .12, N(n), { d: .5 })) },
    coin:   { kk: 'Тиын', ru: 'Монетка', len: .5, fn: (c, o, t) => { tone(c, o, t, N(83), { w: 'square', d: .08, v: .12 }); tone(c, o, t + .08, N(88), { w: 'square', d: .35, v: .12 }); } },
    cash:   { kk: 'Касса', ru: 'Касса', len: 1, fn: (c, o, t) => { noise(c, o, t, .12, .35, 2500); noise(c, o, t + .15, .08, .25, 3000); tone(c, o, t + .3, N(91), { d: .7, v: .2 }); tone(c, o, t + .3, N(96), { d: .7, v: .12 }); } },
    fanfare:{ kk: 'Фанфара', ru: 'Фанфары', len: 1.6, fn: (c, o, t) => { [[67, 0, .15], [67, .16, .15], [67, .32, .15], [72, .5, 1]].forEach(([n, s, d]) => { tone(c, o, t + s, N(n), { w: 'sawtooth', d, v: .12, a: .02 }); tone(c, o, t + s, N(n + 4), { w: 'triangle', d, v: .1 }); }); } },
    levelup:{ kk: 'Деңгей', ru: 'Левел-ап', len: .9, fn: (c, o, t) => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(c, o, t + i * .07, N(n), { w: 'square', d: .12, v: .1 })) },
    laser:  { kk: 'Лазер', ru: 'Лазер', len: .6, fn: (c, o, t) => { tone(c, o, t, 1800, { w: 'sawtooth', f2: 120, d: .45, v: .15 }); tone(c, o, t + .15, 1400, { w: 'square', f2: 100, d: .4, v: .08 }); } },
    magic:  { kk: 'Сиқыр', ru: 'Магия', len: 1.4, fn: (c, o, t) => { for (let i = 0; i < 14; i++) tone(c, o, t + i * .06, N(72 + [0, 4, 7, 11, 14][i % 5] + (i > 9 ? 12 : 0)), { d: .5, v: .08 }); } },
    bell:   { kk: 'Үлкен қоңырау', ru: 'Большой колокол', len: 2.4, fn: (c, o, t) => [[1, .3], [2.76, .12], [5.4, .07], [8.9, .04]].forEach(([m, v]) => tone(c, o, t, N(57) * m, { d: 2.3, v })) },
    drum:   { kk: 'Барабан', ru: 'Барабанная дробь', len: 1.5, fn: (c, o, t) => { for (let i = 0; i < 16; i++) noise(c, o, t + i * .06, .05, .15 + i * .015, 1500); tone(c, o, t + 1, 150, { f2: 45, d: .45, v: .5 }); noise(c, o, t + 1, .4, .4, 4000); } },
    dombra: { kk: 'Домбыра әуені', ru: 'Мотив домбры', len: 1.9, fn: (c, o, t) => [[62, 0], [69, .14], [67, .28], [69, .42], [62, .62], [69, .76], [71, .9], [69, 1.1]].forEach(([n, s]) => { tone(c, o, t + s, N(n), { w: 'triangle', d: .35, v: .2, a: .003 }); tone(c, o, t + s, N(n - 12), { w: 'triangle', d: .25, v: .08, a: .003 }); }) },
    horn:   { kk: 'Сырнай', ru: 'Горн', len: 1.3, fn: (c, o, t) => [[55, 0, .35], [60, .38, .9]].forEach(([n, s, d]) => [0, 7, 12].forEach(k => tone(c, o, t + s, N(n + k), { w: 'sawtooth', d, v: .06, a: .05 }))) },
    pop:    { kk: 'Шерту', ru: 'Щелчок', len: .25, fn: (c, o, t) => tone(c, o, t, 300, { f2: 900, d: .12, v: .3 }) },
    // ---- Стандарт ----
    sparkle:  { g: 1.8, t: 'std', kk: 'Жарқыл', ru: 'Блеск', len: 1, fn: (c, o, t) => { for (let i = 0; i < 12; i++) tone(c, o, t + i * .045, N(84 + [0, 2, 4, 7, 9][i % 5] + (i > 5 ? 12 : 0)), { d: .35, v: .06 }); } },
    bubbles:  { t: 'std', kk: 'Көпіршік', ru: 'Пузыри', len: 1.2, fn: (c, o, t) => { for (let i = 0; i < 9; i++) { const f = 300 + Math.random() * 500; tone(c, o, t + i * .11 + Math.random() * .04, f, { f2: f * 2.2, d: .12, v: .18 }); } } },
    kaching:  { t: 'std', kk: 'Ка-чинг', ru: 'Ка-чинг', len: 1.3, fn: (c, o, t) => { nz(c, o, t, .06, { type: 'highpass', f: 3000, v: .3 }); nz(c, o, t + .08, .05, { type: 'highpass', f: 4000, v: .25 }); chord(c, o, t + .18, [88, 93], { d: 1, v: .12 }); tone(c, o, t + .18, N(100), { d: .6, v: .05 }); } },
    coinpour: { g: 2.5, t: 'std', kk: 'Тиын төгілді', ru: 'Россыпь монет', len: 1.4, fn: (c, o, t) => { for (let i = 0; i < 18; i++) tone(c, o, t + i * .06 + Math.random() * .03, N(90 + (Math.random() * 10 | 0)), { w: 'square', d: .06, v: .05 }); } },
    tada:     { t: 'std', kk: 'Та-да!', ru: 'Та-да!', len: 1.4, fn: (c, o, t) => { chord(c, o, t, [60, 64, 67], { w: 'sawtooth', d: .18, v: .06, lp: 2500 }); chord(c, o, t + .2, [65, 69, 72, 77], { w: 'sawtooth', d: 1.1, v: .06, lp: 3000, h: .5 }); } },
    victory8: { g: 2, t: 'std', kk: 'Жеңіс (8-бит)', ru: 'Победа (8-бит)', len: 1.5, fn: (c, o, t) => mel(c, o, t, [[67, 0, .1], [72, .12, .1], [76, .24, .1], [79, .36, .25], [76, .64, .1], [79, .76, .6]], { w: 'square', v: .08 }) },
    powerup:  { g: 2, t: 'std', kk: 'Күш алу', ru: 'Усиление', len: 1, fn: (c, o, t) => { for (let i = 0; i < 10; i++) tone(c, o, t + i * .06, N(55 + i * 3), { w: 'square', d: .08, v: .07 }); tone(c, o, t + .6, N(91), { w: 'square', d: .3, v: .06 }); } },
    jump:     { g: 1.6, t: 'std', kk: 'Секіру', ru: 'Прыжок', len: .4, fn: (c, o, t) => tone(c, o, t, N(60), { w: 'square', f2: N(84), d: .22, v: .1 }) },
    whoosh:   { g: 2, t: 'std', kk: 'Жел', ru: 'Вжух', len: .8, fn: (c, o, t) => nz(c, o, t, .7, { f: 300, f2: 3000, q: 2, v: .35, a: .3 }) },
    swding:   { t: 'std', kk: 'Вжух-дың', ru: 'Вжух-динь', len: 1.4, fn: (c, o, t) => { nz(c, o, t, .5, { f: 400, f2: 4000, q: 2, v: .3, a: .25 }); chord(c, o, t + .45, [84, 91], { d: .9, v: .1 }); } },
    harp:     { t: 'std', kk: 'Арфа', ru: 'Арфа', len: 1.6, fn: (c, o, t) => [60, 64, 67, 71, 72, 76, 79, 83, 84].forEach((n, i) => tone(c, o, t + i * .06, N(n), { w: 'triangle', d: 1, v: .1, a: .003 })) },
    xylo:     { t: 'std', kk: 'Ксилофон', ru: 'Ксилофон', len: 1.3, fn: (c, o, t) => [[72, 0], [76, .15], [79, .3], [84, .45], [79, .65], [84, .8]].forEach(([n, s]) => { tone(c, o, t + s, N(n), { w: 'triangle', d: .4, v: .15, a: .002 }); tone(c, o, t + s, N(n + 24), { d: .12, v: .03, a: .002 }); }) },
    doorbell: { t: 'std', kk: 'Есік қоңырауы', ru: 'Дверной звонок', len: 1.6, fn: (c, o, t) => { tone(c, o, t, N(76), { d: .9, v: .2 }); tone(c, o, t, N(88), { d: .4, v: .04 }); tone(c, o, t + .55, N(72), { d: 1, v: .2 }); tone(c, o, t + .55, N(84), { d: .4, v: .04 }); } },
    notify:   { g: 1.4, t: 'std', kk: 'Хабарлама', ru: 'Уведомление', len: .7, fn: (c, o, t) => { tone(c, o, t, N(81), { d: .25, v: .15 }); tone(c, o, t + .14, N(88), { d: .45, v: .15 }); } },
    kalimba:  { t: 'std', kk: 'Калимба', ru: 'Калимба', len: 1.6, fn: (c, o, t) => [[74, 0], [78, .18], [81, .36], [86, .54], [81, .8], [78, .98]].forEach(([n, s]) => { tone(c, o, t + s, N(n), { d: .6, v: .18, a: .002 }); tone(c, o, t + s, N(n) * 3.01, { d: .15, v: .03, a: .002 }); }) },
    pad:      { g: 1.4, t: 'std', kk: 'Синт-пад', ru: 'Синт-пад', len: 2, fn: (c, o, t) => { chord(c, o, t, [57, 64, 69, 72], { w: 'sawtooth', d: 1.9, v: .035, a: .6, lp: 1200 }); chord(c, o, t, [57, 64, 69, 72], { w: 'sawtooth', d: 1.9, v: .03, a: .6, lp: 1200, det: 12 }); } },
    crash:    { t: 'std', kk: 'Барабан мен табақ', ru: 'Дробь и тарелка', len: 1.9, fn: (c, o, t) => { for (let i = 0; i < 12; i++) nz(c, o, t + i * .075, .06, { type: 'highpass', f: 1500, v: .1 + i * .02 }); kick(c, o, t + .95); nz(c, o, t + .95, .9, { type: 'highpass', f: 5000, v: .3 }); } },
    claps:    { g: 1.8, t: 'std', kk: 'Шапалақ', ru: 'Аплодисменты', len: 1.8, fn: (c, o, t) => { for (let i = 0; i < 40; i++) nz(c, o, t + Math.random() * 1.5, .04, { f: 1500, q: .8, v: .08 + Math.random() * .1 }); } },
    heart:    { t: 'std', kk: 'Жүрек соғысы', ru: 'Сердцебиение', len: 1.4, fn: (c, o, t) => [0, .22, .8, 1.02].forEach((s, i) => tone(c, o, t + s, i % 2 ? 55 : 62, { f2: 40, d: .22, v: .6 })) },
    kobyz:    { g: 2, t: 'std', kk: 'Қобыз', ru: 'Кобыз', len: 2.2, fn: (c, o, t) => mel(c, o, t, [[57, 0, .7], [60, .7, .5], [62, 1.2, .9]], { w: 'sawtooth', lp: 1400, vib: 5.5, vd: 4, a: .15, h: .3, v: .07 }) },
    // ---- PRO ----
    airhorn:  { g: 1.6, t: 'pro', kk: 'Гудок', ru: 'Гудок', len: 1.6, fn: (c, o, t) => [0, .22, .5].forEach((s, i) => [440, 443, 660, 662].forEach(f => tone(c, o, t + s, f, { w: 'sawtooth', d: i < 2 ? .18 : .9, v: .05, h: i < 2 ? .1 : .7, lp: 3500 }))) },
    bassdrop: { t: 'pro', kk: 'Басс-дроп', ru: 'Басс-дроп', len: 1.8, fn: (c, o, t) => { tone(c, o, t, 120, { f2: 30, d: 1.6, v: .7, h: .3 }); tone(c, o, t, 240, { w: 'square', f2: 60, d: 1.2, v: .08, lp: 400 }); nz(c, o, t, .3, { type: 'lowpass', f: 200, v: .3 }); } },
    riser:    { t: 'pro', kk: 'Көтерілу', ru: 'Райзер', len: 2.9, fn: (c, o, t) => { nz(c, o, t, 2.5, { f: 200, f2: 6000, q: 3, v: .25, a: 2.3 }); tone(c, o, t, N(48), { w: 'sawtooth', f2: N(84), d: 2.5, v: .05, a: 2.2, lp: 5000 }); kick(c, o, t + 2.5); chord(c, o, t + 2.5, [60, 67, 72], { w: 'sawtooth', d: .4, v: .05, lp: 3000 }); } },
    epic:     { t: 'pro', kk: 'Эпик', ru: 'Эпик', len: 2.7, fn: (c, o, t) => [[[48, 55, 60, 64], 0, .6], [[53, 57, 60, 65], .6, .6], [[55, 59, 62, 67], 1.2, .6], [[60, 64, 67, 72], 1.8, .9]].forEach(([ns, s, d]) => { chord(c, o, t + s, ns, { w: 'sawtooth', d, v: .04, a: .05, h: d * .5, lp: 2000 }); tone(c, o, t + s, 80, { f2: 50, d: .5, v: .5 }); }) },
    trap:     { t: 'pro', kk: 'Трэп', ru: 'Трэп', len: 2.2, fn: (c, o, t) => { [0, .75, 1].forEach(s => kick(c, o, t + s)); [.5, 1.5].forEach(s => snare(c, o, t + s)); for (let i = 0; i < 16; i++) hat(c, o, t + i * .125); [1.75, 1.8125, 1.875, 1.9375].forEach(s => hat(c, o, t + s)); [0, 1].forEach(s => tone(c, o, t + s, N(36), { d: .7, v: .35, h: .2 })); } },
    kuy:      { t: 'pro', kk: 'Күй', ru: 'Кюй', len: 2.4, fn: (c, o, t) => { [62, 69, 67, 69, 62, 69, 71, 69, 67, 69, 65, 67, 62, 64, 65, 67].forEach((n, i) => tone(c, o, t + i * .14, N(n), { w: 'triangle', d: .25, v: .16, a: .003 })); tone(c, o, t, N(50), { w: 'triangle', d: 2.3, v: .05, h: 1.8 }); } },
    varga:    { t: 'pro', kk: 'Шаңқобыз', ru: 'Варган', len: 1.8, fn: (c, o, t) => [0, .25, .5, .62, .75, 1.1].forEach(s => tone(c, o, t + s, N(50), { w: 'sawtooth', d: .3, v: .12, lp: 300, lp2: 2500, q: 12 })) },
    sybyzgy:  { g: 1.5, t: 'pro', kk: 'Сыбызғы', ru: 'Сыбызгы', len: 2.2, fn: (c, o, t) => [[74, 0, .5], [76, .5, .3], [79, .8, .4], [76, 1.2, .9]].forEach(([n, s, d]) => { tone(c, o, t + s, N(n), { d, v: .13, vib: 5, vd: 6, a: .08, h: d * .4 }); nz(c, o, t + s, d, { f: 2000, q: .7, v: .02, a: .05 }); }) },
    asatayaq: { t: 'pro', kk: 'Асатаяқ', ru: 'Асатаяк', len: 2, fn: (c, o, t) => { for (let i = 0; i < 8; i++) { nz(c, o, t + i * .25, .08, { type: 'highpass', f: 5000, v: .2 }); tone(c, o, t + i * .25, N(96 + (i % 2) * 3), { d: .15, v: .03 }); } } },
    jackpot:  { t: 'pro', kk: 'Джекпот', ru: 'Джекпот', len: 2.3, fn: (c, o, t) => { for (let i = 0; i < 24; i++) tone(c, o, t + i * .05, N(72 + (i * 5) % 24), { w: 'square', d: .05, v: .05 }); chord(c, o, t + 1.3, [84, 88, 91, 96], { d: .9, v: .08 }); for (let i = 0; i < 10; i++) tone(c, o, t + 1.3 + i * .07, N(92 + (Math.random() * 8 | 0)), { w: 'square', d: .05, v: .04 }); } },
    cosmic:   { g: 1.3, t: 'pro', kk: 'Ғарыш', ru: 'Космос', len: 2.4, fn: (c, o, t) => { tone(c, o, t, 330, { f2: 880, d: 2.3, v: .12, vib: 6, vd: 15, a: .3, h: 1.2 }); chord(c, o, t, [52, 59, 64], { d: 2.3, v: .03, a: .5, h: 1 }); } },
    glitch:   { g: 1.2, t: 'pro', kk: 'Глитч', ru: 'Глитч', len: 1.2, fn: (c, o, t) => { for (let i = 0; i < 22; i++) tone(c, o, t + i * .05, 100 + Math.random() * 1900, { w: i % 2 ? 'square' : 'sawtooth', d: .02 + Math.random() * .04, v: .06 }); for (let i = 0; i < 5; i++) nz(c, o, t + Math.random(), .05, { type: 'highpass', f: 3000, v: .15 }); } },
    fanfare8: { g: 1.4, t: 'pro', kk: 'Ұлы фанфара (8-бит)', ru: 'Большая фанфара (8-бит)', len: 2.4, fn: (c, o, t) => { mel(c, o, t, [[60, 0, .12], [64, .13, .12], [67, .26, .12], [72, .39, .36], [67, .78, .12], [72, .91, .38], [76, 1.3, .12], [79, 1.43, .9]], { w: 'square', v: .07 }); mel(c, o, t, [[48, 0, .38], [43, .39, .38], [48, .78, 1.5]], { w: 'triangle', v: .12 }); } },
    choir:    { g: 1.6, t: 'pro', kk: 'Хор', ru: 'Хор', len: 2.4, fn: (c, o, t) => [[[57, 60, 64], 0], [[57, 62, 65], 1.1]].forEach(([ns, s]) => chord(c, o, t + s, ns, { w: 'sawtooth', d: 1.2, v: .04, a: .4, h: .5, lp: 1100, q: 4, vib: 5, vd: 2 })) },
    orchhit:  { t: 'pro', kk: 'Оркестр соққысы', ru: 'Оркестровый удар', len: 1.4, fn: (c, o, t) => { chord(c, o, t, [48, 55, 60, 64, 67, 72], { w: 'sawtooth', d: .9, v: .05, lp: 3000, lp2: 500 }); nz(c, o, t, .4, { type: 'lowpass', f: 1500, v: .4 }); tone(c, o, t, 90, { f2: 45, d: .5, v: .6 }); } },
    siren:    { g: 1.8, t: 'pro', kk: 'Дабыл', ru: 'Тревога', len: 2, fn: (c, o, t) => tone(c, o, t, 600, { w: 'square', d: 2, v: .07, vib: 2.5, vd: 180, a: .05, h: 1.7, lp: 2000 }) },
    rocket:   { t: 'pro', kk: 'Зымыран', ru: 'Ракета', len: 2.6, fn: (c, o, t) => { nz(c, o, t, 2.5, { type: 'lowpass', f: 300, f2: 1500, v: .4, a: .4 }); nz(c, o, t + .3, 2.2, { f: 500, f2: 5000, q: 1.5, v: .15, a: 1.5 }); tone(c, o, t, 80, { f2: 400, d: 2.5, v: .1, w: 'sawtooth', lp: 600, a: .5 }); } },
    thunder:  { t: 'pro', kk: 'Найзағай', ru: 'Гром', len: 2.6, fn: (c, o, t) => { nz(c, o, t, .15, { type: 'highpass', f: 2000, v: .4 }); nz(c, o, t + .05, 2.5, { type: 'lowpass', f: 400, f2: 80, v: .6, a: .05 }); tone(c, o, t + .05, 60, { f2: 30, d: 1.5, v: .4 }); } },
    chimes:   { g: 1.6, t: 'pro', kk: 'Желқоңырау', ru: 'Музыка ветра', len: 2.8, fn: (c, o, t) => { for (let i = 0; i < 16; i++) { const f = N(84 + [0, 2, 4, 7, 9, 12][Math.random() * 6 | 0]), s = t + i * .15 + Math.random() * .08; tone(c, o, s, f, { d: 1.2, v: .05 }); tone(c, o, s, f * 2.76, { d: .5, v: .015 }); } } },
    royal:    { t: 'pro', kk: 'Патша фанфарасы', ru: 'Королевские фанфары', len: 2.8, fn: (c, o, t) => { [[67, 0, .2], [67, .22, .2], [72, .44, .5], [71, .96, .2], [72, 1.18, .2], [76, 1.4, 1.2]].forEach(([n, s, d]) => chord(c, o, t + s, [n, n - 5], { w: 'sawtooth', d, v: .05, a: .03, h: d * .6, lp: 2600 })); [0, .44, 1.4].forEach(s => tone(c, o, t + s, 65, { f2: 45, d: .6, v: .5 })); } },
    lofi:     { t: 'pro', kk: 'Лоу-фай', ru: 'Лоу-фай', len: 2.6, fn: (c, o, t) => { [[[53, 57, 60, 64], 0], [[55, 59, 62, 65], 1.2]].forEach(([ns, s]) => { chord(c, o, t + s, ns, { d: 1.2, v: .05, a: .02, h: .5 }); chord(c, o, t + s, ns.map(n => n + 12), { w: 'triangle', d: .8, v: .015, a: .02 }); }); for (let i = 0; i < 25; i++) nz(c, o, t + Math.random() * 2.4, .01, { type: 'highpass', f: 4000, v: .04 }); [0, 1.2].forEach(s => kick(c, o, t + s, .35)); [.6, 1.8].forEach(s => snare(c, o, t + s, .15)); } },
    synthwave:{ g: 1.4, t: 'pro', kk: 'Синтвейв', ru: 'Синтвейв', len: 2.4, fn: (c, o, t) => { [57, 60, 64, 69, 64, 60, 57, 60, 55, 59, 62, 67, 62, 59, 55, 59].forEach((n, i) => tone(c, o, t + i * .14, N(n + 12), { w: 'sawtooth', d: .13, v: .05, lp: 1800 })); for (let i = 0; i < 8; i++) tone(c, o, t + i * .28, N(i < 4 ? 33 : 31), { w: 'sawtooth', d: .26, v: .1, lp: 400 }); } },
    champion: { t: 'pro', kk: 'Чемпион', ru: 'Чемпион', len: 2.9, fn: (c, o, t) => { mel(c, o, t, [[60, 0, .3], [64, .3, .3], [67, .6, .6], [65, 1.2, .3], [64, 1.5, .3], [62, 1.8, .3], [67, 2.1, .7]], { w: 'sawtooth', v: .07, a: .03, lp: 2600 }); [[[48, 55, 64], 0, 1.2], [[53, 60, 65], 1.2, .9], [[55, 62, 67], 2.1, .7]].forEach(([ns, s, d]) => chord(c, o, t + s, ns, { w: 'triangle', d, v: .05, h: d * .6 })); for (let i = 0; i < 8; i++) nz(c, o, t + 1.6 + i * .06, .05, { type: 'highpass', f: 1500, v: .08 + i * .02 }); } },
    wobble:   { t: 'pro', kk: 'Дабстеп', ru: 'Дабстеп', len: 2.2, fn: (c, o, t) => { tone(c, o, t, N(36), { w: 'sawtooth', d: 2.1, v: .18, lp: 300, q: 8, wob: 4, wd: 900, h: 1.8, a: .02 }); [0, 1].forEach(s => kick(c, o, t + s)); [.5, 1.5].forEach(s => snare(c, o, t + s)); } },
    finale:   { t: 'pro', kk: 'Үлкен финал', ru: 'Гранд-финал', len: 3, fn: (c, o, t) => { for (let i = 0; i < 20; i++) nz(c, o, t + i * .07, .06, { type: 'highpass', f: 1500, v: .06 + i * .012 }); kick(c, o, t + 1.5); nz(c, o, t + 1.5, 1.2, { type: 'highpass', f: 5000, v: .3 }); chord(c, o, t + 1.5, [48, 55, 60, 64, 67, 72], { w: 'sawtooth', d: 1.4, v: .045, lp: 3000, h: .6 }); chord(c, o, t + 1.5, [84, 88, 91], { d: 1.4, v: .05 }); } }
  };
  // plays a built-in sound; returns its length in seconds
  const play = (id, vol = 60) => {
    const s = SOUNDS[id], c = s && ac(); if (!c) return 0;
    const out = c.createGain(); out.gain.value = Math.max(0, Math.min(1, vol / 100)) * (s.g || 1); // g: per-sound loudness balance out.connect(c.destination);
    try { s.fn(c, out, c.currentTime + .02); } catch (e) { }
    return s.len;
  };

  const coin = '<div class="fx-coin">₸</div>';
  const many = (n, cls, inner, seed = 7) => { let h = '', r = seed; const rnd = () => (r = r * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) h += `<i class="${cls}" style="--x:${(rnd() * 100).toFixed(1)}%;--d:${(1.6 + rnd() * 1.8).toFixed(2)}s;--w:${(rnd() * 1.6).toFixed(2)}s;--r:${(rnd() * 720 - 360) | 0}deg;--s:${(.6 + rnd() * .8).toFixed(2)};--h:${(rnd() * 360) | 0};--y:${(rnd() * 100).toFixed(1)}%;--dx:${(rnd() * 240 - 120) | 0}px;--dy:${(rnd() * 240 - 120) | 0}px">${inner}</i>`; return h; };
  const VISUALS = {
    coin:      { kk: 'Тиын', ru: 'Монетка', html: () => coin },
    crown:     { kk: 'Тәж', ru: 'Корона', html: () => '<svg class="fx-crown" viewBox="0 0 120 90"><path d="M10 75 L18 25 L42 50 L60 12 L78 50 L102 25 L110 75Z" fill="var(--ac)" stroke="#3a2a00" stroke-width="4" stroke-linejoin="round"/><rect x="10" y="72" width="100" height="12" rx="3" fill="var(--ac)" stroke="#3a2a00" stroke-width="4"/><circle cx="60" cy="12" r="6" fill="#ff5c8a"/><circle cx="18" cy="25" r="5" fill="#22c3dd"/><circle cx="102" cy="25" r="5" fill="#22c3dd"/></svg>' },
    fire:      { kk: 'От', ru: 'Огонь', html: () => `<div class="fx-fire">${many(14, 'fl', '', 3)}${coin}</div>` },
    hearts:    { kk: 'Жүректер', ru: 'Сердечки', html: () => `<div class="fx-up">${many(16, 'hu', '❤', 11)}</div>${coin}` },
    stars:     { kk: 'Жұлдыздар', ru: 'Звёзды', html: () => `<div class="fx-up">${many(18, 'st', '★', 5)}</div>${coin}` },
    rain:      { kk: 'Тиын жаңбыры', ru: 'Дождь из монет', over: () => `<div class="fx-full">${many(36, 'rc', '₸', 9)}</div>`, html: () => coin },
    confetti:  { kk: 'Конфетти', ru: 'Конфетти', over: () => `<div class="fx-full">${many(70, 'cf', '', 13)}</div>`, html: () => coin },
    fireworks: { kk: 'Отшашу', ru: 'Салют', html: () => coin, over: () => `<div class="fx-full">${[18, 50, 82].map((x, k) => `<div class="fw" style="--x:${x}%;--y:${[30, 18, 34][k]}%;--w:${k * .45}s">${Array.from({ length: 16 }, (_, i) => `<b style="--a:${i * 22.5}deg"></b>`).join('')}</div>`).join('')}</div>` },
    // ---- Стандарт ----
    gem:      { t: 'std', kk: 'Гауһар', ru: 'Бриллиант', html: () => `<svg class="fx-gem" viewBox="0 0 120 100"><path d="M30 8h60l26 28-56 60L4 36z" fill="#7fe3ff"/><path d="M30 8l12 28h36l12-28M4 36h112M42 36l18 60 18-60" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity=".8"/><path d="M30 8l12 28H4z" fill="#c8f4ff"/><path d="M78 36l12-28 26 28z" fill="#3fb6e0"/></svg><div class="fx-tw">${many(10, 'tw', '', 21)}</div>` },
    bag:      { t: 'std', kk: 'Ақша қапшығы', ru: 'Мешок денег', html: () => `<svg class="fx-bag" viewBox="0 0 120 130"><path d="M44 22h32l-8 16H52z" fill="#a8732a"/><path d="M40 14c8 6 32 6 40 0l-6 10H46z" fill="#c98b36"/><path d="M52 38h16c30 10 44 40 40 64-3 18-22 24-48 24s-45-6-48-24c-4-24 10-54 40-64z" fill="#d99a3e"/><text x="60" y="104" text-anchor="middle" font-family="Unbounded,sans-serif" font-weight="700" font-size="46" fill="#3a2a00">₸</text></svg>${coin.replace('fx-coin', 'fx-coin fx-sm')}` },
    balloons: { t: 'std', kk: 'Шарлар', ru: 'Шарики', html: () => coin, over: () => `<div class="fx-full">${many(16, 'bl', '', 31)}</div>` },
    bubbles:  { t: 'std', kk: 'Көпіршіктер', ru: 'Пузыри', html: () => `<div class="fx-up">${many(18, 'bb', '', 41)}</div>${coin}` },
    snow:     { t: 'std', kk: 'Қар', ru: 'Снег', html: () => coin, over: () => `<div class="fx-full">${many(70, 'sn', '', 51)}</div>` },
    twinkle:  { t: 'std', kk: 'Жарқылдар', ru: 'Искорки', html: () => `<div class="fx-tw">${many(14, 'tw', '', 61)}</div>${coin}` },
    bolt:     { t: 'std', kk: 'Найзағай', ru: 'Молния', html: () => `<svg class="fx-bolt" viewBox="0 0 80 120"><path d="M48 4L10 68h26l-8 48 42-70H44z" fill="var(--ac)" stroke="#3a2a00" stroke-width="4" stroke-linejoin="round"/></svg>` },
    rocket:   { t: 'std', kk: 'Зымыран', ru: 'Ракета', html: () => `<div class="fx-rocket"><svg viewBox="0 0 80 150"><path d="M40 4c22 18 28 48 22 86H18C12 52 18 22 40 4z" fill="#eef6f9" stroke="#0b1d26" stroke-width="4"/><circle cx="40" cy="48" r="11" fill="#22c3dd" stroke="#0b1d26" stroke-width="4"/><path d="M18 70L4 104l16-6zM62 70l14 34-16-6z" fill="#ff5c5c" stroke="#0b1d26" stroke-width="4" stroke-linejoin="round"/><path class="fl" d="M24 92c4 30 12 46 16 52 4-6 12-22 16-52z" fill="#ffb02e"/></svg></div>` },
    trophy:   { t: 'std', kk: 'Кубок', ru: 'Кубок', html: () => `<div class="fx-shine"><svg class="fx-trophy" viewBox="0 0 120 130"><path d="M30 10h60v30c0 24-14 40-30 40S30 64 30 40z" fill="var(--ac)" stroke="#3a2a00" stroke-width="4"/><path d="M30 20H12c0 20 8 30 20 32M90 20h18c0 20-8 30-20 32" fill="none" stroke="#3a2a00" stroke-width="6"/><path d="M52 80h16v18H52z" fill="var(--ac)" stroke="#3a2a00" stroke-width="4"/><rect x="34" y="98" width="52" height="16" rx="4" fill="#3a2a00"/></svg></div>` },
    gift:     { t: 'std', kk: 'Сыйлық', ru: 'Подарок', html: () => `<svg class="fx-gift" viewBox="0 0 120 130"><rect x="16" y="56" width="88" height="66" rx="6" fill="#ff5c8a" stroke="#3a0a1a" stroke-width="4"/><rect x="54" y="56" width="12" height="66" fill="var(--ac)"/><g class="lid"><rect x="8" y="38" width="104" height="22" rx="5" fill="#ff7aa2" stroke="#3a0a1a" stroke-width="4"/><rect x="54" y="38" width="12" height="22" fill="var(--ac)"/><path d="M60 38c-10-22-34-18-24-4zM60 38c10-22 34-18 24-4z" fill="var(--ac)" stroke="#3a2a00" stroke-width="3"/></g></svg><div class="fx-up">${many(14, 'cfs', '', 71)}</div>` },
    bigheart: { t: 'std', kk: 'Үлкен жүрек', ru: 'Большое сердце', html: () => `<div class="fx-pulse"><svg class="fx-heart" viewBox="0 0 120 110"><path d="M60 104C24 78 6 58 6 34 6 18 18 6 34 6c11 0 20 6 26 16 6-10 15-16 26-16 16 0 28 12 28 28 0 24-18 44-54 70z" fill="#ff3d7a" stroke="#4a0a22" stroke-width="5"/></svg></div>` },
    notes:    { t: 'std', kk: 'Ноталар', ru: 'Ноты', html: () => `<div class="fx-up">${many(16, 'nt', '♪', 81)}${many(8, 'nt', '♫', 82)}</div>${coin}` },
    rainbow:  { t: 'std', kk: 'Кемпірқосақ', ru: 'Радуга', html: () => `<svg class="fx-rainbow" viewBox="0 0 240 130">${['#ff4d4d', '#ff9f1c', '#ffe14d', '#3ddc84', '#22c3dd', '#7a5cff'].map((c, i) => `<path d="M${20 + i * 12} 124a${100 - i * 12} ${100 - i * 12} 0 0 1 ${200 - i * 24} 0" fill="none" stroke="${c}" stroke-width="12" pathLength="100" style="animation-delay:${i * .08}s"/>`).join('')}</svg>` },
    bills:    { t: 'std', kk: 'Ақша жаңбыры', ru: 'Дождь из купюр', html: () => coin, over: () => `<div class="fx-full">${many(34, 'bi', '₸', 91)}</div>` },
    tulips:   { t: 'std', kk: 'Қызғалдақтар', ru: 'Тюльпаны', html: () => `<div class="fx-tulips">${[[-1, '#ff4d6d'], [0, '#ffd23f'], [1, '#ff7a3d']].map(([k, c], i) => `<svg viewBox="0 0 60 140" style="--k:${k};animation-delay:${i * .15}s"><path d="M30 60v76" stroke="#2f9e57" stroke-width="6"/><path d="M30 110c-18-4-26-18-26-30 14 4 24 14 26 30z" fill="#3ddc84"/><path d="M10 22c0 26 8 40 20 40s20-14 20-40l-10 10-10-18-10 18z" fill="${c}" stroke="#4a1020" stroke-width="3" stroke-linejoin="round"/></svg>`).join('')}</div>` },
    sunrays:  { t: 'std', kk: 'Күн сәулесі', ru: 'Солнечные лучи', html: () => `<div class="fx-rays"><div class="rays"></div>${coin}</div>` },
    rosette:  { t: 'std', kk: 'Марапат', ru: 'Награда', html: () => `<svg class="fx-rosette" viewBox="0 0 120 150"><path d="M40 80l-16 64 22-12 12 18 6-66zM80 80l16 64-22-12-12 18-6-66z" fill="#22c3dd" stroke="#06222d" stroke-width="4" stroke-linejoin="round"/>${Array.from({ length: 16 }, (_, i) => `<circle cx="${60 + 38 * Math.cos(i * Math.PI / 8)}" cy="${56 + 38 * Math.sin(i * Math.PI / 8)}" r="12" fill="var(--ac)" stroke="#3a2a00" stroke-width="3"/>`).join('')}<circle cx="60" cy="56" r="36" fill="var(--ac)" stroke="#3a2a00" stroke-width="4"/><text x="60" y="72" text-anchor="middle" font-family="Unbounded,sans-serif" font-weight="700" font-size="40" fill="#3a2a00">₸</text></svg>` },
    medal:    { t: 'std', kk: 'Медаль', ru: 'Медаль', html: () => `<svg class="fx-medal" viewBox="0 0 120 160"><path d="M30 0h22l14 60H44zM90 0H68L54 60h22z" fill="#ff5c5c" stroke="#3a0a0a" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="104" r="46" fill="var(--ac)" stroke="#3a2a00" stroke-width="5"/><circle cx="60" cy="104" r="34" fill="none" stroke="#3a2a00" stroke-width="3" opacity=".35"/><path d="M60 80l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#3a2a00"/></svg>` },
    fireflies:{ t: 'std', kk: 'Жарқанаттар', ru: 'Светлячки', html: () => coin, over: () => `<div class="fx-full">${many(40, 'ff', '', 101)}</div>` },
    ripple:   { t: 'std', kk: 'Толқын', ru: 'Волны', html: () => `<div class="fx-ripple"><b></b><b></b><b></b>${coin}</div>` },
    // ---- PRO ----
    shanyrak: { t: 'pro', kk: 'Шаңырақ', ru: 'Шанырак', html: () => `<svg class="fx-shan" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="none" stroke="var(--ac)" stroke-width="12"/>${[-40, 0, 40].map(d => `<path d="M${100 + d} 14C${100 + d - 60} 70 ${100 + d - 60} 130 ${100 + d} 186" fill="none" stroke="var(--ac)" stroke-width="9"/><path d="M14 ${100 + d}C70 ${100 + d - 60} 130 ${100 + d - 60} 186 ${100 + d}" fill="none" stroke="var(--ac)" stroke-width="9"/>`).join('')}<circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-dasharray="6 10"/></svg>` },
    oyu:      { t: 'pro', kk: 'Ою', ru: 'Орнамент', html: () => `<svg class="fx-oyu" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="var(--ac)"/>${[0, 90, 180, 270].map(a => `<path transform="rotate(${a} 50 50)" d="M50 50 C50 36 60 26 70 30 C78 34 76 46 66 45" fill="none" stroke="#061820" stroke-width="7" stroke-linecap="round"/>`).join('')}<circle cx="50" cy="50" r="7" fill="#fff"/></svg><div class="fx-tw">${many(12, 'tw', '', 111)}</div>` },
    eagle:    { t: 'pro', kk: 'Бүркіт', ru: 'Беркут', html: () => `<div class="fx-eagle"><svg viewBox="0 0 240 120"><g class="w l"><path d="M120 60C96 30 50 14 4 22c30 8 52 20 64 34-18-4-34 0-46 8 26 0 54 4 76 10z" fill="#3a2a1a"/></g><g class="w r"><path d="M120 60c24-30 70-46 116-38-30 8-52 20-64 34 18-4 34 0 46 8-26 0-54 4-76 10z" fill="#3a2a1a"/></g><path d="M104 56c4-12 28-12 32 0l-4 30-12 12-12-12z" fill="#5a3f22"/><path d="M110 50c2-10 18-10 20 0-2 8-18 8-20 0z" fill="#f2efe6"/><path d="M126 52l10 4-10 3z" fill="var(--ac)"/></svg></div>` },
    sunset:   { t: 'pro', kk: 'Дала кеші', ru: 'Закат в степи', html: () => `<svg class="fx-sunset" viewBox="0 0 320 180"><defs><linearGradient id="fxsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1b5a"/><stop offset=".6" stop-color="#ff7a3d"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs><rect width="320" height="180" rx="18" fill="url(#fxsk)"/><circle class="sun" cx="160" cy="118" r="34" fill="#ffe680"/><path d="M0 130l60-40 40 26 50-46 60 50 40-22 70 40v42H0z" fill="#3b2a5a"/><path d="M0 150c60-14 120-14 160-4s110 8 160-6v40H0z" fill="#1f5a3a"/><path class="bird" d="M60 40q8-8 16 0q8-8 16 0" fill="none" stroke="#1b1030" stroke-width="3"/><path class="bird b2" d="M220 54q6-6 12 0q6-6 12 0" fill="none" stroke="#1b1030" stroke-width="3"/></svg>` },
    galaxy:   { t: 'pro', kk: 'Галактика', ru: 'Галактика', html: () => coin, over: () => `<div class="fx-full"><div class="fx-gal">${Array.from({ length: 90 }, (_, i) => { const a = i * .5, r = 20 + i * 5.5; return `<i style="left:calc(50% + ${(Math.cos(a) * r).toFixed(0)}px);top:calc(50% + ${(Math.sin(a) * r * .55).toFixed(0)}px);--h:${(200 + i * 2) % 360};--s:${(.5 + (i % 5) * .2).toFixed(1)}"></i>`; }).join('')}</div></div>` },
    neonframe:{ t: 'pro', kk: 'Неон жиек', ru: 'Неоновая рамка', html: () => coin, over: () => `<div class="fx-full"><div class="fx-neon"></div></div>` },
    lasers:   { t: 'pro', kk: 'Лазер шоу', ru: 'Лазерное шоу', html: () => coin, over: () => `<div class="fx-full">${Array.from({ length: 8 }, (_, i) => `<i class="lz" style="--a:${-60 + i * 17}deg;--h:${[300, 190, 120, 50][i % 4]};--w:${(i % 4) * .25}s"></i>`).join('')}</div>` },
    portal:   { t: 'pro', kk: 'Портал', ru: 'Портал', html: () => `<div class="fx-portal"><div class="ring"></div>${coin}</div>` },
    holo:     { t: 'pro', kk: 'Голограмма', ru: 'Голограмма', html: () => `<div class="fx-holo"><span>₸</span></div>` },
    meteors:  { t: 'pro', kk: 'Метеорлар', ru: 'Метеоры', html: () => coin, over: () => `<div class="fx-full">${many(18, 'mt', '', 121)}</div>` },
    aurora:   { t: 'pro', kk: 'Солтүстік шұғыласы', ru: 'Северное сияние', html: () => coin, over: () => `<div class="fx-full"><div class="fx-aur"><b></b><b></b><b></b></div></div>` },
    eq:       { t: 'pro', kk: 'Эквалайзер', ru: 'Эквалайзер', html: () => `<div class="fx-eq">${Array.from({ length: 11 }, (_, i) => `<b style="--w:${(i * .09).toFixed(2)}s;--h:${[40, 70, 55, 90, 65, 100, 60, 85, 50, 75, 45][i]}%"></b>`).join('')}</div>` },
    diamonds: { t: 'pro', kk: 'Гауһар жаңбыры', ru: 'Дождь из бриллиантов', html: () => VISUALS.gem.html(), over: () => `<div class="fx-full">${many(30, 'dm', '', 131)}</div>` },
    kingrain: { t: 'pro', kk: 'Патша жаңбыры', ru: 'Королевский дождь', html: () => VISUALS.crown.html(), over: () => `<div class="fx-full">${many(46, 'rc', '₸', 141)}${many(30, 'cf', '', 142)}</div>` },
    megafw:   { t: 'pro', kk: 'Үлкен салют', ru: 'Большой салют', html: () => coin, over: () => `<div class="fx-full">${[[12, 26], [32, 14], [52, 30], [70, 12], [88, 28], [50, 8]].map(([x, y], k) => `<div class="fw big" style="--x:${x}%;--y:${y}%;--w:${k * .3}s;--c:hsl(${k * 60} 95% 62%)">${Array.from({ length: 24 }, (_, i) => `<b style="--a:${i * 15}deg"></b>`).join('')}</div>`).join('')}</div>` },
    cannons:  { t: 'pro', kk: 'Конфетти зеңбірегі', ru: 'Конфетти-пушки', html: () => coin, over: () => `<div class="fx-full">${many(40, 'cn l', '', 151)}${many(40, 'cn r', '', 152)}</div>` },
    glitch:   { t: 'pro', kk: 'Глитч', ru: 'Глитч', html: () => `<div class="fx-glitch">${coin}<div class="g1">${coin}</div><div class="g2">${coin}</div><i class="scan"></i></div>` },
    levelup:  { t: 'pro', kk: 'Жаңа деңгей', ru: 'Новый уровень', html: () => `<svg class="fx-lvl" viewBox="0 0 140 150"><path d="M70 6l60 34v70l-60 34-60-34V40z" fill="#7a5cff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M70 36l30 34H82v34H58V70H40z" fill="var(--ac)" stroke="#2a1a00" stroke-width="4" stroke-linejoin="round"/></svg><div class="fx-up">${many(16, 'st', '★', 161)}</div>` },
    warning:  { t: 'pro', kk: 'Ескерту', ru: 'Тревога', html: () => coin, over: () => `<div class="fx-full"><div class="fx-warn top"></div><div class="fx-warn bot"></div><div class="fx-vign"></div></div>` },
    heartstorm:{ t: 'pro', kk: 'Жүрек дауылы', ru: 'Шторм сердец', html: () => VISUALS.bigheart.html(), over: () => `<div class="fx-full">${many(50, 'hf', '❤', 171)}</div>` },
    fountain: { t: 'pro', kk: 'Тиын фонтаны', ru: 'Фонтан монет', html: () => coin, over: () => `<div class="fx-full">${many(40, 'fo', '<b>₸</b>', 181)}</div>` },
    firering: { t: 'pro', kk: 'От шеңбері', ru: 'Огненное кольцо', html: () => `<div class="fx-fring">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--w:${(i % 4) * .12}s"></i>`).join('')}${coin}</div>` },
    vortex:   { t: 'pro', kk: 'Ақша құйыны', ru: 'Денежный вихрь', html: () => `<div class="fx-vortex"><div class="orb">${Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg">₸</i>`).join('')}</div>${coin}</div>` },
    sparks:   { t: 'pro', kk: 'Ұшқындар', ru: 'Искры', html: () => `<div class="fx-sparks">${Array.from({ length: 24 }, (_, i) => `<i style="--a:${i * 15}deg;--w:${(i % 3) * .2}s"></i>`).join('')}${coin}</div>` },
    stadium:  { t: 'pro', kk: 'Стадион', ru: 'Стадион', html: () => coin, over: () => `<div class="fx-full"><i class="bm l"></i><i class="bm r"></i>${many(26, 'fl2', '', 191)}</div>` }
  };
  const CSS = `
.fx-coin{width:150px;height:150px;margin:0 auto 14px;border-radius:50%;background:var(--ac);box-shadow:inset -18px -18px 0 rgba(0,0,0,.18),0 0 0 14px rgba(255,255,255,.2);display:grid;place-items:center;font:700 64px Unbounded,sans-serif;color:#1b1400;animation:fx-spin 1.4s ease-in-out infinite}
@keyframes fx-spin{0%,100%{transform:rotateY(0)}50%{transform:rotateY(180deg)}}
.fx-crown{width:190px;display:block;margin:0 auto 10px;animation:fx-bob 1.2s ease-in-out infinite;filter:drop-shadow(0 8px 0 rgba(0,0,0,.35))}
@keyframes fx-bob{50%{transform:translateY(-14px) rotate(-4deg)}}
.fx-fire{position:relative;width:220px;height:170px;margin:0 auto 10px}
.fx-fire .fx-coin{position:absolute;left:35px;bottom:6px;margin:0}
.fx-fire .fl{position:absolute;bottom:20px;left:calc(var(--x) * .8 + 10%);width:34px;height:60px;border-radius:50% 50% 40% 40%;background:radial-gradient(circle at 50% 80%,#fff36b,#ff8a1d 45%,#e8251a 80%,transparent 82%);opacity:0;animation:fx-flame var(--d) ease-out var(--w) infinite}
@keyframes fx-flame{0%{opacity:.95;transform:translateY(0) scale(var(--s))}100%{opacity:0;transform:translateY(-130px) scale(.2)}}
.fx-up{position:absolute;left:50%;top:-40px;width:520px;height:260px;transform:translateX(-50%);pointer-events:none}
.fx-up i{position:absolute;bottom:0;left:var(--x);font-style:normal;font-size:calc(46px * var(--s));opacity:0;animation:fx-rise var(--d) ease-out var(--w) infinite}
.fx-up .hu{color:#ff3d7a;text-shadow:0 3px 0 rgba(0,0,0,.3)}
.fx-up .st{color:var(--ac);text-shadow:0 0 12px var(--ac)}
@keyframes fx-rise{0%{opacity:0;transform:translateY(40px) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translateY(-220px) rotate(var(--r)) scale(var(--s))}}
.fx-full{position:fixed;inset:0;overflow:hidden;pointer-events:none}
.fx-full .rc{position:absolute;top:-80px;left:var(--x);width:56px;height:56px;border-radius:50%;background:var(--ac);color:#1b1400;font:700 28px/56px Unbounded,sans-serif;font-style:normal;text-align:center;box-shadow:inset -6px -6px 0 rgba(0,0,0,.2);animation:fx-fall var(--d) linear var(--w) infinite;transform:scale(var(--s))}
.fx-full .cf{position:absolute;top:-30px;left:var(--x);width:14px;height:22px;background:hsl(var(--h) 90% 60%);animation:fx-fall calc(var(--d) * 1.3) linear var(--w) infinite}
@keyframes fx-fall{0%{transform:translateY(0) rotate(0) scale(var(--s))}100%{transform:translateY(1200px) rotate(var(--r)) scale(var(--s))}}
.fw{position:absolute;left:var(--x);top:var(--y)}
.fw b{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--ac);box-shadow:0 0 12px var(--ac);opacity:0;animation:fx-burst 1.6s ease-out var(--w) infinite;--a:0deg}
.fw b:nth-child(3n){background:#ff5c8a;box-shadow:0 0 12px #ff5c8a}.fw b:nth-child(3n+1){background:#22c3dd;box-shadow:0 0 12px #22c3dd}
@keyframes fx-burst{0%{opacity:1;transform:rotate(var(--a)) translateX(0)}70%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateX(200px)}}
.fx-sm{width:90px;height:90px;font-size:40px;margin-top:-30px}
.fx-gem{width:180px;display:block;margin:0 auto 10px;animation:fx-spin 2.2s ease-in-out infinite;filter:drop-shadow(0 0 18px #7fe3ff)}
.fx-tw{position:absolute;left:50%;top:-30px;width:440px;height:260px;transform:translateX(-50%);pointer-events:none}
.fx-tw .tw{position:absolute;left:var(--x);top:var(--y);width:26px;height:26px;background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);opacity:0;animation:fx-twk calc(var(--d) * .7) ease-in-out var(--w) infinite;transform:scale(var(--s))}
@keyframes fx-twk{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(var(--s)) rotate(45deg)}}
.fx-bag{width:170px;display:block;margin:0 auto;animation:fx-bob 1s ease-in-out infinite;filter:drop-shadow(0 8px 0 rgba(0,0,0,.3))}
.fx-full .bl{position:absolute;bottom:-160px;left:var(--x);width:70px;height:88px;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.7),transparent 30%),hsl(var(--h) 85% 58%);animation:fx-balloon calc(var(--d) * 2.2) ease-in var(--w) infinite;transform:scale(var(--s))}
.fx-full .bl::after{content:'';position:absolute;left:50%;top:100%;width:2px;height:70px;background:rgba(255,255,255,.7)}
@keyframes fx-balloon{0%{transform:translate(0,0) scale(var(--s))}50%{transform:translate(30px,-650px) scale(var(--s))}100%{transform:translate(-20px,-1400px) scale(var(--s))}}
.fx-up .bb{position:absolute;bottom:0;left:var(--x);width:calc(40px * var(--s));height:calc(40px * var(--s));border-radius:50%;border:3px solid rgba(255,255,255,.85);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.6),rgba(34,195,221,.15) 60%);opacity:0;animation:fx-rise var(--d) ease-out var(--w) infinite}
.fx-full .sn{position:absolute;top:-20px;left:var(--x);width:calc(12px * var(--s));height:calc(12px * var(--s));border-radius:50%;background:#fff;box-shadow:0 0 8px #fff;animation:fx-snow calc(var(--d) * 2.4) linear var(--w) infinite}
@keyframes fx-snow{0%{transform:translate(0,0)}50%{transform:translate(var(--dx),560px)}100%{transform:translate(0,1150px)}}
.fx-bolt{width:120px;display:block;margin:0 auto 10px;animation:fx-flash .9s steps(1) infinite;filter:drop-shadow(0 0 24px var(--ac))}
@keyframes fx-flash{0%,40%,100%{opacity:1}20%,60%{opacity:.25}}
.fx-rocket{width:120px;margin:0 auto 6px;animation:fx-shake .12s linear infinite}
.fx-rocket svg{width:100%;display:block}
.fx-rocket .fl{animation:fx-flick .12s ease-in-out infinite alternate;transform-origin:50% 0}
@keyframes fx-shake{50%{transform:translate(2px,-3px)}}
@keyframes fx-flick{to{transform:scaleY(.7)}}
.fx-shine{position:relative;width:170px;margin:0 auto 10px;overflow:hidden;border-radius:16px}
.fx-shine::after{content:'';position:absolute;inset:-20%;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.75) 50%,transparent 60%);animation:fx-sweep 1.8s ease-in-out infinite}
.fx-trophy{width:100%;display:block}
@keyframes fx-sweep{from{transform:translateX(-80%)}to{transform:translateX(80%)}}
.fx-gift{width:170px;display:block;margin:0 auto}
.fx-gift .lid{animation:fx-lid 1.4s ease-in-out infinite;transform-origin:60px 60px}
@keyframes fx-lid{0%,30%,100%{transform:none}50%{transform:translateY(-26px) rotate(-10deg)}}
.fx-up .cfs{position:absolute;bottom:40px;left:var(--x);width:10px;height:16px;background:hsl(var(--h) 90% 60%);opacity:0;animation:fx-rise var(--d) ease-out var(--w) infinite}
.fx-pulse{width:180px;margin:0 auto 10px;position:relative}
.fx-pulse::before{content:'';position:absolute;inset:10%;border-radius:50%;border:6px solid #ff3d7a;animation:fx-ring 1.2s ease-out infinite}
.fx-heart{width:100%;display:block;animation:fx-beat 1.2s ease-in-out infinite}
@keyframes fx-beat{0%,40%,100%{transform:scale(1)}15%{transform:scale(1.15)}25%{transform:scale(.96)}}
@keyframes fx-ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.6);opacity:0}}
.fx-up .nt{color:hsl(var(--h) 90% 65%);text-shadow:0 3px 0 rgba(0,0,0,.35);font-weight:700}
.fx-rainbow{width:300px;display:block;margin:0 auto 6px}
.fx-rainbow path{stroke-dasharray:100;stroke-dashoffset:100;animation:fx-draw 2.4s ease-in-out infinite}
@keyframes fx-draw{0%{stroke-dashoffset:100}40%,70%{stroke-dashoffset:0}100%{stroke-dashoffset:-100}}
.fx-full .bi{position:absolute;top:-90px;left:var(--x);width:110px;height:54px;border-radius:6px;background:linear-gradient(#5bd18b,#2f9e57);border:3px solid #1d6b3a;color:#0d3a1e;font:700 30px/48px Unbounded,sans-serif;font-style:normal;text-align:center;animation:fx-bill calc(var(--d) * 1.6) linear var(--w) infinite}
@keyframes fx-bill{0%{transform:translate(0,0) rotate(0) scale(var(--s))}50%{transform:translate(var(--dx),560px) rotate(calc(var(--r) / 2)) rotateX(60deg) scale(var(--s))}100%{transform:translate(0,1200px) rotate(var(--r)) scale(var(--s))}}
.fx-tulips{display:flex;justify-content:center;align-items:flex-end;gap:6px;height:170px;margin-bottom:8px}
.fx-tulips svg{width:64px;transform-origin:50% 100%;animation:fx-grow 2.6s ease-out infinite}
@keyframes fx-grow{0%{transform:scaleY(0)}25%{transform:scaleY(1) rotate(0)}60%{transform:rotate(calc(var(--k) * 6deg))}100%{transform:rotate(0)}}
.fx-rays{position:relative;width:220px;height:180px;margin:0 auto;display:grid;place-items:center}
.fx-rays .rays{position:absolute;width:320px;height:320px;border-radius:50%;background:repeating-conic-gradient(var(--ac) 0 10deg,transparent 10deg 30deg);-webkit-mask:radial-gradient(circle,#000 20%,transparent 68%);mask:radial-gradient(circle,#000 20%,transparent 68%);animation:fx-rot 8s linear infinite;opacity:.8}
.fx-rays .fx-coin{position:relative;margin:0}
@keyframes fx-rot{to{transform:rotate(360deg)}}
.fx-rosette{width:150px;display:block;margin:0 auto;animation:fx-tilt 2s ease-in-out infinite}
@keyframes fx-tilt{50%{transform:rotate(8deg) scale(1.05)}}
.fx-medal{width:140px;display:block;margin:0 auto;transform-origin:50% 0;animation:fx-swing 1.6s ease-in-out infinite}
@keyframes fx-swing{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}
.fx-full .ff{position:absolute;left:var(--x);top:var(--y);width:10px;height:10px;border-radius:50%;background:#fff6a8;box-shadow:0 0 14px 6px rgba(255,230,120,.7);animation:fx-float calc(var(--d) * 1.5) ease-in-out var(--w) infinite alternate}
@keyframes fx-float{0%{transform:translate(0,0);opacity:.2}50%{opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:.3}}
.fx-ripple{position:relative;width:240px;height:190px;margin:0 auto;display:grid;place-items:center}
.fx-ripple b{position:absolute;width:150px;height:150px;border-radius:50%;border:5px solid var(--ac);animation:fx-ring 1.8s ease-out infinite}
.fx-ripple b:nth-child(2){animation-delay:.6s}.fx-ripple b:nth-child(3){animation-delay:1.2s}
.fx-ripple .fx-coin{position:relative;margin:0}
.fx-shan{width:200px;display:block;margin:0 auto 8px;animation:fx-rot 10s linear infinite;filter:drop-shadow(0 0 16px var(--ac))}
.fx-oyu{width:180px;display:block;margin:0 auto 8px;animation:fx-oyu 3s ease-in-out infinite;filter:drop-shadow(0 0 20px var(--ac))}
@keyframes fx-oyu{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.1)}100%{transform:rotate(360deg) scale(1)}}
.fx-eagle{width:300px;margin:0 auto 8px;animation:fx-bob 2s ease-in-out infinite}
.fx-eagle svg{width:100%;display:block;overflow:visible}
.fx-eagle .w{animation:fx-flap .7s ease-in-out infinite;transform-origin:120px 60px}
@keyframes fx-flap{50%{transform:scaleY(-.5)}}
.fx-sunset{width:340px;display:block;margin:0 auto 10px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.fx-sunset .sun{animation:fx-sun 3s ease-in-out infinite}
.fx-sunset .bird{animation:fx-birdf 3s linear infinite}.fx-sunset .b2{animation-delay:-1.5s}
@keyframes fx-sun{50%{transform:translateY(8px)}}
@keyframes fx-birdf{from{transform:translateX(-40px)}to{transform:translateX(60px)}}
.fx-gal{position:absolute;inset:0;animation:fx-rot 14s linear infinite}
.fx-gal i{position:absolute;width:calc(10px * var(--s));height:calc(10px * var(--s));border-radius:50%;background:hsl(var(--h) 90% 70%);box-shadow:0 0 12px hsl(var(--h) 90% 60%)}
.fx-neon{position:absolute;inset:18px;border-radius:28px;border:8px solid #ff2bd6;box-shadow:0 0 24px #ff2bd6,inset 0 0 24px #ff2bd6;animation:fx-hue 2s linear infinite}
@keyframes fx-hue{to{filter:hue-rotate(360deg)}}
.fx-full .lz{position:absolute;left:50%;bottom:-20px;width:8px;height:150vh;margin-left:-4px;transform-origin:50% 100%;background:linear-gradient(transparent,hsl(var(--h) 100% 60%));box-shadow:0 0 18px hsl(var(--h) 100% 60%);animation:fx-laser 2.4s ease-in-out var(--w) infinite alternate;opacity:.85}
@keyframes fx-laser{from{transform:rotate(var(--a))}to{transform:rotate(calc(var(--a) * -1))}}
.fx-portal{position:relative;width:240px;height:200px;margin:0 auto;display:grid;place-items:center}
.fx-portal .ring{position:absolute;width:230px;height:230px;border-radius:50%;background:conic-gradient(#7a5cff,#22c3dd,#ff2bd6,#ffe680,#7a5cff);-webkit-mask:radial-gradient(circle,transparent 52%,#000 54%,#000 66%,transparent 70%);mask:radial-gradient(circle,transparent 52%,#000 54%,#000 66%,transparent 70%);animation:fx-rot 1.6s linear infinite;filter:blur(1px) drop-shadow(0 0 18px #7a5cff)}
.fx-portal .fx-coin{position:relative;margin:0;animation:fx-spin 1.4s ease-in-out infinite,fx-pul 1.4s ease-in-out infinite}
@keyframes fx-pul{50%{scale:.85}}
.fx-holo{width:240px;height:150px;margin:0 auto 12px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(115deg,#ff9ff3,#feca57,#48dbfb,#1dd1a1,#a29bfe,#ff9ff3);background-size:300% 300%;animation:fx-holo 3s linear infinite,fx-tilt 2.4s ease-in-out infinite;box-shadow:0 0 0 4px rgba(255,255,255,.6),0 12px 30px rgba(0,0,0,.4)}
.fx-holo span{font:700 80px Unbounded,sans-serif;color:rgba(20,10,40,.75);mix-blend-mode:overlay}
@keyframes fx-holo{to{background-position:300% 300%}}
.fx-full .mt{position:absolute;top:calc(var(--y) * .4 - 10%);left:var(--x);width:220px;height:4px;border-radius:4px;background:linear-gradient(90deg,transparent,#fff);box-shadow:0 0 12px #9fe8ff;transform:rotate(-35deg);opacity:0;animation:fx-meteor var(--d) linear var(--w) infinite}
@keyframes fx-meteor{0%{opacity:0;transform:rotate(-35deg) translateX(400px)}10%{opacity:1}100%{opacity:0;transform:rotate(-35deg) translateX(-900px)}}
.fx-aur{position:absolute;left:-10%;right:-10%;top:-10%;height:60%;filter:blur(40px);opacity:.8}
.fx-aur b{position:absolute;inset:0;border-radius:50%;animation:fx-aurm 6s ease-in-out infinite alternate}
.fx-aur b:nth-child(1){background:radial-gradient(closest-side,#3ddc84,transparent)}.fx-aur b:nth-child(2){background:radial-gradient(closest-side,#22c3dd,transparent);animation-delay:-2s}.fx-aur b:nth-child(3){background:radial-gradient(closest-side,#a259ff,transparent);animation-delay:-4s}
@keyframes fx-aurm{from{transform:translateX(-25%) scaleY(.7)}to{transform:translateX(25%) scaleY(1.1)}}
.fx-eq{display:flex;align-items:flex-end;justify-content:center;gap:8px;height:160px;margin-bottom:10px}
.fx-eq b{width:18px;height:var(--h);border-radius:9px;background:linear-gradient(var(--ac),#22c3dd);animation:fx-eqb .5s ease-in-out var(--w) infinite alternate;transform-origin:50% 100%}
@keyframes fx-eqb{from{transform:scaleY(.25)}to{transform:scaleY(1)}}
.fx-full .dm{position:absolute;top:-60px;left:var(--x);width:34px;height:34px;background:linear-gradient(135deg,#fff,#7fe3ff 40%,#3fb6e0);box-shadow:0 0 14px #7fe3ff;animation:fx-fall calc(var(--d) * 1.2) linear var(--w) infinite}
.fw.big b{width:14px;height:14px;background:var(--c);box-shadow:0 0 16px var(--c);animation-name:fx-burst2}
@keyframes fx-burst2{0%{opacity:1;transform:rotate(var(--a)) translateX(0)}70%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateX(300px) translateY(60px)}}
.fx-full .cn{position:absolute;bottom:-20px;width:14px;height:20px;background:hsl(var(--h) 90% 60%);opacity:0;animation:fx-cannon calc(var(--d) * .9) cubic-bezier(.1,.7,.3,1) var(--w) infinite}
.fx-full .cn.l{left:2%;--sx:1}.fx-full .cn.r{right:2%;--sx:-1}
@keyframes fx-cannon{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(calc(var(--sx) * (300px + var(--s) * 500px)),calc(-500px - var(--s) * 400px)) rotate(var(--r))}}
.fx-glitch{position:relative;width:170px;height:170px;margin:0 auto 10px}
.fx-glitch .fx-coin{position:absolute;inset:0;margin:0;animation:none}
.fx-glitch .g1,.fx-glitch .g2{position:absolute;inset:0;mix-blend-mode:screen}
.fx-glitch .g1 .fx-coin{background:#ff2bd6;color:#ff2bd6;opacity:.6;animation:fx-gl1 .4s steps(2) infinite}
.fx-glitch .g2 .fx-coin{background:#22c3dd;color:#22c3dd;opacity:.6;animation:fx-gl2 .5s steps(2) infinite}
.fx-glitch .scan{position:absolute;inset:-10px;background:repeating-linear-gradient(transparent 0 4px,rgba(0,0,0,.25) 4px 6px);pointer-events:none}
@keyframes fx-gl1{0%{transform:translate(-6px,2px);clip-path:inset(10% 0 50% 0)}100%{transform:translate(5px,-3px);clip-path:inset(60% 0 5% 0)}}
@keyframes fx-gl2{0%{transform:translate(6px,-2px);clip-path:inset(40% 0 20% 0)}100%{transform:translate(-4px,3px);clip-path:inset(5% 0 70% 0)}}
.fx-lvl{width:150px;display:block;margin:0 auto 8px;animation:fx-pul 1s ease-in-out infinite;filter:drop-shadow(0 0 22px #7a5cff)}
.fx-warn{position:absolute;left:0;right:0;height:46px;background:repeating-linear-gradient(-45deg,#ffd000 0 30px,#111 30px 60px);background-size:85px 100%;animation:fx-stripe .6s linear infinite}
.fx-warn.top{top:0}.fx-warn.bot{bottom:0}
.fx-vign{position:absolute;inset:0;box-shadow:inset 0 0 160px 40px rgba(255,0,0,.55);animation:fx-flash 1s steps(1) infinite}
@keyframes fx-stripe{to{background-position:85px 0}}
.fx-full .hf{position:absolute;top:-60px;left:var(--x);color:hsl(calc(330 + var(--h) / 12) 90% 60%);font-size:calc(46px * var(--s));font-style:normal;animation:fx-fall calc(var(--d) * 1.4) linear var(--w) infinite}
.fx-full .fo{position:absolute;bottom:-60px;left:calc(40% + var(--x) * .2);animation:fx-fox calc(var(--d) * .9) linear var(--w) infinite}
.fx-full .fo b{display:block;width:50px;height:50px;border-radius:50%;background:var(--ac);color:#1b1400;font:700 26px/50px Unbounded,sans-serif;text-align:center;box-shadow:inset -5px -5px 0 rgba(0,0,0,.2);animation:fx-foy calc(var(--d) * .9) cubic-bezier(.3,0,.7,1) var(--w) infinite}
@keyframes fx-fox{to{transform:translateX(calc(var(--dx) * 4))}}
@keyframes fx-foy{0%{transform:translateY(0)}50%{transform:translateY(calc(-600px - var(--s) * 200px))}100%{transform:translateY(0)}}
.fx-fring{position:relative;width:240px;height:220px;margin:0 auto;display:grid;place-items:center}
.fx-fring i{position:absolute;left:50%;top:50%;width:34px;height:60px;margin:-30px 0 0 -17px;border-radius:50% 50% 40% 40%;background:radial-gradient(circle at 50% 80%,#fff36b,#ff8a1d 45%,#e8251a 80%,transparent 82%);transform:rotate(var(--a)) translateY(-104px);animation:fx-flick2 .5s ease-in-out var(--w) infinite alternate}
@keyframes fx-flick2{from{transform:rotate(var(--a)) translateY(-104px) scale(.85)}to{transform:rotate(var(--a)) translateY(-112px) scale(1.15)}}
.fx-fring .fx-coin{position:relative;margin:0}
.fx-vortex{position:relative;width:260px;height:220px;margin:0 auto;display:grid;place-items:center}
.fx-vortex .orb{position:absolute;inset:0;animation:fx-rot 2.4s linear infinite}
.fx-vortex .orb i{position:absolute;left:50%;top:50%;width:62px;height:32px;margin:-16px 0 0 -31px;border-radius:5px;background:linear-gradient(#5bd18b,#2f9e57);border:2px solid #1d6b3a;color:#0d3a1e;font:700 20px/28px Unbounded,sans-serif;font-style:normal;text-align:center;transform:rotate(var(--a)) translateX(112px) rotate(90deg)}
.fx-vortex .fx-coin{position:relative;margin:0}
.fx-sparks{position:relative;width:240px;height:220px;margin:0 auto;display:grid;place-items:center}
.fx-sparks i{position:absolute;left:50%;top:50%;width:4px;height:40px;margin-left:-2px;border-radius:2px;background:linear-gradient(#fff,var(--ac));box-shadow:0 0 10px var(--ac);transform-origin:50% 0;opacity:0;animation:fx-spk 1s ease-out var(--w) infinite}
@keyframes fx-spk{0%{opacity:1;transform:rotate(var(--a)) translateY(60px) scaleY(.3)}100%{opacity:0;transform:rotate(var(--a)) translateY(130px) scaleY(1)}}
.fx-sparks .fx-coin{position:relative;margin:0}
.fx-full .bm{position:absolute;top:-10%;width:340px;height:140vh;background:linear-gradient(rgba(255,255,255,.75),transparent 80%);filter:blur(10px);transform-origin:50% 0;animation:fx-beam 3s ease-in-out infinite alternate}
.fx-full .bm.l{left:6%;--a:-25deg}.fx-full .bm.r{right:6%;--a:25deg;animation-delay:-1.5s}
@keyframes fx-beam{from{transform:rotate(var(--a))}to{transform:rotate(calc(var(--a) * -1))}}
.fx-full .fl2{position:absolute;left:var(--x);top:calc(55% + var(--y) * .4);width:8px;height:8px;border-radius:50%;background:#fff;opacity:0;box-shadow:0 0 30px 14px #fff;animation:fx-camf calc(var(--d) * 1.3) steps(1) var(--w) infinite}
@keyframes fx-camf{0%,92%{opacity:0}94%{opacity:1}}
.fx-media{display:block;max-width:420px;max-height:320px;margin:0 auto 12px;border-radius:12px}
@media(prefers-reduced-motion:reduce){[class^=fx-] *,.fx-coin,.fx-crown{animation:none!important}}`;
  let cssOn = false;
  const css = () => { if (cssOn) return; cssOn = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); };
  // a visual: built-in id, "file:<name>" (uploaded gif/webp/png/mp4/webm), or "none"
  const visual = id => {
    css();
    if (id === 'none') return '';
    if (/^file:[\w.-]+$/.test(id)) { const f = id.slice(5), src = '/media/' + encodeURIComponent(f); return /\.(mp4|webm)$/i.test(f) ? `<video class="fx-media" src="${src}" autoplay loop muted playsinline></video>` : `<img class="fx-media" src="${src}" alt="">`; }
    return (VISUALS[id] || VISUALS.coin).html();
  };
  // full-screen layer (coin rain, confetti, fireworks) must live outside the animated alert box
  const overlay = id => { css(); const v = VISUALS[id]; return v && v.over ? v.over() : ''; };
  return { SOUNDS, VISUALS, play, visual, overlay, css, ac };
})();
