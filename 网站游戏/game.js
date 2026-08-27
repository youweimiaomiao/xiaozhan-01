// ===== deepseek大肥鱼 · 深海割草小游戏 =====
// 纯 JS + Canvas，零引擎。玩法：走位躲怪、自动攻击、吃经验升级三选一。

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const W = cv.width, H = cv.height;

// ---------- 界面元素 ----------
const $ = id => document.getElementById(id);
const hud = $("hud"), menu = $("menu"), levelup = $("levelup"), over = $("over");
const pauseTip = $("pauseTip"), cardsBox = $("cards");

// ---------- 素材（加载失败也不崩，画圆兜底） ----------
const 素材 = {};
function 载入图(名, 路径) {
  const img = new Image();
  img.src = 路径;
  img.onerror = () => { 素材[名] = null; };
  img.onload = () => { 素材[名] = img; };
}
载入图("主角", "图片/主角.png");
载入图("小鱼", "图片/小鱼.png");
载入图("水母", "图片/水母.png");
载入图("海胆", "图片/海胆.png");
载入图("背景", "图片/背景.png");

// ---------- 玩家属性（升级会改） ----------
let P = null;
function 初始玩家() {
  return {
    x: W / 2, y: H / 2, r: 22, hp: 100, maxHp: 100,
    speed: 235, 攻速: 0.55, 伤害: 12, 弹道: 1, 弹速: 460,
    磁铁: 95, 经验加成: 1,
    xp: 0, 等级: 1, 冷却: 0, 无敌: 0, 面向: 1,
  };
}

// ---------- 升级池 ----------
const 升级池 = [
  { icon: "⚔️", name: "伤害提升", desc: "伤害 +25%", f: p => p.伤害 *= 1.25 },
  { icon: "⏱️", name: "攻击加速", desc: "攻击间隔 -18%", f: p => p.攻速 *= 0.82 },
  { icon: "🔱", name: "多重弹道", desc: "弹道 +1", f: p => p.弹道 += 1 },
  { icon: "👟", name: "疾风之鳍", desc: "移速 +12%", f: p => p.速度 *= 1.12 },
  { icon: "❤️", name: "厚实鳞片", desc: "生命上限 +25 并回满", f: p => { p.maxHp += 25; p.hp = p.maxHp; } },
  { icon: "🧲", name: "磁力珍珠", desc: "拾取范围 +40%", f: p => p.磁铁 *= 1.4 },
  { icon: "💨", name: "气泡加速", desc: "子弹速度 +25%", f: p => p.弹速 *= 1.25 },
  { icon: "✨", name: "经验礼包", desc: "经验获取 +25%", f: p => p.经验加成 *= 1.25 },
];
function 升到下一级() { return 8 + P.等级 * 7; }

// ---------- 世界状态 ----------
let 敌人们 = [], 子弹们 = [], 宝石们 = [], 粒子们 = [], 飘字们 = [];
let 计时 = 0, 击杀 = 0, 生成冷却 = 0, 状态 = "menu";   // menu | playing | levelup | over
let 按键 = new Set();

// ---------- 敌人类型 ----------
const 敌型 = {
  小鱼: { hp: 20, 速度: 95, 伤害: 8, xp: 1, r: 15, 颜色: "#2ecc71" },
  水母: { hp: 62, 速度: 46, 伤害: 12, xp: 2, r: 21, 颜色: "#ff9ff3" },
  海胆: { hp: 40, 速度: 72, 伤害: 10, xp: 2, r: 17, 颜色: "#a55eea" },
};
function 随机敌型() {
  const t = 计时;
  const 表 = ["小鱼", "小鱼", "小鱼"];
  if (t > 45) 表.push("水母", "水母");
  if (t > 110) 表.push("海胆", "海胆");
  if (t > 200) 表.push("水母", "海胆", "海胆");
  return 表[Math.floor(Math.random() * 表.length)];
}
function 生成敌人() {
  const 名 = 随机敌型(), d = 敌型[名];
  const 边 = Math.floor(Math.random() * 4);
  let x, y;
  if (边 === 0) { x = Math.random() * W; y = -30; }
  else if (边 === 1) { x = W + 30; y = Math.random() * H; }
  else if (边 === 2) { x = Math.random() * W; y = H + 30; }
  else { x = -30; y = Math.random() * H; }
  // 随时间变强
  const 强化 = 1 + 计时 / 90;
  敌人们.push({ 名, x, y, r: d.r, hp: d.hp * 强化, 伤害: d.伤害, 速度: d.速度 * (1 + 计时 / 300), xp: d.xp, 抖动: Math.random() * 7, 击退: 0 });
}

