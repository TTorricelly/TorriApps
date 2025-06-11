import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Helper function to generate a lighter version of a hex color for the background
// This is a simple version, a more robust one might be needed for all hex cases
const lightenColor = (hex, percent) => {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const p = percent / 100;
  const newR = Math.min(255, Math.floor(r + (255 - r) * p));
  const newG = Math.min(255, Math.floor(g + (255 - g) * p));
  const newB = Math.min(255, Math.floor(b + (255 - b) * p));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};


const ServiceCategoryCard = ({ categoryName, iconColor = '#CCCCCC', onPress }) => {
  // The design asks for the icon color at 15% opacity.
  // Tailwind's opacity classes (e.g., bg-opacity-15) apply to the whole background.
  // To achieve this for a specific color that's dynamic, we might need to calculate it or use RGBA.
  // For simplicity, let's use a fixed lightened version of the iconColor for the card background.
  // A better way would be to use RGBA if iconColor was, for example, 'rgba(R,G,B,1)' then card bg could be 'rgba(R,G,B,0.15)'
  // For now, we'll use a placeholder or a simplified lightening.
  const cardBackgroundColor = lightenColor(iconColor, 85); // Lighten by 85% to get ~15% of original color strength

  const handlePress = () => {
    console.log(`Category pressed: ${categoryName}`);
    if (onPress) {
      onPress(categoryName);
    }
  };

  return (
    <StyledTouchableOpacity
      onPress={handlePress}
      className="m-2 shadow-md" // For 16dp gap, margin is 8dp (m-2 in Tailwind)
      style={{
        width: 140, // dp
        height: 180, // dp
        backgroundColor: cardBackgroundColor,
        borderRadius: 16, // dp
        elevation: 3, // Subtle elevation for Android
        // For iOS shadow:
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      }}
    >
      <StyledView className="flex-1 items-center pt-4">
        {/* Circular Icon Placeholder */}
        <StyledView
          style={{
            width: 72, // dp
            height: 72, // dp
            borderRadius: 36, // dp
            backgroundColor: iconColor, // Actual icon color for the circle
            marginBottom: 12, // Adjust spacing as needed
          }}
        />
        {/* Service Name */}
        <StyledText
          className="text-center text-slate-800 font-medium"
          style={{
            fontSize: 18, // sp
            color: '#374151',
            paddingHorizontal: 4, // Allow some padding for text
          }}
          numberOfLines={2} // Allow two lines for service name
        >
          {categoryName}
        </StyledText>
      </StyledView>
    </StyledTouchableOpacity>
  );
};

export default ServiceCategoryCard;
