const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const trustEl = document.querySelector("#trust");
const highscoreEl = document.querySelector("#highscore");
const restartButton = document.querySelector("#restartButton");
const muteButton = document.querySelector("#muteButton");

const logo = new Image();
logo.src = "../../src/assets/logo.png";

const HIGH_SCORE_KEY = "estundnzettl_stundn_wurf_highscore_v1";
const AUDIO_MUTE_KEY = "estundnzettl_stundn_wurf_audio_v1";
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';

const SPRITES = {
  worker: "\u{1F477}",
  workerSwing: "\u{1F93E}",
  bat: "\u{1F3CF}",
  pile: "\u{1F4A9}",
  chef: "\u{1F468}‍\u{1F4BC}",
  chefAngry: "\u{1F621}",
  finger: "☝️",
  wc: "\u{1F6BD}",
  flush: "\u{1F300}",
  paper: "\u{1F9FB}",
  boost: "⭐",
  wind: "\u{1F4A8}",
  sweat: "\u{1F4A6}",
  fly: "\u{1FAB0}",
};

const AIM_SWEET = { lo: 0.62, hi: 0.82, center: 0.72 };
const LAUNCH_DURATION = 0.46;

const state = {
  phase: "aim",
  distance: 0,
  elapsedSeconds: 0,
  trust: 100,
  highscore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
  lastTime: 0,
  now: 0,
  worldX: 0,
  meter: 0,
  meterDirection: 1,
  launchTimer: 0,
  launchQuality: 0,
  shake: 0,
  worker: {
    bob: 0,
    sweatTimer: 0,
    swingTrail: [],
  },
  wind: {
    timer: 2.8,
    duration: 0,
    force: 0,
    label: "",
    gusts: [],
  },
  message: "Im richtigen Moment tippen",
  flyer: {
    x: 170,
    y: 330,
    vx: 0,
    vy: 0,
    rotation: 0,
    width: 64,
    height: 78,
    squashTimer: 0,
    hitShake: 0,
    paperTrail: [],
  },
  boosters: [],
  hazards: [],
  particles: [],
  rings: [],
  dust: [],
};

const audio = {
  ctx: null,
  master: null,
  muted: localStorage.getItem(AUDIO_MUTE_KEY) === "1",
  whoosh: null,
  whooshGain: null,
};

function ensureAudio() {
  if (audio.ctx) {
    if (audio.ctx.state === "suspended") audio.ctx.resume().catch(() => {});
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio.ctx = new Ctx();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = audio.muted ? 0 : 0.85;
  audio.master.connect(audio.ctx.destination);
}

function setMuted(muted) {
  audio.muted = muted;
  localStorage.setItem(AUDIO_MUTE_KEY, muted ? "1" : "0");
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.85;
  if (muteButton) muteButton.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
}

function blip({ freq, type = "sine", duration = 0.14, attack = 0.005, release = 0.1, gain = 0.22, freqEnd, sweep = "exponential", vibrato = 0, vibratoRate = 6 }) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd !== undefined) {
    if (sweep === "exponential") osc.frequency.exponentialRampToValueAtTime(Math.max(0.001, freqEnd), t + duration);
    else osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
  }
  if (vibrato > 0) {
    const lfo = audio.ctx.createOscillator();
    const lfoGain = audio.ctx.createGain();
    lfo.frequency.value = vibratoRate;
    lfoGain.gain.value = vibrato;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + duration + 0.05);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  osc.connect(g).connect(audio.master);
  osc.start(t);
  osc.stop(t + Math.max(attack + release, duration) + 0.05);
}

function noise({ duration = 0.2, filterType = "bandpass", filterFreq = 800, filterFreqEnd, filterQ = 1.2, gain = 0.18 }) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const length = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, t);
  filter.Q.value = filterQ;
  if (filterFreqEnd !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(0.001, filterFreqEnd), t + duration);
  }
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(g).connect(audio.master);
  src.start(t);
  src.stop(t + duration + 0.05);
}

function startFlightWhoosh() {
  if (!audio.ctx || audio.muted || audio.whoosh) return;
  const t = audio.ctx.currentTime;
  const length = Math.floor(audio.ctx.sampleRate * 0.5);
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 700;
  filter.Q.value = 0.8;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.2);
  src.connect(filter).connect(g).connect(audio.master);
  src.start(t);
  audio.whoosh = src;
  audio.whooshGain = g;
}

