import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const ACCENT = '#63f98d';

export default function AvatarMarker() {
  const bounce = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
      ]),
    );

    const haloAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 0.65,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0.35,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    bounceAnimation.start();
    pulseAnimation.start();
    haloAnimation.start();

    return () => {
      bounceAnimation.stop();
      pulseAnimation.stop();
      haloAnimation.stop();
    };
  }, [bounce, halo, pulse]);

  const translateY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }, { scale: pulse }] }]}>
      <Animated.View style={[styles.halo, { opacity: halo }]} />
      <View style={styles.core}>
        <Text allowFontScaling={false} style={styles.icon}>
          RUN
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a2e1f',
    borderColor: `${ACCENT}80`,
    borderRadius: 999,
    borderWidth: 2,
  },
  core: {
    width: 46,
    height: 46,
    backgroundColor: '#08100a',
    borderColor: ACCENT,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
