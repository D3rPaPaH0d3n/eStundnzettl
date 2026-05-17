const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const highscoreEl = document.querySelector("#highscore");
const hintEl = document.querySelector("#hint");
const restartButton = document.querySelector("#restartButton");
const muteButton = document.querySelector("#muteButton");

const HIGH_SCORE_KEY = "estundnzettl_stundn_wurf_highscore_v1";
const AUDIO_MUTE_KEY = "estundnzettl_stundn_wurf_audio_v1";
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';

const SPRITES = {
  worker: "\u{1F477}",
  pile: "\u{1F4A9}",
  chef: "\u{1F468}‍\u{1F4BC}",
  paper: "\u{1F9FB}",
  soap: "\u{1F9FC}",
  drop: "\u{1F4A7}",
  brush: "\u{1F9FD}",
  bubble: "\u{1F4AC}",
  starHit: "\u{1F4A2}",
};

const CHEF_LINES = [
  "Wieder Pause?",
  "Wo ist die Stundn-Liste?",
  "Das wird nachgetragen!",
  "Schnell zurueck an die Arbeit!",
  "Ich seh das alles!",
  "Stundnkonto - leer!",
];

const PHASES = { READY: "ready", WIND_UP: "windup", AIRBORNE: "airborne", FLIGHT: "flight", ENDED: "ended" };

const state = {
  phase: PHASES.READY,
  now: 0,
  lastTime: 0,
  score: 0,
  highscore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
  hint: "Tippen zum Werfen",
  message: "",
  shake: 0,
  worldX: 0,
  worker: { bob: 0, throwAnim: 0, drillSpin: 0, drillFire: 0, lean: 0 },
  pile: { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, scaleX: 1, scaleY: 1, squashTimer: 0, alive: true },
  boostCount: 0,
  windUpStart: 0,
  hazards: [],
  particles: [],
  chefBubble: { text: "", life: 0, x: 0, y: 0 },
  chefBubbleTimer: 0,
  drillReady: false,
};

const audio = {
  ctx: null,
  master: null,
  muted: localStorage.getItem(AUDIO_MUTE_KEY) === "1",
  drillNode: null,
  drillGain: null,
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

function startDrill() {
  if (!audio.ctx || audio.muted || audio.drillNode) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 180;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.13, t + 0.08);
  osc.connect(g).connect(audio.master);
  osc.start(t);
  audio.drillNode = osc;
  audio.drillGain = g;
}

