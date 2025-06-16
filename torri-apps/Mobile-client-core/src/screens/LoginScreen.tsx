import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email && password) {
      onLoginSuccess();
    } else {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Simulate social login
    onLoginSuccess();
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

        {/* Email Field */}
        <View style={{ marginBottom: 24 }}>
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
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
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
            backgroundColor: '#ec4899',
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
          }}
          onPress={handleLogin}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            Entrar
          </Text>
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
            Nome do Salão
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