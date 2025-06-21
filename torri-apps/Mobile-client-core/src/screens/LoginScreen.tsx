import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator, // Added for loading indication
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as authService from '../services/authService'; // Adjusted import
import useAuthStore from '../store/authStore'; // Adjusted import
import * as companyService from '../services/companyService';

interface CompanyInfo {
  id?: string;
  name?: string;
  logo_url?: string;
}
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
} from 'lucide-react-native';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToCreateAccount: () => void;
}


const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginSuccess,
  onNavigateToCreateAccount
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Added for loading state
  const [companyName, setCompanyName] = useState('Nome do Salão'); // Default fallback
  const storeLogin = useAuthStore((state) => state.login); // Get the login action from the store

  // Fetch company information when component mounts
  React.useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const companyInfo: CompanyInfo = await companyService.getCompanyInfo();
        if (companyInfo.name) {
          setCompanyName(companyInfo.name);
        }
      } catch (error) {
        console.log('[LoginScreen] Failed to fetch company info, using default name:', error);
        // Keep default name on error
      }
    };

    fetchCompanyInfo();
  }, []);

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    try {
      const tokenData = await authService.login(emailOrPhone, password);
      
      // Check if login was successful (tokenData is not null)
      if (tokenData) {
        // The authStore's login action will handle decoding and setting user data
        await storeLogin(tokenData);
        // onLoginSuccess prop is used by the navigator to switch screens
        onLoginSuccess();
      } else {
        Alert.alert('Falha no Login', 'Credenciais inválidas. Tente novamente.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      Alert.alert('Falha no Login', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Simulate social login - This would also need to be updated
    // For now, it might call the store's login with mock data or a social token
    Alert.alert('Social Login', `Social login com ${provider} não implementado.`);
    // onLoginSuccess();
  };


  const renderLoginForm = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ padding: 24 }}>
        {/* Header Text */}
        <View style={{ marginBottom: 32, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: 8 
          }}>
            Entrar na sua conta
          </Text>
          <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
            Acesse sua conta para agendar seus serviços
          </Text>
        </View>

        {/* Email or Phone Field */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            E-mail ou Telefone
          </Text>
          <View style={{ position: 'relative' }}>
            {emailOrPhone.includes('@') ? (
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
            ) : (
              <Phone 
                size={20} 
                color="#9ca3af" 
                style={{ 
                  position: 'absolute', 
                  left: 12, 
                  top: 18, 
                  zIndex: 1 
                }} 
              />
            )}
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
              placeholder="seu@email.com ou (11) 99999-9999"
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Password Field */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Senha
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
                paddingRight: 48,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 12,
                fontSize: 16,
                backgroundColor: 'white',
              }}
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={{ 
                position: 'absolute', 
                right: 12, 
                top: 18, 
                zIndex: 1 
              }}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#9ca3af" />
              ) : (
                <Eye size={20} color="#9ca3af" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password */}
        <View style={{ alignItems: 'flex-end', marginBottom: 24 }}>
          <TouchableOpacity>
            <Text style={{ color: '#ec4899', fontSize: 14 }}>
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={{
            width: '100%',
            paddingVertical: 16,
            backgroundColor: isLoading ? '#f8bbd0' : '#ec4899', // Change color when loading
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
          }}
          onPress={handleLogin}
          disabled={isLoading} // Disable button when loading
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Entrar
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginVertical: 24 
        }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#d1d5db' }} />
          <Text style={{ 
            paddingHorizontal: 16, 
            color: '#6b7280', 
            fontSize: 14 
          }}>
            ou continue com
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#d1d5db' }} />
        </View>

        {/* Social Login Buttons */}
        <View style={{ marginBottom: 32 }}>
          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              backgroundColor: 'white',
            }}
            onPress={() => handleSocialLogin('google')}
          >
            <Text style={{ color: '#374151', fontSize: 16, fontWeight: '500' }}>
              Continuar com Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
            }}
            onPress={() => handleSocialLogin('facebook')}
          >
            <Text style={{ color: '#374151', fontSize: 16, fontWeight: '500' }}>
              Continuar com Facebook
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alternative Login Help */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
            Já tem uma conta?{' '}
            <Text style={{ color: '#ec4899', fontWeight: '500' }}>
              Use suas credenciais acima
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );


  return (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      <StatusBar barStyle="light-content" backgroundColor="#ec4899" />
      
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 24, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: 'white' 
          }}>
            {companyName}
          </Text>
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 16, 
              color: '#fce7f3', 
              textAlign: 'center',
              marginBottom: 4
            }}>
              Acabou de baixar o app?
            </Text>
            <TouchableOpacity onPress={onNavigateToCreateAccount}>
              <Text style={{ 
                fontSize: 18, 
                color: 'white', 
                fontWeight: 'bold',
                textDecorationLine: 'underline'
              }}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ 
        flex: 1, 
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 16,
      }}>
        {renderLoginForm()}
      </View>
    </View>
  );
};

export default LoginScreen;