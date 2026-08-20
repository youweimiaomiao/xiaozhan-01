// ===== 小服务器大冒险 · 交互脚本 =====

// ---------- 教程步骤数据 ----------
const STEPS = [
  {
    emoji: "🔑", title: "拿到钥匙：SSH 登录服务器",
    html: `
      <p>SSH 就像一根<b>遥控线</b>——你在自己电脑上敲命令，服务器在家里执行。</p>
      <ol>
        <li>Windows 自带 SSH（PowerShell / 终端里直接敲）；</li>
        <li>腾讯云 Ubuntu 的默认用户是 <code>ubuntu</code>（不是 root！）；</li>
        <li>第一次登录会问 "yes/no"，输 <code>yes</code>；然后输密码（屏幕不显示，正常）。</li>
      </ol>
      <pre><code class="codeblock">ssh ubuntu@youweimiao.com
# 输入密码后，你就"进到房子里了"，提示符变成：
# ubuntu@VM-x-x-ubuntu:~$</code></pre>
      <p class="tip">🔐 进阶：用密钥登录替代密码（ssh-keygen 生成一对，公钥放到服务器），既安全又免密。教程进阶篇再展开。</p>`
  },
  {
    emoji: "📦", title: "把货搬进去：上传文件",
    html: `
      <p>文件上传走 <b>SFTP</b>（SSH 的文件通道）。两种常用姿势：</p>
      <ol>
        <li><b>scp</b>：一行命令传单个文件/整个目录（目录要加 <code>-r</code>）；</li>
        <li><b>图形工具</b>：WinSCP / FileZilla——左边你电脑，右边服务器，拖拽即可。</li>
      </ol>
      <pre><code class="codeblock"># 整个文件夹传过去（注意目录最后的斜杠含义）
scp -r build/web/* ubuntu@youweimiao.com:/home/ubuntu/my_site/

# 先放自己家目录（/home/ubuntu），下一步再"摆上货架"</code></pre>
      <p class="tip">💡 我们的工具箱里还有 <code>上传.py</code>：一键批量上传，还带进度打印。</p>`
  },
  {
    emoji: "🗄️", title: "摆上货架：nginx 配置",
    html: `
      <p>nginx 是服务器上的<b>门卫+货架管理员</b>：访客要什么路径，它就从对应文件夹取文件。</p>
      <ol>
        <li>网站文件统一放 <code>/var/www/</code> 下（需要 sudo）；</li>
        <li>配置文件放 <code>/etc/nginx/sites-enabled/</code>；</li>
        <li>改完先 <code>nginx -t</code> 检查语法，再 <code>reload</code>（不打断在线访客）。</li>
      </ol>
      <pre><code class="codeblock"># 关键配置长这样
server {
    listen 80;                 # 开 80 号门
    root /var/www/html;        # 默认货架：你的博客
    location / { try_files $uri $uri/ =404; }

    location /my_game/ {       # 新货架：路径 /my_game/
        alias /var/www/my_game/;
        index index.html;
        try_files $uri $uri/ /my_game/index.html;
    }
}
# 保存后：
sudo nginx -t && sudo systemctl reload nginx</code></pre>
      <p class="tip">⚠️ 备份文件（.bak）千万别留在 sites-enabled 目录里——nginx 会把它们也当成配置加载，直接报 duplicate server。</p>`
  },
  {
    emoji: "🚪", title: "开门迎客：验证上线",
    html: `
      <p>访客的视角才是最终答案。用任何设备打开：</p>
      <pre><code class="codeblock">https://youweimiao.com/        # 博客
https://你的域名/my_game/       # 你刚挂上去的新站点</code></pre>
      <ol>
        <li>打不开 → 先查云厂商<b>安全组</b>有没有放行 80 端口；</li>
        <li>404 → 检查 root/alias 路径和文件是否真在那里（<code>ls -la /var/www/my_game</code>）；</li>
        <li>能开但样式乱/游戏黑屏 → 看下一步的响应头彩蛋。</li>
      </ol>
      <p class="tip">🎮 Godot 网页版需要"跨源隔离响应头"（SharedArrayBuffer 依赖），配置里记得加 COOP/COEP 两行——排错表里有。</p>`
  },
  {
    emoji: "🪧", title: "挂上招牌：绑定域名",
    html: `
      <ol>
        <li>域名商控制台 → DNS 解析 → 加两条 <b>A 记录</b>：<code>@</code> 和 <code>www</code>，记录值都是 <code>你的服务器公网IP</code>；</li>
        <li>等待生效（几分钟~几小时），验证：<code>ping youweimiao.com</code> 看是否解析到你的 IP；</li>
        <li>nginx 里声明域名（让"招牌"对得上"房子"）：</li>
      </ol>
      <pre><code class="codeblock">server {
    listen 80;
    server_name youweimiao.com www.youweimiao.com;   # 就是这句
    root /var/www/html;
    ...
}
sudo nginx -t && sudo systemctl reload nginx</code></pre>
      <p class="tip">🌏 国内服务器建站注意：域名解析到大陆服务器需要 <b>ICP 备案</b>（在腾讯云控制台走流程，约 1~2 周）。境外服务器则无需。</p>`
  },
  {
    emoji: "🔒", title: "装上防盗门：HTTPS + 安全三件套",
    html: `
      <h3>HTTPS（小锁头）</h3>
      <pre><code class="codeblock">sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d youweimiao.com -d www.youweimiao.com
# 选 2（自动跳转 https），证书 90 天一续，certbot 自动续期</code></pre>
      <h3>安全三件套（上线必做）</h3>
      <ol>
        <li><b>SSH 换密钥登录</b>，关掉密码登录：<code>PasswordAuthentication no</code>；</li>
        <li><b>防火墙</b>：<code>sudo ufw allow 22,80,443 && sudo ufw enable</code>；</li>
        <li><b>数据库/面板端口绝不裸奔公网</b>（3306、8888 这类只在安全组里对自己 IP 开放）。</li>
      </ol>
      <p class="tip">🎁 完成六步，你就拥有了"上线一个网站"的完整技能树。恭喜出师！</p>`
  }
];

