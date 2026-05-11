import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text
} from 'react-native';

const FAB_SIZE = 56;
const FAB_POSITION_KEY = 'ai_fab_position';
const SAFE_MARGIN = 16;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DEFAULT_POSITION = {
  x: screenWidth - FAB_SIZE - SAFE_MARGIN,
  y: screenHeight / 2 - FAB_SIZE / 2,
};

interface AIFloatingButtonProps {
  onPress: () => void;
  hidden: boolean;
}

export function AIFloatingButton({ onPress, hidden }: AIFloatingButtonProps) {
  const pan = useRef(new Animated.ValueXY(DEFAULT_POSITION)).current;

  // Track the current absolute position for snap logic
  const currentPos = useRef(DEFAULT_POSITION);

  // Track start position for tap discrimination
  const startPos = useRef({ x: 0, y: 0 });

  // Keep currentPos in sync with animated value
  useEffect(() => {
    const xListener = pan.x.addListener(({ value }) => {
      currentPos.current = { ...currentPos.current, x: value };
    });
    const yListener = pan.y.addListener(({ value }) => {
      currentPos.current = { ...currentPos.current, y: value };
    });
    return () => {
      pan.x.removeListener(xListener);
      pan.y.removeListener(yListener);
    };
  }, [pan]);

  // Restore saved position on mount
  useEffect(() => {
    AsyncStorage.getItem(FAB_POSITION_KEY)
      .then((saved) => {
        if (saved) {
          const pos = JSON.parse(saved) as { x: number; y: number };
          pan.setValue(pos);
          currentPos.current = pos;
        }
      })
      .catch(() => {
        // If read fails, keep default position
      });
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (_, gestureState) => {
        // Record start position for tap discrimination
        startPos.current = {
          x: gestureState.x0,
          y: gestureState.y0,
        };
        // Set offset to current position so movement is relative
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        const { dx, dy } = gestureState;

        // Tap discrimination: small movement = tap
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          onPress();
          return;
        }

        // Snap to nearest horizontal edge
        const currentX = currentPos.current.x;
        const currentY = currentPos.current.y;

        const snapX =
          currentX < screenWidth / 2
            ? SAFE_MARGIN
            : screenWidth - FAB_SIZE - SAFE_MARGIN;

        // Clamp Y within screen bounds
        const clampedY = Math.max(
          SAFE_MARGIN,
          Math.min(currentY, screenHeight - FAB_SIZE - SAFE_MARGIN)
        );

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }).start(() => {
          // Save position after snap animation completes
          const finalPos = { x: snapX, y: clampedY };
          AsyncStorage.setItem(FAB_POSITION_KEY, JSON.stringify(finalPos)).catch(
            () => {
              // Silently ignore storage errors
            }
          );
        });
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.fab,
        {
          transform: pan.getTranslateTransform(),
          display: hidden ? 'none' : 'flex',
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.icon}>🤖</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#D4708F',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  icon: {
    color: '#F5E6D3',
    fontSize: 24,
  },
});
