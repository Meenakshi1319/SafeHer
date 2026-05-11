import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '@core/firebase';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login Success:", userCredential.user.email);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.log("Login error:", error.code, error.message);
      if (error.code === 'auth/invalid-credential') {
        alert("Wrong email or password. Please try again.");
      } else if (error.code === 'auth/user-not-found') {
        alert("No account found with this email. Please register first.");
      } else if (error.code === 'auth/too-many-requests') {
        alert("Too many failed attempts. Please wait a moment and try again.");
      } else {
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Text style={styles.logoIcon}>🛡️</Text>
          <Text style={styles.logoText}>SafeHer</Text>
          <Text style={styles.logoSub}>Welcome back</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#F2EDE8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#F2EDE8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color='#F2EDE8' />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
              <Text style={{ color: '#E66A6A', fontSize: 12 }}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color='#F5E6D3' />
            ) : (
              <Text style={styles.submitText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 10 }}
            onPress={() => router.replace('/register')}
          >
            <Text style={{ color: '#F2EDE8', fontSize: 13 }}>
              Do not have an account? <Text style={{ color: '#E66A6A' }}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3A1F28' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logoWrapper: { alignItems: 'center', marginBottom: 36 },
  logoIcon: { fontSize: 48, marginBottom: 8 },
  logoText: { color: '#E66A6A', fontSize: 28, fontWeight: '600', letterSpacing: 1 },
  logoSub: { color: '#F2EDE8', fontSize: 13, marginTop: 6 },
  form: { gap: 16 },
  inputWrapper: { gap: 6 },
  inputLabel: { color: '#F2EDE8', fontSize: 13 },
  input: {
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 12,
    padding: 14,
    color: '#F5E6D3',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: '#F5E6D3',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 14,
  },
  submitBtn: {
    backgroundColor: '#E66A6A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#E66A6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitText: { color: '#F5E6D3', fontSize: 16, fontWeight: '600' },
});
