// ===== youweimiao.com 主页脚本 =====

// 打字机效果
const WORDS = ["在写代码", "在打游戏", "在学运维", "在折腾 AI", "在把想法搬到公网", "在等你来逛"];
const tw = document.getElementById("typewriter");
let wi = 0, ci = 0, deleting = false;
function tick() {
  const word = WORDS[wi];
  if (!deleting) {
    ci++;
    if (ci === word.length) { deleting = true; setTimeout(tick, 1400); return; }
  } else {
    ci--;
    if (ci === 0) { deleting = false; wi = (wi + 1) % WORDS.length; }
  }
  tw.textContent = word.slice(0, ci);
  setTimeout(tick, deleting ? 60 : 130);
}
tick();

// 星点背景（慢速漂移，轻量）
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");
let stars = [];
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
addEventListener("resize", resize);
for (let i = 0; i < 70; i++) {
  stars.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.6 + .4, s: Math.random() * .3 + .08, tw: Math.random() * Math.PI * 2 });
}
function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const st of stars) {
    st.y -= st.s; st.tw += .03;
    if (st.y < -5) { st.y = canvas.height + 5; st.x = Math.random() * canvas.width; }
    const a = .35 + Math.sin(st.tw) * .25;
    ctx.globalAlpha = a;
    ctx.fillStyle = document.body.classList.contains("light") ? "#3f66e0" : "#8fa8ff";
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
  }
  requestAnimationFrame(drawStars);
}
drawStars();

// 昼夜切换（初始主题已由 index.html 头部脚本判定，这里只管按钮和记忆）
const themeBtn = document.getElementById("themeBtn");
if (document.body.classList.contains("light")) themeBtn.textContent = "☀️";
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  themeBtn.textContent = light ? "☀️" : "🌙";
  localStorage.setItem("home_theme", light ? "light" : "dark");
});

// 阅读进度条
addEventListener("scroll", () => {
  const h = document.documentElement;
  const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  document.getElementById("readBar").style.width = pct + "%";
  document.getElementById("toTop").style.display = h.scrollTop > 500 ? "block" : "none";
});
document.getElementById("toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

// 滚动浮现
const revealables = document.querySelectorAll(".pcard, .tl-item, .about-box, section");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
    });
  }, { threshold: 0.08 });
  revealables.forEach(el => { el.classList.add("pre-reveal"); io.observe(el); });
} else {
  revealables.forEach(el => el.classList.add("revealed"));
}

// 导航活动点（scrollspy）：滚动时高亮当前区块
const navLinks = document.querySelectorAll(".nav-links a[data-sec]");
const secEls = {};
navLinks.forEach(a => { secEls[a.dataset.sec] = document.getElementById(a.dataset.sec); });
function spy() {
  let current = "top";
  const y = window.scrollY + 140;
  for (const key in secEls) {
    if (secEls[key] && secEls[key].offsetTop <= y) current = key;
  }
  navLinks.forEach(a => a.classList.toggle("active", a.dataset.sec === current));
}
addEventListener("scroll", spy);
spy();

// 访客卡片：打开页面记录一次(visit)，之后每 10 秒查询(stats)刷新
// 为什么记录和查询分开：轮询若也走 visit，每次刷新都算一次浏览，PV 会虚高；
// 同时轮询本身就是"心跳"——后端据此统计当前在线人数
async function 请求计数(路径) {
  const r = await fetch(路径, { cache: "no-store" });
  return r.json();
}
function 写数字(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function 运行天数() {
  const 起始 = new Date("2026-08-20T00:00:00");
  return Math.max(1, Math.floor((Date.now() - 起始.getTime()) / 86400000) + 1);
}
function 数字滚动(id, 目标) {  // 大数字滚动动画（easeOutCubic），到位后弹一下
  const el = document.getElementById(id); if (!el) return;
  const 当前 = parseInt(el.textContent) || 0;
  if (当前 === 目标) return;
  const 变化 = 目标 - 当前, 开始 = performance.now(), 时长 = 800;
  function 帧(t) {
    const p = Math.min(1, (t - 开始) / 时长);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(当前 + 变化 * e);
    if (p < 1) { requestAnimationFrame(帧); return; }
    el.textContent = 目标;
    el.classList.add("pop");
    setTimeout(() => el.classList.remove("pop"), 400);
  }
  requestAnimationFrame(帧);
}
function 更新今日(d) {
  写数字("vTodayPV", d["今日浏览"]);
  写数字("vTotalUV", d["累计来访"]);
  写数字("vTotalPV", d["累计浏览"]);
  写数字("vOnline", d["当前在线"] ?? 0);
  写数字("vDays", 运行天数());
  数字滚动("vTodayUV", d["今日来访"]);
}
async function 刷新访客() {
  try {
    const d = await 请求计数("/api/counter/stats");
    更新今日(d);
  } catch (e) { /* 接口暂时不可用时静默，不影响页面 */ }
}
请求计数("/api/counter/visit").then(更新今日).catch(() => {});
刷新访客();
setInterval(刷新访客, 10000);
