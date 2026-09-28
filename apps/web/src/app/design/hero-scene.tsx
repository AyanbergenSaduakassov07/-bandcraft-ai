"use client";

import { useEffect, useRef } from "react";
import { animate, spring, stagger } from "animejs";
import { scoreSpring } from "@/lib/motion";

// Icy glass and brand-blue solids, parked left and right so the headline and card stay clear.
// [shape, material, x, y, z, size]
const SHAPES = [
  ["ico", "glass", -5.2, 1.6, -1, 1.1],
  ["torus", "blue", -4.1, -1.9, 0, 0.8],
  ["box", "ice", -6.6, -0.4, -3, 0.9],
  ["sphere", "pearl", -7.4, 3.3, -4, 0.5],
  ["octa", "deep", 5.1, 1.9, -1, 1.0],
  ["knot", "cyan", 4.3, -1.7, 0, 0.55],
  ["capsule", "glass", 6.6, 0.1, -3, 0.6],
  ["sphere", "blue", 7.6, 3.6, -4, 0.35],
] as const;

/** WebGL backdrop for the hero. Decorative: aria-hidden, paused offscreen, still under reduced motion. */
export function HeroScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the hero works without the backdrop.
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 14;

      const materials = {
        glass: new THREE.MeshPhysicalMaterial({ color: "#bfe6fb", transmission: 1, thickness: 1.2, roughness: 0.08, ior: 1.35 }),
        ice: new THREE.MeshPhysicalMaterial({ color: "#64b5f6", transmission: 0.85, thickness: 1, roughness: 0.25, ior: 1.3 }),
        blue: new THREE.MeshPhysicalMaterial({ color: "#1e88e5", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
        deep: new THREE.MeshPhysicalMaterial({ color: "#0d47a1", roughness: 0.3, metalness: 0.2, clearcoat: 1 }),
        cyan: new THREE.MeshPhysicalMaterial({ color: "#29b6f6", roughness: 0.15, clearcoat: 1 }),
        pearl: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.2, clearcoat: 1, sheen: 1, sheenColor: "#64b5f6" }),
      };
      const geometry = (kind: (typeof SHAPES)[number][0]) => {
        switch (kind) {
          case "ico": return new THREE.IcosahedronGeometry(1, 0);
          case "torus": return new THREE.TorusGeometry(1, 0.38, 32, 96);
          case "box": return new RoundedBoxGeometry(1.5, 1.5, 1.5, 6, 0.28);
          case "sphere": return new THREE.SphereGeometry(1, 48, 48);
          case "octa": return new THREE.OctahedronGeometry(1, 0);
          case "knot": return new THREE.TorusKnotGeometry(1, 0.32, 160, 24);
          case "capsule": return new THREE.CapsuleGeometry(0.6, 1.2, 12, 32);
        }
      };

      const group = new THREE.Group();
      scene.add(group);
      const meshes = SHAPES.map(([kind, mat, x, y, z, size], i) => {
        const mesh = new THREE.Mesh(geometry(kind), materials[mat]);
        mesh.position.set(x, y, z);
        mesh.rotation.set(i * 0.7, i * 1.3, 0);
        mesh.userData = { baseY: y, size, phase: i * 0.9 };
        mesh.scale.setScalar(size);
        group.add(mesh);
        return mesh;
      });

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = el;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Narrow screens: pull back so the side clusters stay in frame at the edges.
        camera.position.z = w < 640 ? 22 : 14;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / innerWidth) * 2 - 1;
        pointer.y = (e.clientY / innerHeight) * 2 - 1;
      };

      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        for (const m of meshes) {
          const { baseY, phase } = m.userData as { baseY: number; phase: number };
          m.position.y = baseY + Math.sin(t * 0.8 + phase) * 0.18;
          m.rotation.x += 0.0025;
          m.rotation.y += 0.004;
        }
        // Pointer parallax plus a scroll push, both eased so nothing snaps.
        group.rotation.y += (pointer.x * 0.25 - group.rotation.y) * 0.05;
        group.rotation.x += (pointer.y * 0.15 - group.rotation.x) * 0.05;
        group.position.y += (scrollY * 0.004 - group.position.y) * 0.1;
        renderer.render(scene, camera);
      };

      let intro: ReturnType<typeof animate> | undefined;
      let io: IntersectionObserver | undefined;
      if (reduceMotion) {
        renderer.render(scene, camera);
      } else {
        const scales = meshes.map((m) => m.scale);
        intro = animate(scales, {
          // from 0 to each mesh's current (final) scale
          x: { from: 0 },
          y: { from: 0 },
          z: { from: 0 },
          ease: spring(scoreSpring),
          delay: stagger(70, { start: 250, from: "center" }),
        });
        addEventListener("pointermove", onPointer, { passive: true });
        io = new IntersectionObserver(([entry]) => renderer.setAnimationLoop(entry.isIntersecting ? tick : null));
        io.observe(el);
      }

      teardown = () => {
        intro?.revert();
        io?.disconnect();
        ro.disconnect();
        removeEventListener("pointermove", onPointer);
        renderer.setAnimationLoop(null);
        meshes.forEach((m) => m.geometry.dispose());
        Object.values(materials).forEach((m) => m.dispose());
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

  return <div ref={host} aria-hidden className="pointer-events-none absolute inset-0 -z-10 [&>canvas]:size-full" />;
}
