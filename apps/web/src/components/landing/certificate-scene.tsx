"use client";

import { useEffect, useRef } from "react";
import { animate, spring, stagger } from "animejs";
import { scoreSpring } from "@/lib/motion";

type Three = typeof import("three");

const INK = "#0b1f33";
const BLUE = "#1565c0";

/** The BandCraft mark on a canvas: same construction as logo.tsx (48-unit grid). */
function drawMark(g: CanvasRenderingContext2D, x: number, y: number, size: number, fg: string, acc: string) {
  const k = size / 48;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.fillStyle = fg;
  g.beginPath();
  g.roundRect(10, 6, 6.5, 36, 3.25);
  g.fill();
  g.lineWidth = 6.5;
  g.strokeStyle = fg;
  g.beginPath();
  g.arc(27, 30, 10.2, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = acc;
  g.lineCap = "round";
  g.beginPath();
  g.arc(27, 30, 10.2, (-78 * Math.PI) / 180, (-22 * Math.PI) / 180);
  g.stroke();
  g.restore();
}

/** The logo's dial as data: 0–9 ring, blue to the band, cyan across band ± margin. */
function drawGauge(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, band: number, margin: number) {
  const a = (v: number) => -Math.PI / 2 + (v / 9) * Math.PI * 2;
  g.lineWidth = r * 0.28;
  g.lineCap = "butt";
  g.strokeStyle = "#eef1f5";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = BLUE;
  g.beginPath();
  g.arc(cx, cy, r, a(0), a(band));
  g.stroke();
  g.strokeStyle = "#29b6f6";
  g.lineCap = "round";
  g.beginPath();
  g.arc(cx, cy, r, a(band - margin), a(band + margin));
  g.stroke();
}

/** The certificate face: guilloche security print, scores, and an honest disclaimer. Drawn once to a canvas. */
function certificateTexture(THREE: Three, font: string) {
  const W = 1600;
  const H = 1120;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  // Guilloche: interleaved sine ribbons, the look of banknotes and certificates.
  g.lineWidth = 1.2;
  for (let k = 0; k < 26; k++) {
    g.strokeStyle = `rgba(21,101,192,${0.05 + (k % 3) * 0.018})`;
    g.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = H * 0.5 + Math.sin(x / 90 + k * 0.45) * (180 + k * 9) * Math.cos(x / 520 + k * 0.1);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.strokeStyle = "rgba(21,101,192,0.35)";
  g.lineWidth = 3;
  g.strokeRect(36, 36, W - 72, H - 72);
  g.lineWidth = 1;
  g.strokeRect(52, 52, W - 104, H - 104);

  drawMark(g, 100, 96, 72, BLUE, "#29b6f6");
  g.fillStyle = INK;
  g.font = `700 44px ${font}`;
  g.fillText("bandcraft", 170, 150);
  g.fillStyle = INK;
  g.font = `700 64px ${font}`;
  g.fillText("Writing Band Report", 110, 230);
  g.fillStyle = "#5b6472";
  g.font = `500 30px ${font}`;
  g.fillText("Task 2 · Academic · Sample candidate", 110, 285);

  g.fillStyle = "#5b6472";
  g.font = `600 28px ${font}`;
  g.fillText("OVERALL BAND", 110, 400);
  g.fillStyle = INK;
  g.font = `700 230px ${font}`;
  g.fillText("7.5", 100, 610);
  g.fillStyle = BLUE;
  g.font = `600 64px ${font}`;
  g.fillText("± 0.5", 470, 600);
  drawGauge(g, 830, 480, 110, 7.5, 0.5);

  const crit = [["Task Response", "7"], ["Coherence", "8"], ["Lexical", "7"], ["Grammar", "8"]];
  crit.forEach(([label, band], i) => {
    const x = 110 + i * 330;
    const y = 700;
    g.strokeStyle = "rgba(11,31,51,0.14)";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x, y, 300, 180, 22);
    g.stroke();
    g.fillStyle = "#5b6472";
    g.font = `600 26px ${font}`;
    g.fillText(label.toUpperCase(), x + 26, y + 52);
    g.fillStyle = INK;
    g.font = `700 88px ${font}`;
    g.fillText(band, x + 26, y + 150);
    g.fillStyle = BLUE;
    g.font = `600 34px ${font}`;
    g.fillText("± 0.5", x + 90, y + 148);
  });

  g.fillStyle = "#8a93a0";
  g.font = `500 22px ${font}`;
  g.fillText("Automated estimate. Not an official IELTS result.", 110, 990);
  g.fillText("No. BC-0000-SAMPLE", W - 420, 990);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function certificate(THREE: Three, font: string) {
  const face = new THREE.MeshPhysicalMaterial({ map: certificateTexture(THREE, font), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color("#dbe9fb") });
  const edge = new THREE.MeshStandardMaterial({ color: "#f3f4f6", roughness: 0.6 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.24, 0.025), [edge, edge, edge, edge, face, edge]);

  // Holographic foil seal, embossed with rings.
  const foil = new THREE.MeshPhysicalMaterial({ color: "#b9d6f5", metalness: 1, roughness: 0.22, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 800], clearcoat: 1 });
  const seal = new THREE.Group();
  seal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 64), foil));
  [0.3, 0.24, 0.16].forEach((r) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.007, 8, 96), foil);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.012;
    seal.add(ring);
  });
  seal.rotation.x = Math.PI / 2;
  seal.position.set(1.12, 0.6, 0.03);
  seal.userData.seal = true;

  const group = new THREE.Group();
  group.add(card, seal);
  return group;
}

