"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float, Html } from "@react-three/drei";
import * as THREE from "three";

// Placeholder component for ESP32
function PlaceholderESP32({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.2, 2.5]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.7} metalness={0.2} />
        <Html position={[0, 0.2, 0]} center className="pointer-events-none opacity-50">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            ESP32 (Cerebro)
          </div>
        </Html>
      </mesh>
    </Float>
  );
}

// Placeholder component for OLED Display
function PlaceholderOLED({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={2.5} rotationIntensity={0.4} floatIntensity={1.5}>
      <mesh ref={meshRef} position={position} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.8} />
        <Html position={[0, 0.15, 0]} center className="pointer-events-none opacity-50">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            OLED (Ojos)
          </div>
        </Html>
      </mesh>
    </Float>
  );
}

// Placeholder component for Micro Servo
function PlaceholderServo({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.6} metalness={0.1} />
        <Html position={[0, 0.5, 0]} center className="pointer-events-none opacity-50">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            Servo (Movimiento)
          </div>
        </Html>
      </mesh>
    </Float>
  );
}

export default function HardwareScene() {
  return (
    <div className="w-full h-[400px] md:h-[500px] relative mt-12 cursor-grab active:cursor-grabbing">
      <Canvas shadows camera={{ position: [0, 3, 6], fov: 45 }}>
        {/* Iluminación básica */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={1024}
        />
        <spotLight
          position={[-5, 5, 0]}
          intensity={1}
          penumbra={1}
          angle={0.5}
        />

        {/* Placeholder Models */}
        <PlaceholderESP32 position={[0, 0, 0]} />
        <PlaceholderOLED position={[-2, 1, 0]} />
        <PlaceholderServo position={[2, -0.5, 1]} />
        <PlaceholderServo position={[2, 0.5, -1]} />

        {/* Controles y Entorno */}
        <OrbitControls 
          enableZoom={false} 
          autoRotate 
          autoRotateSpeed={0.5} 
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  );
}
