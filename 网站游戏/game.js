// ===== deepseek大肥鱼 · 深海割草小游戏 v2 =====
// 新增：多帧游泳动画 / 四武器系统 / 金币经济 / 50秒商店(可累计) / 背包属性面板 / ESC 经典菜单

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const W = cv.width, H = cv.height;

// ---------- 界面元素 ----------
const $ = id => document.getElementById(id);
const hud = $("hud"), menu = $("menu"), levelup = $("levelup"), over = $("over");
const cardsBox = $("cards"), pauseTip = $("pauseTip");
const 商店层 = $("shop"), 货架 = $("shopShelf"), 出售区 = $("shopBag"), 商店金币 = $("shopGold");
const 面板层 = $("panel"), 面板属性 = $("panelStats"), 面板武器 = $("panelWeapons"), 面板道具 = $("panelItems");
const 菜单层 = $("pauseMenu"), 菜单商店项 = $("pmShop");

// ---------- 素材 ----------
const 素材 = {};
function 载入图(名, 路径) {
  const img = new Image();
  img.src = 路径;
  img.onerror = () => { 素材[名] = null; };
  img.onload = () => { 素材[名] = img; };
}
载入图("主角", "图片/主角.png");
载入图("主角2", "图片/主角2.png");
载入图("主角3", "图片/主角3.png");
载入图("小鱼", "图片/小鱼.png");
载入图("水母", "图片/水母.png");
载入图("海胆", "图片/海胆.png");
载入图("背景", "图片/背景.png");

// ---------- 玩家 ----------
let P = null;
function 初始玩家() {
  return {
    x: W / 2, y: H / 2, r: 22, hp: 100, maxHp: 100,
    速度: 235, 攻速系数: 1, 伤害: 12, 弹道: 1, 弹速: 460,
    磁铁: 95, 经验加成: 1, 金币系数: 1, 受伤系数: 1, 回血: 0,
    xp: 0, 等级: 1, 冷却: 0, 无敌: 0, 面向: 1,
    金币: 0, 武器s: [], 道具s: [], 动画帧: 0, 动画计时: 0,
  };
}

// ---------- 武器库与道具库 ----------
const 武器库 = [
  { 名: "泡泡枪", 图标: "🫧", 价格: 0, 可卖: false, 冷却: 0.55, 倍率: 1, 类型: "单发", 描述: "基础武器，追踪最近敌人" },
  { 名: "三叉戟", 图标: "🔱", 价格: 80, 可卖: true, 冷却: 0.75, 倍率: 0.8, 类型: "扇形", 描述: "一次射出多枚扇形气泡" },
  { 名: "鱼雷", 图标: "🚀", 价格: 150, 可卖: true, 冷却: 0.9, 倍率: 2.2, 类型: "穿透", 描述: "直线贯穿，打穿一整排" },
  { 名: "声波", 图标: "🌊", 价格: 220, 可卖: true, 冷却: 2.5, 倍率: 3, 类型: "环形", 描述: "周期性冲击波，清周围怪" },
];
const 道具库 = [
  { 名: "磁力珍珠", 图标: "🧲", 价格: 60, 描述: "拾取范围 +50%", 效果: p => p.磁铁 *= 1.5 },
  { 名: "红珊瑚", 图标: "💗", 价格: 70, 描述: "每秒回复 1 点生命", 效果: p => p.回血 += 1 },
  { 名: "幸运珍珠", 图标: "💰", 价格: 80, 描述: "金币收益 +30%", 效果: p => p.金币系数 *= 1.3 },
  { 名: "海星护符", 图标: "🛡️", 价格: 90, 描述: "受到伤害 -15%", 效果: p => p.受伤系数 *= 0.85 },
  { 名: "活力鳞片", 图标: "👟", 价格: 100, 描述: "移速 +12%", 效果: p => p.速度 *= 1.12 },
  { 名: "厚壳甲", 图标: "🐚", 价格: 110, 描述: "最大生命 +40 并回满", 效果: p => { p.maxHp += 40; p.hp = p.maxHp; } },
];
道具库.forEach(it => {
  it.还原 = p => {
    if (it.名 === "磁力珍珠") p.磁铁 /= 1.5;
    else if (it.名 === "红珊瑚") p.回血 -= 1;
    else if (it.名 === "幸运珍珠") p.金币系数 /= 1.3;
    else if (it.名 === "海星护符") p.受伤系数 /= 0.85;
    else if (it.名 === "活力鳞片") p.速度 /= 1.12;
    else if (it.名 === "厚壳甲") { p.maxHp -= 40; p.hp = Math.min(p.hp, p.maxHp); }
  };
});
function 有武器(名) { return P.武器s.some(w => w.名 === 名); }

