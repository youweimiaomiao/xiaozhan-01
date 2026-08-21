// ===== 老博客脚本 =====

// 横幅打字机
const WORDS = ["在折腾 Godot 小游戏", "在学运维", "在喂 AI 搭子大肥鱼", "在把想法搬上公网", "在等你来逛"];
const tw = document.getElementById("typewriter");
let wi = 0, ci = 0, deleting = false;
function tick() {
  const word = WORDS[wi];
  if (!deleting) {
    ci++;
    if (ci === word.length) { deleting = true; setTimeout(tick, 1500); return; }
  } else {
    ci--;
    if (ci === 0) { deleting = false; wi = (wi + 1) % WORDS.length; }
  }
  tw.textContent = word.slice(0, ci);
  setTimeout(tick, deleting ? 55 : 130);
}
setTimeout(tick, 600);

// 分类筛选：点胶囊只显示对应文章
const pills = document.querySelectorAll(".category-pill");
const cards = document.querySelectorAll(".post-card");
pills.forEach(p => {
  p.addEventListener("click", () => {
    pills.forEach(x => x.classList.remove("active"));
    p.classList.add("active");
    const cat = p.dataset.cat;
    cards.forEach(c => {
      c.classList.toggle("hidden", cat !== "全部" && !c.dataset.cats.split(",").includes(cat));
    });
  });
});

// 站点统计：打开页面记录一次，之后每 10 秒查询刷新（轮询即心跳）
async function 请求(路径) {
  const r = await fetch(路径, { cache: "no-store" });
  return r.json();
}
function 写(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
async function 刷新统计() {
  try {
    const d = await 请求("/api/counter/stats");
    写("wTodayUV", d["今日来访"]);
    写("wTodayPV", d["今日浏览"]);
    写("wTotalUV", d["累计来访"]);
    写("wOnline", d["当前在线"] ?? 0);
    const on = document.getElementById("wOnline");
    if (on) on.classList.toggle("hot", (d["当前在线"] ?? 0) > 0);
  } catch (e) { /* 接口不可用时静默 */ }
}
请求("/api/counter/visit").catch(() => {});
刷新统计();
setInterval(刷新统计, 10000);

// 音乐卡：三曲歌单 + 黑胶旋转 + 均衡器
const 歌单 = [
  { 名: "讨厌", 手: "芮恩", 文件: "music/讨厌 - 芮恩.mp3" },
  { 名: "无尽幸福", 手: "北也", 文件: "music/无尽幸福 - 北也.mp3" },
  { 名: "The one", 手: "栗子养乐多 / WhyAce / Zy", 文件: "music/The one - 栗子养乐多、WhyAce、Zy.mp3" },
];
const bgm = document.getElementById("bgm");
const vinyl = document.getElementById("vinyl");
const eq = document.getElementById("eq");
const playBtn = document.getElementById("playBtn");
const 列表 = document.getElementById("musicList");
let 当前 = -1;

// 渲染歌单
歌单.forEach((s, i) => {
  const li = document.createElement("li");
  li.innerHTML = '<span>' + s.名 + '</span><span>' + s.手 + '</span>';
  li.addEventListener("click", () => 载入(i));
  列表.appendChild(li);
});
const 列表项 = 列表.querySelectorAll("li");

function 高亮() {
  列表项.forEach((li, k) => li.classList.toggle("active", k === 当前));
}
function 播放态() {
  playBtn.textContent = "⏸"; vinyl.classList.add("playing"); eq.classList.add("playing");
}
function 暂停态() {
  playBtn.textContent = "▶"; vinyl.classList.remove("playing"); eq.classList.remove("playing");
}
function 载入(i) {
  当前 = (i + 歌单.length) % 歌单.length;
  const s = 歌单[当前];
  bgm.src = s.文件;
  document.getElementById("musicTitle").textContent = s.名;
  document.getElementById("musicArtist").textContent = s.手;
  高亮();
  bgm.play().then(播放态).catch(暂停态);
}
playBtn.addEventListener("click", () => {
  if (当前 < 0) { 载入(0); return; }
  if (bgm.paused) { bgm.play().then(播放态).catch(() => {}); }
  else { bgm.pause(); 暂停态(); }
});
document.getElementById("prevBtn").addEventListener("click", () => 载入(当前 - 1));
document.getElementById("nextBtn").addEventListener("click", () => 载入(当前 + 1));
bgm.addEventListener("ended", () => 载入(当前 + 1));   // 播完自动下一首

// 迷你日历：本月 + 今天高亮
function 渲染日历() {
  const now = new Date();
  const head = document.getElementById("calHead");
  const grid = document.getElementById("calGrid");
  head.textContent = now.getFullYear() + " 年 " + (now.getMonth() + 1) + " 月";
  const 首日 = new Date(now.getFullYear(), now.getMonth(), 1);
  const 天数 = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const 前空 = (首日.getDay() + 6) % 7;   // 周一开头
  grid.innerHTML = "";
  for (let i = 0; i < 前空; i++) { const b = document.createElement("div"); b.className = "blank"; grid.appendChild(b); }
  for (let d = 1; d <= 天数; d++) {
    const cell = document.createElement("div");
    cell.textContent = d;
    if (d === now.getDate()) cell.className = "today";
    grid.appendChild(cell);
  }
}
渲染日历();