function stopFlightWhoosh() {
  if (!audio.whoosh || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  try {
    audio.whooshGain.gain.cancelScheduledValues(t);
    audio.whooshGain.gain.setValueAtTime(audio.whooshGain.gain.value, t);
    audio.whooshGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    audio.whoosh.stop(t + 0.22);
  } catch (_) {}
  audio.whoosh = null;
  audio.whooshGain = null;
}

const sfx = {
  uiTap: () => blip({ freq: 880, type: "square", duration: 0.04, attack: 0.002, release: 0.04, gain: 0.08 }),
  meterTick: () => blip({ freq: 660, duration: 0.025, attack: 0.001, release: 0.022, gain: 0.05 }),
  windUp: () => blip({ freq: 200, freqEnd: 110, type: "sine", duration: 0.26, attack: 0.01, release: 0.22, gain: 0.18 }),
  impact: () => {
    noise({ duration: 0.09, filterType: "lowpass", filterFreq: 1400, filterFreqEnd: 200, gain: 0.35 });
    blip({ freq: 90, freqEnd: 38, type: "square", duration: 0.18, attack: 0.002, release: 0.16, gain: 0.28 });
  },
  boostTap: () => blip({ freq: 420, freqEnd: 820, type: "square", duration: 0.1, attack: 0.003, release: 0.09, gain: 0.16 }),
  boostCollect: () => {
    blip({ freq: 660, freqEnd: 990, type: "triangle", duration: 0.15, attack: 0.003, release: 0.13, gain: 0.18 });
    blip({ freq: 1320, type: "triangle", duration: 0.12, attack: 0.04, release: 0.1, gain: 0.1 });
  },
  chefHit: () => blip({ freq: 300, freqEnd: 90, type: "sawtooth", duration: 0.28, attack: 0.003, release: 0.25, gain: 0.22 }),
  wcHit: () => {
    noise({ duration: 0.55, filterType: "bandpass", filterFreq: 900, filterFreqEnd: 220, filterQ: 1.6, gain: 0.22 });
    blip({ freq: 320, freqEnd: 140, type: "sine", duration: 0.4, attack: 0.02, release: 0.35, gain: 0.12 });
  },
  paperHit: () => blip({ freq: 220, type: "square", duration: 0.22, attack: 0.003, release: 0.2, gain: 0.16, vibrato: 24, vibratoRate: 14 }),
  windGust: () => noise({ duration: 1.0, filterType: "bandpass", filterFreq: 600, filterFreqEnd: 1200, filterQ: 0.7, gain: 0.18 }),
  landing: () => {
    noise({ duration: 0.22, filterType: "lowpass", filterFreq: 500, filterFreqEnd: 120, gain: 0.32 });
    blip({ freq: 70, type: "sine", duration: 0.25, attack: 0.005, release: 0.22, gain: 0.2 });
  },
  gameOver: () => {
    [659, 523, 440].forEach((f, i) => setTimeout(() => blip({ freq: f, type: "triangle", duration: 0.22, attack: 0.005, release: 0.2, gain: 0.16 }), i * 160));
  },
  highscore: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip({ freq: f, type: "triangle", duration: 0.18, attack: 0.005, release: 0.17, gain: 0.18 }), i * 120));
  },
};

function drawEmoji(emoji, x, y, size, rotation = 0, alpha = 1, scaleX = 1, scaleY = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(canvas.clientWidth * ratio);
  const height = Math.round(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    const oldGround = groundY();
    canvas.width = width;
    canvas.height = height;
    const newGround = groundY();
    if (state.phase === "aim") {
      state.flyer.x = canvas.width * 0.19;
      state.flyer.y = newGround - state.flyer.height / 2;
    } else {
      state.flyer.y += newGround - oldGround;
    }
  }
}

function groundY() {
  return canvas.height * 0.78;
}

function reset() {
  resizeCanvas();
  state.phase = "aim";
  state.distance = 0;
  state.elapsedSeconds = 0;
  state.trust = 100;
  state.lastTime = 0;
  state.worldX = 0;
  state.meter = 0;
  state.meterDirection = 1;
  state.launchTimer = 0;
  state.launchQuality = 0;
  state.shake = 0;
  state.worker.bob = 0;
  state.worker.sweatTimer = 0;
  state.worker.swingTrail = [];
  state.wind.timer = 2.4 + Math.random() * 2.2;
  state.wind.duration = 0;
  state.wind.force = 0;
  state.wind.label = "";
  state.wind.gusts = [];
  state.message = "Im richtigen Moment tippen";
  state.flyer.x = canvas.width * 0.19;
  state.flyer.y = groundY() - state.flyer.height / 2;
  state.flyer.vx = 0;
  state.flyer.vy = 0;
  state.flyer.rotation = 0;
  state.flyer.squashTimer = 0;
  state.flyer.hitShake = 0;
  state.flyer.paperTrail = [];
  state.boosters = [];
  state.hazards = [];
  state.particles = [];
  state.rings = [];
  state.dust = [];
  stopFlightWhoosh();
  if (restartButton) restartButton.classList.remove("is-visible");
  seedCourse();
  updateHud();
}

