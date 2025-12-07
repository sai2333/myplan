import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

// 8-bit Mario (Simplified)
const Mario = ({ scale = 1 }: { scale?: number }) => (
  <View style={[styles.marioContainer, { transform: [{ scale }] }]}>
    {/* Hat */}
    <View style={[styles.pixel, { backgroundColor: '#E70012', top: 0, left: 4, width: 10, height: 2 }]} />
    {/* Face */}
    <View style={[styles.pixel, { backgroundColor: '#FFD700', top: 2, left: 4, width: 8, height: 2 }]} />
    <View style={[styles.pixel, { backgroundColor: '#000', top: 2, left: 8, width: 2, height: 2 }]} />
    <View style={[styles.pixel, { backgroundColor: '#000', top: 2, left: 4, width: 2, height: 1 }]} /> 
    {/* Body */}
    <View style={[styles.pixel, { backgroundColor: '#E70012', top: 4, left: 3, width: 8, height: 4 }]} />
    {/* Overalls */}
    <View style={[styles.pixel, { backgroundColor: '#0000FF', top: 6, left: 4, width: 6, height: 4 }]} />
    <View style={[styles.pixel, { backgroundColor: '#FFD700', top: 6, left: 2, width: 2, height: 2 }]} />
    <View style={[styles.pixel, { backgroundColor: '#FFD700', top: 6, left: 10, width: 2, height: 2 }]} />
  </View>
);

const QuestionBlock = () => (
    <View style={styles.questionBlock}>
        <View style={[styles.coin, { width: 16, height: 22, transform: [{ scale: 0.8 }] }]}>
            <View style={[styles.coinInner, { width: 8, height: 14 }]} />
        </View>
    </View>
);

const Coin = () => (
    <View style={styles.coin}>
        <View style={styles.coinInner} />
    </View>
);

const Cloud = ({ top, left, scale = 1 }: { top: number; left: number; scale?: number }) => (
  <View style={[styles.cloud, { top, left, transform: [{ scale }] }]}>
    <View style={styles.cloudPartLeft} />
    <View style={styles.cloudPartRight} />
    <View style={styles.cloudPartTop} />
  </View>
);

const Hill = ({ bottom, left, scale = 1 }: { bottom: number; left: number; scale?: number }) => (
  <View style={[styles.hillContainer, { bottom, left, transform: [{ scale }] }]}>
      <View style={styles.hillMain} />
      <View style={styles.hillTop} />
      {/* Eyes */}
      <View style={[styles.hillEye, { left: 15, top: 20 }]} />
      <View style={[styles.hillEye, { left: 35, top: 20 }]} />
  </View>
);

const Bush = ({ bottom, left, width: w }: { bottom: number; left: number; width: number }) => (
    <View style={[styles.bush, { bottom, left, width: w }]}>
        <View style={[styles.bushPart, { left: 0 }]} />
        <View style={[styles.bushPart, { left: w / 3 }]} />
        <View style={[styles.bushPart, { right: 0 }]} />
    </View>
);

const FloorBlock = () => (
    <View style={styles.floorBlock}>
        <View style={styles.brickLine} />
        <View style={styles.brickDot} />
    </View>
);

