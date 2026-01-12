"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Line, OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { JobStatus, SystemMetrics } from "@/lib/types";

interface PipelineVizProps {
  status: JobStatus;
  metrics?: SystemMetrics | null;
}

// Node positions - 3D architectural layout
const NODE_POSITIONS = {
  // Top tier - Storage
  s3Input: [-3.5, 1.2, -1.5] as [number, number, number],
  s3Output: [3.5, 1.2, -1.5] as [number, number, number],
  // Middle tier - API Services
  restApi: [-2, 0, 0] as [number, number, number],
  graphql: [2, 0, 0] as [number, number, number],
  // Bottom tier - Data/Processing
  postgres: [-2, -1.2, 1.5] as [number, number, number],
  redis: [0, -1.2, 1.5] as [number, number, number],
  // Worker cluster
  worker1: [2, -1.2, 1] as [number, number, number],
  worker2: [2.8, -1.2, 1.8] as [number, number, number],
  worker3: [3.6, -1.2, 1] as [number, number, number],
};

// Colors
const COLORS = {
  // States
  idle: "#4a5568",
  active: "#3b82f6",
  complete: "#10b981",
  failed: "#ef4444",
  // Component types
  storage: "#f59e0b",    // Amber
  api: "#3b82f6",        // Blue
  database: "#6366f1",   // Indigo
  queue: "#ec4899",      // Pink
  worker: "#8b5cf6",     // Purple
  workerActive: "#a855f7", // Brighter purple
  // Effects
  glow: "#60a5fa",
  particle: "#93c5fd",
  connection: "#475569",
  connectionActive: "#60a5fa",
};

// ============ Storage Node (S3/MinIO - Bucket Shape) ============
interface StorageNodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function StorageNode({ position, label, isActive, isComplete }: StorageNodeProps) {
  const groupRef = useRef<THREE.Group>(null);

  const color = isComplete ? COLORS.complete : isActive ? COLORS.storage : COLORS.idle;