function seedCourse() {
  state.boosters = [];
  state.hazards = [];
  for (let i = 0; i < 44; i += 1) {
    const x = 760 + i * 390 + Math.random() * 210;
    const y = canvas.height * (0.32 + Math.random() * 0.28);
    state.boosters.push({ x, y, radius: 34, used: false, pulse: Math.random() * Math.PI });
  }

  for (let i = 0; i < 30; i += 1) {
    const x = 1120 + i * 540 + Math.random() * 260;
    const roll = Math.random();
    const type = roll > 0.66 ? "paper" : roll > 0.33 ? "chef" : "wc";
    state.hazards.push({
      x,
      y: type === "paper" ? canvas.height * (0.32 + Math.random() * 0.28) : groundY() - 42,
      baseX: x,
      baseY: type === "paper" ? canvas.height * (0.32 + Math.random() * 0.28) : groundY() - 42,
      width: type === "chef" ? 74 : type === "paper" ? 104 : 88,
      height: type === "chef" ? 92 : type === "paper" ? 46 : 64,
      type,
      phase: Math.random() * Math.PI * 2,
      amp: canvas.height * (0.035 + Math.random() * 0.035),
      hit: false,
      hitTime: 0,
      paperTrail: [],
    });
  }
}

function updateHud() {
  scoreEl.textContent = Math.max(0, Math.floor(state.elapsedSeconds));
  trustEl.textContent = `${Math.max(0, Math.round(state.trust))}%`;
  highscoreEl.textContent = Math.floor(state.highscore);
}

function tap() {
  ensureAudio();
  if (state.phase === "ended") {
    sfx.uiTap();
    reset();
    return;
  }

  if (state.phase === "aim") {
    const distFromCenter = Math.abs(state.meter - AIM_SWEET.center);
    const inSweet = state.meter >= AIM_SWEET.lo && state.meter <= AIM_SWEET.hi;
    const quality = inSweet ? Math.max(0.65, 1 - distFromCenter / 0.4) : Math.max(0.18, 1 - distFromCenter / 0.72);
    state.phase = "launch";
    state.launchTimer = 0;
    state.launchQuality = quality;
    state.message = quality > 0.82 ? "Volltreffer!" : "Abschlag!";
    sfx.windUp();
    return;
  }

  if (state.phase === "flight") {
    const nearBoost = state.boosters.find((boost) => {
      if (boost.used) return false;
      const dx = boost.x - state.flyer.x;
      const dy = boost.y - state.flyer.y;
      return Math.hypot(dx, dy) < 150;
    });

    if (nearBoost) {
      nearBoost.used = true;
      state.flyer.vy = -canvas.height * 0.5;
      state.flyer.vx += canvas.width * 0.055;
      state.trust = Math.min(100, state.trust + 9);
      state.particles.push({ x: state.flyer.x - state.worldX - 48, y: state.flyer.y - 42, life: 0.8, text: "+Schuss!" });
      state.rings.push({ x: nearBoost.x, y: nearBoost.y, life: 0.4, max: 0.4 });
      for (let i = 0; i < 6; i += 1) {
        const ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
        state.dust.push({
          x: nearBoost.x, y: nearBoost.y,
          vx: Math.cos(ang) * canvas.width * 0.18, vy: Math.sin(ang) * canvas.width * 0.18,
          life: 0.55, max: 0.55, size: 6, sparkle: true,
        });
      }
      sfx.boostCollect();
    } else {
      state.flyer.vy = Math.min(state.flyer.vy, canvas.height * 0.08) - canvas.height * 0.39;
      state.flyer.vx += canvas.width * 0.028;
      state.trust -= 2.4;
      state.particles.push({ x: state.flyer.x - state.worldX - 58, y: state.flyer.y - 36, life: 0.48, text: "Nachschuss!" });
      sfx.boostTap();
    }
  }
}

let lastTapAt = 0;

function handleGameInput(event) {
  if (event.target === restartButton || event.target === muteButton) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastTapAt < 105) return;
  lastTapAt = now;
  tap();
}

