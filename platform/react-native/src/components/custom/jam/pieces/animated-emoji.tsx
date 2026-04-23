import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedEmojiProps {
  emoji: string;
}

const tmax = 5000;
const g = -0.4e-4;
const G = Math.abs(g);
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
    const vx00 = vx0 * randn();

    let t = t0;
    let x = 0,
      vx = vx00;
    let y = 0,
      vy = vy0;
    let a = 0,
      va = 0;

    function step() {
      const now = Date.now();
      const dt = now - t;
      if (now > tend) { return; }

      t = now;

      // integrate positions
      x += dt * vx;
      y += dt * vy;
      a += dt * va;

      // integrate velocities
      vx += dt * (Rx * randn() - Fx * vx);
      vy += dt * (g - Fy * vy);
      va += dt * (-Sa * a + Ra * randn() - Fa * va);

      const timeFraction = (t - t0) / (tend - t0);
      const s = 1 - 0.75 * timeFraction;
      const o = 1 - timeFraction ** 2;

      // apply to Animated.Values
      translateX.setValue(x);
      translateY.setValue(-y); // up is negative in React Native
      rotate.setValue(a);
      scale.setValue(s);
      opacity.setValue(o);

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.emojiContainer,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate: rotateInterpolate },
          ],
          opacity,
        },
      ]}>
      <Text style={styles.emojiText}>{emoji}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  emojiContainer: {
    position: 'absolute',
    bottom: 0,
    left: screenWidth / 3,
    width: 64,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  emojiText: {
    fontSize: 48,
  },
});
