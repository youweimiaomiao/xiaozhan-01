# data/game_data.gd —— 游戏数值数据表
# 所有可调数值都集中在这里，改平衡不需要碰逻辑代码。
# 数值来源：土豆兄弟 wiki 与攻略站（README 里有对照表和来源链接）。
# 标注"待校准"的数值是教学版近似值，调研结果确认后会更新。
extends RefCounted

# ============ 全局常量 ============

const ARENA_WIDTH := 1152.0        # 场地宽（像素）
const ARENA_HEIGHT := 648.0        # 场地高（像素）
const WALL_MARGIN := 24.0          # 边界墙厚度（玩家/敌人不能越过）
const WEAPON_SLOTS := 6            # 武器槽数量（原版就是6个）
const SHOP_WEAPON_OFFERS := 2      # 商店每次刷出的武器数量
const SHOP_ITEM_OFFERS := 2        # 商店每次刷出的道具数量
const SHOP_REROLL_BASE_COST := 2   # 商店刷新基础费用（待校准：原版随波次增长）
const CONTACT_TICK := 0.8          # 敌人贴身伤害的间隔（秒/次）（近似值，待校准）
const MAGNET_RADIUS := 90.0        # 材料磁吸半径（走到附近自动吸过来）
const HEAL_AFTER_WAVE_PCT := 0.0   # 原版波间不回血，生命跨波保留（已核实）
const HP_REGEN_INTERVAL := 1.0     # 生命再生每1秒结算一次
const CRIT_MULT := 2.0             # 暴击伤害倍率2×（已核实）
const BASE_CRIT := 0.03            # 基础暴击率3%（已核实）
const ENEMY_HP_SCALE := 0.25       # 每过一波敌人血量加成25%（近似值，待校准）

# ============ 角色 ============

# 只做了1个角色（对应原版初始角色 Well-Rounded 全能者）
const CHARACTERS := {
	"全能者": {
		"desc": "属性均衡的新手角色，初始携带一把手枪",
		"max_hp": 10,
		"hp_regen": 0,          # 生命再生：每秒回复
		"damage_pct": 0.0,      # 伤害加成（百分比，0.05=+5%）
		"attack_speed_pct": 0.0,# 攻速加成
		"crit_chance": 0.03,    # 暴击率
		"armor": 0,             # 护甲（见 ARMOR 减伤公式）
		"dodge": 0.0,           # 闪避率（完全躲开一次伤害）
		"speed": 280.0,         # 移动速度（像素/秒；原版约300，教学版按屏幕比例缩放）
		"speed_pct": 0.0,       # 移速加成
		"range": 250.0,         # 基础攻击范围（像素）
		"luck": 0,              # 幸运：提高掉落更好材料/更多材料的几率
		"harvesting": 0,        # 收获：每波结束获得等量材料
		"start_weapons": ["手枪"],
	},
}

# ============ 武器 ============

const WEAPONS := {
	"手枪": {
		"tier": 1, "price": 12,
		"damage": 4, "cooldown": 0.85, "range": 380.0,
		"bullet_speed": 620.0, "pellets": 1, "spread": 0.0,
		"desc": "单发基础武器，稳定可靠",
	},
	"冲锋枪": {
		"tier": 1, "price": 25,
		"damage": 3, "cooldown": 0.32, "range": 340.0,
		"bullet_speed": 680.0, "pellets": 1, "spread": 0.10,
		"desc": "射速极快，单发伤害较低",
	},
	"霰弹枪": {
		"tier": 1, "price": 35,
		"damage": 4, "cooldown": 1.15, "range": 260.0,
		"bullet_speed": 520.0, "pellets": 4, "spread": 0.35,
		"desc": "一次喷出4发弹丸，近距离爆发高",
	},
}

# ============ 道具 ============

# 道具购买后立刻生效（加属性），可重复购买
# 道具名均为原版真实道具（来源：brotato wiki / metabrotato），价格为教学近似值
const ITEMS := {
	"柠檬水": {
		"price": 8,
		"stats": {"harvesting": 2},
		"desc": "收获+2：每波结束多获得2材料",
	},
	"疤痕": {
		"price": 15,
		"stats": {"max_hp": 4},
		"desc": "最大生命+4（原版附带吸血，教学版简化）",
	},
	"咖啡": {
		"price": 12,
		"stats": {"attack_speed_pct": 0.10},
		"desc": "攻击速度+10%",
	},
	"可爱猴子": {
		"price": 15,
		"stats": {"harvesting": 2, "luck": 2},
		"desc": "收获+2、幸运+2：每波材料更多、掉落更好",
	},
}