function stopDrill(impactQuality = 0.6) {
  if (!audio.drillNode || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  try {
    audio.drillGain.gain.cancelScheduledValues(t);
    audio.drillGain.gain.setValueAtTime(audio.drillGain.gain.value, t);
    audio.drillGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    audio.drillNode.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    audio.drillNode.stop(t + 0.2);
  } catch (_) {}
  audio.drillNode = null;
  audio.drillGain = null;
  noise({ duration: 0.12, filterType: "lowpass", filterFreq: 1200, filterFreqEnd: 180, gain: 0.3 + impactQuality * 0.15 });
  blip({ freq: 110 + impactQuality * 100, freqEnd: 40, type: "square", duration: 0.18, gain: 0.22 + impactQuality * 0.1, release: 0.16 });
}

const sfx = {
  uiTap: () => blip({ freq: 880, type: "square", duration: 0.04, attack: 0.002, release: 0.04, gain: 0.08 }),
  throwUp: () => {
    noise({ duration: 0.18, filterType: "bandpass", filterFreq: 1800, filterFreqEnd: 700, filterQ: 0.7, gain: 0.12 });
    blip({ freq: 240, freqEnd: 480, type: "sine", duration: 0.22, attack: 0.01, release: 0.2, gain: 0.12 });
  },
  boost: (qualityFactor = 1) => blip({ freq: 420, freqEnd: 820, type: "square", duration: 0.1, attack: 0.003, release: 0.09, gain: 0.1 + qualityFactor * 0.1 }),
  paperHit: () => {
    noise({ duration: 0.7, filterType: "bandpass", filterFreq: 900, filterFreqEnd: 220, filterQ: 1.6, gain: 0.28 });
    blip({ freq: 320, freqEnd: 80, type: "sine", duration: 0.55, attack: 0.02, release: 0.5, gain: 0.16 });
  },
  brushHit: () => blip({ freq: 220, freqEnd: 110, type: "sawtooth", duration: 0.18, release: 0.16, gain: 0.18, vibrato: 18, vibratoRate: 22 }),
  soapHit: () => {
    blip({ freq: 660, freqEnd: 1320, type: "triangle", duration: 0.18, release: 0.16, gain: 0.18 });
    blip({ freq: 990, type: "triangle", duration: 0.16, attack: 0.05, release: 0.14, gain: 0.1 });
  },
  dropHit: () => noise({ duration: 0.18, filterType: "bandpass", filterFreq: 2200, filterFreqEnd: 600, filterQ: 1.4, gain: 0.18 }),
  chefHit: () => blip({ freq: 300, freqEnd: 90, type: "sawtooth", duration: 0.28, release: 0.25, gain: 0.2 }),
  chefBubble: () => blip({ freq: 520, freqEnd: 240, type: "triangle", duration: 0.18, release: 0.16, gain: 0.1 }),
  landing: () => {
    noise({ duration: 0.22, filterType: "lowpass", filterFreq: 500, filterFreqEnd: 120, gain: 0.3 });
    blip({ freq: 70, type: "sine", duration: 0.25, attack: 0.005, release: 0.22, gain: 0.18 });
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
    canvas.width = width;
    canvas.height = height;
    if (state.phase === PHASES.READY || state.phase === PHASES.ENDED) {
      resetPilePosition();
    }
  }
}

function groundY() {
  return canvas.height * 0.82;
}

function workerAnchor() {
  return { x: canvas.width * 0.18, y: groundY() - canvas.height * 0.06 };
}

function resetPilePosition() {
  const w = workerAnchor();
  state.pile.x = w.x + canvas.width * 0.04;
  state.pile.y = w.y - canvas.height * 0.04;
  state.pile.vx = 0;
  state.pile.vy = 0;
  state.pile.rotation = 0;
  state.pile.scaleX = 1;
  state.pile.scaleY = 1;
  state.pile.squashTimer = 0;
  state.pile.alive = true;
}

function reset() {
  resizeCanvas();
  state.phase = PHASES.READY;
  state.score = 0;
  state.lastTime = 0;
  state.shake = 0;
  state.worldX = 0;
  state.worker.bob = 0;
  state.worker.throwAnim = 0;
  state.worker.drillSpin = 0;
  state.worker.drillFire = 0;
  state.worker.lean = 0;
  state.hint = "Tippen zum Werfen";
  state.message = "";
  state.boostCount = 0;
  state.windUpStart = 0;
  state.hazards = [];
  state.particles = [];
  state.chefBubble.life = 0;
  state.chefBubbleTimer = 1.5;
  state.drillReady = false;
  resetPilePosition();
  seedCourse();
  stopDrill();
  if (restartButton) restartButton.classList.remove("is-visible");
  updateHud();
}

function seedCourse() {
  state.hazards = [];
  const types = ["paper", "brush", "soap", "drop"];
  for (let i = 0; i < 60; i += 1) {
    const x = canvas.width * 0.55 + i * 320 + Math.random() * 160;
    const lane = Math.random();
    const y = canvas.height * (0.22 + lane * 0.5);
    const weight = Math.random();
    let type;
    if (weight < 0.36) type = "paper";
    else if (weight < 0.55) type = "brush";
    else if (weight < 0.78) type = "soap";
    else type = "drop";
    state.hazards.push({
      x, y, baseY: y,
      type,
      phase: Math.random() * Math.PI * 2,
      amp: canvas.height * (0.02 + Math.random() * 0.04),
      hit: false,
    });
  }
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  highscoreEl.textContent = Math.floor(state.highscore);
  if (hintEl) hintEl.textContent = state.hint;
}

function tap() {
  ensureAudio();

  if (state.phase === PHASES.ENDED) {
    sfx.uiTap();
    reset();
    return;
  }

  if (state.phase === PHASES.READY) {
    state.phase = PHASES.WIND_UP;
    state.worker.throwAnim = 0;
    state.windUpStart = state.now;
    state.hint = "Schlagen wenn der Haufen unten ankommt!";
    sfx.throwUp();
    return;
  }

  if (state.phase === PHASES.WIND_UP) {
    return;
  }

  if (state.phase === PHASES.AIRBORNE) {
    fireDrill();
    return;
  }

  if (state.phase === PHASES.FLIGHT) {
    applyBoost();
  }
}

function fireDrill() {
  const w = workerAnchor();
  const drillHeadY = w.y - canvas.height * 0.04;
  const drillHeadX = w.x + canvas.width * 0.06;
  const dx = state.pile.x - drillHeadX;
  const dy = state.pile.y - drillHeadY;
  const distance = Math.hypot(dx, dy);
  const reach = canvas.height * 0.16;
  const proximityQuality = Math.max(0, 1 - distance / reach);
  const fallingBonus = state.pile.vy > 0 ? Math.min(1, state.pile.vy / (canvas.height * 0.55)) : 0.15;
  const quality = Math.max(0.18, proximityQuality * 0.7 + fallingBonus * 0.3);

  state.phase = PHASES.FLIGHT;
  state.worker.drillFire = 0.25;
  state.pile.squashTimer = 0.18;
  const launchSpeed = canvas.width * (0.5 + quality * 0.55);
  const upwardKick = canvas.height * (0.16 + quality * 0.22);
  state.pile.vx = launchSpeed;
  state.pile.vy = -upwardKick;
  state.pile.rotation = 0;
  state.shake = Math.max(state.shake, 0.22);
  state.hint = quality > 0.75 ? "Volltreffer! Tippen fuer Boost." : "Treffer! Tippen fuer Boost.";
  spawnImpactBurst(drillHeadX, drillHeadY);
  state.message = "";
  stopDrill(quality);
}

function applyBoost() {
  state.boostCount += 1;
  const decay = Math.pow(0.78, state.boostCount - 1);
  const timingQuality = Math.max(0.2, Math.min(1, state.pile.vy / (canvas.height * 0.45)));
  const horizontalKick = canvas.width * 0.18 * decay * (0.55 + timingQuality * 0.55);
  const verticalKick = canvas.height * 0.34 * decay * (0.45 + timingQuality * 0.6);
  state.pile.vx += horizontalKick;
  state.pile.vy = Math.min(state.pile.vy, 0) - verticalKick;
  state.particles.push({
    x: state.pile.x - state.worldX,
    y: state.pile.y - canvas.height * 0.05,
    life: 0.55,
    text: timingQuality > 0.7 ? "+Wumms!" : "+",
  });
  sfx.boost(timingQuality);
}

function spawnImpactBurst(x, y) {
  for (let i = 0; i < 8; i += 1) {
    const ang = -Math.PI * Math.random();
    const sp = canvas.width * (0.1 + Math.random() * 0.14);
    state.particles.push({
      x: x + Math.cos(ang) * 8,
      y: y + Math.sin(ang) * 8,
      life: 0.5 + Math.random() * 0.2,
      maxLife: 0.7,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      dust: true,
    });
  }
}

let lastTapAt = 0;

function handleGameInput(event) {
  if (event.target === restartButton || event.target === muteButton) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastTapAt < 80) return;
  lastTapAt = now;
  tap();
}

