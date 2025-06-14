import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scissors, User, Fingerprint, Gift, Footprints, Sparkles } from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const categories = [
    {
      id: 'cabelo',
      name: 'Cabelo',
      backgroundColor: '#fce7f3',
      iconColor: '#ec4899',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Scissors {...props} />,
    },
    {
      id: 'barba',
      name: 'Barba',
      backgroundColor: '#dbeafe',
      iconColor: '#3b82f6',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <User {...props} />,
    },
    {
      id: 'unhas',
      name: 'Unhas',
      backgroundColor: '#f3e8ff',
      iconColor: '#a855f7',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Fingerprint {...props} />,
    },
    {
      id: 'massoterapia',
      name: 'Massoterapia',
      backgroundColor: '#dcfce7',
      iconColor: '#22c55e',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Gift {...props} />,
    },
    {
      id: 'podologia',
      name: 'Podologia',
      backgroundColor: '#ccfbf1',
      iconColor: '#14b8a6',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Footprints {...props} />,
    },
    {
      id: 'unhas-gel',
      name: 'Unhas em Gel',
      backgroundColor: '#fee2e2',
      iconColor: '#ef4444',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Sparkles {...props} />,
    },
  ]

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 pt-4 pb-20">
        <Text style={{
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#374151',
          marginBottom: 32
        }}>
          Nossos Serviços
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={{ 
                width: '47%',
                backgroundColor: category.backgroundColor,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 16
              }}
              activeOpacity={0.7}
              onPress={() => console.log(`Selected ${category.name}`)}
            >
              <View style={{ position: 'relative', marginBottom: 8 }}>
                <View style={{ 
                  width: 96, 
                  height: 96, 
                  borderRadius: 48, 
                  overflow: 'hidden', 
                  borderWidth: 4, 
                  borderColor: 'white',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5
                }}>
                  <Image
                    source={{ uri: category.image }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: 8 
                }}>
                  {category.icon({ size: 32, color: category.iconColor })}
                </View>
              </View>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '500', 
                color: '#374151',
                textAlign: 'center'
              }}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
};