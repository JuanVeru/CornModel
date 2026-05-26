import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';

interface WebCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export function WebCamera({ onCapture, onClose }: WebCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async () => {
    setLoading(true);
    setError(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // On iOS Safari, we must set playsInline to prevent fullscreen native player
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error starting camera:', err);
      // If environment (back camera) fails, try falling back to user camera
      if (facingMode === 'environment') {
        setFacingMode('user');
      } else {
        setError('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Determine crop size for square photo (since model works on squares, let's make it 1:1)
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw centered square from video stream
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        
        ctx.drawImage(
          video,
          startX,
          startY,
          size,
          size,
          0,
          0,
          size,
          size
        );
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(dataUrl);
      }
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
      setError('No se pudo capturar la imagen.');
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <ThemedView type="backgroundElement" style={styles.modalCard}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            Capturar Muestra Foliar
          </ThemedText>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <SymbolView
              tintColor="#888888"
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              size={22}
            />
          </Pressable>
        </View>

        {/* Camera Container */}
        <View style={styles.cameraWrapper}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
                Iniciando flujo de cámara...
              </ThemedText>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <SymbolView
                tintColor="#C62828"
                name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                size={32}
              />
              <ThemedText type="smallBold" style={styles.errorText}>
                {error}
              </ThemedText>
              <Pressable style={styles.retryBtn} onPress={startCamera}>
                <ThemedText type="smallBold" style={styles.retryText}>Reintentar</ThemedText>
              </Pressable>
            </View>
          )}

          {/* HTML5 video element wrapped directly in JSX */}
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: loading || error ? 'none' : 'block',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', // Mirror front camera
              borderRadius: 16,
              backgroundColor: '#000000',
            }}
            autoPlay
            playsInline
            muted
          />

          {/* Guidelines overlay for scanning leaves */}
          {!loading && !error && (
            <View style={styles.guidelinesContainer} pointerEvents="none">
              <View style={styles.scannerTargetBox} />
              <ThemedText type="smallBold" style={styles.guidelineText}>
                Ubica la hoja dentro del recuadro
              </ThemedText>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {/* Toggle Camera button (only on devices with multiple cameras) */}
          <Pressable style={styles.secondaryBtn} onPress={toggleFacingMode} disabled={loading || !!error}>
            <SymbolView
              tintColor="#2E7D32"
              name={{ ios: 'camera.rotate.fill', android: 'switch_camera', web: 'switch_camera' }}
              size={20}
            />
          </Pressable>

          {/* Main Shutter Button */}
          <Pressable
            style={[styles.shutterBtn, (loading || error) && styles.disabledBtn]}
            onPress={handleCapture}
            disabled={loading || !!error}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          {/* Place holder for symmetry */}
          <View style={styles.placeholderBtn} />
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)',
  },
  headerTitle: {
    fontSize: 16,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  cameraWrapper: {
    width: '100%',
    aspectRatio: 1, // Keep it square
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
  },
  errorContainer: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(198, 40, 40, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.2)',
  },
  retryText: {
    color: '#C62828',
    fontSize: 12,
  },
  guidelinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  scannerTargetBox: {
    width: '75%',
    height: '75%',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 12,
    borderStyle: 'dashed',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  guidelineText: {
    position: 'absolute',
    bottom: Spacing.four,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 11,
    overflow: 'hidden',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2E7D32',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  placeholderBtn: {
    width: 44,
    height: 44,
  },
});
