import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function Diyas() {
  return (
    <group position={[0, -1.45, 0]}>
      {[-2.2, 0, 2.2].map((x, i) => (
        <group key={x} position={[x, i === 1 ? 0 : -0.12, 0]} scale={i === 1 ? 1.15 : 0.78}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.56, 0.35, 0.18, 48]} />
            <meshStandardMaterial color="#b85a20" metalness={0.72} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshBasicMaterial color="#ffb02e" />
          </mesh>
          <mesh position={[0, 0.5, 0]} scale={[0.11, 0.27, 0.11]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color="#fff1a6" />
          </mesh>
          <pointLight position={[0, 0.55, 0.3]} color="#ff9b24" intensity={2.2} distance={3.5} />
        </group>
      ))}
    </group>
  );
}


// A single animated shell: it rises, separates into several stars, then
// each star opens into its own smaller burst. All effects are visual only.

function MultiStageFirework({
  position,
  color = "#ffbd55",
  delay = 0,
  style = "peony"
}) {
  const group = useRef();
  const rocket = useRef();
  const flame = useRef();
  const rocketGlow = useRef();
  const smoke = useRef();
  const burstLight = useRef();

  const PARTICLE_COUNT = 240;
  const CYCLE = 10;
  const LAUNCH_DURATION = 1.5;

  const fireworkColor = useMemo(() => new THREE.Color(color), [color]);

  // Generate different explosion directions.
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const random = Math.random();

      let direction;
      let speed = 2 + random * 2;
      let gravity = 1;
      let life = 2.2;
      let drag = 0.12;

      if (style === "ring") {
        direction = new THREE.Vector3(
          Math.cos(angle),
          (Math.random() - 0.5) * 0.12,
          Math.sin(angle)
        );
        speed = 2.7 + random * 0.35;
        gravity = 0.35;
        life = 2;
      } else if (style === "willow") {
        direction = new THREE.Vector3(
          Math.cos(angle) * (0.6 + random * 0.4),
          0.35 + random * 0.85,
          Math.sin(angle) * (0.6 + random * 0.4)
        ).normalize();

        speed = 1.6 + random * 1.1;
        gravity = 1.65;
        life = 3.8;
        drag = 0.32;
      } else if (style === "palm") {
        const branch = Math.floor(random * 10);
        const branchAngle = (branch / 10) * Math.PI * 2;

        direction = new THREE.Vector3(
          Math.cos(branchAngle) * 0.85 + (Math.random() - 0.5) * 0.12,
          0.65 + random * 0.45,
          Math.sin(branchAngle) * 0.85 + (Math.random() - 0.5) * 0.12
        ).normalize();

        speed = 2.1 + random * 1.1;
        gravity = 0.85;
        life = 2.7;
      } else if (style === "chrysanthemum") {
        const elevation = Math.acos(2 * random - 1);

        direction = new THREE.Vector3(
          Math.sin(elevation) * Math.cos(angle),
          Math.cos(elevation),
          Math.sin(elevation) * Math.sin(angle)
        );

        speed = 2.6 + random * 1.8;
        gravity = 0.9;
        life = 2.8;
      } else {
        // Peony: full spherical explosion.
        const elevation = Math.acos(2 * random - 1);

        direction = new THREE.Vector3(
          Math.sin(elevation) * Math.cos(angle),
          Math.cos(elevation),
          Math.sin(elevation) * Math.sin(angle)
        );

        speed = 2.4 + random * 1.5;
        gravity = 0.95;
        life = 2.3;
      }

      return {
        direction,
        speed,
        gravity,
        life,
        drag,
        delay: Math.random() * 0.09,
        length: 0.09 + random * 0.2,
        brightness: 0.7 + Math.random() * 0.3,
        flicker: Math.random() * Math.PI * 2
      };
    });
  }, [style]);

  // Two vertices for each particle: head and tail.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const positions = new Float32Array(PARTICLE_COUNT * 6);
    const colors = new Float32Array(PARTICLE_COUNT * 6);

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    // Keep the dynamic geometry inside a fixed bounding sphere.
    geo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      12
    );

    return geo;
  }, []);

  const scratchHead = useMemo(() => new THREE.Vector3(), []);
  const scratchTail = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    if (!group.current) return;

    const elapsed = clock.elapsedTime - delay;
    const t = ((elapsed % CYCLE) + CYCLE) % CYCLE;

    const launchEnd = LAUNCH_DURATION;
    const burstStart = launchEnd + 0.06;
    const explosionAge = t - burstStart;

    group.current.visible = t < 7.5;

    // ==================================
    // ROCKET LAUNCH
    // ==================================

    const launching = t < launchEnd;

    if (rocket.current) rocket.current.visible = launching;
    if (flame.current) flame.current.visible = launching;
    if (rocketGlow.current) rocketGlow.current.visible = launching;
    if (smoke.current) smoke.current.visible = launching;

    if (launching) {
      const progress = t / launchEnd;

      // Accelerating upward movement.
      const rocketY = -3.5 + 6.2 * progress * progress;

      if (rocket.current) {
        rocket.current.position.y = rocketY;
        rocket.current.rotation.z =
          Math.sin(clock.elapsedTime * 12) * 0.025;
      }

      // Animated orange and yellow flame.
      const flicker =
        0.85 + Math.sin(clock.elapsedTime * 36) * 0.12;

      if (flame.current) {
        flame.current.position.y = rocketY - 0.2;
        flame.current.scale.set(
          flicker,
          0.9 + Math.sin(clock.elapsedTime * 29) * 0.18,
          flicker
        );
      }

      if (rocketGlow.current) {
        rocketGlow.current.position.y = rocketY;
      }

      if (smoke.current) {
        smoke.current.position.y = rocketY - 0.43;
      }
    }

    // ==================================
    // EXPLOSION AND TRAILING SPARKS
    // ==================================

    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;

    let lightStrength = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = particles[i];

      const index = i * 6;
      const age = explosionAge - particle.delay;

      if (age >= 0 && age < particle.life) {
        const speed = particle.speed;
        const drag = particle.drag;

        // Air resistance slows down the sparks.
        const distance =
          speed * (1 - Math.exp(-drag * age)) / drag;

        const tailAge = Math.max(0, age - particle.length);

        const tailDistance =
          speed * (1 - Math.exp(-drag * tailAge)) / drag;

        const gravityDrop =
          0.5 * particle.gravity * age * age;

        const tailGravityDrop =
          0.5 * particle.gravity * tailAge * tailAge;

        // Leading spark position.
        scratchHead.copy(particle.direction).multiplyScalar(distance);

        scratchHead.y -= gravityDrop;

        // Trailing spark position.
        scratchTail.copy(particle.direction).multiplyScalar(tailDistance);

        scratchTail.y -= tailGravityDrop;

        // Natural subtle spark movement.
        const wave =
          Math.sin(clock.elapsedTime * 12 + particle.flicker) * 0.012;

        scratchHead.x += wave;
        scratchTail.x += wave * 0.5;

        // Different fading patterns.
        const fadeIn = Math.min(age / 0.07, 1);

        const fadeOut = Math.pow(
          Math.max(0, 1 - age / particle.life),
          style === "willow" ? 0.8 : 1.5
        );

        const twinkle =
          0.78 +
          0.22 *
            Math.sin(
              clock.elapsedTime * 22 + particle.flicker
            );

        const brightness =
          fadeIn *
          fadeOut *
          twinkle *
          particle.brightness;

        lightStrength = Math.max(lightStrength, brightness);

        // Spark head.
        positions[index] = scratchHead.x;
        positions[index + 1] = scratchHead.y;
        positions[index + 2] = scratchHead.z;

        // Spark tail.
        positions[index + 3] = scratchTail.x;
        positions[index + 4] = scratchTail.y;
        positions[index + 5] = scratchTail.z;

        // Hot white-gold spark centre mixed with firework colour.
        const hot = style === "willow" || style === "chrysanthemum"
          ? 0.65
          : 0.28;

        const r = THREE.MathUtils.lerp(fireworkColor.r, 1, hot);
        const g = THREE.MathUtils.lerp(fireworkColor.g, 0.85, hot);
        const b = THREE.MathUtils.lerp(fireworkColor.b, 0.35, hot);

        // Bright head.
        colors[index] = r * brightness;
        colors[index + 1] = g * brightness;
        colors[index + 2] = b * brightness;

        // Fading tail.
        colors[index + 3] = r * brightness * 0.08;
        colors[index + 4] = g * brightness * 0.08;
        colors[index + 5] = b * brightness * 0.08;
      } else {
        // Hide inactive particles.
        positions[index] = 0;
        positions[index + 1] = -100;
        positions[index + 2] = 0;

        positions[index + 3] = 0;
        positions[index + 4] = -100;
        positions[index + 5] = 0;

        colors.fill(0, index, index + 6);
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    // Explosion light fades along with the particles.
    if (burstLight.current) {
      burstLight.current.intensity = lightStrength * 5;
      burstLight.current.visible = explosionAge >= 0 && lightStrength > 0.01;
    }
  });

  return (
    <group ref={group} position={position}>

      {/* Rocket head */}
      <mesh ref={rocket} position={[0, -3.5, 0]}>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
        />
      </mesh>

      {/* Bright rocket flame */}
      <mesh
        ref={flame}
        position={[0, -3.7, 0]}
        rotation={[0, 0, Math.PI]}
      >
        <coneGeometry args={[0.09, 0.48, 12]} />
        <meshBasicMaterial
          color="#ff7518"
          toneMapped={false}
        />
      </mesh>

      {/* Rocket glow */}
      <pointLight
        ref={rocketGlow}
        color="#ff9b35"
        intensity={5}
        distance={4}
        decay={2}
      />

      {/* Glowing launch trail */}
      <mesh
        ref={smoke}
        position={[0, -3.9, 0]}
        rotation={[0, 0, Math.PI]}
      >
        <coneGeometry args={[0.045, 0.75, 10]} />
        <meshBasicMaterial
          color="#ffc46b"
          transparent
          opacity={0.4}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Long glowing explosion streaks */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      {/* Dynamic explosion light */}
      <pointLight
        ref={burstLight}
        color={color}
        intensity={0}
        distance={6}
        decay={2}
      />

    </group>
  );
}