// ---------- 输入 ----------
addEventListener("keydown", e => {
  if (e.key === "p" || e.key === "P" || e.key === "Escape") 切换暂停();
  if (状态 !== "playing") return;
  按键.add(e.key.toLowerCase());
});
addEventListener("keyup", e => 按键.delete(e.key.toLowerCase()));

// ---------- 暂停 ----------
let 暂停 = false;
function 切换暂停() {
  if (状态 !== "playing" && 状态 !== "levelup") return;
  if (状态 === "playing") { 暂停 = !暂停; pauseTip.classList.toggle("hidden", !暂停); }
}

// ---------- 流程 ----------
$("startBtn").addEventListener("click", 开始);
$("againBtn").addEventListener("click", 开始);
function 开始() {
  P = 初始玩家();
  敌人们 = []; 子弹们 = []; 宝石们 = []; 粒子们 = []; 飘字们 = [];
  计时 = 0; 击杀 = 0; 生成冷却 = 0; 暂停 = false;
  menu.classList.add("hidden"); over.classList.add("hidden");
  levelup.classList.add("hidden"); pauseTip.classList.add("hidden");
  hud.classList.remove("hidden");
  状态 = "playing";
  刷新HUD();
}
function 结束() {
  状态 = "over";
  const 存活 = 格式化(计时);
  $("oTime").textContent = 存活; $("oKills").textContent = 击杀; $("oLv").textContent = P.等级;
  const 最高 = +localStorage.getItem("haiyang_best") || 0;
  const 新纪录 = 计时 > 最高;
  if (新纪录) localStorage.setItem("haiyang_best", 计时);
  $("newBest").style.display = 新纪录 ? "" : "none";
  over.classList.remove("hidden");
  hud.classList.add("hidden");
}