// ---------- 渲染步骤卡片 + 导航 ----------
const stepsBox = document.getElementById("steps");
const navBox = document.getElementById("stepsNav");

STEPS.forEach((s, i) => {
  const card = document.createElement("div");
  card.className = "step";
  card.id = "step" + i;
  card.innerHTML = `
    <div class="step-head">
      <div class="step-num">${i + 1}</div>
      <div class="step-title">${s.emoji} ${s.title}</div>
      <div class="step-check">✓</div>
    </div>
    <div class="step-body">${s.html}</div>`;
  stepsBox.appendChild(card);

  const a = document.createElement("a");
  a.href = "#step" + i;
  a.textContent = (i + 1) + " · " + s.title.slice(0, 10);
  navBox.appendChild(a);

  card.querySelector(".step-head").addEventListener("click", () => {
    card.classList.toggle("open");
  });
});

// 进度记忆（点开过 = 已完成）
const progressKey = "server_adventure_progress";
let done = JSON.parse(localStorage.getItem(progressKey) || "{}");
STEPS.forEach((s, i) => {
  const card = document.getElementById("step" + i);
  if (done[i]) { card.classList.add("done", "open"); navBox.children[i].classList.add("done"); }
  card.querySelector(".step-head").addEventListener("click", () => {
    done[i] = card.classList.contains("open");
    localStorage.setItem(progressKey, JSON.stringify(done));
    if (done[i]) navBox.children[i].classList.add("done");
  });
});

// ---------- 一键复制代码 ----------
document.querySelectorAll(".codeblock").forEach(block => {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "复制";
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(block.textContent).then(() => {
      btn.textContent = "已复制 ✓";
      setTimeout(() => (btn.textContent = "复制"), 1500);
    });
  });
  block.parentElement.appendChild(btn);
});

// ---------- 彩蛋终端 ----------
const termBody = document.getElementById("termBody");
const termInput = document.getElementById("termInput");
const termPrint = (txt) => { termBody.textContent += txt + "\n"; termBody.scrollTop = termBody.scrollHeight; };

