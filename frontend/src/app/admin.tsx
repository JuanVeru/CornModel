import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToastContainer, useToast } from '@/components/toast';
import { Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/constants/config';

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

export default function AdminScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { toasts, showToast, dismissToast } = useToast();

  // Authentication states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Content states
  const [classes, setClasses] = useState<CornClassDetails[]>([]);
  const [selectedClass, setSelectedClass] = useState<CornClassDetails | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [favoredConditions, setFavoredConditions] = useState('');
  const [preventiveManagement, setPreventiveManagement] = useState('');
  const [treatment, setTreatment] = useState('');

  // Fetch all classes from database
  const fetchClasses = async () => {
    setLoadingContent(true);
    try {
      const response = await fetch(`${API_URL}/api/classes`);
      if (!response.ok) {
        throw new Error('Fallo al obtener listado de clases');
      }
      const data = await response.json();
      setClasses(data);
      // Auto select the first class for editing
      if (data.length > 0 && !selectedClass) {
        selectClassForEdit(data[0]);
      }
    } catch (err) {
      showToast('No se pudieron descargar los datos de la base de datos.', 'error');
    } finally {
      setLoadingContent(false);
    }
  };

  // Populate form with selected class
  const selectClassForEdit = (cornClass: CornClassDetails) => {
    setSelectedClass(cornClass);
    setDisplayName(cornClass.display_name);
    setDescription(cornClass.description);
    setSymptoms(cornClass.symptoms);
    setFavoredConditions(cornClass.favored_conditions);
    setPreventiveManagement(cornClass.preventive_management);
    setTreatment(cornClass.treatment);
    setEditSuccess(false);
  };

  // Handle Login Submit
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showToast('Ingresa usuario y contraseña para continuar.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas o servidor inactivo.');
      }

      const result = await response.json();
      setToken(result.access_token);
      // Clean credentials from fields
      setPassword('');
    } catch (err: any) {
      showToast(err.message || 'Error al conectar al backend.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Log Out
  const handleLogout = () => {
    setToken(null);
    setSelectedClass(null);
    setClasses([]);
    setEditSuccess(false);
  };

  // Handle Form Update Submit
  const handleUpdate = async () => {
    if (!selectedClass || !token) return;

    const trimmedDisplayName = displayName.trim();
    const trimmedDescription = description.trim();
    const trimmedSymptoms = symptoms.trim();
    const trimmedFavoredConditions = favoredConditions.trim();
    const trimmedPreventiveManagement = preventiveManagement.trim();
    const trimmedTreatment = treatment.trim();

    if (
      !trimmedDisplayName ||
      !trimmedDescription ||
      !trimmedSymptoms ||
      !trimmedFavoredConditions ||
      !trimmedPreventiveManagement ||
      !trimmedTreatment
    ) {
      showToast('Todos los campos son requeridos y no pueden estar vacíos o contener solo espacios.', 'error');
      return;
    }

    setSaveLoading(true);
    setEditSuccess(false);

    try {
      const response = await fetch(`${API_URL}/api/classes/${selectedClass.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: trimmedDisplayName,
          description: trimmedDescription,
          symptoms: trimmedSymptoms,
          favored_conditions: trimmedFavoredConditions,
          preventive_management: trimmedPreventiveManagement,
          treatment: trimmedTreatment,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
        }
        throw new Error('No se pudo guardar la información de la clase.');
      }

      const updatedClass = await response.json();
      
      // Update local state
      setClasses(prev => prev.map(c => c.name === updatedClass.name ? updatedClass : c));
      setSelectedClass(updatedClass);
      setEditSuccess(true);
      showToast('¡Información actualizada correctamente en la base de datos!', 'success');
    } catch (err: any) {
      showToast(err.message || 'No se pudo contactar al servidor.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Fetch classes when token changes (when logged in successfully)
  useEffect(() => {
    if (token) {
      fetchClasses();
    }
  }, [token]);

  return (
    <ThemedView style={styles.outerContainer}>
      {/* Central auto-dismiss toast overlay */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <SafeAreaView style={styles.safeArea}>
        {/* Unauthenticated View: Login Form */}
        {!token ? (
          <ScrollView
            contentContainerStyle={styles.authScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.loginHeader}>
              <View style={[styles.adminBadge, { borderColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(46,125,50,0.15)' }]}>
                <SymbolView
                  tintColor={isDark ? '#10B981' : '#2E7D32'}
                  name={{ ios: 'lock.shield.fill', android: 'admin_panel_settings', web: 'admin_panel_settings' }}
                  size={28}
                />
              </View>
              <ThemedText type="subtitle" style={styles.loginTitle}>
                Acceso Administrativo
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.loginTagline}>
                Inicia sesión para actualizar las bases de datos de tratamientos y sintomatología foliar
              </ThemedText>
            </View>

            <ThemedView 
              type="backgroundElement" 
              style={[
                styles.loginCard,
                {
                  backgroundColor: isDark ? 'rgba(18, 24, 19, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 125, 50, 0.08)',
                }
              ]}
            >
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.inputLabel}>
                  Usuario de Administración
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                    size={16}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Ej. admin"
                    placeholderTextColor={theme.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.inputLabel}>
                  Contraseña
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{ ios: 'key.fill', android: 'vpn_key', web: 'vpn_key' }}
                    size={16}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Contraseña del sistema"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable 
                    onPress={() => setShowPassword(!showPassword)} 
                    style={styles.eyeBtn}
                  >
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={showPassword ? { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
                      size={16}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable 
                style={[styles.loginBtn, authLoading && styles.disabledBtn]} 
                onPress={handleLogin}
                disabled={authLoading}
              >
                <LinearGradient
                  colors={isDark ? ['#10B981', '#059669'] : ['#2E7D32', '#1B5E20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                {authLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ zIndex: 1 }} />
                ) : (
                  <>
                    <SymbolView
                      tintColor="#ffffff"
                      name={{ ios: 'arrow.right.square.fill', android: 'login', web: 'login' }}
                      size={16}
                      style={{ zIndex: 1 }}
                    />
                    <ThemedText type="smallBold" style={[styles.loginBtnText, { zIndex: 1 }]}>
                      Ingresar al Panel
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </ThemedView>
          </ScrollView>
        ) : (
          /* Authenticated View: Dashboard */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header row with log out */}
            <View style={styles.dashboardHeader}>
              <View>
                <ThemedText type="subtitle" style={styles.dashboardTitle}>
                  Dashboard
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Administrador activo: <ThemedText type="smallBold">{username || 'admin'}</ThemedText>
                </ThemedText>
              </View>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <SymbolView
                  tintColor="#C62828"
                  name={{ ios: 'power.circle.fill', android: 'logout', web: 'logout' }}
                  size={14}
                />
                <ThemedText type="smallBold" style={styles.logoutText}>
                  Salir
                </ThemedText>
              </Pressable>
            </View>

            {/* Quick class selectors */}
            <View style={styles.selectorsWrapper}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Seleccionar Cultivo para Editar
              </ThemedText>
              
              {loadingContent ? (
                <ActivityIndicator size="small" color={isDark ? '#10B981' : '#2E7D32'} style={{ marginVertical: Spacing.two }} />
              ) : (
                <View style={styles.selectorsRow}>
                  {classes.map((cls) => {
                    const isSelected = selectedClass?.name === cls.name;
                    return (
                      <Pressable
                        key={cls.name}
                        style={[
                          styles.selectorTab,
                          isSelected && styles.selectorTabActive,
                          { borderColor: isSelected ? (isDark ? '#10B981' : '#2E7D32') : 'rgba(128,128,128,0.15)' }
                        ]}
                        onPress={() => selectClassForEdit(cls)}
                      >
                        <ThemedText 
                          type="smallBold" 
                          style={[styles.selectorTabText, isSelected && { color: isDark ? '#10B981' : '#2E7D32' }]}
                        >
                          {cls.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Main Editing Form Workspace */}
            {selectedClass && (
              <ThemedView 
                type="backgroundElement" 
                style={[
                  styles.workspaceCard,
                  {
                    backgroundColor: isDark ? 'rgba(18, 24, 19, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 125, 50, 0.08)',
                  }
                ]}
              >
                <View style={styles.cardHeader}>
                  <SymbolView
                    tintColor={isDark ? '#10B981' : '#2E7D32'}
                    name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
                    size={16}
                  />
                  <ThemedText type="default" style={styles.workspaceTitle}>
                    Editando: {selectedClass.name}
                  </ThemedText>
                </View>

                {editSuccess && (
                  <View style={styles.successIndicator}>
                    <SymbolView
                      tintColor={isDark ? '#10B981' : '#2E7D32'}
                      name={{ ios: 'checkmark.seal.fill', android: 'check_circle', web: 'check_circle' }}
                      size={16}
                    />
                    <ThemedText type="smallBold" style={styles.successIndText}>
                      ¡Cambios guardados con éxito en la base de datos!
                    </ThemedText>
                  </View>
                )}

                {/* Form fields */}
                <View style={styles.formContainer}>
                  <View style={styles.fieldGroup}>
                    <ThemedText type="smallBold" style={styles.fieldLabel}>
                      Nombre de Visualización
                    </ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: theme.text, borderColor: 'rgba(128,128,128,0.2)' }]}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Ej. Roya Común (Puccinia sorghi)"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="smallBold" style={styles.fieldLabel}>
                      Descripción General
                    </ThemedText>
                    <TextInput
                      style={[styles.formTextArea, { color: theme.text, borderColor: 'rgba(128,128,128,0.2)' }]}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      placeholder="Descripción de la planta o patógeno..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="smallBold" style={styles.fieldLabel}>
                      ¿Cómo Identificarlo? (Síntomas)
                    </ThemedText>
                    <TextInput
                      style={[styles.formTextArea, { color: theme.text, borderColor: 'rgba(128,128,128,0.2)' }]}
                      value={symptoms}
                      onChangeText={setSymptoms}
                      multiline
                      numberOfLines={4}
                      placeholder="Lista o detalles de los síntomas foliares..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="smallBold" style={styles.fieldLabel}>
                      Condiciones que lo favorecen
                    </ThemedText>
                    <TextInput
                      style={[styles.formTextArea, { color: theme.text, borderColor: 'rgba(128,128,128,0.2)' }]}
                      value={favoredConditions}
                      onChangeText={setFavoredConditions}
                      multiline
                      numberOfLines={3}
                      placeholder="Ej. Humedad prolongada, temperaturas entre..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="smallBold" style={styles.fieldLabel}>
                      Manejo Preventivo (Cultural)
                    </ThemedText>
                    <TextInput
                      style={[styles.formTextArea, { color: theme.text, borderColor: 'rgba(128,128,128,0.2)' }]}
                      value={preventiveManagement}
                      onChangeText={setPreventiveManagement}
                      multiline
                      numberOfLines={4}
                      placeholder="Medidas culturales preventivas en el campo..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="smallBold" style={styles.fieldLabel}>
                      Tratamiento y Control
                    </ThemedText>
                    <TextInput
                      style={[styles.formTextArea, { color: theme.text, borderColor: 'rgba(128,128,128,0.2)' }]}
                      value={treatment}
                      onChangeText={setTreatment}
                      multiline
                      numberOfLines={4}
                      placeholder="Fungicidas químicos o biológicos aplicables..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <Pressable 
                    style={[styles.saveBtn, saveLoading && styles.disabledBtn]} 
                    onPress={handleUpdate}
                    disabled={saveLoading}
                  >
                    <LinearGradient
                      colors={isDark ? ['#10B981', '#059669'] : ['#2E7D32', '#1B5E20']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {saveLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" style={{ zIndex: 1 }} />
                    ) : (
                      <>
                        <SymbolView
                          tintColor="#ffffff"
                          name={{ ios: 'checkmark.circle.fill', android: 'save', web: 'save' }}
                          size={16}
                          style={{ zIndex: 1 }}
                        />
                        <ThemedText type="smallBold" style={[styles.saveBtnText, { zIndex: 1 }]}>
                          Guardar en Base de Datos
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                </View>
              </ThemedView>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
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
  authScrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: Spacing.five,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  adminBadge: {
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.15)',
    marginBottom: Spacing.one,
    backdropFilter: 'blur(8px)',
  } as any,
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  loginTagline: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
    paddingHorizontal: Spacing.four,
  },
  loginCard: {
    width: '100%',
    maxWidth: 450,
    borderRadius: 24,
    padding: Spacing.five,
    borderWidth: 1,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  } as any,
  inputGroup: {
    marginBottom: Spacing.three,
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: Spacing.one,
    opacity: 0.9,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
    paddingHorizontal: Spacing.three,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
    outlineStyle: 'none',
  } as any,
  eyeBtn: {
    padding: Spacing.one,
  },
  loginBtn: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: Spacing.two,
    marginTop: Spacing.two,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    alignItems: 'center',
  },
  dashboardHeader: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.five,
    marginBottom: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)',
    paddingBottom: Spacing.three,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.2)',
    backgroundColor: 'rgba(198, 40, 40, 0.03)',
  },
  logoutText: {
    color: '#C62828',
    fontSize: 12,
  },
  selectorsWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: Spacing.two,
  },
  selectorsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
  },
  selectorTab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.02)',
  },
  selectorTabActive: {
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
  },
  selectorTabText: {
    fontSize: 12,
  },
  workspaceCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: 24,
    padding: Spacing.five,
    borderWidth: 1,
    backdropFilter: 'blur(20px)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
    marginBottom: Spacing.five,
  } as any,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  workspaceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two + 2,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.1)',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  successIndText: {
    fontSize: 12,
  },
  formContainer: {
    width: '100%',
    gap: Spacing.three,
  },
  fieldGroup: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: Spacing.one,
    opacity: 0.8,
  },
  formInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(128,128,128,0.03)',
    outlineStyle: 'none',
  } as any,
  formTextArea: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(128,128,128,0.03)',
    textAlignVertical: 'top',
    outlineStyle: 'none',
  } as any,
  saveBtn: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    gap: Spacing.two,
    marginTop: Spacing.two,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
  },
});
