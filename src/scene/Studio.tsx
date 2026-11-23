import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useSettings, QUALITY } from '../polish/settings'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Lights, environment, floor, dust and post effects. No network assets. */
export function Studio() {
  const { gl, scene } = useThree()
  const q = QUALITY[useSettings(s => s.quality) as 'high' | 'medium' | 'low'] ?? QUALITY.high
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.35
    return () => { env.dispose(); pm.dispose() }
  }, [gl, scene])

  return (
    <>
      <color attach="background" args={['#07080b']} />
      <fog attach="fog" args={['#07080b', 16, 34]} />
      <directionalLight
        position={[5, 11, 6]}
        intensity={1.5}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-7, 4, -9]} intensity={1.6} color="#4fd1c5" />
      <spotLight position={[0, 12, 0]} intensity={7} distance={30} angle={0.75} penumbra={1} decay={1.2} color="#e2b45c" />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.72} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#0c0d11" roughness={0.85} />
      </mesh>
      {q.dust && <Sparkles count={140} scale={[22, 9, 22]} position={[0, 4, 0]} size={2.2} speed={0.25} opacity={0.6} color="#f6d58e" />}
      <EffectComposer multisampling={q.bloom ? 4 : 0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={q.bloom ? 0.55 : 0} />
        <Vignette offset={0.25} darkness={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
