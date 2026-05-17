const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const trustEl = document.querySelector("#trust");
const highscoreEl = document.querySelector("#highscore");
const restartButton = document.querySelector("#restartButton");

const logo = new Image();
logo.src = "../../src/assets/logo.png";

const HIGH_SCORE_KEY = "estundnzettl_stundn_wurf_highscore_v1";
const state = {
  phase: "aim",
  distance: 0,
  elapsedSeconds: 0,
  trust: 100,
  highscore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
  lastTime: 0,
  worldX: 0,
  meter: 0,
  meterDirection: 1,
  launchTimer: 0,
  launchQuality: 0,
  wind: {
    timer: 2.8,
    duration: 0,
    force: 0,
    label: "",
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
  },
  boosters: [],
  hazards: [],
  particles: [],
};

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
  state.wind.timer = 2.4 + Math.random() * 2.2;
  state.wind.duration = 0;
  state.wind.force = 0;
  state.wind.label = "";
  state.message = "Im richtigen Moment tippen";
  state.flyer.x = canvas.width * 0.19;
  state.flyer.y = groundY() - state.flyer.height / 2;
  state.flyer.vx = 0;
  state.flyer.vy = 0;
  state.flyer.rotation = 0;
  state.boosters = [];
  state.hazards = [];
  state.particles = [];
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
      baseY: type === "paper" ? canvas.height * (0.32 + Math.random() * 0.28) : groundY() - 42,
      width: type === "chef" ? 74 : type === "paper" ? 104 : 88,
      height: type === "chef" ? 92 : type === "paper" ? 46 : 64,
      type,
      phase: Math.random() * Math.PI * 2,
      amp: canvas.height * (0.035 + Math.random() * 0.035),
      hit: false,
    });
  }
}

function updateHud() {
  scoreEl.textContent = Math.max(0, Math.floor(state.elapsedSeconds));
  trustEl.textContent = `${Math.max(0, Math.round(state.trust))}%`;
  highscoreEl.textContent = Math.floor(state.highscore);
}

function tap() {
  if (state.phase === "ended") {
    reset();
    return;
  }

  if (state.phase === "aim") {
    const sweet = 1 - Math.abs(state.meter - 0.72) / 0.72;
    const quality = Math.max(0.18, Math.min(1, sweet));
    state.phase = "launch";
    state.launchTimer = 0;
    state.launchQuality = quality;
    state.message = quality > 0.82 ? "Volltreffer!" : "Abschlag!";
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
    } else {
      state.flyer.vy = Math.min(state.flyer.vy, canvas.height * 0.08) - canvas.height * 0.39;
      state.flyer.vx += canvas.width * 0.028;
      state.trust -= 2.4;
      state.particles.push({ x: state.flyer.x - state.worldX - 58, y: state.flyer.y - 36, life: 0.48, text: "Nachschuss!" });
    }
  }
}

let lastTapAt = 0;

function handleGameInput(event) {
  if (event.target === restartButton) return;
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
  }
}

function endRun() {
  state.phase = "ended";
  state.message = "Gelandet. Tippen fuer neuen Wurf.";
  if (state.elapsedSeconds > state.highscore) {
    state.highscore = Math.floor(state.elapsedSeconds);
    localStorage.setItem(HIGH_SCORE_KEY, String(state.highscore));
  }
  updateHud();
}