// ---------- 升级池（经验升级三选一，与商店并存） ----------
const 升级池 = [
  { icon: "⚔️", name: "伤害提升", desc: "伤害 +25%", f: p => p.伤害 *= 1.25 },
  { icon: "⏱️", name: "攻击加速", desc: "所有武器攻击间隔 -18%", f: p => p.攻速系数 *= 0.82 },
  { icon: "🔱", name: "多重弹道", desc: "弹道 +1", f: p => p.弹道 += 1 },
  { icon: "👟", name: "疾风之鳍", desc: "移速 +12%", f: p => p.速度 *= 1.12 },
  { icon: "❤️", name: "厚实鳞片", desc: "生命上限 +25 并回满", f: p => { p.maxHp += 25; p.hp = p.maxHp; } },
  { icon: "🧲", name: "磁力珍珠", desc: "拾取范围 +40%", f: p => p.磁铁 *= 1.4 },
  { icon: "💨", name: "气泡加速", desc: "子弹速度 +25%", f: p => p.弹速 *= 1.25 },
  { icon: "✨", name: "经验礼包", desc: "经验获取 +25%", f: p => p.经验加成 *= 1.25 },
];
function 升到下一级() { return 8 + P.等级 * 7; }

// ---------- 世界状态 ----------
let 敌人们 = [], 子弹们 = [], 宝石们 = [], 金币们 = [], 粒子们 = [], 飘字们 = [], 声波们 = [];
let 计时 = 0, 击杀 = 0, 生成冷却 = 0, 状态 = "menu";   // menu | playing | levelup | shop | panel | pausemenu | over
let 暂停 = false;
let 按键 = new Set();
let 商店机会 = 0, 下一个商店时刻 = 50;

// ---------- 敌人类型 ----------
const 敌型 = {
  小鱼: { hp: 20, 速度: 95, 伤害: 8, xp: 1, 金币: [2, 3], r: 15, 颜色: "#2ecc71" },
  水母: { hp: 62, 速度: 46, 伤害: 12, xp: 2, 金币: [4, 6], r: 21, 颜色: "#ff9ff3" },
  海胆: { hp: 40, 速度: 72, 伤害: 10, xp: 2, 金币: [3, 5], r: 17, 颜色: "#a55eea" },
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
  const 强化 = 1 + 计时 / 90;
  敌人们.push({ 名, x, y, r: d.r, hp: d.hp * 强化, 伤害: d.伤害, 速度: d.速度 * (1 + 计时 / 300), xp: d.xp, 金币: d.金币, 抖动: Math.random() * 7 });
}

// ---------- 输入 ----------
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (k === "escape") {
    if (状态 === "playing") { 开菜单(); return; }
    if (状态 === "shop" || 状态 === "panel" || 状态 === "pausemenu") { 关面板类(); return; }
    return;
  }
  if (k === "p") { 切换暂停(); return; }
  if (k === "tab") {
    if (状态 === "panel") 关面板类();
    else if (状态 === "playing") 开面板();
    return;
  }
  if (状态 !== "playing") return;
  if (k === "b") { 开商店(); return; }
  按键.add(k);
});
addEventListener("keyup", e => 按键.delete(e.key.toLowerCase()));

