"use client";

import { useEffect, useRef } from "react";
import { animate, spring, stagger } from "animejs";
import { scoreSpring } from "@/lib/motion";

type Three = typeof import("three");
type Object3D = import("three").Object3D;

const C = { deep: "#0d47a1", blue: "#1e88e5", sky: "#64b5f6", cyan: "#29b6f6", ink: "#0b1f33", paper: "#ffffff", wood: "#f3d9b1" };

/** Canvas texture helper: draws once, used as a material map. */
function canvasTexture(THREE: Three, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function medal(THREE: Three, displayFont: string) {
  const face = canvasTexture(THREE, 512, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, C.sky);
    grad.addColorStop(0.55, C.blue);
    grad.addColorStop(1, C.deep);
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.font = `900 44px ${displayFont}`;
    g.fillText("BAND", 256, 150);
    g.font = `900 180px ${displayFont}`;
    g.fillText("7.5", 256, 318);
    g.font = `800 60px ${displayFont}`;
    g.fillText("± 0.5", 256, 400);
  });
  // The cylinder cap's UVs run sideways once the coin is stood up; turn the art upright.
  face.center.set(0.5, 0.5);
  face.rotation = Math.PI / 2;
  const rim = new THREE.MeshStandardMaterial({ color: C.deep, roughness: 0.25, metalness: 0.6 });
  const faceMat = new THREE.MeshStandardMaterial({ map: face, roughness: 0.35, metalness: 0.1 });
  // Cylinder groups: 0 side, 1 top, 2 bottom. Rotate so the top face points at the camera.
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.22, 64), [rim, faceMat, rim]);
  coin.rotation.x = Math.PI / 2;
  const group = new THREE.Group();
  group.add(coin);
  return group;
}

function essay(THREE: Three) {
  const lined = canvasTexture(THREE, 256, 340, (g) => {
    g.fillStyle = C.paper;
    g.fillRect(0, 0, 256, 340);
    g.strokeStyle = "#cfe6f5";
    g.lineWidth = 2;
    for (let y = 60; y < 330; y += 22) g.strokeRect(0, y, 256, 0);
    g.strokeStyle = "#ff8a80";
    g.strokeRect(34, 0, 0, 340);
    g.fillStyle = "#7d93a8";
    for (let y = 52, i = 0; y < 320; y += 22, i++) g.fillRect(44, y, 170 - ((i * 37) % 60), 5);
  });
  const paper = new THREE.MeshStandardMaterial({ map: lined, roughness: 0.9 });
  const edge = new THREE.MeshStandardMaterial({ color: "#e8f3fa", roughness: 0.9 });
  const group = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.02), [edge, edge, edge, edge, paper, edge]);
    sheet.position.set(i * 0.12, -i * 0.1, -i * 0.05);
    sheet.rotation.z = i * -0.08;
    group.add(sheet);
  }
  return group;
}

function pencil(THREE: Three) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6), new THREE.MeshStandardMaterial({ color: C.blue, roughness: 0.4 }));
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8 }));
  wood.position.y = -1.05;
  wood.rotation.x = Math.PI;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), new THREE.MeshStandardMaterial({ color: C.ink }));
  tip.position.y = -1.22;
  tip.rotation.x = Math.PI;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.14, 16), new THREE.MeshStandardMaterial({ color: "#cfd8dc", metalness: 0.8, roughness: 0.3 }));
  band.position.y = 0.97;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16), new THREE.MeshStandardMaterial({ color: C.cyan, roughness: 0.6 }));
  eraser.position.y = 1.12;
  group.add(body, wood, tip, band, eraser);
  return group;
}

function barChart(THREE: Three) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }));
  group.add(base);
  [0.5, 0.85, 0.65, 1.25].forEach((h, i) => {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, h, 0.28),
      new THREE.MeshStandardMaterial({ color: [C.sky, C.blue, C.cyan, C.deep][i], roughness: 0.3 }),
    );
    bar.geometry.translate(0, h / 2, 0); // grow from the base when scaled
    bar.position.set(-0.6 + i * 0.4, 0.04, 0);
    bar.userData.bar = true;
    group.add(bar);
  });
  return group;
}

function stopwatch(THREE: Three) {
  const group = new THREE.Group();
  const dial = canvasTexture(THREE, 256, 256, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = C.ink;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 4, 8, 8);
    }
  });
  const shell = new THREE.MeshStandardMaterial({ color: C.deep, roughness: 0.3, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.25, 48), [shell, new THREE.MeshStandardMaterial({ map: dial }), shell]);
  body.rotation.x = Math.PI / 2;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), shell);
  crown.position.y = 0.95;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.03), new THREE.MeshStandardMaterial({ color: C.blue }));
  hand.geometry.translate(0, 0.28, 0);
  hand.position.z = 0.15;
  hand.userData.hand = true;
  group.add(body, crown, hand);
  return group;
}

function gradCap(THREE: Three) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.5 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 1.5), mat);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.45, 32), mat);
  cap.position.y = -0.25;
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), new THREE.MeshStandardMaterial({ color: C.cyan }));
  tassel.position.set(0.7, -0.3, 0.7);
  group.add(board, cap, tassel);
  group.rotation.set(0.35, 0.6, 0.15);
  return group;
}

