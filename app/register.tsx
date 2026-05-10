import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from "../services/api";
import { auth } from "../services/firebase";

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      // Create account with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Set display name on the Firebase Auth profile
      await updateProfile(user, { displayName: name });

      // Create Firestore user profile via backend
      try {
        await apiPost('/signup', { uid: user.uid, name, email });
      } catch (profileErr) {
        // Non-fatal: auth succeeded, profile creation failed
        console.log('Profile creation warning:', profileErr);
      }

      console.log("✅ Signup Success:", user.email);
      alert("Account created successfully!");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.log("Signup error:", error.code, error.message);
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered. Please login instead.");
      } else if (error.code === 'auth/weak-password') {
        alert("Password is too weak. Use at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Please enter a valid email address.");
      } else {
        alert(error.message);
      }
    } finally {
      setLoading(false);
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
          <Text style={styles.logoSub}>Create your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="rgba(255,255,255,0.2)"
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
                placeholder="Create a password (min 6 chars)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 10 }}
            onPress={() => router.replace('/login')}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Already have an account? <Text style={{ color: '#e05a7a' }}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logoWrapper: { alignItems: 'center', marginBottom: 36 },
  logoIcon: { fontSize: 48, marginBottom: 8 },
  logoText: { color: '#e05a7a', fontSize: 28, fontWeight: '600', letterSpacing: 1 },
  logoSub: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 },
  form: { gap: 16 },
  inputWrapper: { gap: 6 },
  inputLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: 'white',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: 'white',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 14,
  },
  submitBtn: {
    backgroundColor: '#e05a7a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#e05a7a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