// ---------- 暂停 / 菜单 / 面板 ----------
function 切换暂停() {
  if (状态 !== "playing") return;
  暂停 = !暂停;
  pauseTip.classList.toggle("hidden", !暂停);
}
function 开菜单() {
  状态 = "pausemenu";
  $("pmShopCount").textContent = 商店机会;
  菜单商店项.style.opacity = 商店机会 > 0 ? "" : ".35";
  菜单商店项.style.pointerEvents = 商店机会 > 0 ? "" : "none";
  菜单层.classList.remove("hidden");
}
function 开面板() {
  状态 = "panel";
  渲染面板();
  面板层.classList.remove("hidden");
}
function 关面板类() {
  面板层.classList.add("hidden");
  商店层.classList.add("hidden");
  菜单层.classList.add("hidden");
  状态 = "playing";
}
$("pmResume").addEventListener("click", 关面板类);
$("pmPanel").addEventListener("click", () => { 菜单层.classList.add("hidden"); 开面板(); });
$("pmShop").addEventListener("click", () => { 菜单层.classList.add("hidden"); 开商店(); });
$("pmQuit").addEventListener("click", () => { location.href = "/blog/"; });
$("panelClose").addEventListener("click", 关面板类);
$("shopClose").addEventListener("click", 关面板类);

// ---------- 商店 ----------
function 开商店() {
  if (状态 !== "playing" || 商店机会 <= 0) return;
  商店机会--;
  状态 = "shop";
  渲染商店();
  商店层.classList.remove("hidden");
}
function 渲染商店() {
  商店金币.textContent = "💰 " + P.金币;
  货架.innerHTML = "";
  for (const w of 武器库) {
    if (w.价格 === 0 || 有武器(w.名)) continue;
    货架.appendChild(建商店卡(w.图标, w.名, w.价格, w.描述, () => 买(w)));
  }
  for (const it of 道具库) {
    货架.appendChild(建商店卡(it.图标, it.名, it.价格, it.描述, () => 买(it)));
  }
  出售区.innerHTML = "";
  for (const w of P.武器s) {
    const 定义 = 武器库.find(x => x.名 === w.名);
    if (定义 && 定义.可卖) 出售区.appendChild(建商店卡(w.图标 || 定义.图标, w.名, 定义.价格, "出售回收 60%", () => 卖(w), true));
  }
  const 分组 = {};
  P.道具s.forEach(it => { 分组[it.名] = (分组[it.名] || 0) + 1; });
  for (const [名, n] of Object.entries(分组)) {
    const 定义 = 道具库.find(x => x.名 === 名);
    出售区.appendChild(建商店卡(定义.图标, 名 + " x" + n, 定义.价格, "出售回收 60%", () => 卖(定义), true));
  }
}
function 建商店卡(图标, 名, 价格, 描述, 动作, 是出售 = false) {
  const c = document.createElement("div");
  c.className = "card " + (是出售 ? "sell" : "");
  const 负担起 = !是出售 && P.金币 >= 价格;
  if (!是出售 && !负担起) c.classList.add("poor");
  c.innerHTML = `<div class="c-icon">${图标}</div><div class="c-name">${名}</div><div class="c-desc">${描述}</div><div class="c-price">${是出售 ? "💰 +" + Math.round(价格 * .6) : "💰 " + 价格}</div>`;
  c.addEventListener("click", () => {
    if (!是出售 && !负担起) return;
    动作();
    渲染商店();
  });
  return c;
}
function 买(物品) {
  if (P.金币 < 物品.价格) return;
  P.金币 -= 物品.价格;
  if (物品.类型) {
    P.武器s.push({ 名: 物品.名, 图标: 物品.图标, 冷却: 物品.冷却, 计时: 0 });
  } else {
    P.道具s.push(物品);
    物品.效果(P);
  }
  刷新HUD();
}
function 卖(东西) {
  const 定义 = 武器库.find(x => x.名 === 东西.名) || 道具库.find(x => x.名 === (东西.名 || 东西));
  const 回收价 = Math.round(定义.价格 * 0.6);
  if (东西.类型) {
    const i = P.武器s.findIndex(w => w.名 === 东西.名);
    if (i >= 0) P.武器s.splice(i, 1);
  } else {
    const i = P.道具s.findIndex(it => it.名 === 东西.名);
    if (i >= 0) { P.道具s.splice(i, 1); 定义.还原(P); }
  }
  P.金币 += 回收价;
  刷新HUD();
}

