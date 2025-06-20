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
  ActivityIndicator, // Added for loading indicator
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Calendar,
  Edit3,
  LogOut,
} from 'lucide-react-native';
import useAuthStore from '../store/authStore'; // Import the auth store
import { getUserProfile, updateUserProfile } from '../services/userService'; // Import user service

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
  hair_type?: 'LISO' | 'ONDULADO' | 'CACHEADO' | 'CRESPO';
  gender?: 'MASCULINO' | 'FEMININO' | 'OUTROS';
  date_of_birth?: string;
  // photo_path could be part of editing in a more advanced version
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const { user: storeUser, setProfile: updateStoreProfile, isAuthenticated } = useAuthStore((state) => ({ // get setProfile for updates
    user: state.user,
    setProfile: state.setProfile,
    isAuthenticated: state.isAuthenticated,
  }));

  const [currentView, setCurrentView] = useState<'profile' | 'edit'>('profile');
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // editData state now uses EditableUserProfile and is initialized from storeUser
  const [editData, setEditData] = useState<EditableUserProfile>({
    fullName: storeUser?.fullName || '',
    email: storeUser?.email || '',
    phone_number: storeUser?.phone_number || '',
    hair_type: storeUser?.hair_type,
    gender: storeUser?.gender,
    date_of_birth: storeUser?.date_of_birth,
  });

  // Effect to fetch user profile details when authenticated
  React.useEffect(() => {
    const fetchProfile = async () => {
      // Check if user is authenticated and if detailed profile info (e.g., phone_number) is missing
      if (isAuthenticated && storeUser && !storeUser.phone_number) {
        console.log('[ProfileScreen] Attempting to fetch profile. isAuthenticated:', isAuthenticated, 'User has phone_number:', !!storeUser?.phone_number);
        setIsProfileLoading(true);
        try {
          const rawProfileData = await getUserProfile();
          console.log('[ProfileScreen] Profile data fetched successfully');
          updateStoreProfile(rawProfileData); // Update store with detailed profile
        } catch (error) {
          console.error('[ProfileScreen] Error fetching profile:', error);
          Alert.alert("Erro de Perfil", "Não foi possível carregar os detalhes do seu perfil.");
        } finally {
          setIsProfileLoading(false);
        }
      }
    };

    fetchProfile();
  }, [isAuthenticated, storeUser, updateStoreProfile]);

  // Effect to update editData when storeUser changes (e.g., after initial fetch or if updated elsewhere)
  React.useEffect(() => {
    if (storeUser) {
      setEditData({
        fullName: storeUser.fullName || '',
        email: storeUser.email || '',
        phone_number: storeUser.phone_number || '',
        hair_type: storeUser.hair_type,
        gender: storeUser.gender,
        date_of_birth: storeUser.date_of_birth,
      });
    }
  }, [storeUser]);

  const handleUpdateProfile = async () => {
    if (!editData.fullName || !editData.email || !editData.phone_number) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    
    try {
      // Prepare the data for the API call
      const updateData = {
        full_name: editData.fullName,
        email: editData.email,
        phone_number: editData.phone_number,
        hair_type: editData.hair_type,
        gender: editData.gender,
        date_of_birth: editData.date_of_birth,
      };

      console.log('[ProfileScreen] Updating profile with data:', updateData);
      
      // Call the API to update the user profile
      const updatedProfile = await updateUserProfile(updateData);
      
      console.log('[ProfileScreen] Profile updated successfully:', updatedProfile);
      
      // Update the local store with the response from the API
      await updateStoreProfile(updatedProfile);
      
      // Switch back to profile view
      setCurrentView('profile');
      
      // Show success message
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      
    } catch (error) {
      console.error('[ProfileScreen] Error updating profile:', error);
      Alert.alert('Erro', `Não foi possível atualizar o perfil: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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

        {/* Hair Type Field */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Tipo de Cabelo
          </Text>
          <View style={{ position: 'relative' }}>
            <View style={{ 
              position: 'absolute', 
              left: 12, 
              top: 18, 
              zIndex: 1,
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 16 }}>💇</Text>
            </View>
            <TouchableOpacity
              style={{
                width: '100%',
                paddingLeft: 44,
                paddingRight: 16,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 12,
                backgroundColor: 'white',
              }}
              onPress={() => {
                const options = [
                  { label: 'Liso', value: 'LISO' },
                  { label: 'Ondulado', value: 'ONDULADO' },
                  { label: 'Cacheado', value: 'CACHEADO' },
                  { label: 'Crespo', value: 'CRESPO' },
                ];
                if (Platform.OS === 'ios') {
                  Alert.alert(
                    'Tipo de Cabelo',
                    '',
                    [
                      ...options.map(option => ({
                        text: option.label,
                        onPress: () => setEditData({ ...editData, hair_type: option.value as any }),
                      })),
                      { text: 'Cancelar', style: 'cancel' },
                    ]
                  );
                } else {
                  Alert.alert(
                    'Tipo de Cabelo',
                    '',
                    options.map(option => ({
                      text: option.label,
                      onPress: () => setEditData({ ...editData, hair_type: option.value as any }),
                    }))
                  );
                }
              }}
            >
              <Text style={{ fontSize: 16, color: editData.hair_type ? '#1f2937' : '#9ca3af' }}>
                {editData.hair_type ? 
                  editData.hair_type.charAt(0) + editData.hair_type.slice(1).toLowerCase() : 
                  'Selecione o tipo de cabelo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gender Field */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Gênero
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
            <TouchableOpacity
              style={{
                width: '100%',
                paddingLeft: 44,
                paddingRight: 16,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 12,
                backgroundColor: 'white',
              }}
              onPress={() => {
                const options = [
                  { label: 'Masculino', value: 'MASCULINO' },
                  { label: 'Feminino', value: 'FEMININO' },
                  { label: 'Outros', value: 'OUTROS' },
                ];
                if (Platform.OS === 'ios') {
                  Alert.alert(
                    'Gênero',
                    '',
                    [
                      ...options.map(option => ({
                        text: option.label,
                        onPress: () => setEditData({ ...editData, gender: option.value as any }),
                      })),
                      { text: 'Cancelar', style: 'cancel' },
                    ]
                  );
                } else {
                  Alert.alert(
                    'Gênero',
                    '',
                    options.map(option => ({
                      text: option.label,
                      onPress: () => setEditData({ ...editData, gender: option.value as any }),
                    }))
                  );
                }
              }}
            >
              <Text style={{ fontSize: 16, color: editData.gender ? '#1f2937' : '#9ca3af' }}>
                {editData.gender ? 
                  editData.gender.charAt(0) + editData.gender.slice(1).toLowerCase() : 
                  'Selecione o gênero'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date of Birth Field */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Data de Nascimento
          </Text>
          <View style={{ position: 'relative' }}>
            <Calendar 
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
              placeholder="DD/MM/AAAA"
              value={editData.date_of_birth ? 
                new Date(editData.date_of_birth).toLocaleDateString('pt-BR') : 
                ''}
              onChangeText={(text) => {
                // Simple date validation and formatting
                const numbers = text.replace(/\D/g, '');
                let formatted = numbers;
                if (numbers.length >= 3) {
                  formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
                }
                if (numbers.length >= 5) {
                  formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
                }
                
                // Convert to ISO format for storage
                if (numbers.length === 8) {
                  const day = numbers.slice(0, 2);
                  const month = numbers.slice(2, 4);
                  const year = numbers.slice(4, 8);
                  const isoDate = `${year}-${month}-${day}`;
                  setEditData({ ...editData, date_of_birth: isoDate });
                } else {
                  // Update the display but don't set the ISO date until complete
                  setEditData({ ...editData, date_of_birth: formatted });
                }
              }}
              keyboardType="numeric"
              maxLength={10}
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
                  hair_type: storeUser.hair_type,
                  gender: storeUser.gender,
                  date_of_birth: storeUser.date_of_birth,
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

  const renderProfileView = () => {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Profile Header */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            {storeUser?.photo_path ? (
              <Image
                source={{ uri: storeUser.photo_path }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <User size={48} color="#ec4899" />
              </View>
            )}
            {isProfileLoading && !storeUser?.fullName ? (
              <ActivityIndicator color="#ec4899" size="small" style={{ marginTop: 16 }} />
            ) : (
              <View style={{ alignItems: 'center' }}>
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
            )}
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

                {/* Hair Type */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ marginRight: 12, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16 }}>💇</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>Tipo de Cabelo</Text>
                    <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                      {storeUser?.hair_type ? 
                        storeUser.hair_type.charAt(0) + storeUser.hair_type.slice(1).toLowerCase() : 
                        'Não informado'}
                    </Text>
                  </View>
                </View>

                {/* Gender */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <User size={20} color="#6b7280" style={{ marginRight: 12 }} />
                  <View>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>Gênero</Text>
                    <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                      {storeUser?.gender ? 
                        storeUser.gender.charAt(0) + storeUser.gender.slice(1).toLowerCase() : 
                        'Não informado'}
                    </Text>
                  </View>
                </View>

                {/* Date of Birth */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={20} color="#6b7280" style={{ marginRight: 12 }} />
                  <View>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>Data de Nascimento</Text>
                    <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                      {storeUser?.date_of_birth ? 
                        new Date(storeUser.date_of_birth).toLocaleDateString('pt-BR') : 
                        'Não informado'}
                    </Text>
                  </View>
                </View>

                {/* Role - only show if it exists */}
                {storeUser?.role ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <User size={20} color="#6b7280" style={{ marginRight: 12 }} />
                    <View>
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>Perfil</Text>
                      <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                        {storeUser.role}
                      </Text>
                    </View>
                  </View>
                ) : null}
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
  };

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