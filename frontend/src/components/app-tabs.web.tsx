import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from './themed-text';

import { MaxContentWidth, Spacing } from '@/constants/theme';

// Height of the floating navbar so pages can pad their content below it
const NAV_HEIGHT = 88;

export default function AppTabs() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Choose gradient colors for background
  const bgGradient = isDark
    ? ['#050806', '#0f1711', '#070a07']
    : ['#f3faf6', '#e4eee7', '#f8fbf9'];

  return (
    <View style={styles.outerAppContainer}>
      {/* Background blobs with organic green, soft gold and sky blue hues */}
      <View style={[styles.blob, styles.blob1, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(46, 125, 50, 0.12)' }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(230, 180, 40, 0.08)' }]} />
      <View style={[styles.blob, styles.blob3, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.03)' : 'rgba(96, 165, 250, 0.06)' }]} />

      <LinearGradient
        colors={bgGradient}
        style={StyleSheet.absoluteFillObject}
      />

      <Tabs style={{ flex: 1, backgroundColor: 'transparent' }}>
        {/* Push page content below the fixed navbar */}
        <TabSlot style={{ flex: 1, paddingTop: NAV_HEIGHT }} />
        <TabList asChild>
          <CustomTabList>
            <TabTrigger name="home" href="/" asChild>
              <TabButton>Home</TabButton>
            </TabTrigger>
            <TabTrigger name="admin" href="/admin" asChild>
              <TabButton>Admin</TabButton>
            </TabTrigger>
          </CustomTabList>
        </TabList>
      </Tabs>
    </View>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Pressable {...props} style={({ pressed }) => [pressed && styles.pressed, styles.tabButtonPressable]}>
      <View style={[
        styles.tabButtonView,
        isFocused && [
          styles.tabButtonViewActive,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(46, 125, 50, 0.1)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(46, 125, 50, 0.15)',
          }
        ]
      ]}>
        <ThemedText type="smallBold" style={[
          styles.tabButtonText,
          isFocused ? { color: isDark ? '#34d399' : '#2e7d32' } : { color: isDark ? '#8b9b90' : '#5a6b5d' }
        ]}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[
        styles.innerContainer,
        {
          backgroundColor: isDark ? 'rgba(18, 24, 19, 0.65)' : 'rgba(255, 255, 255, 0.75)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 125, 50, 0.08)',
        }
      ]}>
        <ThemedText type="smallBold" style={styles.brandText}>
          🌿 CornGuard <ThemedText type="smallBold" style={styles.brandHighlight}>AI</ThemedText>
        </ThemedText>

        <View style={styles.buttonsRow}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerAppContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: '100vh',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    filter: 'blur(120px)',
    pointerEvents: 'none',
  } as any,
  blob1: {
    top: '5%',
    right: '-10%',
    width: 600,
    height: 600,
  },
  blob2: {
    bottom: '-10%',
    left: '-10%',
    width: 700,
    height: 700,
  },
  blob3: {
    top: '40%',
    left: '35%',
    width: 500,
    height: 500,
  },
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 100,
  },
  innerContainer: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.five,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  } as any,
  brandText: {
    fontSize: 16,
    letterSpacing: 0.5,
    marginRight: 'auto',
  },
  brandHighlight: {
    color: '#2e7d32',
    fontWeight: '900',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tabButtonPressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabButtonView: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  } as any,
  tabButtonViewActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