function envelope(THREE: Three) {
  const group = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7 });
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.06), paper));
  const flap = new THREE.Shape([new THREE.Vector2(-0.75, 0.5), new THREE.Vector2(0.75, 0.5), new THREE.Vector2(0, -0.1)]);
  const flapMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(flap, { depth: 0.02, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: C.sky, roughness: 0.6 }));
  flapMesh.position.z = 0.04;
  group.add(flapMesh);
  return group;
}

function check(THREE: Three) {
  const s = new THREE.Shape([
    new THREE.Vector2(-0.6, 0.05), new THREE.Vector2(-0.35, 0.3), new THREE.Vector2(-0.15, 0.1),
    new THREE.Vector2(0.45, 0.7), new THREE.Vector2(0.7, 0.45), new THREE.Vector2(-0.15, -0.4),
  ]);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 });
  geo.center();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: C.cyan, roughness: 0.25 }));
}

// [builder, x, y, z, scale, spin]
const LAYOUT: [keyof typeof BUILDERS, number, number, number, number, number][] = [
  ["medal", 0, 0.2, 0.6, 1.15, 0.35],
  ["essay", -2.3, 1.1, -0.8, 1, 0.2],
  ["pencil", -1.3, -1.7, 0.2, 0.9, 0.5],
  ["barChart", 2.3, -1.4, -0.4, 1, 0.3],
  ["stopwatch", 2.2, 1.6, -0.6, 0.85, 0.25],
  ["gradCap", -2.5, -0.9, -1.4, 0.75, 0.4],
  ["envelope", 0.4, 2.4, -1.8, 0.7, 0.3],
  ["check", 0.9, -2.2, -1, 0.8, 0.45],
];
const BUILDERS = { medal, essay, pencil, barChart, stopwatch, gradCap, envelope, check } as const;

/** IELTS objects orbiting the band medal. Decorative: aria-hidden, paused offscreen or hidden, still under reduced motion. */
export function HeroScene({ paused = false }: { paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const syncLoop = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    syncLoop.current();
  }, [paused]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      await document.fonts.ready;
      if (disposed) return;

      let renderer: InstanceType<Three["WebGLRenderer"]>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight("#ffffff", 1.2);
      key.position.set(3, 4, 5);
      scene.add(key);
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 11;

      const displayFont = getComputedStyle(document.documentElement).getPropertyValue("--font-nunito").trim() || "sans-serif";
      const group = new THREE.Group();
      scene.add(group);
      const items = LAYOUT.map(([name, x, y, z, s, spin], i) => {
        const obj: Object3D = BUILDERS[name](THREE, displayFont);
        obj.position.set(x, y, z);
        obj.scale.setScalar(s);
        obj.userData = { ...obj.userData, baseY: y, phase: i * 0.8, spin };
        group.add(obj);
        return obj;
      });
      const bars: Object3D[] = [];
      let hand: Object3D | undefined;
      group.traverse((o) => {
        if (o.userData.bar) bars.push(o);
        if (o.userData.hand) hand = o;
      });

      const resize = () => {
        renderer.setSize(el.clientWidth, el.clientHeight, false);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / innerWidth) * 2 - 1;
        pointer.y = (e.clientY / innerHeight) * 2 - 1;
      };
      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        items.forEach((o, i) => {
          const { baseY, phase, spin } = o.userData as { baseY: number; phase: number; spin: number };
          o.position.y = baseY + Math.sin(t * 0.9 + phase) * 0.12;
          if (i > 0) o.rotation.y = Math.sin(t * spin + phase) * 0.5;
        });
        items[0].rotation.y = Math.sin(t * 0.6) * 0.45; // the medal sways to catch the light
        if (hand) hand.rotation.z = -t * 1.2; // the exam clock runs
        group.rotation.y += (pointer.x * 0.2 - group.rotation.y) * 0.05;
        group.rotation.x += (pointer.y * 0.12 - group.rotation.x) * 0.05;
        renderer.render(scene, camera);
      };

      const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let intro: { revert: () => unknown }[] = [];
      let io: IntersectionObserver | undefined;
      let visible = true;
      const setLoop = () => renderer.setAnimationLoop(visible && !document.hidden && !pausedRef.current ? tick : null);
      syncLoop.current = setLoop;
      if (reduceMotion) {
        renderer.render(scene, camera);
      } else {
        intro = [
          animate(items.map((o) => o.scale), {
            x: { from: 0 }, y: { from: 0 }, z: { from: 0 },
            ease: spring(scoreSpring),
            delay: stagger(80, { start: 200 }),
          }),
          animate(bars.map((b) => b.scale), { y: { from: 0 }, ease: spring(scoreSpring), delay: stagger(90, { start: 700 }) }),
        ];
        addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", setLoop);
        io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          setLoop();
        });
        io.observe(el);
      }

      teardown = () => {
        syncLoop.current = () => {};
        intro.forEach((a) => a.revert());
        io?.disconnect();
        ro.disconnect();
        removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", setLoop);
        renderer.setAnimationLoop(null);
        scene.traverse((o) => {
          const mesh = o as import("three").Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
            (m as import("three").MeshStandardMaterial).map?.dispose();
            m.dispose();
          });
        });
        scene.environment?.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return <div ref={host} aria-hidden className="size-full [&>canvas]:size-full" />;
}
