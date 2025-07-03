# Task 4: App-client Labels UI Implementation

## Context
The mobile app (React Native) needs to display and allow clients to manage their personal labels/preferences. This replaces the static hair type field with a dynamic, user-friendly labeling system.

**Current Implementation:**
- **Profile Screen**: Shows user information including hair type
- **Edit Profile Screen**: Allows editing hair type via picker
- **API Integration**: Existing user service for profile management

## Goal
Create an intuitive mobile interface for clients to view and manage their labels, with excellent UX optimized for touch interactions.

## What Needs to Be Done

### 1. Update User Model and Types

```typescript
// App-client/src/types/user.types.ts

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  nickname?: string;
  phone_number?: string;
  date_of_birth?: string;
  // hair_type?: HairType; // REMOVE
  labels?: Label[]; // ADD
  gender?: Gender;
  // ... other fields
}

// Remove HairType enum
```

### 2. Update API Service

```typescript
// App-client/src/services/userService.ts

// Get available labels
export const getAvailableLabels = async (): Promise<Label[]> => {
  try {
    const response = await api.get('/labels', {
      params: { limit: 100, isActive: true }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching labels:', error);
    throw error;
  }
};

// Update user labels
export const updateUserLabels = async (userId: string, labelIds: string[]): Promise<User> => {
  try {
    const response = await api.post(`/users/${userId}/labels/bulk`, labelIds);
    return response.data;
  } catch (error) {
    console.error('Error updating labels:', error);
    throw error;
  }
};

// Add single label
export const addLabelToUser = async (userId: string, labelId: string): Promise<User> => {
  try {
    const response = await api.post(`/users/${userId}/labels/${labelId}`);
    return response.data;
  } catch (error) {
    console.error('Error adding label:', error);
    throw error;
  }
};

// Remove single label
export const removeLabelFromUser = async (userId: string, labelId: string): Promise<User> => {
  try {
    const response = await api.delete(`/users/${userId}/labels/${labelId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing label:', error);
    throw error;
  }
};
```

### 3. Create Label Components

```tsx
// App-client/src/components/Labels/LabelChip.tsx

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  Animated 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getContrastColor } from '../../utils/colors';

interface LabelChipProps {
  label: Label;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  size?: 'small' | 'medium' | 'large';
  showRemove?: boolean;
}

export const LabelChip: React.FC<LabelChipProps> = ({
  label,
  selected = false,
  onPress,
  onRemove,
  size = 'medium',
  showRemove = false,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress?.();
  };

  const textColor = getContrastColor(label.color);
  const sizeStyles = styles[size];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.container,
          sizeStyles,
          { backgroundColor: label.color },
          selected && styles.selected,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {selected && (
          <Icon 
            name="check" 
            size={sizeStyles.iconSize} 
            color={textColor}
            style={styles.checkIcon}
          />
        )}
        
        <Text style={[styles.text, sizeStyles.text, { color: textColor }]}>
          {label.name}
        </Text>
        
        {showRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Icon name="close" size={sizeStyles.iconSize} color={textColor} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selected: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  text: {
    fontWeight: '500',
  },
  checkIcon: {
    marginRight: 4,
  },
  removeButton: {
    marginLeft: 4,
    padding: 2,
  },
  small: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    iconSize: 14,
    text: {
      fontSize: 12,
    },
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    iconSize: 16,
    text: {
      fontSize: 14,
    },
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    iconSize: 18,
    text: {
      fontSize: 16,
    },
  },
});
```

### 4. Update Profile Screen

```tsx
// App-client/src/screens/Profile/ProfileScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LabelChip } from '../../components/Labels/LabelChip';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleEditLabels = () => {
    navigation.navigate('EditLabels');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Other profile sections */}
      
      {/* Labels Section - Replace Hair Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Minhas Preferências</Text>
          <TouchableOpacity onPress={handleEditLabels}>
            <Icon name="edit" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.labelsContainer}>
          {user?.labels && user.labels.length > 0 ? (
            user.labels.map((label) => (
              <LabelChip 
                key={label.id} 
                label={label} 
                size="small"
              />
            ))
          ) : (
            <TouchableOpacity 
              style={styles.addLabelsButton}
              onPress={handleEditLabels}
            >
              <Icon name="add-circle-outline" size={24} color="#999" />
              <Text style={styles.addLabelsText}>
                Adicionar preferências
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addLabelsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addLabelsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#999',
  },
});
```

### 5. Create Edit Labels Screen

```tsx
// App-client/src/screens/Profile/EditLabelsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LabelChip } from '../../components/Labels/LabelChip';
import { getAvailableLabels, updateUserLabels } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export const EditLabelsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: null, name: 'Todos', icon: 'view-module' },
    { id: 'hair', name: 'Cabelo', icon: 'face' },
    { id: 'style', name: 'Estilo', icon: 'style' },
    { id: 'preference', name: 'Preferências', icon: 'favorite' },
  ];

  useEffect(() => {
    loadLabels();
    if (user?.labels) {
      setSelectedLabels(user.labels.map(l => l.id));
    }
  }, []);

  const loadLabels = async () => {
    try {
      setLoading(true);
      const labels = await getAvailableLabels();
      setAvailableLabels(labels);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as preferências');
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => {
      if (prev.includes(labelId)) {
        return prev.filter(id => id !== labelId);
      }
      if (prev.length >= 10) {
        Alert.alert('Limite atingido', 'Você pode selecionar no máximo 10 preferências');
        return prev;
      }
      return [...prev, labelId];
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedUser = await updateUserLabels(user!.id, selectedLabels);
      updateUser(updatedUser);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as preferências');
    } finally {
      setSaving(false);
    }
  };

  const filteredLabels = availableLabels.filter(label => {
    const matchesSearch = label.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || label.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Preferências</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.saveButton}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar preferências..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id || 'all'}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Icon 
              name={category.icon} 
              size={20} 
              color={selectedCategory === category.id ? '#007AFF' : '#666'}
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected Labels Preview */}
      {selectedLabels.length > 0 && (
        <View style={styles.selectedPreview}>
          <Text style={styles.selectedCount}>
            {selectedLabels.length}/10 selecionadas
          </Text>
        </View>
      )}

      {/* Labels List */}
      <ScrollView style={styles.labelsList}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <View style={styles.labelsGrid}>
            {filteredLabels.map(label => (
              <LabelChip
                key={label.id}
                label={label}
                selected={selectedLabels.includes(label.id)}
                onPress={() => toggleLabel(label.id)}
                size="medium"
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedPreview: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
  },
  selectedCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  labelsList: {
    flex: 1,
    backgroundColor: 'white',
  },
  labelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  loader: {
    marginTop: 50,
  },
});
```

### 6. Update Navigation

```tsx
// App-client/src/navigation/ProfileStack.tsx

