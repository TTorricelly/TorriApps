"use client"

import { useState } from "react"
import {
  Home,
  Grid,
  Calendar,
  User,
  Scissors,
  BeakerIcon as Beard,
  Fingerprint,
  GiftIcon as Massage,
  Footprints,
  Sparkles,
} from "lucide-react"
import Image from "next/image"

export default function BeautySalonApp() {
  const [activeTab, setActiveTab] = useState("inicio")

  const categories = [
    {
      id: "cabelo",
      name: "Cabelo",
      color: "bg-pink-100",
      icon: <Scissors className="text-pink-500 w-8 h-8 absolute bottom-2 right-2" />,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "barba",
      name: "Barba",
      color: "bg-blue-100",
      icon: <Beard className="text-blue-500 w-8 h-8 absolute bottom-2 right-2" />,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "unhas",
      name: "Unhas",
      color: "bg-purple-100",
      icon: <Fingerprint className="text-purple-500 w-8 h-8 absolute bottom-2 right-2" />,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "massoterapia",
      name: "Massoterapia",
      color: "bg-green-100",
      icon: <Massage className="text-green-500 w-8 h-8 absolute bottom-2 right-2" />,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "podologia",
      name: "Podologia",
      color: "bg-teal-100",
      icon: <Footprints className="text-teal-500 w-8 h-8 absolute bottom-2 right-2" />,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "unhas-gel",
      name: "Unhas em Gel",
      color: "bg-red-100",
      icon: <Sparkles className="text-red-500 w-8 h-8 absolute bottom-2 right-2" />,
      image: "/placeholder.svg?height=100&width=100",
    },
  ]

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      {/* Header */}
      <header className="bg-pink-500 text-white p-4 text-center">
        <h1 className="text-3xl font-bold">Nome do Salão</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <h2 className="text-3xl font-bold text-center text-gray-700 mb-8">Nossos Serviços</h2>

        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <div key={category.id} className={`${category.color} p-4 rounded-lg flex flex-col items-center relative`}>
              <div className="relative mb-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                  <Image
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    width={100}
                    height={100}
                    className="object-cover w-full h-full"
                  />
                </div>
                {category.icon}
              </div>
              <span className="text-lg font-medium text-gray-700">{category.name}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab("inicio")}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === "inicio" ? "text-pink-500" : "text-gray-500"}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Início</span>
          </button>
          <button
            onClick={() => setActiveTab("categorias")}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === "categorias" ? "text-pink-500" : "text-gray-500"}`}
          >
            <Grid className="w-6 h-6" />
            <span className="text-xs mt-1">Categorias</span>
          </button>
          <button
            onClick={() => setActiveTab("pedidos")}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === "pedidos" ? "text-pink-500" : "text-gray-500"}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Pedidos</span>
          </button>
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === "perfil" ? "text-pink-500" : "text-gray-500"}`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