function updateWind(delta) {
  if (state.phase !== "flight") return;

  if (state.wind.duration > 0) {
    state.wind.duration -= delta;
    state.wind.gusts.forEach((g) => {
      g.x += g.vx * delta;
      g.y += g.vy * delta;
      g.life -= delta;
    });
    state.wind.gusts = state.wind.gusts.filter((g) => g.life > 0);
    if (state.wind.gusts.length < 3 && Math.random() < delta * 6) {
      const dir = Math.sign(state.wind.force) || 1;
      state.wind.gusts.push({
        x: dir > 0 ? -40 : canvas.width + 40,
        y: canvas.height * (0.18 + Math.random() * 0.5),
        vx: dir * canvas.width * (0.6 + Math.random() * 0.4),
        vy: (Math.random() - 0.5) * canvas.width * 0.08,
        life: 1.0,
        max: 1.0,
      });
    }
    if (state.wind.duration <= 0) {
      state.wind.duration = 0;
      state.wind.force = 0;
      state.wind.label = "";
      state.wind.timer = 2.6 + Math.random() * 3.4;
    }
    return;
  }

  state.wind.timer -= delta;
  if (state.wind.timer <= 0) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const strength = canvas.width * (0.12 + Math.random() * 0.11);
    state.wind.force = direction * strength;
    state.wind.duration = 0.9 + Math.random() * 0.9;
    state.wind.label = direction > 0 ? "Rueckenwind" : "Gegenwind";
    state.particles.push({
      x: canvas.width * 0.38,
      y: canvas.height * 0.24,
      life: 0.7,
      text: state.wind.label,
    });
    state.shake = Math.max(state.shake, 0.2);
    sfx.windGust();
  }
}

function endRun() {
  state.phase = "ended";
  state.message = "Gelandet. Tippen fuer neuen Wurf.";
  stopFlightWhoosh();
  const isNewHighscore = state.elapsedSeconds > state.highscore;
  if (isNewHighscore) {
    state.highscore = Math.floor(state.elapsedSeconds);
    localStorage.setItem(HIGH_SCORE_KEY, String(state.highscore));
    sfx.highscore();
  } else {
    sfx.gameOver();
  }
  sfx.landing();
  if (restartButton) restartButton.classList.add("is-visible");
  updateHud();
}