export const MarioBackground = ({ children }: { children: React.ReactNode }) => {
  const floorCount = Math.ceil(width / 32) + 1;
  
  // Animation Values
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const coinOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const jumpSequence = Animated.sequence([
      // Wait
      Animated.delay(2000),
      // Jump Up
      Animated.timing(jumpAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      // Hit Block (Simultaneous with coin pop)
      Animated.parallel([
          // Fall Down
          Animated.timing(jumpAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
          // Coin Pop
          Animated.sequence([
              Animated.parallel([
                  Animated.timing(coinAnim, {
                      toValue: 1,
                      duration: 200,
                      useNativeDriver: true,
                      easing: Easing.out(Easing.quad),
                  }),
                  Animated.timing(coinOpacity, {
                      toValue: 1,
                      duration: 50,
                      useNativeDriver: true,
                  })
              ]),
              Animated.timing(coinAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                  easing: Easing.in(Easing.quad),
              }),
              Animated.timing(coinOpacity, {
                  toValue: 0,
                  duration: 100,
                  useNativeDriver: true,
              })
          ])
      ])
    ]);

    const loop = Animated.loop(jumpSequence);
    loop.start();

    return () => loop.stop();
  }, []);

  const marioTranslateY = jumpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60] // Jump height
  });

  const coinTranslateY = coinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -40]
  });

  return (
    <View style={styles.container}>
      {/* Sky Background */}
      <View style={styles.sky}>
        
        {/* Decorative Elements */}
        <Cloud top={80} left={20} scale={0.8} />
        <Cloud top={40} left={width - 100} scale={1.2} />
        <Cloud top={150} left={width / 2 - 40} scale={0.6} />

        <Hill bottom={80} left={-20} scale={1.5} />
        <Hill bottom={80} left={width - 80} scale={1} />
        
        <Bush bottom={80} left={width / 2 - 50} width={100} />

        {/* Interactive Elements */}
        <View style={{ position: 'absolute', bottom: 140, left: 100 }}>
             <QuestionBlock />
             <Animated.View style={{ 
                 position: 'absolute', 
                 top: 0, 
                 left: 0, 
                 right: 0, 
                 alignItems: 'center',
                 opacity: coinOpacity,
                 transform: [{ translateY: coinTranslateY }]
             }}>
                 <Coin />
             </Animated.View>
        </View>

        <Animated.View style={{ 
            position: 'absolute', 
            bottom: 80, // Sitting on floor
            left: 106, 
            transform: [{ translateY: marioTranslateY }] 
        }}>
            <Mario scale={3} />
        </Animated.View>


        {/* Floor - Raised to 80 to clear typical tab bar height (usually 50-60) */}
        <View style={styles.floor}>
             {Array.from({ length: floorCount }).map((_, i) => (
                 <FloorBlock key={i} />
             ))}
             {/* Second layer of floor for depth */}
             <View style={styles.floorSecondLayer} />
        </View>
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
    backgroundColor: '#5c94fc', // Classic Mario Sky Blue
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  
  // Mario Styles
  marioContainer: {
      width: 14,
      height: 16,
  },
  pixel: {
      position: 'absolute',
  },

  // Question Block
  questionBlock: {
      width: 32,
      height: 32,
      backgroundColor: '#FFA500',
      borderWidth: 2,
      borderColor: '#B8860B',
      justifyContent: 'center',
      alignItems: 'center',
  },
  questionMark: {
      width: 16,
      height: 16,
      borderWidth: 2,
      borderColor: '#fff',
      borderBottomWidth: 0,
      borderLeftWidth: 0,
      transform: [{ rotate: '45deg' }],
      marginTop: 4,
  },
  questionDot: {
      position: 'absolute',
      width: 4,
      height: 4,
      backgroundColor: '#fff',
      bottom: 4,
      right: 4,
  },
  
  // Coin
  coin: {
      width: 20,
      height: 28,
      backgroundColor: '#FFD700',
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#DAA520',
      justifyContent: 'center',
      alignItems: 'center',
  },
  coinInner: {
      width: 10,
      height: 18,
      backgroundColor: '#FFD700',
      borderWidth: 1,
      borderColor: '#DAA520',
      borderRadius: 5,
  },

  // Cloud Styles
  cloud: {
    position: 'absolute',
    width: 60,
    height: 40,
  },
  cloudPartLeft: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    bottom: 0,
    left: 0,
  },
  cloudPartRight: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    bottom: 0,
    right: 0,
  },
  cloudPartTop: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    bottom: 5,
    left: 10,
  },

  // Hill Styles
  hillContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hillMain: {
      width: 60,
      height: 40,
      backgroundColor: '#00A800',
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      borderWidth: 2,
      borderColor: '#000',
  },
  hillTop: {
      position: 'absolute',
      top: 10,
      width: 40,
      height: 20,
      // backgroundColor: '#00A800',
  },
  hillEye: {
      position: 'absolute',
      width: 4,
      height: 8,
      backgroundColor: '#000',
      borderRadius: 2,
  },

  // Bush Styles
  bush: {
      position: 'absolute',
      height: 30,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
  },
  bushPart: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#7cfc00', // Lawn Green
      borderWidth: 2,
      borderColor: '#006400', // Dark Green
  },

  // Floor Styles
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Increased height
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    zIndex: 10, // Ensure it covers anything behind it if needed, but background is usually z-index 0
  },
  floorBlock: {
      width: 32,
      height: 32,
      backgroundColor: '#c84c0c', // Brick Brown
      borderWidth: 1,
      borderColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
  },
  brickLine: {
      width: '100%',
      height: 1,
      backgroundColor: '#000',
      opacity: 0.3,
  },
  brickDot: {
      width: 4,
      height: 4,
      backgroundColor: '#000',
      opacity: 0.3,
      position: 'absolute',
      right: 4,
      top: 4,
  },
  floorSecondLayer: {
      position: 'absolute',
      top: 32,
      left: 0,
      right: 0,
      height: 100, // Cover rest
      backgroundColor: '#793100', // Darker brown
  }
});
