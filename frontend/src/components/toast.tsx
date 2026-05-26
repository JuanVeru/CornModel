import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDone: (id: number) => void;
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(22, 68, 28, 0.97)', border: '#2E7D32', icon: '#A1E8AF' },
  error:   { bg: 'rgba(80, 15, 15, 0.97)', border: '#C62828', icon: '#EF9A9A' },
  info:    { bg: 'rgba(15, 45, 80, 0.97)', border: '#1565C0', icon: '#90CAF9' },
};

const ICONS: Record<ToastType, { ios: string; android: string; web: string }> = {
  success: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  error:   { ios: 'xmark.circle.fill',     android: 'error',         web: 'error' },
  info:    { ios: 'info.circle.fill',       android: 'info',          web: 'info' },
};

function ToastItem({ toast, onDone }: ToastItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 140, friction: 9 }),
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 140, friction: 9 }),
    ]).start();

    // After 3s visible, fade + scale out then remove
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 0.9, duration: 280, useNativeDriver: true }),
      ]).start(() => onDone(toast.id));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const palette = COLORS[toast.type];
  const icon    = ICONS[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <SymbolView tintColor={palette.icon} name={icon} size={20} style={styles.icon} />
      <ThemedText
        type="smallBold"
        style={[styles.message, { color: '#ffffff' }]}
        numberOfLines={4}
      >
        {toast.message}
      </ThemedText>
    </Animated.View>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    // On web: position fixed centers the overlay over the viewport regardless of scroll.
    // On native: position absolute fills the parent ThemedView which is full-screen.
    // pointerEvents="box-none" lets touches pass through the transparent backdrop
    // but still reach the toast cards themselves.
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={onDismiss} />
      ))}
    </View>
  );
}

/**
 * useToast — lightweight hook.
 * Usage:
 *   const { toasts, showToast, dismissToast } = useToast();
 *   showToast('Guardado con éxito', 'success');
 */
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, showToast, dismissToast };
}

const styles = StyleSheet.create({
  container: {
    // On web, 'fixed' keeps the overlay anchored to the viewport.
    // StyleSheet doesn't support 'fixed', so we apply it via Platform.
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
      default: {
        position: 'absolute',
      },
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    gap: Spacing.two,
    // Ensure the backdrop is invisible (only toast cards are visible)
    pointerEvents: 'box-none' as any,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    // Reasonable max-width so it never spans the whole screen
    maxWidth: 400,
    width: '88%',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
