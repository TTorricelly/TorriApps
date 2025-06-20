import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
} from 'lucide-react-native';
import * as authService from '../services/authService';

// Phone icon component (since lucide-react-native doesn't have a good phone icon)
const PhoneIcon = ({ size = 20, color = "#9ca3af" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.8, color }}>📱</Text>
  </View>
);

interface CreateAccountScreenProps {
  onBackPress: () => void;
  onAccountCreated: () => void;
}

interface SignupData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

const CreateAccountScreen: React.FC<CreateAccountScreenProps> = ({ 
  onBackPress, 
  onAccountCreated 
}) => {
  const [signupData, setSignupData] = useState<SignupData>({
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!signupData.name || !signupData.email || !signupData.password) {
      Alert.alert('Erro', 'Por favor, preencha pelo menos nome, email e senha.');
      return;
    }

    if (signupData.password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare registration data
      const registrationData = {
        full_name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        phone_number: signupData.phone || null, // Optional field
      };

      console.log('[CreateAccountScreen] Registering user with data:', registrationData);
      
      // Call the registration API
      const userData = await authService.register(registrationData);
      
      console.log('[CreateAccountScreen] User registered successfully:', userData);
      
      // Show success message
      Alert.alert(
        'Conta Criada!', 
        'Sua conta foi criada com sucesso. Faça login para continuar.',
        [
          {
            text: 'OK',
            onPress: onAccountCreated
          }
        ]
      );
      
    } catch (error) {
      console.error('[CreateAccountScreen] Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      Alert.alert('Erro no Cadastro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      <StatusBar barStyle="light-content" backgroundColor="#ec4899" />
      
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ 
          backgroundColor: '#ec4899', 
          padding: 16, 
          flexDirection: 'row', 
          alignItems: 'center' 
        }}>
          <TouchableOpacity 
            onPress={onBackPress}
            style={{ marginRight: 16, padding: 4 }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: 'white' 
          }}>
            Criar Conta
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ 
        flex: 1, 
        backgroundColor: 'white',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ padding: 24 }}>
            {/* Header Text */}
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                color: '#1f2937', 
                marginBottom: 8 
              }}>
                Cadastre-se
              </Text>
              <Text style={{ 
                fontSize: 16, 
                color: '#6b7280', 
                textAlign: 'center' 
              }}>
                Preencha seus dados para criar sua conta
              </Text>
            </View>

            {/* Name Field */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: 8 
              }}>
                Nome completo
              </Text>
              <View style={{ position: 'relative' }}>
                <User 
                  size={20} 
                  color="#9ca3af" 
                  style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: 18, 
                    zIndex: 1 
                  }} 
                />
                <TextInput
                  style={{
                    width: '100%',
                    paddingLeft: 44,
                    paddingRight: 16,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    fontSize: 16,
                    backgroundColor: 'white',
                  }}
                  placeholder="Seu nome completo"
                  value={signupData.name}
                  onChangeText={(text) => setSignupData({ ...signupData, name: text })}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone Field */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: 8 
              }}>
                Celular
              </Text>
              <View style={{ position: 'relative' }}>
                <View style={{ 
                  position: 'absolute', 
                  left: 12, 
                  top: 18, 
                  zIndex: 1 
                }}>
                  <PhoneIcon size={20} color="#9ca3af" />
                </View>
                <TextInput
                  style={{
                    width: '100%',
                    paddingLeft: 44,
                    paddingRight: 16,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    fontSize: 16,
                    backgroundColor: 'white',
                  }}
                  placeholder="(11) 99999-9999"
                  value={signupData.phone}
                  onChangeText={(text) => setSignupData({ ...signupData, phone: text })}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: 8 
              }}>
                E-mail
              </Text>
              <View style={{ position: 'relative' }}>
                <Mail 
                  size={20} 
                  color="#9ca3af" 
                  style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: 18, 
                    zIndex: 1 
                  }} 
                />
                <TextInput
                  style={{
                    width: '100%',
                    paddingLeft: 44,
                    paddingRight: 16,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    fontSize: 16,
                    backgroundColor: 'white',
                  }}
                  placeholder="seu@email.com"
                  value={signupData.email}
                  onChangeText={(text) => setSignupData({ ...signupData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: 8 
              }}>
                Nova senha
              </Text>
              <View style={{ position: 'relative' }}>
                <Lock 
                  size={20} 
                  color="#9ca3af" 
                  style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: 18, 
                    zIndex: 1 
                  }} 
                />
                <TextInput
                  style={{
                    width: '100%',
                    paddingLeft: 44,
                    paddingRight: 16,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    fontSize: 16,
                    backgroundColor: 'white',
                  }}
                  placeholder="Mínimo 6 caracteres"
                  value={signupData.password}
                  onChangeText={(text) => setSignupData({ ...signupData, password: text })}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={{ 
                fontSize: 12, 
                color: '#6b7280', 
                marginTop: 4 
              }}>
                A senha deve ter pelo menos 6 caracteres
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                paddingVertical: 18,
                backgroundColor: isLoading ? '#f8bbd0' : '#ec4899',
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 24,
              }}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  Cadastrar
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms and Privacy */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <Text style={{ 
                fontSize: 12, 
                color: '#6b7280', 
                textAlign: 'center',
                lineHeight: 16
              }}>
                Ao se cadastrar, você concorda com nossos{' '}
                <Text style={{ color: '#ec4899' }}>
                  Termos de Uso
                </Text>
                {' '}e{' '}
                <Text style={{ color: '#ec4899' }}>
                  Política de Privacidade
                </Text>
              </Text>
            </View>

            {/* Back to Login */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                Já tem uma conta?{' '}
                <Text 
                  style={{ color: '#ec4899', fontWeight: 'bold' }}
                  onPress={onBackPress}
                >
                  Fazer login
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default CreateAccountScreen;