function pen(THREE: Three) {
  const lacquer = new THREE.MeshPhysicalMaterial({ color: INK, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#e9eef3", metalness: 1, roughness: 0.12 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 1.9, 48), lacquer);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.07, 48), chrome);
  band.position.y = 0.45;
  const section = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.28, 48), lacquer);
  section.position.y = -1.09;
  const nib = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 32), chrome);
  nib.position.y = -1.36;
  nib.rotation.x = Math.PI;
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.02), chrome);
  clip.position.set(0, 0.5, 0.085);
  g.add(body, band, section, nib, clip);
  return g;
}

/** Hero object: a floating Band Report with a holographic seal and a fountain pen. */
export function CertificateScene({ paused = false }: { paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const sync = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    sync.current();
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
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.NeutralToneMapping; // keeps paper white; ACES greys it
      renderer.toneMappingExposure = 1.15;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
      const sweep = new THREE.PointLight("#ffffff", 22, 8);
      sweep.position.set(-3, 1.5, 2.2);
      scene.add(sweep, new THREE.AmbientLight("#ffffff", 0.6));
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0, 5.6);

      const font = getComputedStyle(document.documentElement).getPropertyValue("--font-onest").trim() || "sans-serif";
      const cert = certificate(THREE, font);
      const fountain = pen(THREE);
      fountain.position.set(0.1, -1.08, 0.55);
      fountain.rotation.set(0.2, 0.1, -1.42);
      const rig = new THREE.Group();
      rig.add(cert, fountain);
      scene.add(rig);
      let seal: import("three").Object3D | undefined;
      cert.traverse((o) => {
        if (o.userData.seal) seal = o;
      });

      const resize = () => {
        renderer.setSize(el.clientWidth, el.clientHeight, false);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.position.z = camera.aspect < 0.9 ? 7 : 5.6;
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
      const t0 = performance.now();
      const tick = () => {
        const t = (performance.now() - t0) / 1000;
        rig.rotation.y += (-0.38 + Math.sin(t * 0.45) * 0.14 + pointer.x * 0.18 - rig.rotation.y) * 0.06;
        rig.rotation.x += (0.12 + Math.sin(t * 0.6) * 0.04 + pointer.y * 0.1 - rig.rotation.x) * 0.06;
        rig.position.y = Math.sin(t * 0.9) * 0.07;
        fountain.position.y = -1.08 + Math.sin(t * 1.1 + 1) * 0.06;
        sweep.position.x = Math.sin(t * 0.35) * 3.2; // gloss sweep across the paper and foil
        if (seal) seal.rotation.y = t * 0.6;
        renderer.render(scene, camera);
      };

      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const anims: { revert: () => unknown }[] = [];
      let visible = true;
      const setLoop = () => renderer.setAnimationLoop(visible && !document.hidden && !pausedRef.current ? tick : null);
      sync.current = setLoop;
      let io: IntersectionObserver | undefined;
      if (reduce) {
        rig.rotation.set(0.12, -0.38, 0);
        renderer.render(scene, camera);
      } else {
        anims.push(
          animate(cert.rotation, { y: { from: -1.4 }, ease: spring(scoreSpring) }),
          animate([cert.position, fountain.position], { z: { from: -2.5 }, delay: stagger(250), ease: spring(scoreSpring) }),
        );
        if (seal) anims.push(animate(seal.scale, { x: { from: 0 }, y: { from: 0 }, z: { from: 0 }, delay: 700, ease: spring(scoreSpring) }));
        addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", setLoop);
        io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          setLoop();
        });
        io.observe(el);
      }

      teardown = () => {
        sync.current = () => {};
        anims.forEach((a) => a.revert());
        io?.disconnect();
        ro.disconnect();
        removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", setLoop);
        renderer.setAnimationLoop(null);
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          if (!m.isMesh) return;
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
            (mat as import("three").MeshStandardMaterial).map?.dispose();
            mat.dispose();
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

  return <div ref={host} aria-hidden className="absolute inset-0 [&>canvas]:size-full" />;
}
