// ============================================================
//  四大戰場場景點綴：赤壁、長板坡、虎牢關、雲夢澤
// ============================================================
import * as THREE from 'three';

export function addDecorations({ scene, mat, COLS, ROWS, CELL, factionColor, stageId = 'chibi', targetGroup = null }) {
  const root = targetGroup || scene;
  const halfW = COLS * CELL / 2, halfH = ROWS * CELL / 2;
  const updaters = [];
  const shadow = (o) => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // 通用營火
  const fire = (x, z, color1 = 0xff8a2a, color2 = 0xffe08a) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7), mat(0x4a2a12));
      log.rotation.z = Math.PI / 2; log.rotation.y = i * Math.PI / 4; log.position.y = 0.08; g.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 6), new THREE.MeshBasicMaterial({ color: color1, transparent: true, opacity: 0.9 }));
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 6), new THREE.MeshBasicMaterial({ color: color2 }));
    flame.position.y = 0.38; flame2.position.y = 0.32; g.add(flame, flame2);
    const light = new THREE.PointLight(color1, 3.2, 6); light.position.y = 0.9; g.add(light);
    g.position.set(x, 0, z); root.add(g);
    updaters.push((t) => {
      const k = 1 + Math.sin(t * 17 + x) * 0.14 + Math.sin(t * 7.3) * 0.08;
      flame.scale.set(1, k, 1); flame2.scale.set(1, 2 - k, 1); light.intensity = 2.4 + k;
    });
  };

  if (stageId === 'chibi') {
    // ========== 赤壁：長江巨浪、鐵索連環戰船、赤壁峭壁、火盆 ==========
    const riverZ = -halfH - 3.6;
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS * CELL + 24, 6.0, 48, 6),
      new THREE.MeshStandardMaterial({ color: 0x1d4e6b, roughness: 0.22, metalness: 0.25, transparent: true, opacity: 0.94, flatShading: true })
    );
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0.04, riverZ); root.add(river);
    const pos = river.geometry.attributes.position;
    updaters.push((t) => {
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 0.7 + t * 2.6) * 0.11 + Math.cos(pos.getY(i) * 1.1 + t * 1.8) * 0.06);
      pos.needsUpdate = true;
    });

    // 連環戰船（3 艘曹軍大艦用鐵索相連，船頭燃火）
    const boats = [];
    [-10, -2, 6].forEach((bx, idx) => {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 2.1), mat(0x4a2e1b)); hull.position.y = 0.35;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 1.9), mat(0x6e472b)); deck.position.y = 0.85;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.4), mat(0x3b2314)); cabin.position.y = 1.45;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.7, 4), mat(0x7a241c)); roof.position.y = 2.25; roof.rotation.y = Math.PI / 4; roof.scale.set(1.3, 1, 0.9);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.6), mat(0x3a2412)); mast.position.set(0.8, 2.2, 0);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), mat(0xd8c8a8, { side: THREE.DoubleSide })); sail.position.set(0.8, 2.5, 0); sail.rotation.y = Math.PI / 2; sail.userData.wave = true;
      boat.add(hull, deck, cabin, roof, mast, sail);
      // 鐵索連接
      if (idx < 2) {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2), mat(0x333840, { metalness: 0.8 }));
        chain.rotation.z = Math.PI / 2; chain.position.set(4.0, 0.65, 0); boat.add(chain);
      }
      boat.position.set(bx, 0, riverZ - 0.3 + (idx % 2) * 0.5);
      root.add(shadow(boat));
      boats.push(boat);
      fire(bx - 1.2, riverZ - 0.2, 0xff5a1f, 0xffcf5a);
    });
    updaters.push((t) => boats.forEach((b, i) => { b.position.y = Math.sin(t * 2 + i) * 0.08; b.rotation.z = Math.sin(t * 1.5 + i) * 0.03; }));

    // 赤壁紅岩峭壁（北岸與西岸）
    for (let i = 0; i < 14; i++) {
      const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + (i % 3) * 0.6, 0), mat(i % 2 ? 0x6e352c : 0x592a22));
      cliff.position.set(-halfW - 4 + i * 3.1, 1.1 + (i % 2) * 0.6, riverZ - 3.2);
      cliff.scale.set(1.2, 1.8, 0.9);
      root.add(shadow(cliff));
    }
    // 沿江火盆
    for (let x = -halfW + 2; x <= halfW - 2; x += 6) {
      fire(x, -halfH - 0.8, 0xff6a1f, 0xffe07a);
    }
  } else if (stageId === 'changban') {
    // ========== 長板坡：當陽長坂木橋、山澗溪流、村落茅屋、稻田 ==========
    const riverZ = -halfH - 3.2;
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS * CELL + 16, 3.2, 40, 4),
      new THREE.MeshStandardMaterial({ color: 0x4f9ec4, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9, flatShading: true })
    );
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0.02, riverZ); root.add(river);
    const pos = river.geometry.attributes.position;
    updaters.push((t) => { for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 0.8 + t * 2) * 0.06); pos.needsUpdate = true; });
    for (const z of [riverZ - 1.7, riverZ + 1.7]) {
      for (let x = -halfW - 6; x < halfW + 6; x += 1.3) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + Math.random() * 0.2, 0), mat(0x9a948a));
        r.position.set(x + Math.random() * 0.5, 0.1, z + (Math.random() - 0.5) * 0.3); r.scale.y = 0.5; root.add(r);
      }
    }
    // 當陽長坂橋
    const bridge = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.38), mat(i % 2 ? 0x8a5a32 : 0x7a4e2a));
      plank.position.set(0, 0.35, -1.6 + i * 0.4); bridge.add(plank);
    }
    for (const x of [-1.25, 1.25]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.8), mat(0x5b3a1e)); rail.position.set(x, 0.85, 0); bridge.add(rail);
      for (const z of [-1.7, 0, 1.7]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.85, 0.15), mat(0x5b3a1e)); post.position.set(x, 0.5, z); bridge.add(post);
      }
    }
    bridge.position.set(-2, 0, riverZ); root.add(shadow(bridge));

    // 百姓村莊與稻田
    const house = (x, z, rot, roofColor) => {
      const h = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.6), mat(0xe8dcc0)); wall.position.y = 0.6;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1, 4), mat(roofColor)); roof.position.y = 1.65; roof.rotation.y = Math.PI / 4; roof.scale.set(1.2, 1, 0.95);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.05), mat(0x5b3a1e)); door.position.set(0, 0.35, 0.81);
      h.add(wall, roof, door); h.position.set(x, 0, z); h.rotation.y = rot; root.add(shadow(h));
    };
    const roofs = [0x4a4a52, 0x7a3a2a, 0x3a4a3a];
    [[-halfW - 6, -4, 0.2], [-halfW - 8.5, 0.5, -0.1], [-halfW - 6.5, 4.5, 0.15], [-halfW - 9, 8, -0.2], [-halfW - 5.5, 9.5, 0.4]].forEach(([x, z, r], i) => house(x, z, Math.PI / 2 + r, roofs[i % 3]));
    for (let i = 0; i < 3; i++) {
      const field = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 2), mat(i % 2 ? 0xc9b25a : 0xb8a64a));
      field.position.set(-halfW - 3.2, 0.05, 3 + i * 2.3); field.rotation.y = Math.PI / 2; field.receiveShadow = true; root.add(field);
    }
    fire(-halfW - 1.5, -halfH + 1.2); fire(-halfW - 3.5, -halfH + 7.5);
  } else if (stageId === 'hulao') {
    // ========== 虎牢關：雄關城牆、烽火狼煙台、巨型戰鼓、黃沙山岩 ==========
    // 北側雄關城牆與烽火台
    const northZ = -halfH - 2.6;
    for (let x = -halfW - 4; x <= halfW + 2; x += 2.4) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.2, 1.5), mat(0x8a7968));
      wall.position.set(x, 1.1, northZ); root.add(shadow(wall));
      const cr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.45), mat(0x786858));
      cr.position.set(x, 2.4, northZ + 0.5); root.add(shadow(cr));
    }
    // 兩座烽火台
    for (const bx of [-9, 5]) {
      const beacon = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 3.2, 4), mat(0x7c6c5c));
      tower.rotation.y = Math.PI / 4; tower.position.y = 1.6; beacon.add(tower);
      beacon.position.set(bx, 0, northZ - 0.5); root.add(shadow(beacon));
      fire(bx, northZ - 0.5, 0xff5511, 0xffcc44);
    }
    // 戰鼓陣
    for (const z of [-5, 1, 7]) {
      const drumG = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), mat(0x5b3a1e)); stand.position.y = 0.3;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.9, 12), mat(0x9a2820)); body.rotation.z = Math.PI / 2; body.position.y = 0.95;
      const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.94, 12), mat(0xe8d8b0)); skin.rotation.z = Math.PI / 2; skin.position.y = 0.95;
      drumG.add(stand, body, skin); drumG.position.set(-halfW - 4.2, 0, z); root.add(shadow(drumG));
    }
    // 拒馬與黃沙巨石
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4), mat(0x6b4a2b)); p.rotation.z = s * 0.7; p.position.y = 0.42; g.add(p); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), mat(0x6b4a2b)); bar.rotation.x = Math.PI / 2; bar.position.y = 0.45; g.add(bar);
      g.position.set(-halfW - 2.4, 0, -halfH + 1.5 + i * 1.8); root.add(shadow(g));
    }
  } else if (stageId === 'yunmeng') {
    // ========== 雲夢澤：毒瘴沼澤池、南蠻竹樓、獸骨圖騰柱、幽綠鬼火 ==========
    const pools = [[-8, -halfH - 2.8, 7, 3.2], [5, -halfH - 2.6, 8, 3.0], [-halfW - 4.5, 4, 4.2, 7.5]];
    pools.forEach(([px, pz, w, h], idx) => {
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h, 20, 6),
        new THREE.MeshStandardMaterial({ color: idx % 2 ? 0x5c3a7a : 0x3b6e4c, roughness: 0.25, transparent: true, opacity: 0.88, flatShading: true })
      );
      pool.rotation.x = -Math.PI / 2; pool.position.set(px, 0.03, pz); root.add(pool);
      const pos = pool.geometry.attributes.position;
      updaters.push((t) => {
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) + t * 2.2) * 0.05);
        pos.needsUpdate = true;
      });
    });
    // 南蠻高腳竹樓
    const hut = (x, z, rot) => {
      const g = new THREE.Group();
      for (const [dx, dz] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), mat(0x5c4628)); leg.position.set(dx, 0.5, dz); g.add(leg);
      }
      const room = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.6), mat(0x8a7248)); room.position.y = 1.45;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.2, 6), mat(0x4f5e32)); roof.position.y = 2.55;
      g.add(room, roof); g.position.set(x, 0, z); g.rotation.y = rot; root.add(shadow(g));
    };
    hut(-halfW - 6.5, -5, 0.3); hut(-halfW - 7.5, -0.5, -0.2); hut(-halfW - 6.2, 9.2, 0.4);
    // 南蠻圖騰柱與幽綠毒火
    for (const [tx, tz] of [[-halfW - 2.2, -halfH + 1.5], [-halfW - 2.2, halfH - 1.5], [-3, -halfH - 1.2], [7, -halfH - 1.2]]) {
      const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.4, 7), mat(0x5a3e24));
      totem.position.set(tx, 1.2, tz); root.add(shadow(totem));
      const horns = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 5, 12, Math.PI), mat(0xe8dfc8));
      horns.position.set(tx, 2.3, tz); horns.rotation.z = Math.PI; root.add(horns);
      fire(tx, tz + 0.7, 0x55ff66, 0xc8ff8a);
    }
  }

  // 城牆（城池兩側通用）
  const wallX = halfW + 1.2;
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = dir * (4.2 + i * 2);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 2.05), mat(0x9b9184)); seg.position.set(wallX, 0.8, z); root.add(shadow(seg));
      for (const dz of [-0.6, 0.1, 0.8]) {
        const cr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.4), mat(0x8a8074)); cr.position.set(wallX, 1.78, z + dz - 0.1); root.add(shadow(cr));
      }
    }
    const tower = new THREE.Group();
    const tb = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, 2), mat(0x9b9184)); tb.position.y = 1.3;
    const tr = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.1, 4), mat(0x3b3a3f)); tr.position.y = 3.15; tr.rotation.y = Math.PI / 4;
    tower.add(tb, tr); tower.position.set(wallX, 0, dir * 12.3); root.add(shadow(tower));
  }
  // 我軍旗幟沿城外
  for (let i = 0; i < 5; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4), mat(0x4a3a2a)); pole.position.set(halfW + 3.2, 1.2, -8 + i * 4); root.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat(factionColor, { side: THREE.DoubleSide }));
    flag.position.set(halfW + 3.2, 2.1, -8 + i * 4 + 0.45); flag.rotation.y = Math.PI / 2; flag.userData.wave = true; root.add(flag);
  }

  return (t) => updaters.forEach(u => u(t));
}