function update(delta) {
  state.now += delta;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - delta);
  if (state.flyer.hitShake > 0) state.flyer.hitShake = Math.max(0, state.flyer.hitShake - delta);
  if (state.flyer.squashTimer > 0) state.flyer.squashTimer = Math.max(0, state.flyer.squashTimer - delta);

  if (state.phase === "aim") {
    state.worker.bob += delta;
    const prevMeter = state.meter;
    state.meter += state.meterDirection * delta * 1.45;
    if (state.meter >= 1) { state.meter = 1; state.meterDirection = -1; }
    if (state.meter <= 0) { state.meter = 0; state.meterDirection = 1; }
    const wasInSweet = prevMeter >= AIM_SWEET.lo && prevMeter <= AIM_SWEET.hi;
    const isInSweet = state.meter >= AIM_SWEET.lo && state.meter <= AIM_SWEET.hi;
    if (isInSweet && !wasInSweet) sfx.meterTick();
    return;
  }

  if (state.phase === "launch") {
    state.launchTimer += delta;
    state.worker.sweatTimer += delta;
    if (state.worker.sweatTimer > 0.12) {
      state.worker.sweatTimer = 0;
      const baseX = canvas.width * 0.17;
      const baseY = groundY() - canvas.height * 0.13;
      state.dust.push({
        x: baseX + (Math.random() - 0.5) * 30, y: baseY,
        vx: (Math.random() - 0.5) * 30, vy: canvas.height * 0.06,
        life: 0.6, max: 0.6, size: 0, sweat: true,
      });
    }
    if (state.launchTimer >= LAUNCH_DURATION) {
      const quality = state.launchQuality;
      state.phase = "flight";
      state.message = "";
      state.flyer.vx = canvas.width * (0.48 + quality * 0.22);
      state.flyer.vy = -canvas.height * (0.3 + quality * 0.18);
      state.flyer.squashTimer = 0.18;
      state.particles.push({
        x: state.flyer.x - state.worldX - 18,
        y: state.flyer.y - 48,
        life: 0.65,
        text: quality > 0.82 ? "perfekt!" : "los!",
      });
      const baseX = canvas.width * 0.22;
      const baseY = groundY() - canvas.height * 0.05;
      for (let i = 0; i < 10; i += 1) {
        const ang = -Math.PI * Math.random();
        const sp = canvas.width * (0.12 + Math.random() * 0.16);
        state.dust.push({
          x: baseX, y: baseY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0.5 + Math.random() * 0.3, max: 0.7,
          size: 8 + Math.random() * 6, dust: true,
        });
      }
      state.shake = 0.18;
      sfx.impact();
      startFlightWhoosh();
    }
    return;
  }

  if (state.phase !== "flight") return;

  const flyer = state.flyer;
  updateWind(delta);
  state.elapsedSeconds += delta;
  flyer.vy += canvas.height * 0.46 * delta;
  flyer.vx += state.wind.force * delta;
  flyer.vx *= 1 - delta * 0.028;
  flyer.x += flyer.vx * delta;
  flyer.y += flyer.vy * delta;
  flyer.rotation += (flyer.vx * 0.00045 + flyer.vy * 0.0002) * delta * 60;

  if (flyer.y < canvas.height * 0.16) {
    flyer.y = canvas.height * 0.16;
    flyer.vy = Math.max(flyer.vy, canvas.height * 0.04);
  }

  const cameraTarget = Math.max(0, flyer.x - canvas.width * 0.34);
  state.worldX += (cameraTarget - state.worldX) * Math.min(1, delta * 6);
  state.distance = Math.max(state.distance, state.worldX / 8);
  state.highscore = Math.max(state.highscore, Math.floor(state.elapsedSeconds));
  state.trust -= delta * 0.52;

  const flyerBounds = {
    x: flyer.x - state.worldX - flyer.width / 2,
    y: flyer.y - flyer.height / 2,
    width: flyer.width,
    height: flyer.height,
  };

  for (const hazard of state.hazards) {
    if (hazard.type === "chef") {
      const t = state.now + hazard.phase;
      hazard.y = hazard.baseY + Math.sin(t * 5) * 4;
      hazard.x = hazard.baseX + Math.sin(t * 2.4) * 8;
    }
    if (hazard.type === "paper") {
      hazard.y = hazard.baseY + Math.sin(state.distance * 0.08 + hazard.phase) * hazard.amp;
      const sx = hazard.x - state.worldX;
      if (sx > -200 && sx < canvas.width + 200 && !hazard.hit) {
        hazard.paperTrail.push({ x: hazard.x, y: hazard.y, life: 0.7 });
        if (hazard.paperTrail.length > 10) hazard.paperTrail.shift();
      }
      hazard.paperTrail.forEach((p) => { p.life -= delta; });
      hazard.paperTrail = hazard.paperTrail.filter((p) => p.life > 0);
    }
    if (hazard.hit) {
      hazard.hitTime += delta;
      continue;
    }
    const sx = hazard.x - state.worldX;
    const hazardBounds = {
      x: sx - hazard.width / 2,
      y: hazard.y - hazard.height / 2,
      width: hazard.width,
      height: hazard.height,
    };
    if (rectsOverlap(flyerBounds, hazardBounds)) {
      hazard.hit = true;
      hazard.hitTime = 0;
      state.flyer.hitShake = 0.22;
      state.shake = Math.max(state.shake, 0.22);
      if (hazard.type === "paper") {
        state.flyer.vx *= 0.58;
        state.flyer.vy += canvas.height * 0.1;
        state.trust -= 18;
        sfx.paperHit();
      } else if (hazard.type === "chef") {
        state.flyer.vx *= 0.72;
        state.flyer.vy -= canvas.height * 0.12;
        state.trust -= 20;
        sfx.chefHit();
      } else {
        state.flyer.vx *= 0.72;
        state.flyer.vy -= canvas.height * 0.12;
        state.trust -= 14;
        sfx.wcHit();
      }
      const hitText = hazard.type === "chef" ? "Chef!" : hazard.type === "paper" ? "weggewischt!" : "WC-Zeit";
      state.particles.push({ x: flyerBounds.x - 30, y: flyer.y - 60, life: 0.65, text: hitText });
    }
  }

  for (const boost of state.boosters) {
    boost.pulse += delta * 6;
  }

  state.rings.forEach((r) => { r.life -= delta; });
  state.rings = state.rings.filter((r) => r.life > 0);

  state.dust.forEach((d) => {
    d.life -= delta;
    d.x += (d.vx || 0) * delta;
    d.y += (d.vy || 0) * delta;
    if (!d.sweat) d.vy += canvas.height * 0.15 * delta;
  });
  state.dust = state.dust.filter((d) => d.life > 0);

  state.particles = state.particles
    .map((particle) => ({ ...particle, y: particle.y - 42 * delta, life: particle.life - delta }))
    .filter((particle) => particle.life > 0);

  if (flyer.y + flyer.height / 2 >= groundY() || state.trust <= 0 || flyer.vx < canvas.width * 0.08) {
    flyer.y = Math.min(flyer.y, groundY() - flyer.height / 2);
    endRun();
  }

  updateHud();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function applyShake() {
  if (state.shake <= 0) return { x: 0, y: 0 };
  const amp = state.shake * canvas.width * 0.008;
  return { x: (Math.random() - 0.5) * amp, y: (Math.random() - 0.5) * amp };
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#182321");
  sky.addColorStop(0.5, "#23322c");
  sky.addColorStop(1, "#101414");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const parallax = state.worldX * 0.18;
  ctx.fillStyle = "rgba(245, 240, 232, 0.07)";
  for (let x = -200 - (parallax % 260); x < canvas.width + 260; x += 260) {
    ctx.fillRect(x, canvas.height * 0.25, 96, 10);
    ctx.fillRect(x + 130, canvas.height * 0.18, 58, 8);
  }

  ctx.fillStyle = "#2d4038";
  ctx.fillRect(0, groundY(), canvas.width, canvas.height - groundY());
  ctx.fillStyle = "#f0c36a";
  ctx.fillRect(0, groundY(), canvas.width, 5);

  const groundOffset = state.worldX % 140;
  ctx.fillStyle = "#17201d";
  for (let x = -groundOffset; x < canvas.width + 140; x += 140) {
    ctx.fillRect(x, groundY() + 54, 84, 9);
  }

  ctx.fillStyle = "#d7e8dc";
  ctx.font = `900 ${Math.max(22, canvas.width * 0.028)}px system-ui`;
  ctx.fillText("eStundnzettl", canvas.width * 0.055, canvas.height * 0.18);
  if (logo.complete) {
    const size = Math.max(48, canvas.width * 0.052);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logo, canvas.width * 0.058, canvas.height * 0.2, size, size);
    ctx.globalAlpha = 1;
  }
}

