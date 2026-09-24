import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface AnimatedEmojiProps {
  emoji: string;
}

const g = -0.4e-4;
const G = Math.abs(g);
const tmax = 5000;
const Rx = 2 * G;
const Fx = 4 * G;
const vx0 = 0.1 * tmax * G;
const Fy = 2 * G;
const vy0 = 0.4 * tmax * G;
const size = 80;
const Ra = 1e-8 * size * 360;
const Fa = 5e-4;
const Sa = (5 * G) / size;

const randn = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) *
  Math.cos(2 * Math.PI * Math.random());

export const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({ emoji }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t0 = Date.now();
    const tend = t0 + tmax;
    let t = t0;
    let x = 0;
    let vx = vx0 * randn();
    let y = 0;
    let vy = vy0;
    let a = 0;
    let va = 0;
    let frame = 0;

    const step = () => {
      if (t > tend) return;

      const dt = Date.now() - t;
      t += dt;
      x += dt * vx;
      y += dt * vy;
      a += dt * va;
      vx += dt * (Rx * randn() - Fx * vx);
      vy += dt * (g - Fy * vy);
      va += dt * (-Sa * a + Ra * randn() - Fa * va);

      const timeFraction = (t - t0) / (tend - t0);
      const nextScale = 1 - 0.75 * timeFraction;
      scale.setValue(nextScale);
      translateX.setValue(x / nextScale);
      translateY.setValue(-y / nextScale);
      rotate.setValue(a);
      opacity.setValue(1 - timeFraction ** 2);

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [opacity, rotate, scale, translateX, translateY]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.emoji,
        {
          opacity,
          transform: [
            { scale },
            { translateX },
            { translateY },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  emoji: {
    position: 'absolute',
    bottom: 0,
    right: '33.333333%',
    width: 64,
    height: 64,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emojiText: {
    fontSize: 36,
    textAlign: 'center',
  },
});