// ---------- 属性面板 ----------
function 渲染面板() {
  面板属性.innerHTML =
    `<div class="row"><span>等级</span><b>${P.等级}</b></div>` +
    `<div class="row"><span>生命</span><b>${Math.round(P.hp)} / ${Math.round(P.maxHp)}</b></div>` +
    `<div class="row"><span>伤害</span><b>${Math.round(P.伤害)}</b></div>` +
    `<div class="row"><span>移速</span><b>${Math.round(P.速度)}</b></div>` +
    `<div class="row"><span>拾取范围</span><b>${Math.round(P.磁铁)}</b></div>` +
    `<div class="row"><span>金币</span><b>${P.金币}</b></div>` +
    `<div class="row"><span>击杀</span><b>${击杀}</b></div>` +
    `<div class="row"><span>存活</span><b>${格式化(计时)}</b></div>`;
  面板武器.innerHTML = P.武器s.map(w => `<div class="chip">${w.图标} ${w.名}</div>`).join("") || "<div class='empty'>还没有武器</div>";
  面板道具.innerHTML = P.道具s.map(it => `<div class="chip">${it.图标} ${it.名}</div>`).join("") || "<div class='empty'>还没有道具</div>";
}

// ---------- 流程 ----------
$("startBtn").addEventListener("click", 开始);
$("againBtn").addEventListener("click", 开始);
function 开始() {
  P = 初始玩家();
  P.武器s.push({ 名: "泡泡枪", 图标: "🫧", 冷却: 0.55, 计时: 0 });
  敌人们 = []; 子弹们 = []; 宝石们 = []; 金币们 = []; 粒子们 = []; 飘字们 = []; 声波们 = [];
  计时 = 0; 击杀 = 0; 生成冷却 = 0; 暂停 = false;
  商店机会 = 0; 下一个商店时刻 = 50;
  menu.classList.add("hidden"); over.classList.add("hidden");
  levelup.classList.add("hidden"); pauseTip.classList.add("hidden");
  hud.classList.remove("hidden");
  状态 = "playing";
  刷新HUD();
}
function 结束() {
  状态 = "over";
  $("oTime").textContent = 格式化(计时); $("oKills").textContent = 击杀; $("oLv").textContent = P.等级;
  const 最高 = +localStorage.getItem("haiyang_best") || 0;
  const 新纪录 = 计时 > 最高;
  if (新纪录) localStorage.setItem("haiyang_best", 计时);
  $("newBest").style.display = 新纪录 ? "" : "none";
  over.classList.remove("hidden");
  hud.classList.add("hidden");
}

