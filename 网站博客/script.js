// ===== 老博客脚本 =====
// 横幅打字机：轮换短语，和主页同款手感
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
