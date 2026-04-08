import { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 800

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const { viewport } = useThree()

  const particles = useMemo(() => {
    const data = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 8
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.001
        ),
        scale: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5,
      })
    }
    return data
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  const handlePointerMove = useCallback(
    (e: { clientX: number; clientY: number }) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    },
    []
  )

  // Attach global mouse listener
  useMemo(() => {
    window.addEventListener('mousemove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('mousemove', handlePointerMove)
  }, [handlePointerMove])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const mx = mouseRef.current.x * viewport.width * 0.5
    const my = mouseRef.current.y * viewport.height * 0.5

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]

      // Drift
      p.position.x += p.velocity.x
      p.position.y += p.velocity.y
      p.position.z += p.velocity.z

      // Oscillation
      const osc = Math.sin(t * p.speed + p.phase) * 0.02
      p.position.y += osc

      // Mouse influence — gentle attraction
      const dx = mx - p.position.x
      const dy = my - p.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 4) {
        const force = (1 - dist / 4) * 0.002
        p.position.x += dx * force
        p.position.y += dy * force
      }

      // Wrap around
      if (p.position.x > 12) p.position.x = -12
      if (p.position.x < -12) p.position.x = 12
      if (p.position.y > 8) p.position.y = -8
      if (p.position.y < -8) p.position.y = 8

      dummy.position.copy(p.position)

      // Pulse scale
      const pulse = 1 + Math.sin(t * p.speed * 2 + p.phase) * 0.3
      dummy.scale.setScalar(p.scale * pulse)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)

      // Color based on depth/position
      const hue = 0.55 + p.position.z * 0.02 + Math.sin(t * 0.1 + p.phase) * 0.05
      const saturation = 0.6 + (dist < 4 ? (1 - dist / 4) * 0.3 : 0)
      const lightness = 0.4 + pulse * 0.15
      color.setHSL(hue, saturation, lightness)
      meshRef.current!.setColorAt(i, color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.7} toneMapped={false} />
    </instancedMesh>
  )
}

function ConnectionLines() {
  const lineRef = useRef<THREE.LineSegments>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const colorsRef = useRef<Float32Array | null>(null)

  const maxConnections = 600
  const connectionDistance = 2.5

  useMemo(() => {
    positionsRef.current = new Float32Array(maxConnections * 6)
    colorsRef.current = new Float32Array(maxConnections * 6)
  }, [])

  useFrame(({ scene }) => {
    if (!lineRef.current || !positionsRef.current || !colorsRef.current) return
    const instancedMesh = scene.children.find(
      (c): c is THREE.InstancedMesh => (c as THREE.InstancedMesh).isInstancedMesh
    )
    if (!instancedMesh) return

    const positions = positionsRef.current
    const colors = colorsRef.current
    let idx = 0
    const tempMatrix = new THREE.Matrix4()
    const posA = new THREE.Vector3()
    const posB = new THREE.Vector3()

    const count = Math.min(instancedMesh.count, 200) // Only check first 200 for perf

    for (let i = 0; i < count && idx < maxConnections; i++) {
      instancedMesh.getMatrixAt(i, tempMatrix)
      posA.setFromMatrixPosition(tempMatrix)

      for (let j = i + 1; j < count && idx < maxConnections; j++) {
        instancedMesh.getMatrixAt(j, tempMatrix)
        posB.setFromMatrixPosition(tempMatrix)

        const d = posA.distanceTo(posB)
        if (d < connectionDistance) {
          const alpha = 1 - d / connectionDistance

          positions[idx * 6] = posA.x
          positions[idx * 6 + 1] = posA.y
          positions[idx * 6 + 2] = posA.z
          positions[idx * 6 + 3] = posB.x
          positions[idx * 6 + 4] = posB.y
          positions[idx * 6 + 5] = posB.z

          const c = alpha * 0.15
          colors[idx * 6] = 0.23 * c
          colors[idx * 6 + 1] = 0.51 * c
          colors[idx * 6 + 2] = 0.96 * c
          colors[idx * 6 + 3] = 0.02 * c
          colors[idx * 6 + 4] = 0.71 * c
          colors[idx * 6 + 5] = 0.83 * c

          idx++
        }
      }
    }

    const geom = lineRef.current.geometry
    geom.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, idx * 6), 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, idx * 6), 3))
    geom.setDrawRange(0, idx * 2)
    geom.attributes.position.needsUpdate = true
    geom.attributes.color.needsUpdate = true
  })

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial vertexColors transparent opacity={0.4} toneMapped={false} />
    </lineSegments>
  )
}

export default function ParticleField() {
  return (
    <div
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(180deg, #050810 0%, #0a0e1a 40%, #0c1225 100%)' }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
        frameloop="always"
      >
        <Particles />
        <ConnectionLines />
      </Canvas>
      
      {/* Heavy Blur + Darkening Overlay for Text Readability */}
      <div className="absolute inset-0 pointer-events-none backdrop-blur-xl bg-[#050810]/70" />
    </div>
  )
}