// ==================================
// DIFFERENT FIREWORK TYPES
// ==================================

function FireworkVariety() {
  const shells = [
    {
      position: [-4.0, 0.7, -3.5],
      color: "#ffbd55",
      delay: 0,
      style: "peony"
    },
    {
      position: [3.7, 1.0, -4.0],
      color: "#ff5d91",
      delay: 0.8,
      style: "ring"
    },
    {
      position: [-1.8, 2.0, -5.0],
      color: "#ffd166",
      delay: 1.6,
      style: "willow"
    },
    {
      position: [1.9, 0.9, -2.8],
      color: "#c6a0ff",
      delay: 2.4,
      style: "palm"
    },
    {
      position: [-3.1, 2.5, -5.5],
      color: "#ffdf72",
      delay: 3.2,
      style: "chrysanthemum"
    },
    {
      position: [3.3, 2.6, -5.2],
      color: "#72f1c4",
      delay: 4.0,
      style: "peony"
    },
    {
      position: [0.0, 1.4, -3.8],
      color: "#ff8c42",
      delay: 4.8,
      style: "willow"
    },
    {
      position: [-0.8, 3.0, -6.0],
      color: "#f7a8ff",
      delay: 5.6,
      style: "palm"
    },
    {
      position: [4.2, 0.4, -2.5],
      color: "#9eb7ff",
      delay: 6.4,
      style: "peony"
    },
    {
      position: [-4.2, 1.4, -4.8],
      color: "#ff729d",
      delay: 7.2,
      style: "ring"
    },
    {
      position: [2.5, 1.9, -6.2],
      color: "#ffd166",
      delay: 8.0,
      style: "willow"
    },
    {
      position: [-2.4, 0.8, -2.4],
      color: "#7de2ff",
      delay: 8.8,
      style: "chrysanthemum"
    }
  ];

  return (
    <>
      {shells.map((shell, index) => (
        <MultiStageFirework
          key={index}
          position={shell.position}
          color={shell.color}
          delay={shell.delay}
          style={shell.style}
        />
      ))}
    </>
  );
}




