import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

// Neon colors from Splatoon 3
const COLORS = [
  '#E1F803', // Neon Yellow
  '#603BFF', // Neon Purple/Blue
  '#F60594', // Neon Pink
  '#04D957', // Neon Green
  '#00E5FF', // Cyan
];

const getRandom = (min: number, max: number) => Math.random() * (max - min) + min;

const InkSplat = ({ color, top, left, scale = 1 }: { color: string; top: number; left: number; scale?: number }) => {
  // Generate a complex ink shape
  const parts = useMemo(() => {
    // 1. Central blobs (overlapping to make irregular center)
    const centerBlobs = Array.from({ length: 3 }).map((_, i) => ({
      type: 'center',
      key: `c-${i}`,
      size: getRandom(40, 60),
      top: getRandom(-15, 15),
      left: getRandom(-15, 15),
    }));

    // 2. Radiating arms (splat rays)
    const armCount = Math.floor(getRandom(5, 9));
    const arms = Array.from({ length: armCount }).map((_, i) => {
      const angle = (i * (360 / armCount)) + getRandom(-20, 20); // Distribute around circle
      const length = getRandom(30, 60);
      const width = getRandom(15, 25);
      return {
        type: 'arm',
        key: `a-${i}`,
        width,
        height: length,
        angle,
        top: 0, // Pivot from center
        left: 0,
      };
    });

    // 3. Droplets (detached)
    const dropletCount = Math.floor(getRandom(3, 7));
    const droplets = Array.from({ length: dropletCount }).map((_, i) => {
      const angle = getRandom(0, 360);
      const dist = getRandom(50, 80);
      const size = getRandom(5, 15);
      // Calculate position based on angle and distance
      const rad = (angle * Math.PI) / 180;
      const dTop = Math.sin(rad) * dist;
      const dLeft = Math.cos(rad) * dist;
      
      return {
        type: 'droplet',
        key: `d-${i}`,
        size,
        top: dTop,
        left: dLeft,
      };
    });

    return [...centerBlobs, ...arms, ...droplets];
  }, []);

  return (
    <View style={[styles.splatContainer, { top, left, transform: [{ scale }] }]}>
      {parts.map((part: any) => {
        if (part.type === 'center') {
          return (
            <View
              key={part.key}
              style={[
                styles.blob,
                {
                  backgroundColor: color,
                  width: part.size,
                  height: part.size,
                  borderRadius: part.size / 2,
                  top: part.top,
                  left: part.left,
                },
              ]}
            />
          );
        } else if (part.type === 'arm') {
           // Create a ray by rotating a rounded rectangle
           return (
             <View
                key={part.key}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: part.height, // Length of arm
                    height: part.width, // Thickness
                    backgroundColor: color,
                    borderRadius: part.width / 2,
                    transform: [
                        { rotate: `${part.angle}deg` },
                        { translateX: part.height / 2 - 10 } // Push out from center slightly
                    ]
                }}
             />
           );
        } else {
          // Droplet
          return (
            <View
              key={part.key}
              style={[
                styles.blob,
                {
                  backgroundColor: color,
                  width: part.size,
                  height: part.size,
                  borderRadius: part.size / 2,
                  top: part.top,
                  left: part.left,
                },
              ]}
            />
          );
        }
      })}
    </View>
  );
};

const AnimatedSplatWrapper = ({ splat, delay }: { splat: any, delay: number }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, // We apply the splat.scale in the transform
          friction: 4, // Bouncy
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={{ 
        position: 'absolute', 
        top: splat.top, 
        left: splat.left, 
        opacity: opacityAnim,
        transform: [
          { rotate: `${splat.rotation}deg` },
          { scale: scaleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, splat.scale]
          })}
        ] 
      }}
    >
        <InkSplat color={splat.color} top={0} left={0} scale={1} />
    </Animated.View>
  );
};

export const SplatoonBackground = ({ children }: { children: React.ReactNode }) => {
  const [splats, setSplats] = useState<any[]>([]);

  // Helper to create a random splat
  const createRandomSplat = (key: string | number, delay = 0) => ({
    key,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    top: getRandom(-50, height),
    left: getRandom(-50, width),
    scale: getRandom(0.8, 2.5),
    rotation: getRandom(0, 360),
    delay, 
  });

  // Initial population
  useEffect(() => {
    const initialSplats = Array.from({ length: 15 }).map((_, i) => createRandomSplat(i, getRandom(0, 800)));
    setSplats(initialSplats);
  }, []);

  // Interval for new splats (every 5 seconds)
  useEffect(() => {
      const interval = setInterval(() => {
          setSplats(current => {
              const newSplat = createRandomSplat(`new-${Date.now()}`); 
              // Limit total splats to avoid performance issues (keep last 30)
              const updated = [...current, newSplat];
              if (updated.length > 30) {
                  return updated.slice(updated.length - 30);
              }
              return updated;
          });
      }, 5000);
      return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Layer */}
      <View style={styles.backgroundLayer}>
        {splats.map((splat) => (
          <AnimatedSplatWrapper key={splat.key} splat={splat} delay={splat.delay} />
        ))}
        {/* Diagonal stripes overlay texture */}
        <View style={styles.texture} />
      </View>

      {/* Content Overlay */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  splatContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
  },
  texture: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      // We could add a pattern here if we had SVG, but for now just letting the ink sit on black is fine.
  }
});