function drawWindGusts() {
  if (state.phase !== "flight") return;
  const size = Math.max(28, canvas.width * 0.05);
  for (const g of state.wind.gusts) {
    const alpha = Math.max(0, Math.min(1, g.life / g.max));
    drawEmoji(SPRITES.wind, g.x, g.y, size, 0, alpha * 0.85);
  }
  if (state.wind.duration > 0 && state.wind.label) {
    ctx.save();
    ctx.fillStyle = "#fff7de";
    ctx.font = `900 ${Math.max(18, canvas.width * 0.023)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 0.8;
    ctx.fillText(state.wind.label, canvas.width * 0.82, canvas.height * 0.2);
    ctx.restore();
  }
}

function drawAimMeter() {
  if (state.phase !== "aim" && state.phase !== "launch") return;

  const width = Math.min(canvas.width * 0.68, 560);
  const height = 28;
  const x = (canvas.width - width) / 2;
  const y = canvas.height * 0.68;

  ctx.fillStyle = "rgba(16, 20, 20, 0.78)";
  roundRect(x - 18, y - 54, width + 36, 112, 8);
  ctx.fill();

  ctx.fillStyle = "#fff7de";
  ctx.font = `900 ${Math.max(28, canvas.width * 0.042)}px system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(state.phase === "launch" ? state.message : "Stundn-Wurf", x, y - 22);

  const barGradient = ctx.createLinearGradient(x, y, x + width, y);
  barGradient.addColorStop(0, "#3a2520");
  barGradient.addColorStop(AIM_SWEET.lo, "#3a2520");
  barGradient.addColorStop(AIM_SWEET.lo + 0.001, "#f5b342");
  barGradient.addColorStop(AIM_SWEET.center, "#fff2c0");
  barGradient.addColorStop(AIM_SWEET.hi, "#f5b342");
  barGradient.addColorStop(AIM_SWEET.hi + 0.001, "#3a2520");
  barGradient.addColorStop(1, "#3a2520");
  ctx.fillStyle = barGradient;
  roundRect(x, y, width, height, 8);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 247, 222, 0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + width * AIM_SWEET.lo, y - 4);
  ctx.lineTo(x + width * AIM_SWEET.lo, y + height + 4);
  ctx.moveTo(x + width * AIM_SWEET.hi, y - 4);
  ctx.lineTo(x + width * AIM_SWEET.hi, y + height + 4);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#101414";
  const markerX = x + width * state.meter;
  roundRect(markerX - 7, y - 10, 14, height + 20, 6);
  ctx.fill();

  ctx.fillStyle = "#c8d7ce";
  ctx.font = `800 ${Math.max(17, canvas.width * 0.024)}px system-ui`;
  ctx.fillText("Tipp im hellen Bereich → Boni im Flug einsammeln.", x, y + 62);
}