function ScrollCamera() {
  const { camera } = useThree();
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      camera.position.y = THREE.MathUtils.lerp(1.3, -2.1, p);
      camera.position.z = THREE.MathUtils.lerp(10, 7.2, p);
      camera.rotation.x = THREE.MathUtils.lerp(-0.04, 0.08, p);
      camera.lookAt(0, THREE.MathUtils.lerp(0, -0.6, p), 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [camera]);
  return null;
}

function KambiMathappu({ position = [0, -1.1, 0] }) {
  const sparks = useRef();
  const count = 90;

  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.8,
        phase: Math.random() * 2,
      })),
    []
  );

  const positions = useMemo(
    () => new Float32Array(count * 3),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    particles.forEach((p, i) => {
      const age = (t * p.speed + p.phase) % 1;
      const radius = age * 0.65;

      positions[i * 3] = Math.cos(p.angle + t * 2) * radius;
      positions[i * 3 + 1] = 0.8 + age * 0.8 - age * age;
      positions[i * 3 + 2] = Math.sin(p.angle + t * 2) * radius;
    });

    if (sparks.current) {
      sparks.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[0, 0, -0.2]} position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.85, 12]} />
        <meshStandardMaterial
          color="#d6a05b"
          metalness={0.7}
        />
      </mesh>

      <mesh position={[0.08, 0.84, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color="#fff2a6" />
      </mesh>

      <points ref={sparks}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ffd36b"
          size={0.065}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <pointLight position={[0, 0.8, 0]} color="#ffb52e" intensity={1.8} distance={3} />
    </group>
  );
}




