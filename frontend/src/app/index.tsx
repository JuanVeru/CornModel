import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/constants/config';
import { WebCamera } from '@/components/web-camera';
import { ToastContainer, useToast } from '@/components/toast';

interface CornClassDetails {
  id: number;
  name: string;
  display_name: string;
  description: string;
  symptoms: string;
  favored_conditions: string;
  preventive_management: string;
  treatment: string;
  updated_at: string;
}

interface DiagnosisResponse {
  prediction: string;
  confidence: number;
  class_details: CornClassDetails;
}

export default function HomeScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { toasts, showToast, dismissToast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('desc');
  const [webCameraActive, setWebCameraActive] = useState(false);

  // Request media permissions and pick an image
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Necesitamos acceso a tu galería para seleccionar una hoja de maíz.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setDiagnosis(null);
        setError(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al abrir la galería o archivo no soportado.', 'error');
    }
  };

  // Request camera permissions and snap a photo
  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      setWebCameraActive(true);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('Necesitamos acceso a la cámara para tomar una foto del cultivo.', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setDiagnosis(null);
        setError(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al activar la cámara.', 'error');
    }
  };

  // Upload image to backend for inference
  const analyzeImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    setDiagnosis(null);

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // Fetch web-based blob
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        formData.append('file', blob, 'corn_leaf.jpg');
      } else {
        // Connect native file shape
        formData.append('file', {
          uri: selectedImage,
          name: 'corn_leaf.jpg',
          type: 'image/jpeg',
        } as any);
      }

      console.log(`[*] Sending request to: ${API_URL}/api/predict`);
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Fallo de respuesta del servidor de Inteligencia Artificial.');
      }

      const result: DiagnosisResponse = await response.json();
      setDiagnosis(result);
    } catch (err: any) {
      const msg = err.message || 'Error de conexión. Asegúrate de que el backend esté en ejecución.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setSelectedImage(null);
    setDiagnosis(null);
    setError(null);
    setActiveAccordion('desc');
  };

  // Determine styles dynamically based on classes
  const getThemeColors = (prediction: string) => {
    const isDarkTheme = scheme === 'dark';
    switch (prediction) {
      case 'Healthy':
        return {
          colors: isDarkTheme ? ['#064e3b', '#059669'] : ['#1b5e20', '#2E7D32'],
          primary: isDarkTheme ? '#10B981' : '#2E7D32',
          glow: isDarkTheme ? 'rgba(16, 185, 129, 0.25)' : 'rgba(46, 125, 50, 0.25)',
          text: '#A1E8AF'
        };
      case 'Common_Rust':
        return {
          colors: isDarkTheme ? ['#7c2d12', '#ea580c'] : ['#bf360c', '#D84315'],
          primary: isDarkTheme ? '#F97316' : '#D84315',
          glow: isDarkTheme ? 'rgba(249, 115, 22, 0.25)' : 'rgba(216, 67, 21, 0.25)',
          text: '#FFAB91'
        };
      case 'Blight':
        return {
          colors: isDarkTheme ? ['#7f1d1d', '#dc2626'] : ['#b71c1c', '#C62828'],
          primary: isDarkTheme ? '#EF4444' : '#C62828',
          glow: isDarkTheme ? 'rgba(239, 68, 68, 0.25)' : 'rgba(198, 40, 40, 0.25)',
          text: '#EF9A9A'
        };
      default:
        return {
          colors: isDarkTheme ? ['#064e3b', '#059669'] : ['#1b5e20', '#2E7D32'],
          primary: isDarkTheme ? '#10B981' : '#2E7D32',
          glow: isDarkTheme ? 'rgba(16, 185, 129, 0.25)' : 'rgba(46, 125, 50, 0.25)',
          text: '#A1E8AF'
        };
    }
  };

  const resultsColor = diagnosis ? getThemeColors(diagnosis.prediction) : null;

  return (
    <ThemedView style={styles.outerContainer}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={[styles.logoBadge, { borderColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(46,125,50,0.15)' }]}>
              <SymbolView
                tintColor={isDark ? '#10B981' : '#2E7D32'}
                name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
                size={22}
              />
            </View>
            <ThemedText type="subtitle" style={styles.logoText}>
              CornGuard <ThemedText type="subtitle" style={[styles.logoHighlight, { color: isDark ? '#10B981' : '#2E7D32' }]}>AI</ThemedText>
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
              Diagnóstico instantáneo de enfermedades foliares mediante redes convolucionales
            </ThemedText>
          </View>

          {/* Interactive Card */}
          <ThemedView 
            type="backgroundElement" 
            style={[
              styles.card,
              { 
                backgroundColor: isDark ? 'rgba(18, 24, 19, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 125, 50, 0.08)',
              }
            ]}
          >
            {!selectedImage ? (
              <View style={styles.emptyContainer}>
                <View style={styles.uploadGlowCircle}>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{ ios: 'camera.viewfinder', android: 'photo_camera', web: 'photo_camera' }}
                    size={48}
                  />
                </View>
                <ThemedText type="default" style={styles.promptTitle}>
                  Analizar cultivo de maíz
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.promptDesc}>
                  Sube o toma una foto enfocada de una hoja de maíz para diagnosticar su estado de salud.
                </ThemedText>

                <View style={styles.actionButtonsRow}>
                  <Pressable style={styles.pickerButton} onPress={pickImage}>
                    <LinearGradient
                      colors={isDark ? ['#10B981', '#059669'] : ['#2E7D32', '#1B5E20']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <SymbolView
                      tintColor="#ffffff"
                      name={{ ios: 'photo.on.rectangle.angled', android: 'image', web: 'image' }}
                      size={16}
                      style={{ zIndex: 1 }}
                    />
                    <ThemedText type="smallBold" style={[styles.pickerButtonText, { zIndex: 1 }]}>
                      Galería
                    </ThemedText>
                  </Pressable>

                  <Pressable style={styles.pickerButton} onPress={takePhoto}>
                    <LinearGradient
                      colors={isDark ? ['#10B981', '#059669'] : ['#2E7D32', '#1B5E20']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <SymbolView
                      tintColor="#ffffff"
                      name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                      size={16}
                      style={{ zIndex: 1 }}
                    />
                    <ThemedText type="smallBold" style={[styles.pickerButtonText, { zIndex: 1 }]}>
                      Cámara
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.previewContainer}>
                {/* Image preview frame with scanning effect */}
                <View style={[
                  styles.imageFrame,
                  resultsColor && { borderColor: resultsColor.primary, shadowColor: resultsColor.primary }
                ]}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  {loading && <View style={styles.scanningBar} />}
                </View>

                {/* Status or loading states */}
                {loading && (
                  <View style={styles.loadingWrapper}>
                    <ActivityIndicator size="large" color={isDark ? '#10B981' : '#2E7D32'} style={styles.loader} />
                    <ThemedText type="smallBold" style={styles.loadingHeading}>
                      Procesando muestra...
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.loadingSub}>
                      Alineando textura de clorofila y consultando al modelo Keras
                    </ThemedText>
                  </View>
                )}

                {error && (
                  <View style={styles.errorWrapper}>
                    <SymbolView
                      tintColor="#C62828"
                      name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                      size={20}
                    />
                    <ThemedText type="smallBold" style={styles.errorText}>
                      {error}
                    </ThemedText>
                    <Pressable style={styles.retryButton} onPress={analyzeImage}>
                      <ThemedText type="smallBold" style={styles.retryText}>Reintentar</ThemedText>
                    </Pressable>
                  </View>
                )}

                {!loading && !diagnosis && !error && (
                  <View style={styles.readyWrapper}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.readyText}>
                      Imagen cargada correctamente en memoria temporal.
                    </ThemedText>
                    <View style={styles.readyButtons}>
                      <Pressable style={styles.analyzeButton} onPress={analyzeImage}>
                        <LinearGradient
                          colors={isDark ? ['#10B981', '#059669'] : ['#2E7D32', '#1B5E20']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <SymbolView
                          tintColor="#ffffff"
                          name={{ ios: 'waveform.path.ecg.rectangle.fill', android: 'psychology', web: 'psychology' }}
                          size={16}
                          style={{ zIndex: 1 }}
                        />
                        <ThemedText type="smallBold" style={[styles.analyzeButtonText, { zIndex: 1 }]}>
                          Diagnosticar Hoja
                        </ThemedText>
                      </Pressable>
                      <Pressable style={styles.changeButton} onPress={resetScanner}>
                        <ThemedText type="small" themeColor="textSecondary">Cancelar</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ThemedView>

          {/* Diagnosis Results details */}
          {diagnosis && resultsColor && (
            <View style={styles.resultsContainer}>
              {/* Header result badge */}
              <View style={styles.diagnosisBadge}>
                <LinearGradient
                  colors={resultsColor.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[styles.badgeLeft, { zIndex: 1 }]}>
                  <SymbolView
                    tintColor="#ffffff"
                    name={diagnosis.prediction === 'Healthy' 
                      ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                      : { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }
                    }
                    size={22}
                  />
                  <View>
                    <ThemedText type="smallBold" style={styles.badgePreText}>
                      DIAGNÓSTICO ENCONTRADO:
                    </ThemedText>
                    <ThemedText type="default" style={styles.badgeTitle}>
                      {diagnosis.class_details.display_name}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.badgeRight, { zIndex: 1 }]}>
                  <ThemedText type="smallBold" style={styles.badgeConfPre}>
                    Confianza
                  </ThemedText>
                  <ThemedText type="subtitle" style={styles.badgeConfVal}>
                    {diagnosis.confidence.toFixed(1)}%
                  </ThemedText>
                </View>
              </View>

              {/* Reset floating button */}
              <Pressable style={styles.resetButton} onPress={resetScanner}>
                <SymbolView
                  tintColor="#ffffff"
                  name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
                  size={16}
                />
                <ThemedText type="smallBold" style={styles.resetText}>
                  Analizar otra muestra
                </ThemedText>
              </Pressable>

              {/* Accordion Panels for Disease details */}
              <View style={styles.accordionContainer}>
                {/* 1. Description */}
                <View style={styles.accordionItem}>
                  <Pressable 
                    style={[styles.accordionHeader, activeAccordion === 'desc' && styles.accordionHeaderActive]}
                    onPress={() => setActiveAccordion(activeAccordion === 'desc' ? null : 'desc')}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <SymbolView
                        tintColor={activeAccordion === 'desc' ? '#2E7D32' : theme.textSecondary}
                        name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
                        size={16}
                      />
                      <ThemedText type="smallBold" style={activeAccordion === 'desc' && { color: '#2E7D32' }}>
                        Descripción General
                      </ThemedText>
                    </View>
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={activeAccordion === 'desc' ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={14}
                    />
                  </Pressable>
                  {activeAccordion === 'desc' && (
                    <ThemedView type="backgroundSelected" style={styles.accordionBody}>
                      <ThemedText type="small" style={styles.accordionText}>
                        {diagnosis.class_details.description}
                      </ThemedText>
                    </ThemedView>
                  )}
                </View>

                {/* 2. Symptoms */}
                <View style={styles.accordionItem}>
                  <Pressable 
                    style={[styles.accordionHeader, activeAccordion === 'symptoms' && styles.accordionHeaderActive]}
                    onPress={() => setActiveAccordion(activeAccordion === 'symptoms' ? null : 'symptoms')}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <SymbolView
                        tintColor={activeAccordion === 'symptoms' ? '#2E7D32' : theme.textSecondary}
                        name={{ ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
                        size={16}
                      />
                      <ThemedText type="smallBold" style={activeAccordion === 'symptoms' && { color: '#2E7D32' }}>
                        ¿Cómo Identificarlo? (Síntomas)
                      </ThemedText>
                    </View>
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={activeAccordion === 'symptoms' ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={14}
                    />
                  </Pressable>
                  {activeAccordion === 'symptoms' && (
                    <ThemedView type="backgroundSelected" style={styles.accordionBody}>
                      <ThemedText type="small" style={styles.accordionText}>
                        {diagnosis.class_details.symptoms}
                      </ThemedText>
                    </ThemedView>
                  )}
                </View>

                {/* 3. Favored Conditions */}
                <View style={styles.accordionItem}>
                  <Pressable 
                    style={[styles.accordionHeader, activeAccordion === 'conditions' && styles.accordionHeaderActive]}
                    onPress={() => setActiveAccordion(activeAccordion === 'conditions' ? null : 'conditions')}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <SymbolView
                        tintColor={activeAccordion === 'conditions' ? '#2E7D32' : theme.textSecondary}
                        name={{ ios: 'cloud.sun.rain.fill', android: 'thermostat', web: 'thermostat' }}
                        size={16}
                      />
                      <ThemedText type="smallBold" style={activeAccordion === 'conditions' && { color: '#2E7D32' }}>
                        Condiciones que lo favorecen
                      </ThemedText>
                    </View>
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={activeAccordion === 'conditions' ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={14}
                    />
                  </Pressable>
                  {activeAccordion === 'conditions' && (
                    <ThemedView type="backgroundSelected" style={styles.accordionBody}>
                      <ThemedText type="small" style={styles.accordionText}>
                        {diagnosis.class_details.favored_conditions}
                      </ThemedText>
                    </ThemedView>
                  )}
                </View>

                {/* 4. Preventive Management */}
                <View style={styles.accordionItem}>
                  <Pressable 
                    style={[styles.accordionHeader, activeAccordion === 'prev' && styles.accordionHeaderActive]}
                    onPress={() => setActiveAccordion(activeAccordion === 'prev' ? null : 'prev')}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <SymbolView
                        tintColor={activeAccordion === 'prev' ? '#2E7D32' : theme.textSecondary}
                        name={{ ios: 'shield.fill', android: 'shield', web: 'shield' }}
                        size={16}
                      />
                      <ThemedText type="smallBold" style={activeAccordion === 'prev' && { color: '#2E7D32' }}>
                        Manejo Preventivo (Cultural)
                      </ThemedText>
                    </View>
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={activeAccordion === 'prev' ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={14}
                    />
                  </Pressable>
                  {activeAccordion === 'prev' && (
                    <ThemedView type="backgroundSelected" style={styles.accordionBody}>
                      <ThemedText type="small" style={styles.accordionText}>
                        {diagnosis.class_details.preventive_management}
                      </ThemedText>
                    </ThemedView>
                  )}
                </View>

                {/* 5. Treatment */}
                <View style={styles.accordionItem}>
                  <Pressable 
                    style={[styles.accordionHeader, activeAccordion === 'treat' && styles.accordionHeaderActive]}
                    onPress={() => setActiveAccordion(activeAccordion === 'treat' ? null : 'treat')}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <SymbolView
                        tintColor={activeAccordion === 'treat' ? '#2E7D32' : theme.textSecondary}
                        name={{ ios: 'testtube.2', android: 'science', web: 'science' }}
                        size={16}
                      />
                      <ThemedText type="smallBold" style={activeAccordion === 'treat' && { color: '#2E7D32' }}>
                        Tratamiento y Control
                      </ThemedText>
                    </View>
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={activeAccordion === 'treat' ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={14}
                    />
                  </Pressable>
                  {activeAccordion === 'treat' && (
                    <ThemedView type="backgroundSelected" style={styles.accordionBody}>
                      <ThemedText type="small" style={styles.accordionText}>
                        {diagnosis.class_details.treatment}
                      </ThemedText>
                    </ThemedView>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {Platform.OS === 'web' && webCameraActive && (
        <WebCamera
          onCapture={(uri) => {
            setSelectedImage(uri);
            setDiagnosis(null);
            setError(null);
            setWebCameraActive(false);
          }}
          onClose={() => setWebCameraActive(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    marginTop: Spacing.five,
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  logoBadge: {
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.15)',
    marginBottom: Spacing.one,
    backdropFilter: 'blur(8px)',
  } as any,
  logoText: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: 0.5,
  },
  logoHighlight: {
    fontSize: 26,
    fontWeight: '900',
  },
  tagline: {
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: Spacing.four,
    opacity: 0.8,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: 24,
    padding: Spacing.five,
    alignSelf: 'center',
    borderWidth: 1,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: Spacing.five,
  } as any,
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  uploadGlowCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'rgba(128,128,128,0.15)',
    borderStyle: 'dashed',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  promptDesc: {
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.four,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pickerButton: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.five,
    borderRadius: 14,
    gap: Spacing.two,
    minWidth: 140,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pickerButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  imageFrame: {
    width: 250,
    height: 250,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.2)',
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    backgroundColor: '#111',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scanningBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#A1E8AF',
    shadowColor: '#2E7D32',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
    animationDuration: '2s',
  },
  loadingWrapper: {
    alignItems: 'center',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  loader: {
    marginBottom: Spacing.two,
  },
  loadingHeading: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Spacing.half,
  },
  loadingSub: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 16,
  },
  readyWrapper: {
    alignItems: 'center',
    marginTop: Spacing.three,
    width: '100%',
  },
  readyText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  readyButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    justifyContent: 'center',
  },
  analyzeButton: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.six,
    borderRadius: 14,
    gap: Spacing.two,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  changeButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  errorWrapper: {
    alignItems: 'center',
    marginTop: Spacing.three,
    padding: Spacing.three,
    backgroundColor: 'rgba(198, 40, 40, 0.05)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.1)',
    width: '100%',
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: '#C62828',
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
  },
  resultsContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  diagnosisBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: Spacing.three,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  badgePreText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  badgeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  badgeRight: {
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    paddingLeft: Spacing.three,
  },
  badgeConfPre: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
  },
  badgeConfVal: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  resetText: {
    color: '#ffffff',
    fontSize: 13,
  },
  accordionContainer: {
    width: '100%',
    gap: Spacing.two,
  },
  accordionItem: {
    width: '100%',
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    backgroundColor: 'rgba(128, 128, 128, 0.03)',
  },
  accordionHeaderActive: {
    backgroundColor: 'rgba(46, 125, 50, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.05)',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  accordionBody: {
    padding: Spacing.three,
  },
  accordionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