function drawWorkerLaunch() {
  if (state.phase !== "aim" && state.phase !== "launch") return;

  const baseX = canvas.width * 0.17;
  const groundLineY = groundY();
  const workerSize = Math.max(72, canvas.width * 0.085);
  const batSize = Math.max(56, canvas.width * 0.06);

  let workerY = groundLineY - workerSize * 0.55;
  let workerEmoji = SPRITES.worker;
  let leanAngle = 0;
  let batAngle = -0.85;
  let batOffsetX = workerSize * 0.5;
  let batOffsetY = -workerSize * 0.05;

  if (state.phase === "aim") {
    workerY += Math.sin(state.worker.bob * 2.4) * 2;
  } else {
    const progress = Math.min(1, state.launchTimer / LAUNCH_DURATION);
    if (progress < 0.25) {
      const p = progress / 0.25;
      batAngle = -0.85 - p * 0.6;
      leanAngle = -p * 0.18;
      workerEmoji = SPRITES.worker;
    } else if (progress < 0.55) {
      const p = (progress - 0.25) / 0.3;
      batAngle = -1.45 + p * 2.6;
      leanAngle = -0.18 + p * 0.5;
      workerEmoji = SPRITES.workerSwing;
    } else {
      const p = (progress - 0.55) / 0.45;
      batAngle = 1.15 + p * 0.7;
      leanAngle = 0.32 - p * 0.3;
      workerEmoji = SPRITES.workerSwing;
    }
    state.worker.swingTrail.unshift({ angle: batAngle, offsetX: batOffsetX, offsetY: batOffsetY });
    if (state.worker.swingTrail.length > 6) state.worker.swingTrail.pop();
  }

  drawEmoji(workerEmoji, baseX, workerY, workerSize, leanAngle, 1);

  const shoulderX = baseX + workerSize * 0.18;
  const shoulderY = workerY - workerSize * 0.05;

  if (state.phase === "launch" && state.worker.swingTrail.length > 1) {
    state.worker.swingTrail.forEach((trail, i) => {
      if (i === 0) return;
      const alpha = (1 - i / state.worker.swingTrail.length) * 0.35;
      ctx.save();
      ctx.translate(shoulderX, shoulderY);
      ctx.rotate(trail.angle);
      drawEmoji(SPRITES.bat, batSize * 0.65, 0, batSize, 0, alpha);
      ctx.restore();
    });
  }

  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.rotate(batAngle);
  drawEmoji(SPRITES.bat, batSize * 0.65, 0, batSize, 0, 1);
  ctx.restore();

  if (state.phase === "aim") {
    const meterPulse = state.meter >= AIM_SWEET.lo && state.meter <= AIM_SWEET.hi;
    if (meterPulse && Math.floor(state.now * 4) % 2 === 0) {
      drawEmoji(SPRITES.boost, baseX, workerY - workerSize * 0.85, workerSize * 0.4);
    }
  }
}