function endRun(reason) {
  state.phase = PHASES.ENDED;
  stopDrill();
  state.hint = reason === "paper" ? "Runtergespuelt! Tippen fuer neuen Wurf." : "Gelandet. Tippen fuer neuen Wurf.";
  state.message = reason === "paper" ? "RUNTERGESPUELT" : "Gelandet";
  const newScore = Math.floor(state.score);
  const isNew = newScore > state.highscore;
  if (isNew) {
    state.highscore = newScore;
    localStorage.setItem(HIGH_SCORE_KEY, String(state.highscore));
    sfx.highscore();
  } else {
    sfx.gameOver();
  }
  if (reason !== "paper") sfx.landing();
  if (restartButton) restartButton.classList.add("is-visible");
  updateHud();
}

function updateChefBubble(delta) {
  if (state.chefBubble.life > 0) {
    state.chefBubble.life -= delta;
    if (state.chefBubble.life <= 0) state.chefBubble.text = "";
  }
  if (state.phase === PHASES.ENDED) return;
  state.chefBubbleTimer -= delta;
  if (state.chefBubbleTimer <= 0) {
    state.chefBubbleTimer = 5 + Math.random() * 4;
    state.chefBubble.text = CHEF_LINES[Math.floor(Math.random() * CHEF_LINES.length)];
    state.chefBubble.life = 2.4;
    sfx.chefBubble();
  }
}