function GroundChakkara({
  position = [0, -1.25, 0],
  color = "#ffb52e"
}) {
  const wheel = useRef();
  const sparks = useRef();
  const count = 180;

  const angles = useMemo(
    () =>
      Array.from(
        { length: count },
        () => Math.random() * Math.PI * 2
      ),
    []
  );

  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        speed: 0.7 + Math.random() * 1.8,
        life: Math.random(),
        size: 0.5 + Math.random()
      })),
    []
  );

  const positions = useMemo(
    () => new Float32Array(count * 3),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Vertical wheel rotation
    if (wheel.current) {
      wheel.current.rotation.z = t * 8;
    }

    angles.forEach((angle, i) => {
      const p = particles[i];
      const age = (t * p.speed + p.life * 2) % 1;

      const radius = 0.48 + age * 0.75;

      // Circular sparks facing the camera
      const a = angle + t * 8;

      positions[i * 3] =
        Math.cos(a) * radius;

      positions[i * 3 + 1] =
        Math.sin(a) * radius;

      positions[i * 3 + 2] =
        0.12 + age * 0.15;
    });

    if (sparks.current) {
      sparks.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={position}>

      {/* Upright rotating cracker */}
      <group ref={wheel}>

        <mesh>
          <torusGeometry args={[0.42, 0.045, 12, 64]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Inner rotating rings */}
        <mesh>
          <torusGeometry args={[0.28, 0.018, 8, 48]} />
          <meshBasicMaterial
            color="#fff1a6"
            toneMapped={false}
          />
        </mesh>

        {/* Centre */}
        <mesh>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshBasicMaterial
            color="#ffffff"
            toneMapped={false}
          />
        </mesh>

        {/* Radial spokes */}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            rotation={[0, 0, (i * Math.PI) / 6]}
          >
            <boxGeometry args={[0.82, 0.025, 0.035]} />
            <meshBasicMaterial
              color="#ffd36b"
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Circular particle trails */}
      <points ref={sparks}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>

        <pointsMaterial
          color={color}
          size={0.075}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>

      {/* Golden ground glow */}
      <pointLight
        position={[0, -0.55, 0.3]}
        color={color}
        intensity={3}
        distance={3}
      />

    </group>
  );
}






