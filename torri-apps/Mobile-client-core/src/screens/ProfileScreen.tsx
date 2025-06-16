import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Image, // Added for photo display
  StyleSheet, // Added for styles
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api'; // For potential photo URL construction
import {
  User,
  Mail,
  Calendar,
  Edit3,
  HelpCircle,
  LogOut,
} from 'lucide-react-native';
import useAuthStore from '../store/authStore'; // Import the auth store

// Phone icon component (since lucide-react-native doesn't have a good phone icon)
const PhoneIcon = ({ size = 20, color = "#6b7280" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.8, color }}>📱</Text>
  </View>
);

interface ProfileScreenProps {
  onLogout: () => void;
}

// Updated UserProfile interface for form editing
interface EditableUserProfile {
  fullName: string; // Changed from name to fullName to match storeUser
  email: string;
  phone_number: string; // Changed from phone to phone_number
  // photo_path could be part of editing in a more advanced version
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const { user: storeUser, setProfile: updateStoreProfile } = useAuthStore((state) => ({ // get setProfile for updates
    user: state.user,
    setProfile: state.setProfile,
  }));

  console.log('[ProfileScreen] Rendering with user data from store:', JSON.stringify(storeUser, null, 2));

  const [currentView, setCurrentView] = useState<'profile' | 'edit'>('profile');

  // editData state now uses EditableUserProfile and is initialized from storeUser
  const [editData, setEditData] = useState<EditableUserProfile>({
    fullName: storeUser?.fullName || '',
    email: storeUser?.email || '',
    phone_number: storeUser?.phone_number || '',
  });

  // Effect to update editData when storeUser changes (e.g., after initial fetch or if updated elsewhere)
  React.useEffect(() => {
    if (storeUser) {
      setEditData({
        fullName: storeUser.fullName || '',
        email: storeUser.email || '',
        phone_number: storeUser.phone_number || '',
      });
    }
  }, [storeUser]);

  const handleUpdateProfile = async () => { // Made async for potential API call
    if (!editData.fullName || !editData.email || !editData.phone_number) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    
    // Here, you would typically call an API to update the user's profile on the backend
    // For now, we'll just update the local Zustand store as if it were successful.
    // This simulates the frontend part of the update.
    // The actual API call to PUT /api/v1/users/{user_id} or /api/v1/users/me would be needed.

    // Create a partial user object with only the fields that are being updated
    const updatedProfileData = {
        // id: storeUser?.id, // Important if API needs it
        full_name: editData.fullName,
        email: editData.email, // Assuming email can be updated, though often it's fixed or has a separate flow
        phone_number: editData.phone_number,
        // Include other fields from storeUser that are not part of editData but should be preserved
        role: storeUser?.role,
        is_active: storeUser?.is_active,
        photo_path: storeUser?.photo_path, // Preserve existing photo path
        // id is crucial and should come from storeUser.id
    };

    // Update the Zustand store. The store's setProfile will handle merging.
    // Note: setProfile in authStore is designed to merge, so we pass the changed fields.
    // However, for a real update, we'd likely pass just { fullName, email, phone_number } to an API,
    // then on success, either re-fetch /users/me or have the API return the full updated user.
    // For this simulation, we update the store directly with the intended changes.
    if (storeUser?.id) { // Ensure user id exists
        await updateStoreProfile({
            ...storeUser, // spread existing store user to keep id, role etc.
            ...updatedProfileData // apply changes from edit form
        });
    }

    setCurrentView('profile');
    Alert.alert('Sucesso', 'Perfil atualizado (localmente).'); // Changed message
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
            value={editData.fullName}
            onChangeText={(text) => setEditData({ ...editData, fullName: text })}
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
            value={editData.phone_number}
            onChangeText={(text) => setEditData({ ...editData, phone_number: text })}
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
              // Reset editData to current storeUser state when canceling
              if (storeUser) {
                setEditData({
                  fullName: storeUser.fullName || '',
                  email: storeUser.email || '',
                  phone_number: storeUser.phone_number || '',
                });
              }
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
          {storeUser?.photo_path ? (
            <Image
              source={{ uri: storeUser.photo_path }} // Directly use if full URL, or construct if relative
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <User size={48} color="#ec4899" />
            </View>
          )}
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: 4 
          }}>
            {storeUser?.fullName || 'Nome não disponível'}
          </Text>
          <Text style={{ fontSize: 16, color: '#6b7280' }}>
            {storeUser?.email || 'Email não disponível'}
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
                    {storeUser?.fullName || 'Não informado'}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Mail size={20} color="#6b7280" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>E-mail</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                    {storeUser?.email || 'Não informado'}
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
                    {storeUser?.phone_number || 'Não informado'}
                  </Text>
                </View>
              </View>
              {/* Display other fields from storeUser as needed, e.g., role */}
              {storeUser?.role && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <User size={20} color="#6b7280" style={{ marginRight: 12 }} /> {/* Placeholder icon */}
                  <View>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>Perfil</Text>
                    <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                      {storeUser.role}
                    </Text>
                  </View>
                </View>
              )}
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

const styles = StyleSheet.create({
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  profileImagePlaceholder: {
    width: 96,
    height: 96,
    backgroundColor: '#fce7f3',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  // Add other styles if needed
});

export default ProfileScreen;