function update(delta) {
  state.now += delta;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - delta);
  if (state.pile.squashTimer > 0) state.pile.squashTimer = Math.max(0, state.pile.squashTimer - delta);
  if (state.worker.drillFire > 0) state.worker.drillFire = Math.max(0, state.worker.drillFire - delta);
  state.worker.drillSpin += delta * (state.phase === PHASES.AIRBORNE ? 38 : 8);

  updateChefBubble(delta);

  if (state.phase === PHASES.READY) {
    state.worker.bob += delta;
    return;
  }

  if (state.phase === PHASES.WIND_UP) {
    state.worker.throwAnim = Math.min(1, state.worker.throwAnim + delta / 0.35);
    if (state.worker.throwAnim >= 1) {
      state.phase = PHASES.AIRBORNE;
      const w = workerAnchor();
      state.pile.x = w.x + canvas.width * 0.025;
      state.pile.y = w.y - canvas.height * 0.08;
      state.pile.vx = canvas.width * 0.04;
      state.pile.vy = -canvas.height * 0.95;
      startDrill();
      state.drillReady = true;
    }
    return;
  }

  if (state.phase === PHASES.AIRBORNE) {
    state.pile.vy += canvas.height * 1.05 * delta;
    state.pile.x += state.pile.vx * delta;
    state.pile.y += state.pile.vy * delta;
    state.pile.rotation += delta * 4;

    const w = workerAnchor();
    const groundLine = groundY() - canvas.height * 0.02;
    if (state.pile.y > groundLine && state.pile.vy > 0) {
      state.pile.y = groundLine;
      state.phase = PHASES.ENDED;
      state.hint = "Verfehlt! Tippen fuer neuen Wurf.";
      state.message = "Verfehlt";
      stopDrill(0);
      sfx.landing();
      if (restartButton) restartButton.classList.add("is-visible");
      updateHud();
    }
    return;
  }

  if (state.phase !== PHASES.FLIGHT) return;

  const pile = state.pile;
  pile.vy += canvas.height * 0.62 * delta;
  pile.vx *= 1 - delta * 0.16;
  pile.x += pile.vx * delta;
  pile.y += pile.vy * delta;
  pile.rotation += (pile.vx * 0.0006 + 0.4) * delta * 60;

  if (pile.y < canvas.height * 0.14) {
    pile.y = canvas.height * 0.14;
    pile.vy = Math.max(pile.vy, 0);
  }

  const cameraTarget = Math.max(0, pile.x - canvas.width * 0.32);
  state.worldX += (cameraTarget - state.worldX) * Math.min(1, delta * 6);
  state.score = Math.max(state.score, state.worldX / 10);
  state.highscore = Math.max(state.highscore, Math.floor(state.score));

  const pileBounds = {
    x: pile.x - state.worldX - canvas.width * 0.035,
    y: pile.y - canvas.height * 0.05,
    width: canvas.width * 0.07,
    height: canvas.height * 0.08,
  };

  for (const hazard of state.hazards) {
    hazard.y = hazard.baseY + Math.sin((state.now + hazard.phase) * 1.4) * hazard.amp;
    if (hazard.hit) continue;
    const hx = hazard.x - state.worldX;
    if (hx < -200 || hx > canvas.width + 200) continue;
    const half = canvas.width * 0.04;
    const hazardBounds = {
      x: hx - half,
      y: hazard.y - half,
      width: half * 2,
      height: half * 2,
    };
    if (rectsOverlap(pileBounds, hazardBounds)) {
      hazard.hit = true;
      handleHazardCollision(hazard);
      if (state.phase === PHASES.ENDED) return;
    }
  }

  state.particles = state.particles
    .map((p) => ({
      ...p,
      life: p.life - delta,
      x: p.x + (p.vx || 0) * delta,
      y: p.y + (p.vy || 0) * delta - (p.dust ? 0 : 38 * delta),
      vy: p.vy !== undefined ? p.vy + canvas.height * 0.4 * delta : undefined,
    }))
    .filter((p) => p.life > 0);

  if ((pile.y + canvas.height * 0.05 >= groundY() && pile.vy > 0) || pile.vx < canvas.width * 0.06) {
    pile.y = Math.min(pile.y, groundY() - canvas.height * 0.04);
    endRun("ground");
  }

  updateHud();
}

