"use client"

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars, useTexture } from "@react-three/drei"
import * as THREE from "three"
import DataPanel from "./data-panel"

function Earth({ onRegionClick }: { onRegionClick: (lat: number, lon: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const { camera, gl } = useThree()

  // Load Earth texture
  const earthTexture = useTexture("/earth-surface-texture-continents-oceans.jpg")

  // Auto-rotate Earth
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0003141592653589793 // ~0.000314 for slow rotation
    }
  })

  // Handle click on Earth
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!meshRef.current) return

      // Calculate mouse position in normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera)

      // Check for intersections
      const intersects = raycaster.current.intersectObject(meshRef.current)

      if (intersects.length > 0) {
        const point = intersects[0].point

        // Convert 3D point to lat/lon
        const lat = Math.asin(point.y / 2) * (180 / Math.PI)
        const lon = Math.atan2(point.x, point.z) * (180 / Math.PI)

        onRegionClick(lat, lon)
      }
    }

    gl.domElement.addEventListener("click", handleClick)
    return () => gl.domElement.removeEventListener("click", handleClick)
  }, [camera, gl, onRegionClick])

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={earthTexture} />
    </mesh>
  )
}

function CupolaFrame() {
  return (
    <group position={[0, 0, 5]}>
      {/* Cupola window frame */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[3.5, 0.15, 16, 100]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Window supports */}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <mesh key={angle} position={[Math.cos(rad) * 3.5, Math.sin(rad) * 3.5, 0]} rotation={[0, 0, rad]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
          </mesh>
        )
      })}
    </group>
  )
}

function CameraController() {
  const { camera } = useThree()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = -(event.clientY / window.innerHeight) * 2 + 1
      setMousePos({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useFrame(() => {
    // Edge detection for camera rotation
    const edgeThreshold = 0.85
    const rotationSpeed = 0.02

    if (Math.abs(mousePos.x) > edgeThreshold) {
      camera.rotation.y -= mousePos.x * rotationSpeed
    }
    if (Math.abs(mousePos.y) > edgeThreshold) {
      camera.rotation.x += mousePos.y * rotationSpeed
    }
  })

  return null
}

export default function EarthScene() {
  const [selectedRegion, setSelectedRegion] = useState<{ lat: number; lon: number } | null>(null)
  const [showDataPanel, setShowDataPanel] = useState(false)

  const handleRegionClick = (lat: number, lon: number) => {
    setSelectedRegion({ lat, lon })
    setShowDataPanel(true)
    console.log("[v0] Region clicked:", { lat, lon })
  }

  return (
    <>
      <Canvas camera={{ position: [0, 0, 12], fov: 8 }} gl={{ antialias: true }} className="w-full h-full">
        <color attach="background" args={["#000000"]} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#4a9eff" />

        {/* Stars background */}
        <Stars radius={300} depth={60} count={5000} factor={7} saturation={0} fade speed={1} />

        {/* Earth */}
        <Earth onRegionClick={handleRegionClick} />

        {/* Cupola frame */}
        <CupolaFrame />

        {/* Camera controller */}
        <CameraController />

        {/* Orbit controls for manual rotation */}
        <OrbitControls enableZoom={true} enablePan={false} minDistance={8} maxDistance={20} zoomSpeed={0.3} />
      </Canvas>

      {showDataPanel && selectedRegion && (
        <DataPanel lat={selectedRegion.lat} lon={selectedRegion.lon} onClose={() => setShowDataPanel(false)} />
      )}

      {/* Instructions */}
      <div className="absolute bottom-8 left-8 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 max-w-md">
        <h3 className="text-sm font-semibold mb-2 text-accent">ISS Cupola View</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Click on Earth to select a region and view NASA data. Move mouse to screen edges to rotate camera. Use mouse
          wheel to zoom.
        </p>
      </div>
    </>
  )
}
