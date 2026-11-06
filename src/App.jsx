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

function Firework({ position, color, delay = 0 }) {
  const group = useRef();
  const points = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 90; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.45 + Math.random() * 1.6;
      arr.push({
        direction: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        ),
        speed,
        size: 0.025 + Math.random() * 0.035
      });
    }
    return arr;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime + delay) % 4.2;
    const progress = clamp((t - 0.6) / 2.8, 0, 1);
    if (!group.current) return;
    group.current.visible = t > 0.6;
    points.forEach((p, i) => {
      const distance = p.speed * progress * 1.55;
      dummy.position.copy(p.direction).multiplyScalar(distance);
      dummy.position.y -= progress * progress * 0.65;
      dummy.scale.setScalar(p.size * (1 - progress * 0.72));
      dummy.updateMatrix();
      group.current.children[i].matrix.copy(dummy.matrix);
    });
    group.current.children.forEach((child) => { child.visible = progress < 1; });
  });
  return (
    <group ref={group} position={position}>
      {points.map((p, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

function Rocket({ x, color, delay }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime + delay) % 5;
    if (!ref.current) return;
    ref.current.position.y = -2.7 + (t / 5) * 4.9;
    ref.current.position.x = x + Math.sin(t * 1.2) * 0.12;
    ref.current.visible = t < 3.5;
  });
  return (
    <group ref={ref} position={[x, -2.7, -1]}>
      <mesh>
        <coneGeometry args={[0.075, 0.28, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={1.2} distance={1.5} />
    </group>
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

function FestiveScene() {
  return (
    <Canvas camera={{ position: [0, 1.3, 10], fov: 48 }} dpr={[1, 1.7]}>
      <color attach="background" args={["#100719"]} />
      <fog attach="fog" args={["#100719", 8, 23]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 3, 4]} color="#ffb64d" intensity={2.4} />
      <Stars radius={45} depth={35} count={1100} factor={3} fade speed={0.5} />
      <Sparkles count={100} scale={[13, 9, 5]} size={2.4} speed={0.35} color="#ffc86b" />
      <Diyas />
      <Firework position={[-3.1, 2.1, -2]} color="#ffbd55" delay={0} />
      <Firework position={[3.1, 2.8, -3]} color="#ff5d91" delay={1.4} />
      <Firework position={[0, 3.4, -4]} color="#8be9ff" delay={2.6} />
      <Rocket x={-3.3} color="#ffbd55" delay={0} />
      <Rocket x={2.8} color="#ff5d91" delay={2.1} />
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

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setQuoteIndex((v) => (v + 1) % quotes.length), 4800);
    return () => clearInterval(id);
  }, []);

  return (
    <main>
      <div className="scene"><Suspense fallback={null}><FestiveScene /></Suspense></div>
      <div className="ambient-glow" aria-hidden="true" />
      <div className="light-string" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => <span key={i} style={{ "--i": i }} />)}
      </div>
      <div className="scroll-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
      <header className="topbar">
        <a className="brand" href="#home">✦ <span>Deepavali</span></a>
        <button className="sound-button" onClick={() => setMuted((v) => !v)} aria-label="Toggle sound">
          {muted ? "♫ Sound off" : "♫ Sound on"}
        </button>
      </header>

      <section className="hero section" id="home">
        <p className="eyebrow reveal">A FESTIVAL OF LIGHT · LOVE · NEW BEGINNINGS</p>
        <h1 className="hero-title">A little more<br /><em>light</em> in the world.</h1>
        <p className="hero-copy">May the glow of every diya brighten your path<br className="desktop-only" /> and the joy of every celebration stay with you.</p>
        <a className="scroll-cue" href="#celebrate"><span /> Scroll to celebrate</a>
      </section>

      <section className="celebrate section" id="celebrate">
        <div className="section-kicker">01 / THE CELEBRATION</div>
        <div className="celebrate-copy">
          <p className="eyebrow">LIGHT UP THE NIGHT</p>
          <h2>Moments that<br /><em>sparkle.</em></h2>
          <p>From the first diya at the doorstep to colourful fireworks painting the sky — may every little moment become a memory worth keeping.</p>
        </div>
        <div className="floating-badge">✦<br /><small>JOY<br />& LIGHT</small></div>
      </section>

      <section className="quote-section section">
        <div className="section-kicker">02 / A WISH FOR YOU</div>
        <div className="quote-card" key={quoteIndex}>
          <span className="quote-mark">“</span>
          <p>{quotes[quoteIndex][0]}<br />{quotes[quoteIndex][1]}</p>
          <span className="quote-dots">{quotes.map((_, i) => <button key={i} className={i === quoteIndex ? "active" : ""} onClick={() => setQuoteIndex(i)} aria-label={`Show quote ${i + 1}`} />)}</span>
        </div>
      </section>

      <section className="finale section" id="wishes">
        <div className="section-kicker">03 / FROM OUR HEARTS TO YOURS</div>
        <div className="finale-content">
          <div className="mandala">✺</div>
          <p className="eyebrow">LET THERE BE LIGHT</p>
          <h2>Happy <em>Diwali!</em></h2>
          <p className="finale-copy">Wishing you and your loved ones a Diwali filled with peace, prosperity, laughter and countless reasons to smile.</p>
          <div className="wish-separator">✦ ✧ ✦</div>
          <p className="signature">With light & love</p>
          <a className="back-top" href="#home">Back to the beginning ↑</a>
        </div>
      </section>
      <footer>MADE WITH ✦ FOR THE FESTIVAL OF LIGHTS</footer>
    </main>
  );
}

export default App;