import { EditLabelsScreen } from '../screens/Profile/EditLabelsScreen';

// Add to the stack navigator
<Stack.Screen 
  name="EditLabels" 
  component={EditLabelsScreen}
  options={{
    title: 'Editar Preferências',
    headerShown: false, // We're using custom header
  }}
/>
```

### 7. Add Utility Functions

```typescript
// App-client/src/utils/colors.ts

export const getContrastColor = (hexColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
```

### 8. Add Offline Support

```typescript
// App-client/src/services/offline/labelsOffline.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const LABELS_CACHE_KEY = 'cached_labels';
const USER_LABELS_KEY = 'user_labels_pending';

export const cacheLabels = async (labels: Label[]) => {
  await AsyncStorage.setItem(LABELS_CACHE_KEY, JSON.stringify(labels));
};

export const getCachedLabels = async (): Promise<Label[]> => {
  const cached = await AsyncStorage.getItem(LABELS_CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
};

export const queueLabelUpdate = async (userId: string, labelIds: string[]) => {
  const pending = await AsyncStorage.getItem(USER_LABELS_KEY);
  const updates = pending ? JSON.parse(pending) : {};
  updates[userId] = { labelIds, timestamp: Date.now() };
  await AsyncStorage.setItem(USER_LABELS_KEY, JSON.stringify(updates));
};

export const syncPendingLabelUpdates = async () => {
  const pending = await AsyncStorage.getItem(USER_LABELS_KEY);
  if (!pending) return;
  
  const updates = JSON.parse(pending);
  for (const [userId, data] of Object.entries(updates)) {
    try {
      await updateUserLabels(userId, data.labelIds);
      delete updates[userId];
    } catch (error) {
      console.error('Failed to sync label update:', error);
    }
  }
  
  await AsyncStorage.setItem(USER_LABELS_KEY, JSON.stringify(updates));
};
```

## Output
1. Updated user types without hair_type
2. API service with label endpoints
3. Reusable LabelChip component
4. Updated Profile screen with labels
5. Complete Edit Labels screen
6. Navigation configuration
7. Utility functions for colors
8. Offline support implementation

## Technical Details
- **Framework**: React Native 0.72+
- **Navigation**: React Navigation 6
- **Storage**: AsyncStorage for offline
- **Icons**: React Native Vector Icons
- **Animations**: Built-in Animated API
- **State**: React hooks and Context

## Validation Steps
1. Test label display in profile
2. Test navigation to edit labels
3. Test label selection/deselection
4. Test search functionality
5. Test category filtering
6. Test save functionality
7. Test offline mode
8. Test on both iOS and Android
9. Test with different screen sizes
10. Test performance with 100+ labels
11. Test color contrast for all labels
12. Test accessibility with screen readers