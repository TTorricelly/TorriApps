import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
} from 'react-native';
import ServiceCategoryCard from '../components/ServiceCategoryCard';

const serviceCategoriesData = [
  { id: '1', name: 'Cabelo', iconColor: '#FFC0CB' },
  { id: '2', name: 'Barba', iconColor: '#ADD8E6' },
  { id: '3', name: 'Unhas', iconColor: '#90EE90' },
  { id: '4', name: 'Massoterapia', iconColor: '#FFD700' },
  { id: '5', name: 'Podologia', iconColor: '#FFA07A' },
  { id: '6', name: 'Unhas em Gel', iconColor: '#DDA0DD' },
];

const CategoriesScreen = () => {
  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#d7197f" barStyle="light-content" />

      {/* Header */}
      <View className="h-18 bg-[#d7197f] justify-center items-center">
        <Text className="text-white font-bold text-2xl">
          Nome do Salão
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Section Title */}
        <Text className="text-center font-bold text-xl text-slate-800 mt-6 mb-4">
          Nossos Serviços
        </Text>

        {/* Content Grid */}
        <View className="flex-row flex-wrap justify-center px-2">
          {serviceCategoriesData.map(category => (
            <ServiceCategoryCard
              key={category.id}
              categoryName={category.name}
              iconColor={category.iconColor}
              onPress={name => console.log(`Navigating to ${name} services…`)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default CategoriesScreen;
