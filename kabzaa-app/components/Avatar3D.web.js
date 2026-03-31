import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

function RunnerMesh({ energy = 0.5 }) {
  const groupRef = useRef(null);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const time = state.clock.getElapsedTime();
    groupRef.current.rotation.y = time * 0.75;
    groupRef.current.position.y = Math.sin(time * 3.8) * (0.08 + energy * 0.08);
    groupRef.current.rotation.z = Math.sin(time * 4.1) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.55, 0]}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#88ffd4" emissive="#2eff91" emissiveIntensity={1.15} />
      </mesh>

      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 0.9, 12]} />
        <meshStandardMaterial color="#0d1220" emissive="#11372a" emissiveIntensity={0.5} />
      </mesh>

      <mesh position={[-0.4, -0.18, 0]} rotation={[0, 0, 0.45]}>
        <capsuleGeometry args={[0.08, 0.6, 6, 10]} />
        <meshStandardMaterial color="#63f98d" emissive="#2eff91" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.4, -0.18, 0]} rotation={[0, 0, -0.45]}>
        <capsuleGeometry args={[0.08, 0.6, 6, 10]} />
        <meshStandardMaterial color="#63f98d" emissive="#2eff91" emissiveIntensity={0.8} />
      </mesh>

      <mesh position={[-0.16, -0.98, 0]} rotation={[0.4, 0, 0.14]}>
        <capsuleGeometry args={[0.09, 0.7, 6, 10]} />
        <meshStandardMaterial color="#86bfff" emissive="#2358d8" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0.16, -0.98, 0]} rotation={[-0.4, 0, -0.14]}>
        <capsuleGeometry args={[0.09, 0.7, 6, 10]} />
        <meshStandardMaterial color="#86bfff" emissive="#2358d8" emissiveIntensity={0.55} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.42, 0]}>
        <ringGeometry args={[0.68, 0.86, 48]} />
        <meshBasicMaterial color="#63f98d" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

export default function Avatar3D({ speed = 0, style }) {
  const energy = useMemo(() => Math.min(speed / 4.5, 1), [speed]);
  const energyLabel = useMemo(() => {
    if (speed >= 10) {
      return 'Sprint';
    }
    if (speed >= 6) {
      return 'Run';
    }
    return 'Warmup';
  }, [speed]);

  return (
    <View style={[styles.container, style]}>
      <Canvas camera={{ position: [0, 1.1, 4.2], fov: 38 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#020509']} />
        <fog attach="fog" args={['#020509', 4.5, 8]} />
        <ambientLight intensity={1.4} />
        <directionalLight color="#78ffd7" intensity={2} position={[2, 3, 4]} />
        <pointLight color="#4ab3ff" intensity={22} position={[-2, 1, 2]} distance={8} />
        <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.9}>
          <RunnerMesh energy={energy} />
        </Float>
      </Canvas>

      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.overlayLabel}>Avatar sync</Text>
        <Text style={styles.overlayValue}>{energyLabel}</Text>
      </View>
      <View pointerEvents="none" style={styles.frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 232,
    height: 232,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(6, 10, 16, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.16)',
  },
  overlay: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(7, 12, 20, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overlayLabel: {
    color: '#7ec7ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  overlayValue: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.12)',
    backgroundColor: 'transparent',
  },
});