function handleHazardCollision(hazard) {
  const pile = state.pile;
  const sx = hazard.x - state.worldX;
  switch (hazard.type) {
    case "paper":
      state.shake = 0.4;
      state.particles.push({ x: sx, y: hazard.y, life: 0.9, text: "Runtergespuelt!" });
      sfx.paperHit();
      endRun("paper");
      break;
    case "brush":
      pile.vx *= 0.42;
      pile.vy += canvas.height * 0.05;
      state.shake = Math.max(state.shake, 0.18);
      state.particles.push({ x: sx, y: hazard.y - 30, life: 0.6, text: "Bremse!" });
      sfx.brushHit();
      break;
    case "soap":
      pile.vx += canvas.width * 0.22;
      pile.vy -= canvas.height * 0.18;
      state.particles.push({ x: sx, y: hazard.y - 30, life: 0.6, text: "Boost!" });
      sfx.soapHit();
      break;
    case "drop":
      pile.vx *= 0.7;
      pile.vy -= canvas.height * 0.08;
      state.particles.push({ x: sx, y: hazard.y - 30, life: 0.55, text: "Spritz!" });
      sfx.dropHit();
      break;
    default:
      break;
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function applyShake() {
  if (state.shake <= 0) return { x: 0, y: 0 };
  const amp = state.shake * canvas.width * 0.007;
  return { x: (Math.random() - 0.5) * amp, y: (Math.random() - 0.5) * amp };
}

function drawBackground() {
  const tileH = canvas.height * 0.07;
  const wallEnd = canvas.height * 0.66;

  const wall = ctx.createLinearGradient(0, 0, 0, wallEnd);
  wall.addColorStop(0, "#e6eef0");
  wall.addColorStop(1, "#c9d6dc");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, canvas.width, wallEnd);

  ctx.strokeStyle = "rgba(110, 130, 140, 0.35)";
  ctx.lineWidth = 1.5;
  for (let y = 0; y < wallEnd; y += tileH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  const tileW = canvas.width * 0.08;
  const tileOffset = (state.worldX * 0.2) % tileW;
  for (let x = -tileOffset; x < canvas.width + tileW; x += tileW) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, wallEnd);
    ctx.stroke();
  }

  const floor = ctx.createLinearGradient(0, wallEnd, 0, canvas.height);
  floor.addColorStop(0, "#8a9aa3");
  floor.addColorStop(1, "#5a6770");
  ctx.fillStyle = floor;
  ctx.fillRect(0, wallEnd, canvas.width, canvas.height - wallEnd);

  ctx.strokeStyle = "rgba(20, 30, 35, 0.25)";
  ctx.lineWidth = 1.5;
  const floorTileW = canvas.width * 0.12;
  const floorOffset = (state.worldX * 0.4) % floorTileW;
  for (let x = -floorOffset; x < canvas.width + floorTileW; x += floorTileW) {
    ctx.beginPath();
    ctx.moveTo(x, wallEnd);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(20, 30, 35, 0.15)";
  for (let y = wallEnd + canvas.height * 0.04; y < canvas.height; y += canvas.height * 0.06) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  drawBgToilet();
  drawBgSink();
  drawBgPaperHolder();
  drawBgChef();
}

function drawBgToilet() {
  const cx = canvas.width * 0.36 - state.worldX * 0.12;
  const cy = canvas.height * 0.6;
  const w = canvas.width * 0.12;
  const h = canvas.height * 0.12;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#f5f7f9";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.55, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dde4e8";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f5f7f9";
  ctx.fillRect(cx - w * 0.45, cy + h * 0.18, w * 0.9, h * 0.32);
  ctx.fillStyle = "#aab6bd";
  ctx.fillRect(cx - w * 0.18, cy - h * 0.32, w * 0.36, h * 0.18);
  ctx.restore();
}

function drawBgSink() {
  const cx = canvas.width * 0.78 - state.worldX * 0.12;
  const cy = canvas.height * 0.52;
  const w = canvas.width * 0.13;
  const h = canvas.height * 0.08;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#eef2f4";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.55, h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d0d8dd";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aa6ad";
  ctx.fillRect(cx - 3, cy - h * 0.9, 6, h * 0.7);
  ctx.fillRect(cx - 10, cy - h * 0.95, 20, 6);
  ctx.restore();
}

function drawBgPaperHolder() {
  const x = canvas.width * 0.5 - state.worldX * 0.12;
  const y = canvas.height * 0.32;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#a8b4bb";
  ctx.fillRect(x - 4, y, 8, canvas.height * 0.04);
  ctx.fillStyle = "#fdfdfd";
  ctx.beginPath();
  ctx.arc(x, y + canvas.height * 0.045, canvas.height * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c0c8cd";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawBgChef() {
  const x = canvas.width * 0.92 - state.worldX * 0.05;
  const y = groundY() - canvas.height * 0.08;
  if (x < -120 || x > canvas.width + 120) return;
  const size = Math.max(64, canvas.width * 0.06);
  drawEmoji(SPRITES.chef, x, y, size);
  if (state.chefBubble.life > 0 && state.chefBubble.text) {
    drawSpeechBubble(state.chefBubble.text, x - size * 0.7, y - size * 0.95, Math.min(1, state.chefBubble.life / 0.6));
  }
}

function drawSpeechBubble(text, anchorX, anchorY, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${Math.max(15, canvas.width * 0.018)}px system-ui`;
  const padX = 12;
  const padY = 8;
  const w = ctx.measureText(text).width + padX * 2;
  const h = Math.max(28, canvas.width * 0.025);
  const x = anchorX - w;
  const y = anchorY - h;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#36404a";
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - 14, y + h);
  ctx.lineTo(x + w + 6, y + h + 12);
  ctx.lineTo(x + w - 4, y + h - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1c252c";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2);
  ctx.restore();
}

function drawDrill(x, y, rotation, spin, fire = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const bodyW = canvas.width * 0.06;
  const bodyH = canvas.width * 0.035;
  const recoil = fire > 0 ? -canvas.width * 0.012 : 0;
  ctx.translate(recoil, 0);
  ctx.fillStyle = "#d68a1a";
  roundRect(-bodyW * 0.4, -bodyH / 2, bodyW * 0.8, bodyH, 4);
  ctx.fill();
  ctx.fillStyle = "#3b3b3b";
  roundRect(-bodyW * 0.15, bodyH / 2 - 2, bodyW * 0.18, bodyH * 0.8, 3);
  ctx.fill();
  ctx.fillStyle = "#bbbdbf";
  roundRect(bodyW * 0.4, -bodyH * 0.25, bodyW * 0.18, bodyH * 0.5, 3);
  ctx.fill();
  ctx.save();
  ctx.translate(bodyW * 0.65, 0);
  ctx.rotate(spin);
  ctx.fillStyle = "#7b7e82";
  for (let i = 0; i < 6; i += 1) {
    const seg = i / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bodyW * 0.4 - seg * bodyW * 0.05, bodyH * 0.12);
    ctx.lineTo(bodyW * 0.4 - seg * bodyW * 0.05, -bodyH * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.PI / 3);
  }
  ctx.restore();
  ctx.fillStyle = "#5a5d61";
  ctx.beginPath();
  ctx.moveTo(bodyW * 0.55, 0);
  ctx.lineTo(bodyW * 0.95, bodyH * 0.06);
  ctx.lineTo(bodyW * 0.95, -bodyH * 0.06);
  ctx.closePath();
  ctx.fill();
  if (fire > 0) {
    ctx.globalAlpha = fire * 3;
    ctx.fillStyle = "#fff2c0";
    ctx.beginPath();
    ctx.arc(bodyW * 0.95, 0, bodyW * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWorker() {
  const w = workerAnchor();
  const workerSize = Math.max(64, canvas.width * 0.075);
  const bobY = state.phase === PHASES.READY ? Math.sin(state.worker.bob * 2.4) * 2 : 0;
  let lean = 0;

  if (state.phase === PHASES.WIND_UP) {
    const t = state.worker.throwAnim;
    lean = Math.sin(t * Math.PI) * -0.18;
  }

  drawEmoji(SPRITES.worker, w.x, w.y + bobY, workerSize, lean);

  const throwingArmX = w.x - workerSize * 0.25;
  const throwingArmY = w.y - workerSize * 0.35;
  if (state.phase === PHASES.WIND_UP) {
    const t = state.worker.throwAnim;
    const armAngle = -1.6 + t * 2.6;
    const handX = throwingArmX + Math.cos(armAngle) * workerSize * 0.45;
    const handY = throwingArmY + Math.sin(armAngle) * workerSize * 0.45;
    ctx.save();
    ctx.strokeStyle = "#f3c285";
    ctx.lineWidth = workerSize * 0.13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(throwingArmX, throwingArmY);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    ctx.restore();
    const pileSize = workerSize * 0.4;
    drawEmoji(SPRITES.pile, handX, handY, pileSize);
  }

  const drillBaseX = w.x + workerSize * 0.35;
  const drillBaseY = w.y - workerSize * 0.05;
  let drillTipAngle = 0.18;
  if (state.phase === PHASES.AIRBORNE) {
    const dx = state.pile.x - drillBaseX;
    const dy = state.pile.y - drillBaseY;
    drillTipAngle = Math.atan2(dy, dx);
    drillTipAngle = Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.05, drillTipAngle));
  } else if (state.phase === PHASES.FLIGHT) {
    drillTipAngle = -0.4 + Math.min(0.6, state.worker.drillFire * 2);
  }

  ctx.save();
  ctx.strokeStyle = "#f3c285";
  ctx.lineWidth = workerSize * 0.13;
  ctx.lineCap = "round";
  ctx.beginPath();
  const handX = drillBaseX + Math.cos(drillTipAngle) * workerSize * 0.2;
  const handY = drillBaseY + Math.sin(drillTipAngle) * workerSize * 0.2;
  ctx.moveTo(drillBaseX, drillBaseY);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  ctx.restore();

  drawDrill(handX, handY, drillTipAngle, state.worker.drillSpin, state.worker.drillFire);
}

function drawPile() {
  if (state.phase === PHASES.READY || state.phase === PHASES.WIND_UP) return;
  const pile = state.pile;
  const isFlight = state.phase === PHASES.FLIGHT;
  const sx = isFlight ? pile.x - state.worldX : pile.x;
  const sy = pile.y;
  const size = Math.max(54, canvas.width * 0.065);
  let scaleX = 1;
  let scaleY = 1;
  if (pile.squashTimer > 0) {
    const t = pile.squashTimer / 0.18;
    scaleX = 1 + 0.4 * t;
    scaleY = 1 - 0.3 * t;
  }
  drawEmoji(SPRITES.pile, sx, sy, size, pile.rotation, 1, scaleX, scaleY);
}

function drawHazards() {
  if (state.phase !== PHASES.FLIGHT && state.phase !== PHASES.ENDED) return;
  const size = Math.max(48, canvas.width * 0.06);
  for (const hazard of state.hazards) {
    if (hazard.hit) continue;
    const sx = hazard.x - state.worldX;
    if (sx < -100 || sx > canvas.width + 100) continue;
    const emoji = hazard.type === "paper" ? SPRITES.paper
      : hazard.type === "brush" ? SPRITES.brush
      : hazard.type === "soap" ? SPRITES.soap
      : SPRITES.drop;
    if (hazard.type === "paper") {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "#a8c4dc";
      ctx.lineWidth = 3;
      for (let i = 0; i < 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(sx - size * 0.4, hazard.y + size * 0.4 + i * 6);
        ctx.lineTo(sx + size * 0.4, hazard.y + size * 0.4 + i * 6 + 8);
        ctx.stroke();
      }
      ctx.restore();
    }
    drawEmoji(emoji, sx, hazard.y, size, state.now * (hazard.type === "soap" ? 0.5 : 1.6) + hazard.phase);
  }
}

function drawParticles() {
  for (const p of state.particles) {
    if (p.dust) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 0.7)) * 0.55;
      ctx.fillStyle = "#c8b88a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.text) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = "#fff7de";
      ctx.font = `900 ${Math.max(20, canvas.width * 0.028)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }
}

function drawHud() {
  if (state.phase === PHASES.READY || state.phase === PHASES.WIND_UP || state.phase === PHASES.AIRBORNE) {
    const text = state.hint;
    if (!text) return;
    ctx.save();
    ctx.font = `900 ${Math.max(20, canvas.width * 0.034)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const padX = 22;
    const padY = 14;
    const w = ctx.measureText(text).width + padX * 2;
    const h = Math.max(46, canvas.width * 0.055);
    const x = (canvas.width - w) / 2;
    const y = canvas.height * 0.18;
    ctx.fillStyle = "rgba(20, 30, 38, 0.78)";
    roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = "#fff7de";
    ctx.fillText(text, canvas.width / 2, y + h / 2);
    ctx.restore();
  }

  if (state.phase === PHASES.AIRBORNE) {
    drawTimingHint();
  }
}

function drawTimingHint() {
  const w = workerAnchor();
  const drillHeadX = w.x + canvas.width * 0.06;
  const drillHeadY = w.y - canvas.height * 0.04;
  const dx = state.pile.x - drillHeadX;
  const dy = state.pile.y - drillHeadY;
  const distance = Math.hypot(dx, dy);
  const reach = canvas.height * 0.16;
  if (distance < reach * 1.4) {
    const intensity = Math.max(0, 1 - distance / (reach * 1.4));
    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = "#fff2c0";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(drillHeadX, drillHeadY, reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawOverlay() {
  if (state.phase !== PHASES.ENDED) return;
  const text = state.message || "Gelandet";
  ctx.save();
  ctx.fillStyle = "rgba(20, 30, 38, 0.85)";
  const width = Math.min(canvas.width * 0.7, 540);
  const height = canvas.height * 0.18;
  const x = (canvas.width - width) / 2;
  const y = canvas.height * 0.34;
  roundRect(x, y, width, height, 14);
  ctx.fill();
  ctx.fillStyle = "#fff7de";
  ctx.font = `900 ${Math.max(28, canvas.width * 0.05)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, y + height * 0.42);
  ctx.font = `800 ${Math.max(16, canvas.width * 0.022)}px system-ui`;
  ctx.fillStyle = "#c8d7ce";
  ctx.fillText(`${Math.floor(state.score)} Stundn`, canvas.width / 2, y + height * 0.76);
  ctx.restore();
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
  drawHazards();
  drawWorker();
  drawPile();
  drawParticles();
  ctx.restore();
  drawHud();
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