  useFrame((state) => {
    if (groupRef.current && isActive && !isComplete) {
      groupRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
    } else if (groupRef.current) {
      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Bucket body */}
        <mesh>
          <cylinderGeometry args={[0.22, 0.28, 0.35, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={isActive ? COLORS.glow : color}
            emissiveIntensity={isActive ? 0.4 : 0.1}
          />
        </mesh>
        {/* Bucket rim */}
        <mesh position={[0, 0.18, 0]}>
          <torusGeometry args={[0.24, 0.03, 8, 24]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      <Text position={[0, -0.5, 0]} fontSize={0.18} color="#a1a1aa" anchorX="center" anchorY="top">
        {label}
      </Text>
    </group>
  );
}

// ============ API Node (REST/GraphQL - Box Shape) ============
interface ApiNodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function ApiNode({ position, label, isActive, isComplete }: ApiNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = isComplete ? COLORS.complete : isActive ? COLORS.api : COLORS.idle;

  useFrame((state) => {
    if (meshRef.current && isActive && !isComplete) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? COLORS.glow : color}
          emissiveIntensity={isActive ? 0.4 : 0.1}
        />
      </mesh>
      <Text position={[0, -0.5, 0]} fontSize={0.18} color="#a1a1aa" anchorX="center" anchorY="top">
        {label}
      </Text>
    </group>
  );
}

// ============ Database Node (PostgreSQL - Cylinder Shape) ============
interface DatabaseNodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function DatabaseNode({ position, label, isActive, isComplete }: DatabaseNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = isComplete ? COLORS.complete : isActive ? COLORS.database : COLORS.idle;

  useFrame((state) => {
    if (meshRef.current && isActive && !isComplete) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.25, 0.25, 0.4, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? COLORS.glow : color}
          emissiveIntensity={isActive ? 0.4 : 0.1}
        />
      </mesh>
      <Text position={[0, -0.5, 0]} fontSize={0.18} color="#a1a1aa" anchorX="center" anchorY="top">
        {label}
      </Text>
    </group>
  );
}

// ============ Queue Node (Redis - Torus/Ring Shape) ============
interface QueueNodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isComplete: boolean;
  queueDepth?: number;
}

function QueueNode({ position, label, isActive, isComplete, queueDepth = 0 }: QueueNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = isComplete ? COLORS.complete : isActive ? COLORS.queue : COLORS.idle;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.5;
      if (isActive && !isComplete) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? COLORS.glow : color}
          emissiveIntensity={isActive ? 0.4 : 0.1}
        />
      </mesh>
      <Text position={[0, -0.5, 0]} fontSize={0.18} color="#a1a1aa" anchorX="center" anchorY="top">
        {label}
      </Text>
      {/* Queue depth badge */}
      {queueDepth > 0 && (
        <Html position={[0.4, 0.3, 0]} center>
          <div className="rounded bg-pink-500/90 px-1.5 py-0.5 text-xs font-bold text-white">
            {queueDepth}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============ Worker Node (Sphere) ============
interface WorkerNodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isProcessing: boolean;
}

function WorkerNode({ position, label, isActive, isProcessing }: WorkerNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = isProcessing ? COLORS.workerActive : isActive ? COLORS.worker : COLORS.idle;

  useFrame((state) => {
    if (meshRef.current && isProcessing) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.15);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={isProcessing ? COLORS.workerActive : color}
          emissiveIntensity={isProcessing ? 0.6 : 0.1}
        />
      </mesh>
      <Text position={[0, -0.4, 0]} fontSize={0.14} color="#a1a1aa" anchorX="center" anchorY="top">
        {label}
      </Text>
    </group>
  );
}

// ============ Connection Line ============
interface ConnectionProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
  isComplete: boolean;
  curved?: boolean;
}

function Connection({ start, end, isActive, isComplete, curved = false }: ConnectionProps) {
  const color = isComplete ? COLORS.complete : isActive ? COLORS.connectionActive : COLORS.connection;

  const points = useMemo(() => {
    if (curved) {
      const mid: [number, number, number] = [
        (start[0] + end[0]) / 2,
        Math.max(start[1], end[1]) + 0.5,
        (start[2] + end[2]) / 2,
      ];
      return [start, mid, end];
    }
    return [start, end];
  }, [start, end, curved]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isActive ? 2 : 1}
      dashed={!isComplete && !isActive}
      dashScale={8}
    />
  );
}

// ============ Flow Particles ============
interface FlowParticlesProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
  color?: string;
}

function FlowParticles({ start, end, isActive, color = COLORS.particle }: FlowParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 6;

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

    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // Calculate midpoint for arc
    const midY = Math.max(start[1], end[1]) + 0.3;

    for (let i = 0; i < particleCount; i++) {
      const t = ((i / particleCount) + time * 0.4) % 1;
      pos[i * 3] = start[0] + (end[0] - start[0]) * t;
      // Arc motion
      const arcHeight = Math.sin(t * Math.PI) * 0.2;
      pos[i * 3 + 1] = start[1] + (end[1] - start[1]) * t + arcHeight;
      pos[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!isActive) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={color} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

// ============ Main Pipeline Scene ============
interface PipelineSceneProps {
  status: JobStatus;
  metrics?: SystemMetrics | null;
}

function PipelineScene({ status, metrics }: PipelineSceneProps) {
  // Determine stage based on job status
  const isPending = status === "pending";
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  // Stage-based active states
  const s3InputActive = isPending || isProcessing;
  const restApiActive = isPending;
  const postgresActive = isPending || isProcessing;
  const redisActive = isPending || isProcessing;
  const workersActive = isProcessing;
  const s3OutputActive = isProcessing || isCompleted;
  const graphqlActive = isProcessing || isCompleted;

  // Simulate which worker is processing (based on active jobs)
  const activeWorkerIndex = isProcessing ? 0 : -1;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} />
      <pointLight position={[0, -3, -5]} intensity={0.3} />

      {/* Storage Nodes */}
      <StorageNode
        position={NODE_POSITIONS.s3Input}
        label="S3 Input"
        isActive={s3InputActive}
        isComplete={isCompleted}
      />
      <StorageNode
        position={NODE_POSITIONS.s3Output}
        label="S3 Output"
        isActive={s3OutputActive}
        isComplete={isCompleted}
      />

      {/* API Nodes */}
      <ApiNode
        position={NODE_POSITIONS.restApi}
        label="REST API"
        isActive={restApiActive}
        isComplete={!isPending}
      />
      <ApiNode
        position={NODE_POSITIONS.graphql}
        label="GraphQL"
        isActive={graphqlActive}
        isComplete={isCompleted}
      />

      {/* Database Node */}
      <DatabaseNode
        position={NODE_POSITIONS.postgres}
        label="PostgreSQL"
        isActive={postgresActive}
        isComplete={isCompleted}
      />

      {/* Queue Node */}
      <QueueNode
        position={NODE_POSITIONS.redis}
        label="Redis"
        isActive={redisActive}
        isComplete={isCompleted}
        queueDepth={metrics?.queueDepth}
      />

      {/* Worker Nodes */}
      <WorkerNode
        position={NODE_POSITIONS.worker1}
        label="W1"
        isActive={workersActive}
        isProcessing={activeWorkerIndex === 0}
      />
      <WorkerNode
        position={NODE_POSITIONS.worker2}
        label="W2"
        isActive={workersActive}
        isProcessing={activeWorkerIndex === 1}
      />
      <WorkerNode
        position={NODE_POSITIONS.worker3}
        label="W3"
        isActive={workersActive}
        isProcessing={activeWorkerIndex === 2}
      />

      {/* Connections - Upload Flow */}
      <Connection
        start={NODE_POSITIONS.s3Input}
        end={NODE_POSITIONS.restApi}
        isActive={restApiActive}
        isComplete={!isPending}
        curved
      />
      <Connection
        start={NODE_POSITIONS.restApi}
        end={NODE_POSITIONS.postgres}
        isActive={postgresActive}
        isComplete={!isPending}
      />
      <Connection
        start={NODE_POSITIONS.postgres}
        end={NODE_POSITIONS.redis}
        isActive={redisActive}
        isComplete={isCompleted}
      />

      {/* Connections - Processing Flow */}
      <Connection
        start={NODE_POSITIONS.redis}
        end={NODE_POSITIONS.worker1}
        isActive={workersActive}
        isComplete={isCompleted}
      />
      <Connection
        start={NODE_POSITIONS.worker1}
        end={NODE_POSITIONS.s3Input}
        isActive={workersActive && activeWorkerIndex === 0}
        isComplete={isCompleted}
        curved
      />
      <Connection
        start={NODE_POSITIONS.worker1}
        end={NODE_POSITIONS.s3Output}
        isActive={workersActive && activeWorkerIndex === 0}
        isComplete={isCompleted}
        curved
      />

      {/* Connections - Status Flow */}
      <Connection
        start={NODE_POSITIONS.worker1}
        end={NODE_POSITIONS.postgres}
        isActive={workersActive}
        isComplete={isCompleted}
      />
      <Connection
        start={NODE_POSITIONS.graphql}
        end={NODE_POSITIONS.postgres}
        isActive={graphqlActive}
        isComplete={isCompleted}
      />

      {/* Flow Particles - active during processing */}
      <FlowParticles
        start={NODE_POSITIONS.redis}
        end={NODE_POSITIONS.worker1}
        isActive={workersActive}
        color={COLORS.queue}
      />
      <FlowParticles
        start={NODE_POSITIONS.worker1}
        end={NODE_POSITIONS.s3Output}
        isActive={workersActive && activeWorkerIndex === 0}
        color={COLORS.storage}
      />
      <FlowParticles
        start={NODE_POSITIONS.s3Input}
        end={NODE_POSITIONS.restApi}
        isActive={isPending}
        color={COLORS.storage}
      />

      {/* User-controlled camera */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        minDistance={5}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={false}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  );
}

// ============ Main Component ============
export default function PipelineViz({ status, metrics }: PipelineVizProps) {
  return (
    <div className="relative h-64 w-full rounded-lg bg-[var(--bg-primary)]">
      <Canvas camera={{ position: [0, 3, 8], fov: 45 }} style={{ background: "transparent" }}>
        <PipelineScene status={status} metrics={metrics} />
      </Canvas>
      {/* Metrics overlay */}
      {metrics && (
        <div className="absolute bottom-2 left-2 flex gap-2 text-xs">
          <span className="rounded bg-gray-800/80 px-2 py-1 text-gray-300">
            Queue: <span className="font-bold text-pink-400">{metrics.queueDepth}</span>
          </span>
          <span className="rounded bg-gray-800/80 px-2 py-1 text-gray-300">
            Processing: <span className="font-bold text-purple-400">{metrics.processingJobs}</span>
          </span>
        </div>
      )}
    </div>
  );
}
