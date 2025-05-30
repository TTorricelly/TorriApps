import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  setItem: (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)),
  getItem: async (key) => {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }
};

