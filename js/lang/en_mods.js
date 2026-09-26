'use strict';
// 英文词典：可选角色的专属武器模块（modules.js）
Object.assign(I18N.EN, {
  '获得模块 · %{name}': 'Module acquired · %{name}', '专属模块：%{name}': 'Exclusive module: %{name}',
  '拖拽钩：钩中普通敌人会把它拽过来撞碎': 'Drag Hook: hooking a regular enemy yanks it in and smashes it',
  // 获得地点
  '1-4 地下仓库': '1-4 Storage Vault', '1-6 古兵器馆': '1-6 Armoury', '1-8 坍塌天井': '1-8 Collapsed Atrium', '2-1 孵化场入口': '2-1 Hatchery Gate', '2-5 粘液走廊': '2-5 Slime Corridor',
  // 小扫
  '连锁弹射': 'Chain Roll', '双刷头': 'Twin Brush', '回旋刷头': 'Boomerang Head', '高压蒸汽': 'Steam Jet', '增压吸盘': 'Boosted Suction', '清洁泡沫': 'Cleaning Foam',
  '【1-4 地下仓库】弹射撞碎敌人时，冲击会连带击碎它周围约 2 格内的其他普通敌人。': '[1-4 Storage Vault] When a roll smashes an enemy, the impact also smashes other regular enemies within about 2 tiles of it.',
  '【1-6 古兵器馆】旋转刷的攻击距离 34 → 44；连续挥动的第三下变成转一整圈的旋转扫，前后都能打到。': '[1-6 Armoury] Brush reach 34 → 44; every third swing in a row becomes a full spin that hits in front and behind.',
  '【1-8 坍塌天井】按住攻击约 0.3 秒再松开：甩出刷头，飞出约 5 格再飞回来，沿途的敌人都会被击碎。能打落吊灯、击落无人机，会被盾牌挡下。': '[1-8 Collapsed Atrium] Hold attack for about 0.3 s, then release: fling the brush head out about 5 tiles and back, smashing enemies along the way. Brings down chandeliers and drones; blocked by shields.',
  '【击败巨像1号】按住攻击约 0.6 秒再松开：高压喷刷，能冲开看守者的盾牌；站在地上时还会向前推出一道蒸汽冲击波。': '[Defeat Colossus-1] Hold attack for about 0.6 s, then release: a high-pressure blast that breaks Warden shields; on the ground it also pushes a steam shockwave forward.',
  '【2-1 孵化场入口】空中额外多一次弹射：弹射之后没贴到任何表面，也能再弹一次。': '[2-1 Hatchery Gate] One extra roll in mid-air: even without latching onto a surface, you can roll once more.',
  '【2-5 粘液走廊】旋转扫会向两侧甩出泡沫团，落地留下一滩泡沫，约 1.5 秒内碰到的敌人都会被腐蚀（无视盾牌）。': '[2-5 Slime Corridor] The spin sweep flings foam to both sides; where it lands, a puddle corrodes any enemy that touches it for about 1.5 s (ignores shields).',
  // 阿特拉斯
  '液压冲压': 'Hydraulic Press', '连击阀': 'Combo Valve', '火箭拳': 'Rocket Fist', '打桩锤': 'Pile Driver', '扩容燃料罐': 'Extended Fuel Tank', '震荡核心': 'Quake Core',
  '【1-4 地下仓库】液压踏地（地面按冲刺）的范围扩大到约 2.5 格，冷却 0.5 → 0.3 秒。': '[1-4 Storage Vault] Hydraulic Stomp (dash on the ground) reaches about 2.5 tiles; cooldown 0.5 → 0.3 s.',
  '【1-6 古兵器馆】出拳后马上再按一次攻击，可以紧接着打出第二拳；两拳之后才进入正常冷却。': '[1-6 Armoury] Press attack again right after a punch to throw a second one immediately; the normal cooldown only starts after the second.',
  '【1-8 坍塌天井】按住攻击约 0.3 秒再松开：发射拳头，直线飞出约 8 格。能打落吊灯、击落无人机，也能破盾。': '[1-8 Collapsed Atrium] Hold attack for about 0.3 s, then release: launch your fist about 8 tiles straight ahead. Brings down chandeliers and drones, and breaks shields.',
  '【击败巨像1号】按住攻击约 0.6 秒再松开：重拳；站在地上时会砸出一次震地，向两侧放出冲击波，还能震塌坍塌石板。': '[Defeat Colossus-1] Hold attack for about 0.6 s, then release: a heavy punch; on the ground it quakes the floor, sends shockwaves both ways and collapses crumbling slabs.',
  '【2-1 孵化场入口】喷气燃料 1.15 → 1.8 秒：悬停更久、爬得更高。': '[2-1 Hatchery Gate] Jet fuel 1.15 → 1.8 s: hover longer and climb higher.',
  '【2-5 粘液走廊】地面猛击放出的冲击波距离翻倍，落点还会留下约 1 秒的震荡区，碰到的敌人都会被震碎（无视盾牌）。': '[2-5 Slime Corridor] Ground Slam shockwaves travel twice as far, and the impact point leaves a quake zone for about 1 s that shatters any enemy inside (ignores shields).',
  // 赤影
  '相位斩': 'Phase Cut', '残像回响': 'Afterimage Echo', '数据飞刃': 'Data Shard', '格式化': 'Format', '二次闪现': 'Double Blink', '回溯爆破': 'Rewind Burst',
  '【1-4 地下仓库】闪现路径上的普通敌人会被切碎；切碎至少一个时，立即恢复闪现。': '[1-4 Storage Vault] Regular enemies in your blink path are cut down; cutting at least one restores your blink immediately.',
  '【1-6 古兵器馆】数据刃挥过的地方，0.3 秒后会由残像再砍一次。': '[1-6 Armoury] 0.3 s after each swing, an afterimage slashes the same spot again.',
  '【1-8 坍塌天井】按住攻击约 0.3 秒再松开：射出一道飞刃，飞出约 6 格。能打落吊灯、击落无人机，会被盾牌挡下。': '[1-8 Collapsed Atrium] Hold attack for about 0.3 s, then release: fire a blade that flies about 6 tiles. Brings down chandeliers and drones; blocked by shields.',
  '【击败巨像1号】按住攻击约 0.6 秒再松开：瞬移穿过前方最多 3 格，路径上的敌人全部被斩开（能破盾）。': '[Defeat Colossus-1] Hold attack for about 0.6 s, then release: teleport up to 3 tiles forward, cutting through every enemy in the path (breaks shields).',
  '【2-1 孵化场入口】空中闪现次数 1 → 2。': '[2-1 Hatchery Gate] Mid-air blinks 1 → 2.',
  '【2-5 粘液走廊】回溯时，在离开的位置引爆一次数据爆破：半径约 2 格内的敌人都会被击碎（无视盾牌）。': '[2-5 Slime Corridor] Rewinding detonates a data burst where you left: enemies within about 2 tiles are shattered (ignores shields).',
  // 信使
  '拖拽钩': 'Drag Hook', '双膛信号枪': 'Twin-Barrel Flare', '燃烧信号弹': 'Incendiary Flare', '照明弹': 'Star Shell', '扑翼': 'Wing Flap', '彩烟信号': 'Smoke Signal',
  '【1-4 地下仓库】抓钩钩中普通敌人时，会把它拽过来撞碎（被盾牌挡住的除外）。': '[1-4 Storage Vault] Hooking a regular enemy yanks it in and smashes it (unless a shield blocks the hook).',
  '【1-6 古兵器馆】信号枪的射击冷却 0.42 → 0.28 秒。': '[1-6 Armoury] Flare gun cooldown 0.42 → 0.28 s.',
  '【1-8 坍塌天井】被信号弹打晕的敌人会着火，晕眩结束时直接烧毁——不用再踩头收尾。': '[1-8 Collapsed Atrium] Enemies stunned by flares catch fire and burn up when the stun ends — no stomp needed.',
  '【击败巨像1号】按住攻击约 0.6 秒再松开：抛出照明弹，落地炸开强光，半径约 3.5 格内的敌人全部晕眩，看守者也会放下盾牌。': '[Defeat Colossus-1] Hold attack for about 0.6 s, then release: lob a star shell that bursts into light, stunning every enemy within about 3.5 tiles — Wardens drop their shields too.',
  '【2-1 孵化场入口】空中（没挂在绳子上时）按跳跃，可以扑一下滑翔翼向上腾起；每次离地可以用一次。': '[2-1 Hatchery Gate] In mid-air (not on the rope), press jump to flap your glider and rise; once per jump.',
  '【2-5 粘液走廊】信号弹落地或命中时留下一团彩烟，约 1.5 秒内碰到的敌人都会被晕眩。': '[2-5 Slime Corridor] Flares leave a cloud of coloured smoke where they land or hit; for about 1.5 s it stuns any enemy that touches it.',
});
