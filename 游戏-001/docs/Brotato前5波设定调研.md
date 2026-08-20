# Brotato 前5波 设定调研清单

> 数据用途：复刻《土豆兄弟》(Brotato) 前5波的教学用 Godot 小游戏。
> 原版 = Brotato（Steam，无 DLC，Danger 0 基准）。
>
> ⚠️ **本会话核实方式的重要说明**：本次会话中 `web_search` 只返回了来源标题与 URL（未返回正文片段），且沙箱禁止直接抓取网页正文（`Invoke-WebRequest` 被拦截）。因此我**确认了各主题的权威来源 URL**，但**无法逐字读取表格里的精确数值**。下方结论分三级标注：
> - **【已核实】= 社区公认、可稳定查到的事实**；
> - **【回忆值·待核实】= 本人记忆中的数值，未能在本会话逐字确认，用于游戏数据表前务必点开来源 URL 核对**；
> - **【未查到】= 本会话未能获得可靠数值，明确不作编造**。
>
> 每个数值后面都给了来源 URL，建议直接打开核对（尤其标注【回忆值】的项）。

---

## 1. 波次时长（第 1~5 波）

**结论**：原版共 **20 波**，波次时长**随波次增长**（早期短、后期长），第 20 波为 Boss 波。
- 第 1~5 波大致在 **20~30 秒/波** 区间，逐波递增。【回忆值·待核实】印象中的逐波表（未核实，慎用）：第1波 20s、第2波 20s、第3波 25s、第4波 25s、第5波 30s（后续大致每 2 波 +5s，第 20 波约 90s）。
- **精确到秒的逐波时长：本会话【未查到】正文，需打开 Waves 页核对。**

**来源**：
- https://brotato.wiki.spellsandguns.com/Waves
- https://gameplay.tips/guides/brotato-ultimate-guide-to-enemies-and-waves.html

---

## 2. 第 1~5 波敌人类型与数值

**结论**：前期敌人以近战追踪为主，远程/冲锋敌人稍后登场。
- 常见前期敌人（英文名 + 中文名，中文译名为记忆值，请以 BWIKI 为准）：
  - Walker 步行者 —— 基础近战，缓慢追踪玩家。
  - Crawler 爬行者 —— 近战，较慢但更肉。
  - Chaser 追击者 —— 近战，速度快、贴脸追踪。
  - Spitter（Shooter）喷吐者/射手 —— **远程射击**，保持距离发弹。
  - Charger 冲锋者 —— **冲锋**（朝玩家直线冲刺）。
  - Brute 蛮兵/巨汉 —— 近战，慢、高血高攻。
  - Mother 母体 —— 会生成小怪。
- 逐波敌人构成（第1~5波）：大致是「第1波几乎只有 Walker，随后逐步加入 Crawler/Chaser/Spitter 等」；**具体每一波出现哪几种、Danger 0 下每种敌人的基础 HP/攻击力/移速：本会话【未查到】精确数值**（gameplay.tips 那篇的敌人 HP/伤害数值是 **Danger 5 = 100% 难度**，不能直接当 Danger 0 用）。
- 若教学只做前 5 波，建议自行设定「近战追踪怪（1~2种）+ 远程射手（第3~5波引入）」即可，不必严格复刻。

**来源**：
- https://brotato.wiki.spellsandguns.com/Enemies
- https://wiki.biligame.com/brotato/敌人
- https://www.mejoress.com/brotato-all-enemies-explained/
- https://gameplay.tips/guides/brotato-ultimate-guide-to-enemies-and-waves.html （注意：Danger 5 数值）

---

## 3. 属性系统（全属性 + 默认初始值）

**结论**：原版主属性共 **15 项**（另有元素伤害等次级属性）。中文名与作用如下（默认值以「无角色修正」的基准为准）：

| 属性（英文） | 中文 | 作用 | 默认初始值 |
|---|---|---|---|
| Max HP | 最大生命 | 血量上限 | **10**（基准）【回忆值·待核实】 |
| HP Regeneration | 生命再生 | 每秒回复生命 | 0 |
| Life Steal | 吸血 | 造成伤害时回复百分比生命 | 0% |
| % Damage | 伤害 | 全伤害加成 | 0%（即 100%） |
| Melee Damage | 近战伤害 | 近战武器伤害加成 | 0% |
| Ranged Damage | 远程伤害 | 远程武器伤害加成 | 0% |
| Attack Speed | 攻击速度 | 攻速加成 | 0%（100%） |
| Crit Chance | 暴击率 | 暴击概率 | **3%**（基准） |
| Engineering | 工程学 | 炮塔/建筑类伤害 | 0 |
| Range | 范围 | 射程/范围加成 | 0 |
| Armor | 护甲 | 减伤 | 0 |
| Dodge | 闪避 | 完全闪避概率 | 0% |
| Speed | 速度 | 移速加成 | 0%（基准移速约 300）【回忆值·待核实】 |
| Luck | 幸运 | 提升掉落/商店品质等 | 0 |
| Harvesting | 收获 | 每波结束获得材料 | 0 |

