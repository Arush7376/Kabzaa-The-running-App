import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  background: '#05070c',
  panel: '#101521',
  border: '#1c2432',
  text: '#f4f7fb',
  muted: '#7d8ca4',
  accent: '#63f98d',
  accentDark: '#05110a',
};

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) {
      Alert.alert('Missing details', 'Enter your username and password.');
      return;
    }

    setLoading(true);

    try {
      await signIn(username.trim(), password);
    } catch (error) {
      const message =
        error?.response?.data?.error || error?.message || 'Unable to sign in right now.';
      Alert.alert('Login failed', String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>KABZAA // ACCESS NODE</Text>
          <Text style={styles.title}>Log in and take the route.</Text>
          <Text style={styles.subtitle}>
            Your session token unlocks live GPS tracking and territory capture.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="runner_name"
            placeholderTextColor="#4d5a70"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#4d5a70"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={loading}
            onPress={handleLogin}
            style={[styles.primaryButton, loading && styles.disabled]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.accentDark} />
            ) : (
              <Text style={styles.primaryButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Signup')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
  },
  kicker: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 320,
  },
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 20,
  },
  label: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#090d15',
    borderColor: '#202b3d',
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonText: {
    color: COLORS.accentDark,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
});