// ---------- 经验升级三选一 ----------
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
function 发射(类型, 角) {
  if (类型 === "单发") {
    子弹们.push({ x: P.x, y: P.y, vx: Math.cos(角) * P.弹速, vy: Math.sin(角) * P.弹速, r: 6, 生命: 2.2, 伤害: P.伤害, 穿透: false, 已撞: null });
  } else if (类型 === "扇形") {
    const 发数 = 2 + P.弹道;
    for (let i = 0; i < 发数; i++) {
      const 偏 = (i - (发数 - 1) / 2) * 0.2;
      子弹们.push({ x: P.x, y: P.y, vx: Math.cos(角 + 偏) * P.弹速, vy: Math.sin(角 + 偏) * P.弹速, r: 5, 生命: 1.6, 伤害: P.伤害 * 0.8, 穿透: false, 已撞: null });
    }
  } else if (类型 === "穿透") {
    子弹们.push({ x: P.x, y: P.y, vx: Math.cos(角) * (P.弹速 * 1.2), vy: Math.sin(角) * (P.弹速 * 1.2), r: 7, 生命: 2.6, 伤害: P.伤害 * 2.2, 穿透: true, 已撞: new Set() });
  } else if (类型 === "环形") {
    声波们.push({ x: P.x, y: P.y, r: 12, maxR: 150, 伤害: P.伤害 * 3, 已撞: new Set() });
  }
}
function 武器齐射(dt) {
  const 目标 = 最近敌人();
  const 角 = 目标 ? Math.atan2(目标.y - P.y, 目标.x - P.x) : 0;
  for (const w of P.武器s) {
    if (w.冷却 <= 0) continue;
    w.计时 -= dt;
    if (w.计时 > 0) continue;
    const 定义 = 武器库.find(x => x.名 === w.名);
    w.计时 = w.冷却 * P.攻速系数;
    发射(定义.类型, 角);
  }
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

  // 商店机会：每 50 秒 +1
  if (计时 >= 下一个商店时刻) {
    商店机会++;
    下一个商店时刻 += 50;
    飘字(P.x, P.y - 40, "🛒 商店次数 +1 (B)", "#ffd32a");
  }

  // 移动 + 游泳动画
  let dx = 0, dy = 0;
  if (按键.has("w") || 按键.has("arrowup")) dy -= 1;
  if (按键.has("s") || 按键.has("arrowdown")) dy += 1;
  if (按键.has("a") || 按键.has("arrowleft")) { dx -= 1; P.面向 = -1; }
  if (按键.has("d") || 按键.has("arrowright")) { dx += 1; P.面向 = 1; }
  const 移动中 = dx !== 0 || dy !== 0;
  const 长 = Math.hypot(dx, dy) || 1;
  P.x += dx / 长 * P.速度 * dt; P.y += dy / 长 * P.速度 * dt;
  P.x = Math.max(20, Math.min(W - 20, P.x)); P.y = Math.max(20, Math.min(H - 20, P.y));
  if (移动中) {
    P.动画计时 += dt;
    if (P.动画计时 > 0.16) { P.动画计时 = 0; P.动画帧 = (P.动画帧 + 1) % 3; }
    if (Math.random() < dt * 8) 粒子(P.x - P.面向 * 18, P.y + 8, "#9fd8ff", 1);
  } else { P.动画帧 = 0; P.动画计时 = 0; }
  P.无敌 = Math.max(0, P.无敌 - dt);
  if (P.回血 > 0) { P.hp = Math.min(P.maxHp, P.hp + P.回血 * dt); 刷新HUD(); }

  // 武器齐射
  武器齐射(dt);

  // 生成敌人
  生成冷却 -= dt;
  const 间隔 = Math.max(0.3, 1.15 - 计时 / 240);
  if (生成冷却 <= 0) { 生成敌人(); 生成冷却 = 间隔; }

  // 敌人
  for (const e of 敌人们) {
    const 角 = Math.atan2(P.y - e.y, P.x - e.x);
    e.x += Math.cos(角) * e.速度 * dt;
    e.y += Math.sin(角) * e.速度 * dt + Math.sin(计时 * 2 + e.抖动) * 12 * dt;
    if (P.无敌 <= 0 && 距(e, P) < e.r + P.r) {
      P.hp -= Math.round(e.伤害 * P.受伤系数); P.无敌 = 0.5;
      飘字(P.x, P.y - 30, "-" + Math.round(e.伤害 * P.受伤系数), "#ff6b81");
      粒子(P.x, P.y, "#ff6b81", 8);
      if (P.hp <= 0) { 结束(); return; }
      刷新HUD();
    }
  }
  // 敌人间分离
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
      if (b.穿透 && b.已撞.has(e)) continue;
      if (距(b, e) < b.r + e.r) {
        e.hp -= b.伤害;
        飘字(e.x, e.y - e.r - 6, Math.round(b.伤害), "#fff");
        if (b.穿透) { b.已撞.add(e); } else { b.生命 = 0; }
        if (e.hp <= 0) 击杀敌人(e);
        if (!b.穿透) break;
      }
    }
  }
  子弹们 = 子弹们.filter(b => b.生命 > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30);
  // 声波
  for (const s of 声波们) {
    s.r += 220 * dt;
    for (const e of 敌人们) {
      if (e.hp <= 0 || s.已撞.has(e)) continue;
      if (Math.abs(距(s, e) - s.r) < e.r + 8) {
        s.已撞.add(e);
        e.hp -= s.伤害;
        飘字(e.x, e.y - e.r - 6, Math.round(s.伤害), "#7fd8ff");
        if (e.hp <= 0) 击杀敌人(e);
      }
    }
  }
  声波们 = 声波们.filter(s => s.r < s.maxR);
  敌人们 = 敌人们.filter(e => e.hp > 0);

  // 宝石 + 金币：磁吸拾取
  const 拾取们 = [...宝石们, ...金币们];
  for (const g of 拾取们) {
    const d = Math.hypot(g.x - P.x, g.y - P.y);
    if (d < P.磁铁 && d > 1) {
      const 速 = 320;
      g.x += (P.x - g.x) / d * 速 * dt; g.y += (P.y - g.y) / d * 速 * dt;
    }
    if (d < P.r + 10) {
      g.死 = true;
      if (g.是金币) {
        P.金币 += g.v;
        粒子(g.x, g.y, "#ffd32a", 4);
      } else {
        P.xp += Math.round(g.v * P.经验加成);
        粒子(g.x, g.y, "#1dd1a1", 5);
      }
      刷新HUD();
    }
  }
  宝石们 = 宝石们.filter(g => !g.死);
  金币们 = 金币们.filter(g => !g.死);
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
function 击杀敌人(e) {
  击杀++;
  宝石们.push({ x: e.x, y: e.y, v: e.xp, r: 7, 是金币: false });
  const [低, 高] = e.金币;
  金币们.push({ x: e.x + 6, y: e.y + 6, v: Math.round((低 + Math.random() * (高 - 低)) * P.金币系数), r: 6, 是金币: true });
  粒子(e.x, e.y, 敌型[e.名].颜色, 12);
  if (击杀 % 25 === 0) 粒子(P.x, P.y, "#ffd32a", 20);
}