const CMDS = {
  help: `可用命令：
  whoami    — 看看我是谁
  ls        — 房子里有什么
  df        — 磁盘还剩多少
  free      — 内存还剩多少
  nginx -t  — 检查门卫的语法
  部署步骤   — 温习六步口诀
  土豆       — 看看我们的作品
  域名       — 域名要做什么
  安全组     — 云防火墙是什么
  宝塔       — 面板真的需要吗
  教程       — 本教程网址
  博客       — 服务器上的老住户
  clear     — 清屏
  exit      — 假装退出（其实不会）`,
  whoami: "ubuntu",
  ls: "potato_web  jiaocheng  my_site  default-site.conf",
  "nginx -t": "nginx: configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file test is successful",
  "部署步骤": "① 拿钥匙 SSH → ② 传文件 SFTP → ③ nginx 摆货架 → ④ reload 开门 → ⑤ 域名挂招牌 → ⑥ HTTPS 防盗门",
  土豆: "🥔 土豆兄弟网页版就在这台服务器上：\nhttps://youweimiao.com/potato/ （真的能玩！）",
  域名: "在域名商控制台加 A 记录：\n@  → 你的服务器公网IP\nwww → 你的服务器公网IP\n然后 nginx 里 server_name 写上你的域名。",
  安全组: "云厂商控制台 → 安全组 → 入站规则：\n放行 22(SSH) 80(HTTP) 443(HTTPS)\n服务器上服务要真的在跑，光放行没用。",
  宝塔: "宝塔只是命令行的网页皮肤，可有可无。\n本教程全程命令行：ssh / scp / nginx 三样走天下。",
  教程: "你现在看的就是：https://youweimiao.com/jiaocheng/",
  博客: "服务器的老住户：https://youweimiao.com/（nginx 1.24 在跑）",
  备份: "每天凌晨 4 点 cron 自动打包 /var/www 到 ~/backups/\n（本教程第7步装的，已实跑一次：13MB）",
  更新: "日常更新三步：\n① 本地改文件\n② scp 上传覆盖\n③ 浏览器强刷\n（改了 nginx 配置才需要 reload）",
  df: "文件系统      容量  已用  可用 使用%\n/dev/vda2      40G  6.2G   32G   17% /",
  free: "              总量  已用  可用\n内存(MB)      3723   587  3135",
  sudo: "（试一次就好，本彩蛋不提供 sudo 权限 🐟）",
  鱼: "🐟 大肥鱼在此。本教程是我和 s2648 一起写的，祝你上线顺利！",
  clear: "__CLEAR__",
  exit: "（这只是彩蛋，不是真终端，你跑不掉 😏）"
};

// 终端：支持 ↑↓ 历史
const termHistory = [];
let histIdx = 0;
termInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (histIdx < termHistory.length) histIdx++;
    termInput.value = termHistory[termHistory.length - histIdx] || "";
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    histIdx = Math.max(0, histIdx - 1);
    termInput.value = termHistory[termHistory.length - histIdx] || "";
  } else if (e.key !== "Enter") {
    return;
  } else {
    const cmd = termInput.value.trim();
    termInput.value = "";
    if (cmd) { termHistory.push(cmd); histIdx = 0; }
    termPrint("ubuntu@小服务器:~$ " + cmd);
    if (cmd === "clear") { termBody.textContent = ""; return; }
    const out = CMDS[cmd] || "命令不存在，敲 help 看看";
    termPrint(out);
  }
});

// 终端开场白
termPrint("欢迎来到你的服务器（模拟器版）🐧");
termPrint("敲 help 看看能干什么，或者试试 whoami");

// 回到顶部按钮
const toTop = document.getElementById("toTop");
window.addEventListener("scroll", () => {
  toTop.style.display = window.scrollY > 600 ? "block" : "none";
});
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// 成功日记
const diary = document.getElementById("diary");
const diaryHint = document.getElementById("diaryHint");
diary.value = localStorage.getItem("deploy_diary") || "";
document.getElementById("diarySave").addEventListener("click", () => {
  localStorage.setItem("deploy_diary", diary.value);
  diaryHint.textContent = "已保存 ✓（" + new Date().toLocaleString() + "）";
});

// 白天/黑夜切换（首次访问跟随系统偏好；?theme=light/dark 可强制）
const themeBtn = document.getElementById("themeBtn");
const savedTheme = localStorage.getItem("tut_theme");
const urlTheme = new URLSearchParams(window.location.search).get("theme");
const sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
if (urlTheme === "light" || savedTheme === "light" || (!savedTheme && !urlTheme && !sysDark)) {
  document.body.classList.add("light");
  themeBtn.textContent = "☀️";
}
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  themeBtn.textContent = light ? "☀️" : "🌙";
  localStorage.setItem("tut_theme", light ? "light" : "dark");
});

// 蹦跶土豆：点击弹一句话
const potato = document.getElementById("potatoMascot");
const potatoLines = ["土豆兄弟在 /potato/ 等你！", "服务器 24 小时营业中 🐟", "敲 help 有惊喜", "上线这种事，一回生二回熟", "🥔🥔🥔"];
potato.addEventListener("click", () => {
  potato.textContent = potatoLines[Math.floor(Math.random() * potatoLines.length)];
  setTimeout(() => (potato.textContent = "🥔"), 2200);
});

