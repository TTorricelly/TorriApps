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
  User,
  Mail,
  Calendar,
  Edit3,
  HelpCircle,
  LogOut,
} from 'lucide-react-native';

// Phone icon component (since lucide-react-native doesn't have a good phone icon)
const PhoneIcon = ({ size = 20, color = "#6b7280" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.8, color }}>📱</Text>
  </View>
);

interface ProfileScreenProps {
  onLogout: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<'profile' | 'edit'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
  });

  // Temporary state for editing
  const [editData, setEditData] = useState<UserProfile>(userProfile);

  const handleUpdateProfile = () => {
    if (!editData.name || !editData.email || !editData.phone) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    
    setUserProfile(editData);
    setCurrentView('profile');
    Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  const renderEditProfile = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ padding: 24 }}>
        {/* Header Text */}
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: 8 
          }}>
            Editar Perfil
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: '#6b7280', 
            textAlign: 'center' 
          }}>
            Atualize suas informações pessoais
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
              value={editData.name}
              onChangeText={(text) => setEditData({ ...editData, name: text })}
              autoCapitalize="words"
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
              value={editData.phone}
              onChangeText={(text) => setEditData({ ...editData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Email Field */}
        <View style={{ marginBottom: 32 }}>
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
              value={editData.email}
              onChangeText={(text) => setEditData({ ...editData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: 'white',
            }}
            onPress={() => {
              setEditData(userProfile); // Reset to original data
              setCurrentView('profile');
            }}
          >
            <Text style={{ color: '#374151', fontSize: 16, fontWeight: '500' }}>
              Cancelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 16,
              backgroundColor: '#ec4899',
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={handleUpdateProfile}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              Salvar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderProfileView = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ padding: 24 }}>
        {/* Profile Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ 
            width: 96, 
            height: 96, 
            backgroundColor: '#fce7f3', 
            borderRadius: 48, 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <User size={48} color="#ec4899" />
          </View>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: 4 
          }}>
            {userProfile.name}
          </Text>
          <Text style={{ fontSize: 16, color: '#6b7280' }}>
            {userProfile.email}
          </Text>
        </View>

        {/* Profile Information */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: 16 
            }}>
              Informações Pessoais
            </Text>

            <View style={{ gap: 12 }}>
              {/* Name */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <User size={20} color="#6b7280" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>Nome</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                    {userProfile.name}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Mail size={20} color="#6b7280" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>E-mail</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                    {userProfile.email}
                  </Text>
                </View>
              </View>

              {/* Phone */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginRight: 12 }}>
                  <PhoneIcon size={20} color="#6b7280" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>Telefone</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                    {userProfile.phone}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 12 }}>
          {/* Edit Information */}
          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 18,
              backgroundColor: '#ec4899',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setCurrentView('edit')}
          >
            <Edit3 size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Editar Informações
            </Text>
          </TouchableOpacity>

          {/* My Appointments */}
          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 18,
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade será implementada em breve.')}
          >
            <Calendar size={20} color="#374151" style={{ marginRight: 8 }} />
            <Text style={{ color: '#374151', fontSize: 18, fontWeight: 'bold' }}>
              Meus Agendamentos
            </Text>
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 18,
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => Alert.alert('Ajuda', 'Entre em contato conosco pelo WhatsApp: (11) 99999-9999')}
          >
            <HelpCircle size={20} color="#374151" style={{ marginRight: 8 }} />
            <Text style={{ color: '#374151', fontSize: 18, fontWeight: 'bold' }}>
              Ajuda e Suporte
            </Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 18,
              backgroundColor: '#ef4444',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleLogoutPress}
          >
            <LogOut size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Sair da Conta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      <StatusBar barStyle="light-content" backgroundColor="#ec4899" />
      
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: 'white' 
          }}>
            Meu Perfil
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ 
        flex: 1, 
        backgroundColor: 'white',
      }}>
        {currentView === 'edit' ? renderEditProfile() : renderProfileView()}
      </View>
    </View>
  );
};

export default ProfileScreen;