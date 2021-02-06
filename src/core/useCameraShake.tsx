import * as React from 'react'
import * as THREE from 'three'
import { useFrame, Camera } from 'react-three-fiber'
import { makeNoise2D } from 'open-simplex-noise'

type ShakeConfig = typeof defaultConfig
export type ShakeConfigPartial = Partial<ShakeConfig>

const defaultConfig = {
  decay: false,
  decayRate: 0.65,
  maxYaw: 0.1,
  maxPitch: 0.1,
  maxRoll: 0.1,
  yawFrequency: 1,
  pitchFrequency: 1,
  rollFrequency: 1,
  yawNoiseSeed: 10,
  pitchNoiseSeed: 20,
  rollNoiseSeed: 30,
  lerpValue: 0.8,
}

export interface ShakeController {
  getTrauma: () => number
  setTrauma: (val: number) => void
}

export function useCameraShake(
  baseCamera: Camera | undefined,
  shakeConfig?: ShakeConfigPartial,
  initialTrauma: number = 1
): ShakeController {
  const origin = React.useRef(new THREE.Euler())
  const trauma = React.useRef<number>(initialTrauma)

  const config = React.useMemo<ShakeConfig>(() => ({ ...defaultConfig, ...shakeConfig }), [shakeConfig])

  const yawNoise = React.useMemo(() => makeNoise2D(config.yawNoiseSeed), [config.yawNoiseSeed])
  const pitchNoise = React.useMemo(() => makeNoise2D(config.pitchNoiseSeed), [config.pitchNoiseSeed])
  const rollNoise = React.useMemo(() => makeNoise2D(config.rollNoiseSeed), [config.rollNoiseSeed])

  const constrainTrauma = () => {
    if (trauma.current < 0 || trauma.current > 1) {
      trauma.current = trauma.current < 0 ? 0 : 1
    }
  }

  const getTrauma = () => {
    return trauma.current
  }

  const setTrauma = (val: number) => {
    trauma.current = val
    constrainTrauma()
  }

  useFrame(({ clock }, delta) => {
    if (baseCamera === undefined) return

    if (trauma.current > 0) {
      origin.current = origin.current.copy(baseCamera.rotation)

      const shake = Math.pow(trauma.current, 2)
      const pitch =
        config.maxPitch * shake * pitchNoise(clock.elapsedTime * config.pitchFrequency, 1) + origin.current.x
      const yaw = config.maxYaw * shake * yawNoise(clock.elapsedTime * config.yawFrequency, 1) + origin.current.y
      const roll = config.maxRoll * shake * rollNoise(clock.elapsedTime * config.rollFrequency, 1) + origin.current.z

      if (config.decay) {
        trauma.current -= config.decayRate * delta
        constrainTrauma()
      }

      baseCamera.rotation.x = THREE.MathUtils.lerp(origin.current.x, pitch, config.lerpValue)
      baseCamera.rotation.y = THREE.MathUtils.lerp(origin.current.y, yaw, config.lerpValue)
      baseCamera.rotation.z = THREE.MathUtils.lerp(origin.current.z, roll, config.lerpValue)
    }
  })

  return { getTrauma, setTrauma }
}