// ---------- 绘制 ----------
function 绘制() {
  if (素材["背景"]) ctx.drawImage(素材["背景"], 0, 0, W, H);
  else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a3d6b"); g.addColorStop(1, "#04121f"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = "rgba(4,16,30,.25)"; ctx.fillRect(0, 0, W, H);

  for (const g of 金币们) {
    ctx.beginPath(); ctx.arc(g.x, g.y, 6, 0, 7); ctx.fillStyle = "#ffd32a"; ctx.fill();
    ctx.beginPath(); ctx.arc(g.x, g.y, 3.5, 0, 7); ctx.fillStyle = "#c98f00"; ctx.fill();
  }
  for (const g of 宝石们) {
    ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, 7); ctx.fillStyle = "#1dd1a1"; ctx.fill();
    ctx.beginPath(); ctx.arc(g.x - 2, g.y - 2, 2.5, 0, 7); ctx.fillStyle = "#eafff6"; ctx.fill();
  }
  for (const e of 敌人们) {
    if (素材[e.名]) 画精灵(素材[e.名], e.x, e.y, e.r * 2.6, Math.sin(计时 * 3 + e.抖动) * 0.12);
    else { ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fillStyle = 敌型[e.名].颜色; ctx.fill(); }
  }
  for (const b of 子弹们) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7);
    ctx.fillStyle = b.穿透 ? "rgba(255,190,120,.95)" : "rgba(190,235,255,.9)"; ctx.fill();
    ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 2, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
  }
  for (const s of 声波们) {
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7);
    ctx.strokeStyle = "rgba(127,216,255,.8)"; ctx.lineWidth = 4; ctx.stroke();
  }
  if (状态 !== "over" && P) {
    ctx.save();
    if (P.无敌 > 0 && Math.floor(计时 * 12) % 2 === 0) ctx.globalAlpha = .5;
    const 帧名 = ["主角", "主角2", "主角3"][P.动画帧];
    const img = 素材[帧名] || 素材["主角"];
    const 浮动 = Math.sin(计时 * 5) * 3;
    ctx.translate(P.x, P.y + 浮动);
    ctx.scale(P.面向, 1);
    if (img) ctx.drawImage(img, -P.r * 1.4, -P.r * 1.4, P.r * 2.8, P.r * 2.8);
    else { ctx.beginPath(); ctx.arc(0, 0, P.r, 0, 7); ctx.fillStyle = "#5aa9ff"; ctx.fill(); }
    ctx.restore();
  }
  for (const pa of 粒子们) {
    ctx.globalAlpha = Math.max(0, pa.生命 / pa.满命);
    ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.r, 0, 7); ctx.fillStyle = pa.色; ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = "bold 15px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
  for (const f of 飘字们) {
    ctx.globalAlpha = Math.max(0, f.生命 / .7);
    ctx.fillStyle = f.色; ctx.fillText(f.字, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function 画精灵(img, x, y, 尺寸, 转) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(转);
  ctx.drawImage(img, -尺寸 / 2, -尺寸 / 2, 尺寸, 尺寸);
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
  $("gold").textContent = P.金币;
  $("shopChances").textContent = 商店机会;
}

requestAnimationFrame(帧);
