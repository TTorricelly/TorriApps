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
      color: "bg-pink-100",
      icon: (props: any) => <Scissors {...props} />,
      image: "https://via.placeholder.com/100",
    },
    {
      id: 'barba',
      name: 'Barba',
      color: "bg-blue-100",
      icon: (props: any) => <User {...props} />,
      image: "https://via.placeholder.com/100",
    },
    {
      id: 'unhas',
      name: 'Unhas',
      color: "bg-purple-100",
      icon: (props: any) => <Fingerprint {...props} />,
      image: "https://via.placeholder.com/100",
    },
    {
      id: 'massoterapia',
      name: 'Massoterapia',
      color: "bg-green-100",
      icon: (props: any) => <Gift {...props} />,
      image: "https://via.placeholder.com/100",
    },
    {
      id: 'podologia',
      name: 'Podologia',
      color: "bg-teal-100",
      icon: (props: any) => <Footprints {...props} />,
      image: "https://via.placeholder.com/100",
    },
    {
      id: 'unhas-gel',
      name: 'Unhas em Gel',
      color: "bg-red-100",
      icon: (props: any) => <Sparkles {...props} />,
      image: "https://via.placeholder.com/100",
    },
  ]

  // Map color strings to actual color values
  const colorMap: Record<string, string> = {
    "bg-pink-100": "#fce7f3",
    "bg-blue-100": "#dbeafe",
    "bg-purple-100": "#f3e8ff",
    "bg-green-100": "#dcfce7",
    "bg-teal-100": "#ccfbf1",
    "bg-red-100": "#fee2e2",
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 pt-4 pb-20">
        <Text className="text-3xl font-bold text-center text-gray-700 mb-8">Nossos Serviços</Text>

        <View className="flex-row flex-wrap justify-between">
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              className="w-[48%] mb-4"
              style={{ backgroundColor: colorMap[category.color] }}
              activeOpacity={0.7}
              onPress={() => console.log(`Selected ${category.name}`)}
            >
              <View className="p-4 rounded-lg items-center relative">
                <View className="relative mb-2">
                  <View className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <Image
                      source={{ uri: category.image }}
                      className="w-full h-full"
                      style={{ width: 96, height: 96 }}
                    />
                  </View>
                  <View className="absolute bottom-0 right-0">{category.icon({ size: 24, color: "#ec4899" })}</View>
                </View>
                <Text className="text-lg font-medium text-gray-700">{category.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
};