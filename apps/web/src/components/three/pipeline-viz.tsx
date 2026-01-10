"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { JobStatus } from "@/lib/types";

interface PipelineVizProps {
  status: JobStatus;
}

// Node positions
const NODE_POSITIONS = {
  input: [-2, 0, 0] as [number, number, number],
  process: [0, 0, 0] as [number, number, number],
  output: [2, 0, 0] as [number, number, number],
};

// Colors
const COLORS = {
  inactive: "#71717a",
  active: "#3b82f6",
  complete: "#10b981",
  failed: "#ef4444",
  glow: "#60a5fa",
};

interface NodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isComplete: boolean;
  isFailed: boolean;
}

function PipelineNode({ position, label, isActive, isComplete, isFailed }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine color
  const color = isFailed
    ? COLORS.failed
    : isComplete
    ? COLORS.complete
    : isActive
    ? COLORS.active
    : COLORS.inactive;

  // Animate active nodes
  useFrame((state) => {
    if (meshRef.current && isActive && !isComplete) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position}>
      {/* Main sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive && !isComplete ? COLORS.glow : color}
          emissiveIntensity={isActive && !isComplete ? 0.5 : 0.1}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.2}
        color="#a1a1aa"
        anchorX="center"
        anchorY="top"
      >
        {label}
      </Text>
    </group>
  );
}

interface ConnectionProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
  isComplete: boolean;
}

function Connection({ start, end, isActive, isComplete }: ConnectionProps) {
  const color = isComplete ? COLORS.complete : isActive ? COLORS.active : COLORS.inactive;

  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={2}
      dashed={!isComplete && !isActive}
      dashScale={10}
    />
  );
}

interface ParticlesProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
}

function FlowParticles({ start, end, isActive }: ParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 5;
  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      arr[i * 3] = start[0] + (end[0] - start[0]) * t;
      arr[i * 3 + 1] = start[1] + (end[1] - start[1]) * t;
      arr[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
    }
    return arr;
  }, [start, end]);

  useFrame((state) => {
    if (!particlesRef.current || !isActive) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      const t = ((i / particleCount) + time * 0.3) % 1;
      positions[i * 3] = start[0] + (end[0] - start[0]) * t;
      positions[i * 3 + 1] = start[1] + (end[1] - start[1]) * t + Math.sin(t * Math.PI) * 0.1;
      positions[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!isActive) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={COLORS.glow}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function PipelineScene({ status }: { status: JobStatus }) {
  // Determine node states based on job status
  const inputComplete = status !== "pending";
  const inputActive = status === "pending";
  const processActive = status === "processing";
  const processComplete = status === "completed";
  const outputActive = status === "processing";
  const outputComplete = status === "completed";
  const isFailed = status === "failed";

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} />

      {/* Nodes */}
      <PipelineNode
        position={NODE_POSITIONS.input}
        label="Input"
        isActive={inputActive}
        isComplete={inputComplete}
        isFailed={isFailed}
      />
      <PipelineNode
        position={NODE_POSITIONS.process}
        label="FFmpeg"
        isActive={processActive}
        isComplete={processComplete}
        isFailed={isFailed}
      />
      <PipelineNode
        position={NODE_POSITIONS.output}
        label="Output"
        isActive={outputActive}
        isComplete={outputComplete}
        isFailed={isFailed}
      />

      {/* Connections */}
      <Connection
        start={NODE_POSITIONS.input}
        end={NODE_POSITIONS.process}
        isActive={processActive}
        isComplete={processComplete || outputComplete}
      />
      <Connection
        start={NODE_POSITIONS.process}
        end={NODE_POSITIONS.output}
        isActive={outputActive}
        isComplete={outputComplete}
      />

      {/* Flow particles */}
      <FlowParticles
        start={NODE_POSITIONS.input}
        end={NODE_POSITIONS.process}
        isActive={processActive}
      />
      <FlowParticles
        start={NODE_POSITIONS.process}
        end={NODE_POSITIONS.output}
        isActive={outputActive}
      />

      {/* Camera controls - limited */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export default function PipelineViz({ status }: PipelineVizProps) {
  return (
    <div className="h-48 w-full rounded-lg bg-[var(--bg-primary)]">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <PipelineScene status={status} />
      </Canvas>
    </div>
  );
}
