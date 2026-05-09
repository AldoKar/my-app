"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

// Model component for ESP32
function ModelESP32({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/models/ESP32/ESP32Wroom.glb");

  // Pintar el modelo gris de verde oscuro
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: "gray", // Verde PCB más claro y visible
          roughness: 0.5,
          metalness: 0.3,
        });
      }
    });
  }, [scene]);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position}>
        <Center>
          <primitive object={scene} scale={20} />
        </Center>
        <Html position={[0, 1, 0]} center className="pointer-events-none opacity-50">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            ESP32 (Cerebro)
          </div>
        </Html>
      </group>
    </Float>
  );
}

useGLTF.preload("/models/ESP32/ESP32Wroom.glb");

// Model component for OLED Display
function ModelOLED({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/models/scene.gltf");

  return (
    <Float speed={2.5} rotationIntensity={0.4} floatIntensity={1.5}>
      <group position={position}>
        <Center>
          <primitive object={scene} scale={20} />
        </Center>
        <Html position={[0, 1, 0]} center className="pointer-events-none opacity-50">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            OLED (Ojos)
          </div>
        </Html>
      </group>
    </Float>
  );
}

useGLTF.preload("/models/scene.gltf");

// Model component for Micro Servo
function ModelServo({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/models/Microservo/micro_servo_motor.glb");

  // Al usar el mismo modelo varias veces, debemos clonar la escena para que no se sobreescriba.
  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={0.8}>
      <group position={position}>
        <Center>
          <primitive object={scene.clone()} scale={0.4} />
        </Center>
        <Html position={[0, 1, 0]} center className="pointer-events-none opacity-50">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            Servo (Movimiento)
          </div>
        </Html>
      </group>
    </Float>
  );
}

useGLTF.preload("/models/Microservo/micro_servo_motor.glb");

export default function HardwareScene() {
  return (
    <div className="w-full h-[400px] md:h-[500px] relative mt-12 cursor-grab active:cursor-grabbing">
      <Canvas shadows camera={{ position: [0, 1.5, 3.5], fov: 45 }}>
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
        <ModelESP32 position={[0, 0, 0]} />
        <ModelOLED position={[-2, 1, 0]} />
        <ModelServo position={[2, -0.5, 1]} />
        <ModelServo position={[2, 0.5, -1]} />

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