// 三题小测
const QUIZ = [
  { q: "腾讯云 Ubuntu 服务器默认登录用户是？", opts: ["root", "admin", "ubuntu", "bt"], a: 2 },
  { q: "改完 nginx 配置，正确的生效姿势是？", opts: ["直接刷新网页", "nginx -t 检查后 systemctl reload nginx", "重启服务器", "等一小时"], a: 1 },
  { q: "sites-enabled 目录里放 .bak 备份会怎样？", opts: ["没事", "nginx 报 duplicate server 起不来", "备份被自动删除", "只有警告"], a: 1 }
];
const quizBox = document.getElementById("quiz");
QUIZ.forEach((item, qi) => {
  const wrap = document.createElement("div");
  wrap.className = "quiz-item";
  let html = '<p class="quiz-q">' + (qi + 1) + ". " + item.q + "</p>";
  item.opts.forEach((op, oi) => {
    html += '<button class="quiz-opt" data-q="' + qi + '" data-o="' + oi + '">' + op + "</button> ";
  });
  wrap.innerHTML = html;
  quizBox.appendChild(wrap);
});
quizBox.addEventListener("click", (e) => {
  const b = e.target.closest(".quiz-opt");
  if (!b || b.classList.contains("locked")) return;
  const qi = +b.dataset.q, oi = +b.dataset.o;
  const item = QUIZ[qi];
  const opts = quizBox.querySelectorAll('.quiz-opt[data-q="' + qi + '"]');
  opts.forEach(o => o.classList.add("locked"));
  if (oi === item.a) {
    b.classList.add("right");
    b.textContent += " ✓ 对！";
  } else {
    b.classList.add("wrong");
    b.textContent += " ✗ 再想想";
    opts[item.a].classList.add("right");
    opts[item.a].textContent += " ✓";
  }
});

// 打印导出
document.getElementById("printBtn").addEventListener("click", () => {
  document.querySelectorAll(".step").forEach(s => s.classList.add("open"));
  window.print();
});

// 复制分享链接
document.getElementById("shareBtn").addEventListener("click", () => {
  navigator.clipboard.writeText("https://youweimiao.com/jiaocheng/").then(() => {
    const b = document.getElementById("shareBtn");
    b.textContent = "✓";
    setTimeout(() => (b.textContent = "🔗"), 1500);
  });
});

// 访问计数（浏览器本地）+ 页脚统计
let visits = +(localStorage.getItem("tut_visits") || 0) + 1;
localStorage.setItem("tut_visits", visits);
const codeCount = document.querySelectorAll(".codeblock").length;
const stepCount = STEPS.length;
document.getElementById("footStats").textContent =
  "共 " + stepCount + " 个步骤 · " + codeCount + " 段可复制的真实命令 · 3 题小测 · 1 个彩蛋终端 · 你已来访 " + visits + " 次";

// 阅读进度条
window.addEventListener("scroll", () => {
  const h = document.documentElement;
  const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  document.getElementById("readBar").style.width = pct + "%";
});

// 答疑折叠
document.querySelectorAll(".acc-q").forEach(q => {
  q.addEventListener("click", () => q.parentElement.classList.toggle("open"));
});

// 区块滚动浮现
const revealables = document.querySelectorAll(".card, .step");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add("revealed");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.06 });
  revealables.forEach(el => {
    el.classList.add("pre-reveal");
    io.observe(el);
  });
} else {
  revealables.forEach(el => el.classList.add("revealed"));
}

// 全部步骤完成 → 撒花
const stepsHeads = document.querySelectorAll(".step-head");
stepsHeads.forEach((h, i) => {
  h.addEventListener("click", () => {
    setTimeout(() => {
      const allDone = STEPS.every((s, k) => document.getElementById("step" + k).classList.contains("done"));
      if (allDone && !sessionStorage.getItem("confetti_fired")) {
        sessionStorage.setItem("confetti_fired", "1");
        const emojis = ["🎉", "🥔", "🐟", "🚀", "⭐", "🎊"];
        for (let n = 0; n < 24; n++) {
          const e = document.createElement("span");
          e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          e.style.cssText = "position:fixed;z-index:999;font-size:22px;pointer-events:none;transition:all 1.6s ease-out;left:" + Math.random() * 100 + "vw;top:-30px";
          document.body.appendChild(e);
          requestAnimationFrame(() => { e.style.top = "100vh"; e.style.transform = "rotate(" + (Math.random() * 720 - 360) + "deg)"; });
          setTimeout(() => e.remove(), 1700);
        }
      }
    }, 50);
  });
});