function update(delta) {
  if (state.phase === "aim") {
    state.meter += state.meterDirection * delta * 1.45;
    if (state.meter >= 1) {
      state.meter = 1;
      state.meterDirection = -1;
    }
    if (state.meter <= 0) {
      state.meter = 0;
      state.meterDirection = 1;
    }
    return;
  }

  if (state.phase === "launch") {
    state.launchTimer += delta;
    if (state.launchTimer >= 0.46) {
      const quality = state.launchQuality;
      state.phase = "flight";
      state.message = "";
      state.flyer.vx = canvas.width * (0.48 + quality * 0.22);
      state.flyer.vy = -canvas.height * (0.3 + quality * 0.18);
      state.particles.push({
        x: state.flyer.x - state.worldX - 18,
        y: state.flyer.y - 48,
        life: 0.65,
        text: quality > 0.82 ? "perfekt!" : "los!",
      });
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
    if (hazard.hit) continue;
    if (hazard.type === "paper") {
      hazard.y = hazard.baseY + Math.sin(state.distance * 0.08 + hazard.phase) * hazard.amp;
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
      if (hazard.type === "paper") {
        state.flyer.vx *= 0.58;
        state.flyer.vy += canvas.height * 0.1;
        state.trust -= 18;
      } else {
        state.flyer.vx *= 0.72;
        state.flyer.vy -= canvas.height * 0.12;
        state.trust -= hazard.type === "chef" ? 20 : 14;
      }
      const hitText = hazard.type === "chef" ? "Chef!" : hazard.type === "paper" ? "weggewischt!" : "WC-Zeit";
      state.particles.push({ x: flyerBounds.x - 30, y: flyer.y - 60, life: 0.65, text: hitText });
    }
  }

  for (const boost of state.boosters) {
    boost.pulse += delta * 6;
  }

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

  drawWind();
}

function drawWind() {
  if (state.phase !== "flight" || state.wind.duration <= 0) return;

  const direction = Math.sign(state.wind.force) || 1;
  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.strokeStyle = direction > 0 ? "#d9efe6" : "#f5b342";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = Math.max(3, canvas.width * 0.004);
  ctx.lineCap = "round";

  for (let i = 0; i < 5; i += 1) {
    const y = canvas.height * (0.28 + i * 0.075);
    const startX = direction > 0 ? canvas.width * 0.1 : canvas.width * 0.9;
    const endX = startX + direction * canvas.width * (0.13 + i * 0.014);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.quadraticCurveTo((startX + endX) / 2, y - 16, endX, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, y);
    ctx.lineTo(endX - direction * 16, y - 9);
    ctx.lineTo(endX - direction * 16, y + 9);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.font = `900 ${Math.max(18, canvas.width * 0.023)}px system-ui`;
  ctx.fillText(state.wind.label, canvas.width * 0.72, canvas.height * 0.2);
  ctx.restore();
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
  ctx.fillText(state.phase === "launch" ? state.message : "Stundn-Wurf", x, y - 22);

  const barGradient = ctx.createLinearGradient(x, y, x + width, y);
  barGradient.addColorStop(0, "#e05745");
  barGradient.addColorStop(0.48, "#f5b342");
  barGradient.addColorStop(0.72, "#d9efe6");
  barGradient.addColorStop(1, "#e05745");
  ctx.fillStyle = barGradient;
  roundRect(x, y, width, height, 8);
  ctx.fill();

  ctx.fillStyle = "#101414";
  const markerX = x + width * state.meter;
  roundRect(markerX - 7, y - 10, 14, height + 20, 6);
  ctx.fill();

  ctx.fillStyle = "#c8d7ce";
  ctx.font = `800 ${Math.max(17, canvas.width * 0.024)}px system-ui`;
  ctx.fillText("Tippen im hellen Bereich, danach Logo-Boni timen.", x, y + 62);
}

function drawWorkerLaunch() {
  if (state.phase !== "aim" && state.phase !== "launch") return;

  const baseX = canvas.width * 0.17;
  const baseY = groundY() - 16;
  const progress = state.phase === "launch" ? Math.min(1, state.launchTimer / 0.46) : 0;
  const swing = state.phase === "launch" ? -0.85 + progress * 2.2 : -0.8;

  ctx.save();
  ctx.translate(baseX, baseY);

  ctx.fillStyle = "#24504a";
  roundRect(-28, -118, 56, 78, 14);
  ctx.fill();
  ctx.fillStyle = "#f0c36a";
  roundRect(-24, -156, 48, 44, 18);
  ctx.fill();
  ctx.fillStyle = "#101414";
  ctx.fillRect(-12, -142, 8, 8);
  ctx.fillRect(7, -142, 8, 8);
  ctx.fillStyle = "#d9efe6";
  ctx.fillRect(-24, -168, 48, 12);

  ctx.strokeStyle = "#f5b342";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(18, -96);
  ctx.lineTo(44, -70);
  ctx.stroke();

  ctx.save();
  ctx.translate(42, -75);
  ctx.rotate(swing);
  ctx.strokeStyle = "#d9efe6";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(96, 0);
  ctx.stroke();
  ctx.fillStyle = "#f5b342";
  roundRect(86, -16, 28, 32, 8);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#1b2723";
  ctx.fillRect(-20, -42, 16, 42);
  ctx.fillRect(8, -42, 16, 42);
  ctx.restore();
}

function drawPoopPile(x, y, scale = 1, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#714323";
  roundRect(-34, 18, 68, 24, 14);
  ctx.fill();
  ctx.fillStyle = "#8a522b";
  roundRect(-25, -2, 50, 28, 14);
  ctx.fill();
  ctx.fillStyle = "#a06132";
  roundRect(-15, -20, 30, 24, 12);
  ctx.fill();
  ctx.fillStyle = "#d9efe6";
  roundRect(-18, 6, 36, 20, 6);
  ctx.fill();
  ctx.fillStyle = "#12392e";
  ctx.font = "900 14px system-ui";
  ctx.fillText("EZ", -10, 21);
  ctx.restore();
}

function drawFlyer() {
  const flyer = state.flyer;
  const sx = flyer.x - state.worldX;
  const sy = flyer.y;

  drawPoopPile(sx, sy, Math.max(0.78, canvas.width / 1060), flyer.rotation);
}

function drawBoosters() {
  for (const boost of state.boosters) {
    if (boost.used) continue;
    const sx = boost.x - state.worldX;
    if (sx < -120 || sx > canvas.width + 120) continue;
    const size = boost.radius * 2 + Math.sin(boost.pulse) * 5;
    ctx.fillStyle = "#d9efe6";
    roundRect(sx - size / 2, boost.y - size / 2, size, size, 14);
    ctx.fill();
    if (logo.complete) {
      ctx.drawImage(logo, sx - size * 0.34, boost.y - size * 0.34, size * 0.68, size * 0.68);
    }
  }
}

function drawHazards() {
  for (const hazard of state.hazards) {
    if (hazard.hit) continue;
    const sx = hazard.x - state.worldX;
    if (sx < -150 || sx > canvas.width + 150) continue;
    if (hazard.type === "paper") {
      drawToiletPaper(sx, hazard.y, hazard.width, hazard.height);
    } else {
      ctx.fillStyle = hazard.type === "chef" ? "#e05745" : "#8d7fd3";
      roundRect(sx - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height, 12);
      ctx.fill();
      ctx.fillStyle = "#101414";
      ctx.font = `900 ${Math.max(17, canvas.width * 0.022)}px system-ui`;
      ctx.fillText(hazard.type === "chef" ? "Chef" : "WC", sx - hazard.width * 0.28, hazard.y + 7);
    }
  }
}

function drawToiletPaper(x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(state.distance * 0.12 + x * 0.01) * 0.18);
  ctx.fillStyle = "#f7f2e8";
  roundRect(-width / 2, -height / 2, height, height, height * 0.25);
  ctx.fill();
  ctx.fillStyle = "#b8c6bc";
  ctx.beginPath();
  ctx.arc(-width / 2 + height / 2, 0, height * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f2e8";
  roundRect(-width / 2 + height * 0.64, -height * 0.18, width * 0.72, height * 0.36, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 20, 20, 0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-width * 0.02, -height * 0.18);
  ctx.lineTo(-width * 0.02, height * 0.18);
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  ctx.font = `900 ${Math.max(20, canvas.width * 0.026)}px system-ui`;
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = "#fff7de";
    ctx.fillText(particle.text, particle.x, particle.y);
  }
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (!state.message || state.phase === "aim") return;
  const width = Math.min(canvas.width * 0.76, 620);
  const height = Math.min(canvas.height * 0.22, 150);
  const x = (canvas.width - width) / 2;
  const y = canvas.height * 0.32;

  ctx.fillStyle = "rgba(16, 20, 20, 0.82)";
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.fillStyle = "#fff7de";
  ctx.font = `900 ${Math.max(30, canvas.width * 0.04)}px system-ui`;
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
  drawBoosters();
  drawHazards();
  drawWorkerLaunch();
  drawFlyer();
  drawParticles();
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
document.addEventListener("touchstart", handleGameInput, { passive: false });
document.addEventListener("click", handleGameInput, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    tap();
  }
});

restartButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  reset();
});
restartButton.addEventListener("click", (event) => {
  event.preventDefault();
  reset();
});
window.addEventListener("resize", resizeCanvas);

reset();
requestAnimationFrame(loop);