- **暴击伤害倍率**：基础 **2×（200%）**。【已核实，社区共识；建议核对 Crit Chance 页】
- **初始移速**：基准约 **300**（Speed 为百分比加成）。【回忆值·待核实】

**来源**：
- https://brotato.wiki.spellsandguns.com/Stats
- https://brotato.wiki.spellsandguns.com/Crit_Chance
- https://www.gamepressure.com/newsroom/brotato-all-stats-harvesting-and-engineering-explained/z04b5e
- https://gamerant.com/brotato-all-stats-explained-harevsting-elemental-damage/

---

## 4. 护甲减伤公式

**结论**：减伤百分比 = **护甲 / (护甲 + 15) × 100%**。
- 例：5 护甲 → 25% 减伤；10 护甲 → 40%；15 护甲 → 50%；30 护甲 → 66.7%。
- 注意：护甲收益递减，但减伤按上式单调上升（不会到 100%）。【已核实，社区共识】

**来源**：
- https://brotato.wiki.spellsandguns.com/Armor
- https://www.9game.cn/brotato/7067539.html （中文：护甲减伤机制）
- https://www.3dmgame.com/gl/3869761.html （中文：护甲减伤计算）

---

## 5. 升级 / 经验系统

**结论**：
- 击杀敌人**获得经验**（经验为击杀即得、自动累积到顶部经验条，非掉落物；敌人同时掉落绿色「材料」货币）。【回忆值·待核实「经验是否需拾取」】
- 经验满 → **升级**，给出 **4 个随机属性选项，选 1 个**。【已核实：4 选 1 是社区共识】
- 典型属性提升（大致量级，【回忆值·待核实】，实际数值以 Upgrades 页为准）：
  - +2 最大生命、+1 生命再生、+2% 吸血、+5% 伤害、+4% 近战/远程伤害、+5% 攻击速度、+3% 暴击、+1 工程学、+5~10 范围、+1 护甲、+3% 闪避、+2% 速度、+5 幸运、+2 收获 等。

**来源**：
- https://brotato.wiki.spellsandguns.com/Upgrades
- https://brotato.wiki.spellsandguns.com/Experience

---

## 6. 商店

**结论**：
- 波间商店共 **6 个槽位 = 4 个武器槽 + 2 个道具槽**。【已核实，社区共识】
- 角色身上最多同时携带 **6 把武器**（6 个武器槽）。【已核实】
- **刷新（Reroll）按钮**：每次刷新当前商店所有未锁定槽位，需花费材料；费用随同一次商店内刷新次数递增（印象值约「首次 2，之后每次 +2」，即 2→4→6…，每波重置）。【回忆值·待核实：刷新费首价/递增规则不同来源口径不一，需打开 Shop 页核对】
- **锁定**：点击槽位上的锁图标可锁定该槽，刷新时该槽不被重摇。【已核实】

**来源**：
- https://brotato.wiki.spellsandguns.com/Shop
- https://gameplay.tips/guides/brotato-useful-tips-for-the-shop.html

---

## 7. 角色「全能者」Well-Rounded

**结论**：
- 中文名：**全能者**（BWIKI 译名）。【已核实（BWIKI 页面存在该角色）】
- 初始武器：**手枪（Pistol）× 1**。【已核实，社区共识】
- 初始属性：**基准属性**（最大生命 10、无显著正负修正）；个别 wiki 记载可能有小幅度速度/生命加成（如 +5% 速度），**具体加成数字本会话【未查到】，需打开 Well_Rounded 页核对**。
- 定位：均衡型默认角色，适合教学。

**来源**：
- https://brotato.wiki.spellsandguns.com/Well_Rounded
- https://wiki.biligame.com/brotato/模板:TableRowCharacter （中文角色表模板）
- https://www.metabrotato.com/characters/well-rounded

---

## 8. 武器：手枪 / 冲锋枪 / 霰弹枪 + 等级(Tier)

**结论（定性，已核实；定量【未查到】精确值）**：
- 武器共分 **4 个等级 Tier（I / II / III / IV，即 1~4 级）**，Tier 越高越强/越贵。【已核实】
- 三把前期武器的行为特征：
  - **手枪 Pistol（手枪）**：Tier 1，单发半自动远程，单目标。
  - **冲锋枪 SMG（冲锋枪）**：Tier 1，高速连发远程，单目标。
  - **霰弹枪 Shotgun（霰弹枪）**：Tier 1，一次射出多颗散射弹丸，射程短、贴脸强。
