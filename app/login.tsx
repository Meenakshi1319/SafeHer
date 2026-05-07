import { createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth} from "../services/firebase";
import { useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

const handleSubmit = async () => {
  try {
    if (isLogin) {
      // LOGIN

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("✅ Login Success:", userCredential.user);

      alert("Login Successful");

      router.replace("/(tabs)");

    } else {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  console.log("Signup Success:", userCredential.user);

  alert("Signup Successful");

  router.replace("/(tabs)");
}

  } catch (error: any) {
    console.log(error.message);
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
          <Text style={styles.logoSub}>Your personal safety companion</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, isLogin && styles.toggleActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !isLogin && styles.toggleActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {!isLogin && (
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
          )}

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
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>
              {isLogin ? 'Login' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleBtn}>
            <Text style={styles.googleText}>🔵 Continue with Google</Text>
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing you agree to SafeHer's{' '}
          <Text style={styles.footerLink}>Terms & Privacy Policy</Text>
        </Text>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  logoText: {
    color: '#e05a7a',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 1,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 6,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: '#e05a7a',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: 'white',
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: 'white',
    fontSize: 14,
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
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  googleBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  googleText: {
    color: 'white',
    fontSize: 14,
  },
  footer: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
  footerLink: {
    color: '#e05a7a',
  },
});