# ============ 敌人 ============
# behavior 取值：chase(近战追踪) / ranged(远程射击) / charger(蓄力冲锋)
# 名字为中文 BWIKI 译名（步行者/喷吐者/冲锋者/蛮兵）
# 数值为危险度0的第1波基础值（近似值，待校准），实际血量随波次乘以(1+ENEMY_HP_SCALE*(波数-1))

const ENEMIES := {
	"步行者": {
		"hp": 5, "contact_damage": 3, "speed": 95.0,
		"xp": 1, "materials": [1, 1], "behavior": "chase",
		"radius": 12.0, "color": "#b26bd6",
	},
	"喷吐者": {
		"hp": 6, "contact_damage": 4, "speed": 80.0,
		"xp": 2, "materials": [1, 2], "behavior": "ranged",
		"radius": 12.0, "color": "#d66b6b",
		"range": 300.0, "attack_cd": 2.2, "bullet_speed": 300.0,
	},
	"冲锋者": {
		"hp": 8, "contact_damage": 5, "speed": 70.0,
		"xp": 2, "materials": [1, 2], "behavior": "charger",
		"radius": 13.0, "color": "#e0a34a",
		"charge_speed": 360.0, "charge_cd": 2.8, "charge_duration": 0.9,
	},
	"蛮兵": {
		"hp": 22, "contact_damage": 6, "speed": 55.0,
		"xp": 4, "materials": [2, 3], "behavior": "chase",
		"radius": 20.0, "color": "#8f4bb0",
	},
}

# ============ 波次（只做前5波） ============
# duration：本波持续秒数（20/20/25/25/30，调研回忆值，待校准）
# spawns：本波刷出的敌人总数（按敌人类型）
# 前5波没有精英/Boss（已核实），波次构成：第1波只有步行者，逐波加入新类型

const WAVES := [
	{"duration": 20.0, "spawns": {"步行者": 8}},
	{"duration": 20.0, "spawns": {"步行者": 10, "喷吐者": 2}},
	{"duration": 25.0, "spawns": {"步行者": 12, "喷吐者": 4, "冲锋者": 2}},
	{"duration": 25.0, "spawns": {"步行者": 14, "喷吐者": 5, "冲锋者": 3, "蛮兵": 1}},
	{"duration": 30.0, "spawns": {"步行者": 16, "喷吐者": 6, "冲锋者": 4, "蛮兵": 2}},
]

# ============ 升级（经验）系统 ============
# 升到第 N 级需要的累计经验（索引0是第1级，不需要经验）
# 待校准：原版经验曲线，教学版按递增幅度近似
const XP_PER_LEVEL := [0, 12, 26, 44, 66, 92, 122, 156, 194, 236, 282, 332, 386]

# 升级时随机给出4个选项，选1个。name 显示给玩家，stats 是实际加成
const UPGRADES := [
	{"name": "最大生命 +2",       "stats": {"max_hp": 2}},
	{"name": "生命再生 +1",       "stats": {"hp_regen": 1}},
	{"name": "伤害 +5%",          "stats": {"damage_pct": 0.05}},
	{"name": "攻击速度 +5%",      "stats": {"attack_speed_pct": 0.05}},
	{"name": "暴击率 +3%",        "stats": {"crit_chance": 0.03}},
	{"name": "移动速度 +5%",      "stats": {"speed_pct": 0.05}},
	{"name": "护甲 +1",           "stats": {"armor": 1}},
	{"name": "闪避 +3%",          "stats": {"dodge": 0.03}},
	{"name": "收获 +2",           "stats": {"harvesting": 2}},
	{"name": "幸运 +3",           "stats": {"luck": 3}},
	{"name": "攻击范围 +15",      "stats": {"range": 15}},
]

# ============ 护甲减伤公式 ============
# 减伤比例 = armor / (armor + 15)（已核实：brotato wiki Armor 页）
# 例：5护甲→25%减伤，10→40%，15→50%
static func armor_reduction(armor: int) -> float:
	return float(armor) / (float(armor) + 15.0)