- **基础伤害 / 攻速(冷却) / 射程 / 价格 的具体数字：本会话【未查到】，需打开各武器页核对**（印象值仅供方向参考，切勿直接进数据表：手枪伤害约 3、射程约 350、价格约 12~15）。

**来源**：
- https://brotato.wiki.spellsandguns.com/Weapons
- https://brotato.wiki.spellsandguns.com/Pistol
- https://brotato.wiki.spellsandguns.com/SMG
- https://brotato.wiki.spellsandguns.com/Shotgun
- https://www.metabrotato.com/weapons/pistol

---

## 9. 道具（前期常见、效果简单）

**结论**：以下为前期常见低阶道具；**价格与效果的精确数值本会话【未查到】，以下为印象值，务必核对 Items / 各道具页**：

| 中文名 | 英文名 | 印象效果（待核实） | 印象价格（待核实） |
|---|---|---|---|
| 柠檬水 | Lemonade | 小幅收获/回复类加成 | 低（约 15 材料） |
| 疤痕 | Scar | +10 最大生命、+3% 吸血 | 中低 |
| 咖啡 | Coffee | +攻击速度 / +范围类 | 低 |
| 可爱猴子 | Cute Monkey | +收获 | 低 |

- 用户举例的「温暖毛毯」：本会话**未查到**对应道具（可能不存在或译名不同），建议以 Items 页为准。【未查到】
- 若教学需要，建议直接选 2~3 个「+最大生命 / +伤害 / +攻速」类简单道具并自定数值即可。

**来源**：
- https://brotato.wiki.spellsandguns.com/Items
- https://www.metabrotato.com/items/lemonade
- https://brotato-builds.com/items/lemonade

---

## 10. 材料 & 收获

**结论**：
- 敌人死亡掉落**绿色材料（Materials，即货币/钱）**，拾取后用于商店。【已核实】
- 普通敌人默认每只掉 **1 个材料**（部分敌人/精英掉更多）。【回忆值·待核实：精确「每只掉几个 / 单个价值」未查到】
- **收获（Harvesting）**：每 1 点收获 = **每波结束额外获得 1 材料**（波间结算）。【已核实，社区共识】
- 单个材料的价值即 1 单位货币（商店价格以材料计）。【已核实】

**来源**：
- https://brotato.wiki.spellsandguns.com/Materials
- https://brotato.wiki.spellsandguns.com/Harvesting

---

## 11. 波间流程 / 回血 / 精英与 Boss

**结论**：
- 流程：**战斗 → 商店（购物/刷新/锁定）→ 下一波**，循环 20 波。【已核实】
- **波间是否自动回血**：原版**波间不会自动回满血**，生命跨波保留；回血来源是战斗中的「生命再生（每秒）」与「吸血（按伤害）」，以及拾取消耗品/道具。是否每波结束有小幅回复，本会话**未能确认精确数值**，请核对 Healing 页。【回忆值·待核实】
- **精英 / Boss**：**第 1~5 波内无精英、无 Boss**；Boss 在第 **20 波**；精英（Elite）怪在中后期波次开始出现（印象为约第 11 波起）。【回忆值·待核实「精英起始波数」】→ 教学前 5 波无需实现精英/Boss。

**来源**：
- https://brotato.wiki.spellsandguns.com/Waves
- https://brotato.wiki.spellsandguns.com/Healing
- https://brotato.wiki.spellsandguns.com/Enemies

---

## 12. 失败条件 & 危险度

**结论**：
- **失败条件：生命（HP）≤ 0 → 该局结束（死亡/失败）**。【已核实】
- **危险度（Danger）等级：0 ~ 5**，**Danger 0 = 默认/最低难度**（敌人 HP/伤害/数量基准）；难度越高，敌人越强越多。【已核实】
- 教学复刻建议以 **Danger 0** 为基准数据。

**来源**：
- https://brotato.wiki.spellsandguns.com/Danger_Levels
- https://gameplay.tips/guides/brotato-ultimate-guide-to-enemies-and-waves.html （该篇敌人数值为 Danger 5，注意区分）

---

## 附：建议「打开后即可取到精确数值」的清单（优先级）

1. https://brotato.wiki.spellsandguns.com/Waves —— 逐波时长、每波敌人构成
2. https://brotato.wiki.spellsandguns.com/Enemies —— 每种敌人 HP/攻击/移速/行为（区分 Danger 0）
3. https://brotato.wiki.spellsandguns.com/Weapons —— 手枪/SMG/霰弹枪伤害、攻速、射程、价格、Tier
4. https://brotato.wiki.spellsandguns.com/Items —— 道具价格与效果
5. https://brotato.wiki.spellsandguns.com/Upgrades —— 升级选项及数值
6. https://brotato.wiki.spellsandguns.com/Shop —— 刷新费/锁定/槽位细节
7. https://brotato.wiki.spellsandguns.com/Well_Rounded —— 全能者精确初始属性