function FlowerPot({ position = [0, -1.3, 0], scale = 1 }) {
  const particles = useRef();
  const count = 900;

  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2.5,
        height: 2.5 + Math.random() * 3.5,
        spread: 0.5 + Math.random() * 1.3,
        phase: Math.random() * 1.5,
        size: Math.random(),
      })),
    []
  );

  const positions = useMemo(
    () => new Float32Array(count * 3),
    []
  );

  const colors = useMemo(
    () => new Float32Array(count * 3),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    data.forEach((p, i) => {
      const age = (t * p.speed * 0.55 + p.phase) % 1.5;
      const progress = age / 1.5;

      // Wide-bottom, narrow-top fountain cone
      const radius = progress * p.spread;

      const flicker =
        Math.sin(t * 25 + p.phase * 15) * 0.025;

      positions[i * 3] =
        Math.cos(p.angle) * radius;

      positions[i * 3 + 1] =
        0.12 +
        progress * p.height -
        progress * progress * 0.45;

      positions[i * 3 + 2] =
        Math.sin(p.angle) * radius;

      // Hot white-gold sparks
      const brightness =
        0.7 + Math.sin(t * 30 + p.phase * 20) * 0.3;

      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.75;
      colors[i * 3 + 2] = brightness * 0.3;
    });

    if (particles.current) {
      const geometry = particles.current.geometry;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <group position={position} scale={scale}>

      {/* Large cone-shaped golden spark fountain */}
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />

          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>

        <pointsMaterial
          size={0.075}
          vertexColors
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>

      {/* Bright ignition point */}
      <pointLight
        position={[0, 0.5, 0]}
        color="#ffb52e"
        intensity={5}
        distance={6}
      />

    </group>
  );
}


function ScheduledEffect({
  startAt,
  duration,
  children,
  cycle = 30
}) {
  const group = useRef();

  useFrame(({ clock }) => {
    if (!group.current) return;

    const phase =
      ((clock.elapsedTime - startAt) % cycle + cycle) % cycle;

    group.current.visible = phase < duration;
  });

  return (
    <group ref={group} visible={false}>
      {children}
    </group>
  );
}




