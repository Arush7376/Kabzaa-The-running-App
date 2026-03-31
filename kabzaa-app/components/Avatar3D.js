import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function Avatar3D({ style }) {
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.06,
          duration: 620,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 620,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseValue]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.fallback, { transform: [{ scale: pulseValue }] }]}>
        <View style={styles.halo} />
        <View style={styles.core}>
          <Text style={styles.label}>RUN</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(6, 10, 16, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.16)',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(99, 249, 141, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(99, 249, 141, 0.3)',
  },
  core: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1018',
    borderWidth: 2,
    borderColor: '#63f98d',
  },
  label: {
    color: '#63f98d',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