function drawFlyer() {
  const flyer = state.flyer;
  const sx = flyer.x - state.worldX + (flyer.hitShake > 0 ? (Math.random() - 0.5) * 6 : 0);
  const sy = flyer.y + (flyer.hitShake > 0 ? (Math.random() - 0.5) * 6 : 0);
  const size = Math.max(56, canvas.width * 0.07);

  let scaleX = 1;
  let scaleY = 1;
  if (flyer.squashTimer > 0) {
    const t = flyer.squashTimer / 0.18;
    scaleX = 1 + 0.4 * t;
    scaleY = 1 - 0.3 * t;
  }

  if (state.phase === "flight") {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#b8c6bc";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const phase = state.now * 6 + i * 0.7;
      const stinkX = sx + (Math.random() - 0.5) * 4 - 2;
      const stinkY = sy - size * 0.6 - i * 8;
      ctx.beginPath();
      ctx.arc(stinkX, stinkY, 5 + Math.sin(phase) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEmoji(SPRITES.pile, sx, sy, size, flyer.rotation, 1, scaleX, scaleY);
}

function drawBoosters() {
  const size = Math.max(36, canvas.width * 0.05);
  for (const boost of state.boosters) {
    if (boost.used) continue;
    const sx = boost.x - state.worldX;
    if (sx < -120 || sx > canvas.width + 120) continue;
    const pulse = 1 + Math.sin(boost.pulse) * 0.12;
    drawEmoji(SPRITES.boost, sx, boost.y, size * pulse, boost.pulse * 0.4);
  }
}

function drawHazards() {
  const chefSize = Math.max(64, canvas.width * 0.075);
  const wcSize = Math.max(60, canvas.width * 0.07);
  const paperSize = Math.max(50, canvas.width * 0.06);

  for (const hazard of state.hazards) {
    const sx = hazard.x - state.worldX;
    if (sx < -200 || sx > canvas.width + 200) continue;

    if (hazard.type === "chef") {
      if (hazard.hit) {
        const fade = Math.max(0, 1 - hazard.hitTime / 0.6);
        drawEmoji(SPRITES.chefAngry, sx, hazard.y - chefSize * 0.85, chefSize * 0.5, 0, fade);
        drawEmoji(SPRITES.chef, sx, hazard.y, chefSize, 0.6, fade);
        continue;
      }
      const distToFlyer = state.flyer.x - hazard.x;
      const approaching = distToFlyer < 600 && distToFlyer > -200;
      if (approaching && Math.floor(state.now * 4) % 2 === 0) {
        drawEmoji(SPRITES.finger, sx + chefSize * 0.4, hazard.y - chefSize * 0.6, chefSize * 0.45);
      }
      const walkAngle = Math.sin(state.now * 8 + hazard.phase) * 0.05;
      drawEmoji(SPRITES.chef, sx, hazard.y, chefSize, walkAngle);
    } else if (hazard.type === "wc") {
      if (hazard.hit && hazard.hitTime < 0.7) {
        const flushPulse = 1 + Math.sin(hazard.hitTime * 30) * 0.1;
        drawEmoji(SPRITES.flush, sx, hazard.y - wcSize * 0.4, wcSize * 0.7 * flushPulse, hazard.hitTime * 8);
        ctx.save();
        ctx.strokeStyle = "rgba(150, 200, 240, 0.7)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i += 1) {
          const yo = -wcSize * 0.2 + i * 8;
          ctx.beginPath();
          ctx.moveTo(sx - wcSize * 0.4, hazard.y + yo);
          for (let dx = -wcSize * 0.4; dx <= wcSize * 0.4; dx += 4) {
            ctx.lineTo(sx + dx, hazard.y + yo + Math.sin(dx * 0.15 + hazard.hitTime * 20) * 3);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      drawEmoji(SPRITES.wc, sx, hazard.y, wcSize);
    } else if (hazard.type === "paper") {
      if (hazard.paperTrail.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(247, 242, 232, 0.55)";
        ctx.lineWidth = Math.max(3, paperSize * 0.18);
        ctx.lineCap = "round";
        ctx.beginPath();
        let first = true;
        for (const p of hazard.paperTrail) {
          const psx = p.x - state.worldX;
          if (first) { ctx.moveTo(psx, p.y); first = false; }
          else ctx.lineTo(psx, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (hazard.hit) continue;
      const rot = Math.sin(state.distance * 0.12 + hazard.phase) * 0.25 + state.now * 2.5;
      drawEmoji(SPRITES.paper, sx, hazard.y, paperSize, rot);
    }
  }
}

function drawRings() {
  for (const r of state.rings) {
    const sx = r.x - state.worldX;
    const t = 1 - r.life / r.max;
    for (let i = 0; i < 3; i += 1) {
      const radius = (15 + i * 12) + t * 40;
      const alpha = (1 - t) * (1 - i * 0.25);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.strokeStyle = "#fff7de";
      ctx.lineWidth = 3 - i * 0.7;
      ctx.beginPath();
      ctx.arc(sx, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawDust() {
  for (const d of state.dust) {
    const sx = d.x - (d.world ? state.worldX : 0);
    const alpha = Math.max(0, d.life / d.max);
    if (d.sparkle) {
      drawEmoji(SPRITES.boost, sx, d.y, 14, d.life * 8, alpha);
    } else if (d.sweat) {
      drawEmoji(SPRITES.sweat, sx, d.y, 18, 0, alpha);
    } else {
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = "#c8b88a";
      ctx.beginPath();
      ctx.arc(sx, d.y, d.size * (0.6 + alpha * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawParticles() {
  ctx.font = `900 ${Math.max(20, canvas.width * 0.026)}px system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = "#fff7de";
    ctx.fillText(particle.text, particle.x, particle.y);
  }
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (!state.message || state.phase === "aim") return;
  if (state.phase === "flight") return;
  const width = Math.min(canvas.width * 0.76, 620);
  const height = Math.min(canvas.height * 0.22, 150);
  const x = (canvas.width - width) / 2;
  const y = canvas.height * 0.32;

  ctx.fillStyle = "rgba(16, 20, 20, 0.82)";
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.fillStyle = "#fff7de";
  ctx.font = `900 ${Math.max(30, canvas.width * 0.04)}px system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Pausenlandung", x + width * 0.09, y + height * 0.38);
  ctx.fillStyle = "#c8d7ce";
  ctx.font = `800 ${Math.max(18, canvas.width * 0.024)}px system-ui`;
  ctx.fillText(state.message, x + width * 0.09, y + height * 0.68);
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function draw() {
  drawBackground();
  const shake = applyShake();
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBoosters();
  drawHazards();
  drawDust();
  drawWorkerLaunch();
  drawFlyer();
  drawRings();
  drawWindGusts();
  drawParticles();
  ctx.restore();
  drawAimMeter();
  drawOverlay();
}

function loop(time = 0) {
  resizeCanvas();
  const delta = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("pointerdown", handleGameInput, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    ensureAudio();
    tap();
  }
});

restartButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  ensureAudio();
  sfx.uiTap();
  reset();
});

if (muteButton) {
  setMuted(audio.muted);
  muteButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    ensureAudio();
    setMuted(!audio.muted);
    sfx.uiTap();
  });
}

window.addEventListener("resize", resizeCanvas);

reset();
requestAnimationFrame(loop);