// ---------- 升级三选一 ----------
function 触发升级() {
  状态 = "levelup";
  const 选 = [...升级池].sort(() => Math.random() - .5).slice(0, 3);
  cardsBox.innerHTML = "";
  选.forEach(u => {
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="c-icon">${u.icon}</div><div class="c-name">${u.name}</div><div class="c-desc">${u.desc}</div>`;
    c.addEventListener("click", () => {
      u.f(P);
      levelup.classList.add("hidden");
      状态 = "playing";
      P.xp -= 升到下一级(); P.等级++;
      刷新HUD();
    });
    cardsBox.appendChild(c);
  });
  levelup.classList.remove("hidden");
}

// ---------- 射击 ----------
function 最近敌人() {
  let 最 = null, 距 = Infinity;
  for (const e of 敌人们) {
    const d2 = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
    if (d2 < 距) { 距 = d2; 最 = e; }
  }
  return 最 && 距 < 640 * 640 ? 最 : null;
}
function 射击() {
  const 目标 = 最近敌人();
  const 角 = 目标 ? Math.atan2(目标.y - P.y, 目标.x - P.x) : 0;
  for (let i = 0; i < P.弹道; i++) {
    const 偏 = P.弹道 > 1 ? (i - (P.弹道 - 1) / 2) * 0.14 : 0;
    子弹们.push({ x: P.x, y: P.y, vx: Math.cos(角 + 偏) * P.弹速, vy: Math.sin(角 + 偏) * P.弹速, r: 6, 生命: 2.2 });
  }
  P.冷却 = P.攻速;
}

// ---------- 主循环 ----------
let 上一帧 = performance.now();
function 帧(now) {
  const dt = Math.min(0.05, (now - 上一帧) / 1000);
  上一帧 = now;
  if (状态 === "playing" && !暂停) 更新(dt);
  绘制();
  requestAnimationFrame(帧);
}

function 更新(dt) {
  计时 += dt;
  // 移动
  let dx = 0, dy = 0;
  if (按键.has("w") || 按键.has("arrowup")) dy -= 1;
  if (按键.has("s") || 按键.has("arrowdown")) dy += 1;
  if (按键.has("a") || 按键.has("arrowleft")) { dx -= 1; P.面向 = -1; }
  if (按键.has("d") || 按键.has("arrowright")) { dx += 1; P.面向 = 1; }
  const 长 = Math.hypot(dx, dy) || 1;
  P.x += dx / 长 * P.速度 * dt; P.y += dy / 长 * P.速度 * dt;
  P.x = Math.max(20, Math.min(W - 20, P.x)); P.y = Math.max(20, Math.min(H - 20, P.y));
  P.无敌 = Math.max(0, P.无敌 - dt);
  P.冷却 -= dt;

  // 射击
  if (P.冷却 <= 0) 射击();

  // 生成敌人
  生成冷却 -= dt;
  const 间隔 = Math.max(0.3, 1.15 - 计时 / 240);
  if (生成冷却 <= 0) { 生成敌人(); 生成冷却 = 间隔; }

  // 敌人
  for (const e of 敌人们) {
    const 角 = Math.atan2(P.y - e.y, P.x - e.x);
    e.x += Math.cos(角) * e.速度 * dt;
    e.y += Math.sin(角) * e.速度 * dt + Math.sin(计时 * 2 + e.抖动) * 12 * dt;
    e.击退 = Math.max(0, e.击退 - dt);
    // 撞玩家
    if (P.无敌 <= 0 && 距(e, P) < e.r + P.r) {
      P.hp -= e.伤害; P.无敌 = 0.5;
      飘字(P.x, P.y - 30, "-" + e.伤害, "#ff6b81");
      粒子(P.x, P.y, "#ff6b81", 8);
      if (P.hp <= 0) { 结束(); return; }
      刷新HUD();
    }
  }
  // 敌人间轻微分离
  for (let i = 0; i < 敌人们.length; i++) for (let j = i + 1; j < 敌人们.length; j++) {
    const a = 敌人们[i], b = 敌人们[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > 0 && d < a.r + b.r) {
      const 推 = (a.r + b.r - d) / 2;
      const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
      a.x += nx * 推; a.y += ny * 推; b.x -= nx * 推; b.y -= ny * 推;
    }
  }

  // 子弹
  for (const b of 子弹们) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.生命 -= dt;
    for (const e of 敌人们) {
      if (e.hp <= 0) continue;
      if (距(b, e) < b.r + e.r) {
        e.hp -= P.伤害; b.生命 = 0;
        飘字(e.x, e.y - e.r - 6, Math.round(P.伤害), "#fff");
        if (e.hp <= 0) {
          击杀++;
          宝石们.push({ x: e.x, y: e.y, v: e.xp, r: 7 });
          粒子(e.x, e.y, 敌型[e.名].颜色, 12);
          if (击杀 % 25 === 0) 粒子(P.x, P.y, "#ffd32a", 20);
        }
        break;
      }
    }
  }
  子弹们 = 子弹们.filter(b => b.生命 > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
  敌人们 = 敌人们.filter(e => e.hp > 0);

  // 宝石：磁吸 + 拾取
  for (const g of 宝石们) {
    const d = Math.hypot(g.x - P.x, g.y - P.y);
    if (d < P.磁铁) {
      const 速 = 320;
      g.x += (P.x - g.x) / d * 速 * dt; g.y += (P.y - g.y) / d * 速 * dt;
    }
    if (d < P.r + 8) {
      g.r = -1;
      P.xp += Math.round(g.v * P.经验加成);
      粒子(g.x, g.y, "#1dd1a1", 5);
      刷新HUD();
    }
  }
  宝石们 = 宝石们.filter(g => g.r > 0);
  while (P.xp >= 升到下一级()) { 触发升级(); break; }

  // 粒子与飘字
  for (const pa of 粒子们) { pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.生命 -= dt; }
  粒子们 = 粒子们.filter(pa => pa.生命 > 0);
  for (const f of 飘字们) { f.y -= 40 * dt; f.生命 -= dt; }
  飘字们 = 飘字们.filter(f => f.生命 > 0);

  $("time").textContent = 格式化(计时);
  $("kills").textContent = 击杀;
  $("best").textContent = 格式化(Math.max(+localStorage.getItem("haiyang_best") || 0, 计时));
}

// ---------- 绘制 ----------
function 绘制() {
  // 背景
  if (素材["背景"]) ctx.drawImage(素材["背景"], 0, 0, W, H);
  else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a3d6b"); g.addColorStop(1, "#04121f"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = "rgba(4,16,30,.25)"; ctx.fillRect(0, 0, W, H);

  // 宝石
  for (const g of 宝石们) {
    ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, 7);
    ctx.fillStyle = "#ffd32a"; ctx.fill();
    ctx.beginPath(); ctx.arc(g.x - 2, g.y - 2, 2.5, 0, 7); ctx.fillStyle = "#fff8dc"; ctx.fill();
  }
  // 敌人
  for (const e of 敌人们) {
    if (素材[e.名]) 画精灵(e.名, e.x, e.y, e.r * 2.6, 抖动角(e));
    else { ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fillStyle = 敌型[e.名].颜色; ctx.fill(); }
  }
  // 子弹（气泡）
  for (const b of 子弹们) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7);
    ctx.fillStyle = "rgba(190,235,255,.9)"; ctx.fill();
    ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 2, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
  }
  // 玩家
  if (状态 !== "over") {
    ctx.save();
    if (P) {
      if (P.无敌 > 0 && Math.floor(计时 * 12) % 2 === 0) ctx.globalAlpha = .5;
      if (素材["主角"]) {
        ctx.translate(P.x, P.y); ctx.scale(P.面向, 1);
        ctx.drawImage(素材["主角"], -P.r * 1.4, -P.r * 1.4, P.r * 2.8, P.r * 2.8);
      } else {
        ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, 7); ctx.fillStyle = "#5aa9ff"; ctx.fill();
      }
    }
    ctx.restore();
  }
  // 粒子
  for (const pa of 粒子们) {
    ctx.globalAlpha = Math.max(0, pa.生命 / pa.满命);
    ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.r, 0, 7); ctx.fillStyle = pa.色; ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 飘字
  ctx.font = "bold 15px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
  for (const f of 飘字们) {
    ctx.globalAlpha = Math.max(0, f.生命 / .7);
    ctx.fillStyle = f.色; ctx.fillText(f.字, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function 抖动角(e) { return Math.sin(计时 * 3 + e.抖动) * 0.12; }
function 画精灵(名, x, y, 尺寸, 转) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(转);
  ctx.drawImage(素材[名], -尺寸 / 2, -尺寸 / 2, 尺寸, 尺寸);
  ctx.restore();
}

// ---------- 小工具 ----------
function 距(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function 格式化(秒) {
  const m = Math.floor(秒 / 60), s = Math.floor(秒 % 60);
  return m + ":" + String(s).padStart(2, "0");
}
function 粒子(x, y, 色, n) {
  for (let i = 0; i < n; i++) {
    const 角 = Math.random() * 7;
    const 速 = 60 + Math.random() * 160;
    粒子们.push({ x, y, vx: Math.cos(角) * 速, vy: Math.sin(角) * 速, r: 2 + Math.random() * 3, 色, 生命: .5, 满命: .5 });
  }
}
function 飘字(x, y, 字, 色) { 飘字们.push({ x, y, 字, 色, 生命: .7 }); }
function 刷新HUD() {
  $("hpFill").style.width = Math.max(0, P.hp / P.maxHp * 100) + "%";
  $("xpFill").style.width = Math.min(100, P.xp / 升到下一级() * 100) + "%";
  $("lv").textContent = P.等级;
}

requestAnimationFrame(帧);