function SaramVedi({ position = [0, 0, 0], delay = 0 }) {
  const group = useRef();
  const crackers = useRef([]);
  const flashes = useRef([]);
  const smoke = useRef([]);
  const sparks = useRef([]);

  const COUNT = 18;
const BURST_INTERVAL = 0.32;
const SEQUENCE_DURATION = 7.5;
const CYCLE = SEQUENCE_DURATION;
  const particleData = useMemo(
    () =>
      Array.from({ length: COUNT }, () =>
        Array.from({ length: 12 }, () => ({
          angle: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5,
          lift: Math.random() * 0.8,
        }))
      ),
    []
  );

  useFrame(({ clock }) => {
    const t =
  ((clock.elapsedTime - delay) % CYCLE + CYCLE) % CYCLE;

if (group.current) {
  group.current.visible = t < SEQUENCE_DURATION;
}

    // Show the string before and during ignition.
    if (group.current) {
      group.current.visible = t < 8.5;
    }

    for (let i = 0; i < COUNT; i++) {
      const cracker = crackers.current[i];
      const flash = flashes.current[i];
      const smokeCloud = smoke.current[i];
      const sparkGroup = sparks.current[i];

      if (!cracker) continue;

      // Ignite from bottom to top.
      const ignitionTime = 0.8 + (COUNT - 1 - i) * BURST_INTERVAL;
      const age = t - ignitionTime;
      const exploding = age >= 0 && age < 0.8;

      cracker.visible = t < ignitionTime;

      if (flash) {
        flash.visible = exploding && age < 0.13;
        flash.scale.setScalar(
          exploding ? Math.max(0.1, 1 - age * 5) : 0
        );
      }

      if (smokeCloud) {
        smokeCloud.visible = exploding && age > 0.08 && age < 1.1;
        const smokeAge = Math.max(0, age - 0.08);
        smokeCloud.scale.setScalar(0.3 + smokeAge * 1.5);
        smokeCloud.material.opacity =
          Math.max(0, 0.25 * (1 - smokeAge / 1.1));
      }

      if (sparkGroup) {
        sparkGroup.visible = exploding && age < 0.65;

        sparkGroup.children.forEach((spark, j) => {
          const p = particleData[i][j];
          const sparkAge = Math.max(0, age);

          const radius = p.speed * sparkAge;
          spark.position.set(
            Math.cos(p.angle) * radius,
            Math.sin(p.angle) * radius + p.lift * sparkAge,
            Math.sin(p.angle * 2) * radius * 0.3
          );

          spark.material.opacity = Math.max(
            0,
            1 - sparkAge / 0.65
          );
        });
      }
    }
  });

  return (
    <group ref={group} position={position}>
      {/* Hanging string */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 3.2, 8]} />
        <meshStandardMaterial color="#49301e" />
      </mesh>

      {Array.from({ length: COUNT }, (_, i) => {
        const y = -0.45 + i * 0.17;

        return (
          <group key={i}>
            {/* Red individual cracker */}
            <mesh
              ref={(el) => (crackers.current[i] = el)}
              position={[0, y, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.055, 0.055, 0.15, 12]} />
              <meshStandardMaterial
                color="#a51d20"
                roughness={0.7}
              />
            </mesh>

            {/* Explosion flash */}
            <mesh
              ref={(el) => (flashes.current[i] = el)}
              position={[0, y, 0]}
              visible={false}
            >
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshBasicMaterial
                color="#fff2a0"
                transparent
                toneMapped={false}
              />
            </mesh>

            {/* Smoke */}
            <mesh
              ref={(el) => (smoke.current[i] = el)}
              position={[0, y, 0]}
              visible={false}
            >
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshBasicMaterial
                color="#aaa0a0"
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>

            {/* Individual outward sparks */}
            <group
              ref={(el) => (sparks.current[i] = el)}
              position={[0, y, 0]}
              visible={false}
            >
              {Array.from({ length: 12 }, (_, j) => (
                <mesh key={j}>
                  <sphereGeometry args={[0.025, 6, 6]} />
                  <meshBasicMaterial
                    color={j % 3 === 0 ? "#fff4a5" : "#ff9e27"}
                    transparent
                    opacity={1}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}






function FireworkLayout() {
  const { viewport } = useThree();

  const sideX = Math.min(5.0, viewport.width * 0.43);
  const topY = viewport.height * 0.20;
  const middleY = 0;
  const bottomY = -viewport.height * 0.30;

  return (
    <>
      {/* TOP CORNERS - KAMBI MATHAPPU */}
      <KambiMathappu
        position={[-sideX, topY, 1.5]}
      />
      <KambiMathappu
        position={[sideX, topY, 1.5]}
      />

      {/* MIDDLE SIDES - GROUND CHAKKARA */}
      <GroundChakkara
        position={[-sideX, middleY, 1.5]}
      />
      <GroundChakkara
        position={[sideX, middleY, 1.5]}
        color="#ff6b9d"
      />

      {/* Flower pots moved slightly inward */}
<FlowerPot
  position={[-sideX * 0.78, bottomY, 1.5]}
/>
<FlowerPot
  position={[sideX * 0.78, bottomY, 1.5]}
/>
<SaramVedi
  position={[-sideX * 0.65, bottomY - 1.1, 1.8]}
 
/>

<SaramVedi
  position={[sideX * 0.65, bottomY - 1.1, 1.8]}
  
/>
    </>
  );
}




function FestiveScene() {
  return (
    <Canvas camera={{ position: [0, 1.8, 11], fov: 45 }} dpr={[1, 1.7]}>
      <color attach="background" args={["#100719"]} />
      <fog attach="fog" args={["#100719", 8, 23]} />

      <ambientLight intensity={0.8} />

      <pointLight
        position={[0, 3, 4]}
        color="#ffb64d"
        intensity={2.4}
      />

      <Stars
        radius={45}
        depth={35}
        count={1100}
        factor={3}
        fade
        speed={0.5}
      />

      <Sparkles
        count={100}
        scale={[13, 9, 5]}
        size={2.4}
        speed={0.35}
        color="#ffc86b"
      />

      <Diyas />

      {/* All ground fireworks animate independently */}
      <FireworkLayout />

      {/* Sky fireworks */}
      <FireworkVariety />

      <ScrollCamera />
    </Canvas>
  );
}






const quotes = [
  ["May your home glow with happiness", "and your heart shine with hope."],
  ["Let every diya remind you", "that light always finds a way."],
  ["May this festival bring new beginnings,", "beautiful memories and endless joy."]
];

function App() {
  const [muted, setMuted] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const crackerAudioRef = useRef(null);

  // Play or stop custom firecracker sound
  const toggleSound = async () => {
    if (!crackerAudioRef.current) {
      const audio = new Audio("/firecracker.mp3");
      audio.loop = true;
      audio.volume = 0.7;
      crackerAudioRef.current = audio;
    }

    const audio = crackerAudioRef.current;

    if (muted) {
      try {
        await audio.play();
        setMuted(false);
      } catch (error) {
        console.error("Unable to play cracker sound:", error);
      }
    } else {
      audio.pause();
      audio.currentTime = 0;
      setMuted(true);
    }
  };

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;

      setProgress(max > 0 ? window.scrollY / max : 0);
    };

    window.addEventListener("scroll", onScroll, {
      passive: true
    });

    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Automatically rotate wishes
  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex((v) => (v + 1) % quotes.length);
    }, 4800);

    return () => clearInterval(id);
  }, []);

  // Audio cleanup
  useEffect(() => {
    return () => {
      if (crackerAudioRef.current) {
        crackerAudioRef.current.pause();
        crackerAudioRef.current = null;
      }
    };
  }, []);

  return (
    <main>
      <div className="scene">
        <Suspense fallback={null}>
          <FestiveScene />
        </Suspense>
      </div>

      <div className="ambient-glow" aria-hidden="true" />

      <div className="light-string" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} style={{ "--i": i }} />
        ))}
      </div>

      <div className="scroll-progress">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <header className="topbar">
        <a className="brand" href="#home">
          ✦ <span>Deepavali</span>
        </a>

        <button
          className="sound-button"
          onClick={toggleSound}
          aria-label="Toggle sound"
        >
          {muted ? "♫ Sound off" : "♫ Sound on"}
        </button>
      </header>

      <section className="hero section" id="home">
        <p className="eyebrow reveal">
          A FESTIVAL OF LIGHT · LOVE · NEW BEGINNINGS
        </p>

        <h1 className="hero-title">
          A little more<br />
          <em>light</em> in the world.
        </h1>

        <p className="hero-copy">
          May the glow of every diya brighten your path
          <br className="desktop-only" />
          and the joy of every celebration stay with you.
        </p>

        <a className="scroll-cue" href="#celebrate">
          <span /> Scroll to celebrate
        </a>
      </section>

      <section className="celebrate section" id="celebrate">
        <div className="section-kicker">
          01 / THE CELEBRATION
        </div>

        <div className="celebrate-copy">
          <p className="eyebrow">LIGHT UP THE NIGHT</p>

          <h2>
            Moments that<br />
            <em>sparkle.</em>
          </h2>

          <p>
            From the first diya at the doorstep to colourful
            fireworks painting the sky — may every little
            moment become a memory worth keeping.
          </p>
        </div>

        <div className="floating-badge">
          ✦<br />
          <small>JOY<br />& LIGHT</small>
        </div>
      </section>

      <section className="quote-section section">
        <div className="section-kicker">
          02 / A WISH FOR YOU
        </div>

        <div className="quote-card" key={quoteIndex}>
          <span className="quote-mark">“</span>

          <p>
            {quotes[quoteIndex][0]}<br />
            {quotes[quoteIndex][1]}
          </p>

          <span className="quote-dots">
            {quotes.map((_, i) => (
              <button
                key={i}
                className={i === quoteIndex ? "active" : ""}
                onClick={() => setQuoteIndex(i)}
                aria-label={`Show quote ${i + 1}`}
              />
            ))}
          </span>
        </div>
      </section>

      <section className="finale section" id="wishes">
        <div className="section-kicker">
          03 / FROM OUR HEARTS TO YOURS
        </div>

        <div className="finale-content">
          <div className="mandala">✺</div>

          <p className="eyebrow">LET THERE BE LIGHT</p>

          <h2>
            Happy <em>Diwali!</em>
          </h2>

          <p className="finale-copy">
            Wishing you and your loved ones a Diwali filled
            with peace, prosperity, laughter and countless
            reasons to smile.
          </p>

          <div className="wish-separator">
            ✦ ✧ ✦
          </div>

          <p className="signature">
            With light & love
          </p>

          <a className="back-top" href="#home">
            Back to the beginning ↑
          </a>
        </div>
      </section>

      <footer>
        MADE WITH ✦ FOR THE FESTIVAL OF LIGHTS
      </footer>
    </main>
  );
}

export default App;
