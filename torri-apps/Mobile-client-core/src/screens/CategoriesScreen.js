import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { styled } from 'nativewind';
import ServiceCategoryCard from '../components/ServiceCategoryCard'; // Added import

// Styled components for Tailwind RN
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

const serviceCategoriesData = [
  { id: '1', name: 'Cabelo', iconColor: '#FFC0CB' }, // Example color, replace later
  { id: '2', name: 'Barba', iconColor: '#ADD8E6' },
  { id: '3', name: 'Unhas', iconColor: '#90EE90' },
  { id: '4', name: 'Massoterapia', iconColor: '#FFD700' },
  { id: '5', name: 'Podologia', iconColor: '#FFA07A' },
  { id: '6', name: 'Unhas em Gel', iconColor: '#DDA0DD' },
];

const CategoriesScreen = () => {
  return (
    <StyledView className="flex-1 bg-white">
      <StatusBar backgroundColor="#d7197f" barStyle="light-content" />
      {/* Header */}
      <StyledView style={{ backgroundColor: '#d7197f', height: 72 }} className="justify-center items-center">
        <StyledText className="text-white font-bold text-2xl" style={{ fontSize: 28 /* sp */ }}>
          Nome do Salão
        </StyledText>
      </StyledView>

      <StyledScrollView>
        {/* Section Title */}
        <StyledText
          className="text-slate-800 font-bold text-center mt-6 mb-4"
          style={{ fontSize: 24 /* sp */, color: '#374151' }}
        >
          Nossos Serviços
        </StyledText>

        {/* Content Grid */}
        <StyledView className="flex-row flex-wrap justify-center px-2" style={{ paddingHorizontal: 8 /* to achieve 16dp gap effectively */}}>
          {serviceCategoriesData.map((category) => (
            <ServiceCategoryCard
              key={category.id}
              categoryName={category.name}
              iconColor={category.iconColor}
              onPress={(categoryName) => console.log(`Navigating to ${categoryName} services...`)} // Example action
            />
          ))}
        </StyledView>
      </StyledScrollView>
    </StyledView>
  );
};

export default CategoriesScreen;
