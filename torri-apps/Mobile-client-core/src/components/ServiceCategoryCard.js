import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

// Helper to compute a ~15% background from a hex color
const lightenColor = (hex, percent) => {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const p = percent / 100;
  const newR = Math.min(255, Math.floor(r + (255 - r) * p));
  const newG = Math.min(255, Math.floor(g + (255 - g) * p));
  const newB = Math.min(255, Math.floor(b + (255 - b) * p));
  return `#${newR.toString(16).padStart(2, '0')}${newG
    .toString(16)
    .padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

const ServiceCategoryCard = ({ categoryName, iconColor = '#CCCCCC', onPress }) => {
  const cardBackgroundColor = lightenColor(iconColor, 85);

  const handlePress = () => {
    console.log(`Category pressed: ${categoryName}`);
    onPress?.(categoryName);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="m-2 shadow-md"
      style={{
        width: 140,
        height: 180,
        backgroundColor: cardBackgroundColor,
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      }}
    >
      <View className="flex-1 items-center pt-4">
        {/* Circular icon */}
        <View
          className="mb-3"
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: iconColor,
          }}
        />

        {/* Category Name */}
        <Text
          className="text-center text-slate-800 font-medium"
          style={{ fontSize: 18, paddingHorizontal: 4 }}
          numberOfLines={2}
        >
          {categoryName}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default ServiceCategoryCard;
