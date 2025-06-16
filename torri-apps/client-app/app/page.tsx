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
  ArrowLeft,
  Clock,
  DollarSign,
  MapPin,
  Eye,
  EyeOff,
  Mail,
  Lock,
} from "lucide-react"
import Image from "next/image"

export default function BeautySalonApp() {
  const [activeTab, setActiveTab] = useState("inicio")
  const [currentScreen, setCurrentScreen] = useState("login")
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  // Adicionar estados para agendamento
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedProfessional, setSelectedProfessional] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [observations, setObservations] = useState("")
  const [showOrdersScreen, setShowOrdersScreen] = useState(false)

  // Login states
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showRegister, setShowRegister] = useState(false)
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })

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

  const servicesData = {
    cabelo: [
      { id: 1, name: "Escova curta (com lavagem)", duration: "1h - 1h 30min", price: "R$ 80,00" },
      { id: 2, name: "Escova média (com lavagem)", duration: "1h 15min - 1h 45min", price: "R$ 100,00" },
      { id: 3, name: "Escova longa (com lavagem)", duration: "1h 30min - 2h", price: "R$ 120,00" },
      { id: 4, name: "Corte feminino", duration: "45min - 1h", price: "R$ 60,00" },
      { id: 5, name: "Corte masculino", duration: "30min - 45min", price: "R$ 40,00" },
    ],
    barba: [
      { id: 1, name: "Barba completa", duration: "30min - 45min", price: "R$ 35,00" },
      { id: 2, name: "Aparar barba", duration: "15min - 30min", price: "R$ 25,00" },
      { id: 3, name: "Design de barba", duration: "45min - 1h", price: "R$ 50,00" },
    ],
    unhas: [
      { id: 1, name: "Manicure simples", duration: "45min - 1h", price: "R$ 30,00" },
      { id: 2, name: "Manicure com esmaltação", duration: "1h - 1h 15min", price: "R$ 40,00" },
      { id: 3, name: "Pedicure completo", duration: "1h - 1h 30min", price: "R$ 45,00" },
    ],
    massoterapia: [
      { id: 1, name: "Massagem relaxante", duration: "1h", price: "R$ 80,00" },
      { id: 2, name: "Massagem terapêutica", duration: "1h 15min", price: "R$ 100,00" },
      { id: 3, name: "Drenagem linfática", duration: "1h 30min", price: "R$ 120,00" },
    ],
    podologia: [
      { id: 1, name: "Tratamento de unhas", duration: "45min - 1h", price: "R$ 60,00" },
      { id: 2, name: "Remoção de calos", duration: "30min - 45min", price: "R$ 50,00" },
      { id: 3, name: "Tratamento completo", duration: "1h - 1h 30min", price: "R$ 90,00" },
    ],
    "unhas-gel": [
      { id: 1, name: "Aplicação de gel", duration: "1h 30min - 2h", price: "R$ 70,00" },
      { id: 2, name: "Manutenção de gel", duration: "1h - 1h 30min", price: "R$ 50,00" },
      { id: 3, name: "Remoção de gel", duration: "45min - 1h", price: "R$ 40,00" },
    ],
  }

  const serviceDetails = {
    1: {
      // Escova curta
      images: [
        { src: "/placeholder.svg?height=300&width=300", caption: "Liso" },
        { src: "/placeholder.svg?height=300&width=300", caption: "Ondulado" },
        { src: "/placeholder.svg?height=300&width=300", caption: "Encaracolado" },
        { src: "/placeholder.svg?height=300&width=300", caption: "Crespo" },
      ],
      description: `**O que é o serviço?**

A escova é um procedimento clássico que utiliza calor e técnica para modelar os fios, proporcionando um visual alinhado, com brilho e movimento. Ideal para quem busca praticidade e um look elegante para o dia a dia ou ocasiões especiais.

**Benefícios:**

- Alinhamento dos fios
- Redução de frizz
- Brilho intenso
- Maciez e sedosidade
- Facilidade para pentear

**Indicado para:**

Todos os tipos de cabelo que desejam um visual mais liso e modelado temporariamente. Ótimo para eventos, ou para quem gosta de variar o estilo.

**Como funciona:**

Após a lavagem com produtos específicos, o cabelo é seco e modelado mecha a mecha com o auxílio de uma escova e secador. A técnica aplicada pelo profissional garante um resultado duradouro e protege a saúde dos fios.

**Durabilidade:**

O efeito da escova pode durar de 2 a 5 dias, dependendo do tipo de cabelo, dos cuidados pós-procedimento e das atividades diárias.

**Cuidados Pós-Serviço:**

Para prolongar o efeito da escova, evite umidade excessiva, use touca de cetim para dormir e produtos específicos para cabelos escovados. Evite prender o cabelo com elásticos apertados logo após o procedimento.

**Observações Adicionais:**

Este serviço inclui uma lavagem simples. Caso deseje uma hidratação ou tratamento mais profundo, consulte nossos pacotes adicionais. O tempo de duração é uma estimativa e pode variar conforme o volume e comprimento do cabelo.`,
    },
    2: {
      // Escova média
      images: [
        { src: "/placeholder.svg?height=300&width=300", caption: "Liso" },
        { src: "/placeholder.svg?height=300&width=300", caption: "Ondulado" },
        { src: "/placeholder.svg?height=300&width=300", caption: "Encaracolado" },
        { src: "/placeholder.svg?height=300&width=300", caption: "Crespo" },
      ],
      description: `**O que é o serviço?**

A escova média é ideal para cabelos de comprimento médio, oferecendo um acabamento profissional com técnicas avançadas de modelagem. Proporciona volume, movimento e um brilho excepcional.

**Benefícios:**

- Modelagem profissional
- Volume controlado
- Brilho duradouro
- Textura sedosa
- Acabamento impecável

**Indicado para:**

Cabelos médios que precisam de mais tempo de dedicação para um resultado perfeito. Ideal para ocasiões especiais ou para quem deseja um visual mais elaborado.

**Durabilidade:**

O efeito pode durar de 3 a 6 dias com os cuidados adequados.`,
    },
    // Add more service details as needed
  }

  const availableDates = [
    { day: "Sáb", date: "31", month: "Mai", fullDate: "2024-05-31" },
    { day: "Dom", date: "1", month: "Jun", fullDate: "2024-06-01" },
    { day: "Seg", date: "2", month: "Jun", fullDate: "2024-06-02" },
    { day: "Ter", date: "3", month: "Jun", fullDate: "2024-06-03" },
    { day: "Qua", date: "4", month: "Jun", fullDate: "2024-06-04" },
    { day: "Qui", date: "5", month: "Jun", fullDate: "2024-06-05" },
    { day: "Sex", date: "6", month: "Jun", fullDate: "2024-06-06" },
    { day: "Sáb", date: "7", month: "Jun", fullDate: "2024-06-07" },
  ]

  const professionals = [
    { id: 1, name: "Ana Silva", image: "/placeholder.svg?height=80&width=80" },
    { id: 2, name: "Carlos Lima", image: "/placeholder.svg?height=80&width=80" },
    { id: 3, name: "Maria Santos", image: "/placeholder.svg?height=80&width=80" },
    { id: 4, name: "João Costa", image: "/placeholder.svg?height=80&width=80" },
    { id: 5, name: "Lucia Ferreira", image: "/placeholder.svg?height=80&width=80" },
  ]

  const availableTimes = [
    "9:00",
    "9:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
  ]

  const salonInfo = {
    name: "Salão Charme & Estilo",
    address: "Rua das Palmeiras, 123 - Bairro Flores, Cidade - UF",
  }

  const formatDateForDisplay = (date) => {
    if (!date) return ""
    const months = {
      Mai: "Maio",
      Jun: "Junho",
      Jul: "Julho",
      Ago: "Agosto",
      Set: "Setembro",
      Out: "Outubro",
      Nov: "Novembro",
      Dez: "Dezembro",
    }
    return `${date.day}, ${date.date} de ${months[date.month] || date.month}`
  }

  const handleCategoryClick = (categoryId, categoryName) => {
    setSelectedCategory({ id: categoryId, name: categoryName })
    setCurrentScreen("services")
    setSelectedService(null)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (email && password) {
      setIsLoggedIn(true)
      setCurrentScreen("categories")
      setActiveTab("inicio")
    }
  }

  const handleSocialLogin = (provider) => {
    // Simulate social login
    setIsLoggedIn(true)
    setCurrentScreen("categories")
    setActiveTab("inicio")
  }

  const handleRegister = (e) => {
    e.preventDefault()
    if (registerData.name && registerData.email && registerData.password && registerData.confirmPassword) {
      if (registerData.password === registerData.confirmPassword) {
        setIsLoggedIn(true)
        setCurrentScreen("categories")
        setActiveTab("inicio")
        setShowRegister(false)
      } else {
        alert("As senhas não coincidem!")
      }
    }
  }

  // If not logged in, show login screen
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white">
        {/* Header */}
        <header className="bg-pink-500 text-white p-6 text-center">
          <h1 className="text-3xl font-bold">Nome do Salão</h1>
          <p className="text-pink-100 mt-2">Bem-vindo de volta!</p>
        </header>

        {!showRegister ? (
          /* Login Form */
          <main className="flex-1 p-6">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Entrar na sua conta</h2>
              <p className="text-gray-600">Acesse sua conta para agendar seus serviços</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button type="button" className="text-pink-500 text-sm hover:text-pink-600">
                  Esqueceu a senha?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-lg transition-all"
              >
                Entrar
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-gray-500 text-sm">ou continue com</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleSocialLogin("google")}
                className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-gray-700 font-medium">Continuar com Google</span>
              </button>

              <button
                onClick={() => handleSocialLogin("facebook")}
                className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-gray-700 font-medium">Continuar com Facebook</span>
              </button>
            </div>

            {/* Register Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Ainda não tem uma conta?{" "}
                <button onClick={() => setShowRegister(true)} className="text-pink-500 font-bold hover:text-pink-600">
                  Criar conta
                </button>
              </p>
            </div>
          </main>
        ) : (
          /* Register Form */
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Criar nova conta</h2>
              <p className="text-gray-600">Preencha os dados para se cadastrar</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo</label>
                <input
                  type="text"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                <input
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar senha</label>
                <input
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Digite a senha novamente"
                  required
                />
              </div>

              {/* Register Button */}
              <button
                type="submit"
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-lg transition-all mt-6"
              >
                Criar conta
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Já tem uma conta?{" "}
                <button onClick={() => setShowRegister(false)} className="text-pink-500 font-bold hover:text-pink-600">
                  Fazer login
                </button>
              </p>
            </div>
          </main>
        )}
      </div>
    )
  }

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
            <div
              key={category.id}
              className={`${category.color} p-4 rounded-lg flex flex-col items-center relative cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => handleCategoryClick(category.id, category.name)}
            >
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

      {currentScreen === "services" && selectedCategory && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto">
          {/* Header with back button */}
          <header className="bg-pink-500 text-white p-4 flex items-center">
            <button onClick={() => setCurrentScreen("categories")} className="mr-4 p-1 hover:bg-pink-600 rounded">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">{selectedCategory.name}</h1>
          </header>

          {/* Services List */}
          <main className="flex-1 overflow-y-auto p-4 pb-24">
            <div className="space-y-4">
              {servicesData[selectedCategory.id]?.map((service) => (
                <div
                  key={service.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedService?.id === service.id
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedService(service)}
                >
                  <div className="flex items-start">
                    <div
                      className={`w-6 h-6 rounded-full border-2 mr-4 mt-1 flex items-center justify-center ${
                        selectedService?.id === service.id ? "border-pink-500 bg-pink-500" : "border-gray-300"
                      }`}
                    >
                      {selectedService?.id === service.id && <div className="w-3 h-3 bg-white rounded-full"></div>}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{service.name}</h3>
                      <p className="text-gray-600 mb-2">Duração: {service.duration}</p>
                      <p className="text-pink-500 font-bold text-lg">{service.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>

          {/* Confirm Button */}
          <div className="p-4 bg-white border-t">
            <button
              className={`w-full py-4 rounded-lg text-white font-bold text-lg transition-all ${
                selectedService ? "bg-pink-500 hover:bg-pink-600" : "bg-gray-300 cursor-not-allowed"
              }`}
              disabled={!selectedService}
              onClick={() => {
                if (selectedService) {
                  setCurrentScreen("service-details")
                }
              }}
            >
              Confirmar Seleção
            </button>
          </div>
        </div>
      )}

      {currentScreen === "service-details" && selectedService && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto">
          {/* Header with back button */}
          <header className="bg-pink-500 text-white p-4 flex items-center">
            <button onClick={() => setCurrentScreen("services")} className="mr-4 p-1 hover:bg-pink-600 rounded">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold flex-1 truncate">{selectedService.name}</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-4">
            {/* Image Carousel */}
            <div className="relative">
              <div
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                onScroll={(e) => {
                  const scrollLeft = e.target.scrollLeft
                  const itemWidth = e.target.offsetWidth
                  const index = Math.round(scrollLeft / itemWidth)
                  setCurrentImageIndex(index)
                }}
              >
                {serviceDetails[selectedService.id]?.images.map((image, index) => (
                  <div key={index} className="flex-none w-full snap-center">
                    <div className="p-4">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 w-32 h-32 mx-auto">
                        <Image
                          src={image.src || "/placeholder.svg"}
                          alt={image.caption}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-center mt-2 font-medium text-gray-700">{image.caption}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Carousel Indicators */}
              <div className="flex justify-center space-x-2 mt-4">
                {serviceDetails[selectedService.id]?.images.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${index === currentImageIndex ? "bg-pink-500" : "bg-gray-300"}`}
                  />
                ))}
              </div>
            </div>

            {/* Service Description */}
            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="prose prose-sm max-w-none">
                  {serviceDetails[selectedService.id]?.description.split("\n").map((paragraph, index) => {
                    if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                      return (
                        <h3 key={index} className="font-bold text-gray-800 mt-4 mb-2">
                          {paragraph.replace(/\*\*/g, "")}
                        </h3>
                      )
                    } else if (paragraph.startsWith("- ")) {
                      return (
                        <li key={index} className="text-gray-600 ml-4">
                          {paragraph.substring(2)}
                        </li>
                      )
                    } else if (paragraph.trim()) {
                      return (
                        <p key={index} className="text-gray-600 mb-3">
                          {paragraph}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>
          </main>

          {/* Continue Button */}
          <div className="p-4 bg-white border-t">
            <button
              className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-lg transition-all"
              onClick={() => {
                setCurrentScreen("scheduling")
              }}
            >
              Continuar
            </button>
          </div>

          {/* Bottom Navigation */}
          <nav className="bg-white border-t border-gray-200">
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
      )}

      {currentScreen === "scheduling" && selectedService && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto">
          {/* Header with back button */}
          <header className="bg-pink-500 text-white p-4 flex items-center">
            <button onClick={() => setCurrentScreen("service-details")} className="mr-4 p-1 hover:bg-pink-600 rounded">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Agendamento</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-4">
            {/* Date Selection */}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecione o dia do agendamento</h2>
              <div className="flex overflow-x-auto space-x-3 pb-2">
                {availableDates.map((date, index) => (
                  <div
                    key={index}
                    className={`flex-none cursor-pointer p-3 rounded-lg border-2 min-w-[70px] text-center ${
                      selectedDate?.fullDate === date.fullDate
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="text-xs text-gray-600">{date.day}</div>
                    <div className="text-xl font-bold text-gray-800">{date.date}</div>
                    <div className="text-xs text-gray-600">{date.month}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Selection */}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Escolha o(a) profissional</h2>
              <div className="flex overflow-x-auto space-x-4 pb-2">
                {professionals.map((professional) => (
                  <div
                    key={professional.id}
                    className={`flex-none cursor-pointer p-3 rounded-lg border-2 min-w-[100px] text-center ${
                      selectedProfessional?.id === professional.id
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedProfessional(professional)}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 bg-gray-100">
                      <Image
                        src={professional.image || "/placeholder.svg"}
                        alt={professional.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-800">{professional.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Horários disponíveis</h2>
              <div className="grid grid-cols-4 gap-3">
                {availableTimes.map((time, index) => (
                  <button
                    key={index}
                    className={`p-3 rounded-lg border-2 text-center font-medium transition-all ${
                      selectedTime === time
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </main>

          {/* Continue Button */}
          <div className="p-4 bg-white border-t">
            <button
              className={`w-full py-4 rounded-lg text-white font-bold text-lg transition-all ${
                selectedDate && selectedProfessional && selectedTime
                  ? "bg-pink-500 hover:bg-pink-600"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
              disabled={!selectedDate || !selectedProfessional || !selectedTime}
              onClick={() => {
                if (selectedDate && selectedProfessional && selectedTime) {
                  setCurrentScreen("confirmation")
                }
              }}
            >
              Continuar
            </button>
          </div>

          {/* Bottom Navigation */}
          <nav className="bg-white border-t border-gray-200">
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
      )}

      {currentScreen === "confirmation" && selectedService && selectedDate && selectedProfessional && selectedTime && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto">
          {/* Header with back button */}
          <header className="bg-pink-500 text-white p-4 flex items-center">
            <button onClick={() => setCurrentScreen("scheduling")} className="mr-4 p-1 hover:bg-pink-600 rounded">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Confirmar Agendamento</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-4">
            <div className="p-4 space-y-6">
              {/* Service Section */}
              <div>
                <h2 className="text-lg font-semibold text-pink-500 mb-3">Serviço Selecionado</h2>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Scissors className="w-5 h-5 text-pink-500 mr-3" />
                    <span className="text-gray-800 font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-pink-500 mr-3" />
                    <span className="text-gray-600">Duração: {selectedService.duration}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-pink-500 mr-3" />
                    <span className="text-gray-600">Preço: {selectedService.price}</span>
                  </div>
                </div>
              </div>

              {/* Date and Time Section */}
              <div>
                <h2 className="text-lg font-semibold text-pink-500 mb-3">Data e Horário</h2>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-pink-500 mr-3" />
                    <span className="text-gray-800">{formatDateForDisplay(selectedDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-pink-500 mr-3" />
                    <span className="text-gray-800">{selectedTime}</span>
                  </div>
                </div>
              </div>

              {/* Professional Section */}
              <div>
                <h2 className="text-lg font-semibold text-pink-500 mb-3">Profissional</h2>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-gray-100">
                    <Image
                      src={selectedProfessional.image || "/placeholder.svg"}
                      alt={selectedProfessional.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-gray-800 font-medium">{selectedProfessional.name}</span>
                </div>
              </div>

              {/* Location Section */}
              <div>
                <h2 className="text-lg font-semibold text-pink-500 mb-3">Local</h2>
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-pink-500 mr-3 mt-0.5" />
                  <div>
                    <div className="text-gray-800 font-medium">{salonInfo.name}</div>
                    <div className="text-gray-600 text-sm">{salonInfo.address}</div>
                  </div>
                </div>
              </div>

              {/* Total Value */}
              <div className="flex justify-between items-center py-3 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-800">Valor Total:</span>
                <span className="text-2xl font-bold text-pink-500">{selectedService.price}</span>
              </div>

              {/* Observations */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Observações (opcional)</h2>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  rows={3}
                  placeholder="Ex: Tenho alergia a amônia, prefiro produtos sem cheiro..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </div>
            </div>
          </main>

          {/* Confirm Button */}
          <div className="p-4 bg-white border-t">
            <button
              className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-lg transition-all"
              onClick={() => {
                setCurrentScreen("orders")
                setShowOrdersScreen(true)
              }}
            >
              Confirmar Agendamento
            </button>
          </div>

          {/* Bottom Navigation */}
          <nav className="bg-white border-t border-gray-200">
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
                onClick={() => {
                  setActiveTab("pedidos")
                  setCurrentScreen("orders")
                  setShowOrdersScreen(true)
                }}
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
      )}

      {currentScreen === "orders" && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto">
          {/* Header */}
          <header className="bg-pink-500 text-white p-4 text-center">
            <h1 className="text-2xl font-bold">Pedidos</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-4">
            <div className="p-4 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Success Message */}
              <h2 className="text-2xl font-bold text-gray-800 mb-8">Agendamento Confirmado!</h2>
            </div>

            {/* Appointment Details */}
            <div className="p-4">
              <h3 className="text-xl font-bold text-pink-500 mb-6">Detalhes do Agendamento</h3>

              <div className="space-y-4">
                {/* Service */}
                <div className="flex items-start">
                  <Scissors className="w-6 h-6 text-gray-600 mr-4 mt-1" />
                  <div>
                    <div className="text-gray-600 font-medium">Serviço:</div>
                    <div className="text-gray-800 font-semibold">{selectedService?.name}</div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="flex items-start">
                  <Calendar className="w-6 h-6 text-gray-600 mr-4 mt-1" />
                  <div>
                    <div className="text-gray-600 font-medium">Data e Hora:</div>
                    <div className="text-gray-800 font-semibold">
                      {selectedDate && selectedTime && `${formatDateForDisplay(selectedDate)} às ${selectedTime}`}
                    </div>
                  </div>
                </div>

                {/* Professional */}
                <div className="flex items-start">
                  <User className="w-6 h-6 text-gray-600 mr-4 mt-1" />
                  <div>
                    <div className="text-gray-600 font-medium">Profissional:</div>
                    <div className="text-gray-800 font-semibold">{selectedProfessional?.name}</div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-gray-600 mr-4 mt-1" />
                  <div>
                    <div className="text-gray-600 font-medium">Local:</div>
                    <div className="text-gray-800 font-semibold">{salonInfo.name}</div>
                    <div className="text-gray-600 text-sm">{salonInfo.address}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                <button className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-lg transition-all flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  Ver Meus Agendamentos
                </button>

                <button className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-lg rounded-lg transition-all flex items-center justify-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  Adicionar ao Calendário
                </button>

                <button
                  className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-lg rounded-lg transition-all flex items-center justify-center"
                  onClick={() => {
                    setCurrentScreen("categories")
                    setActiveTab("inicio")
                    setShowOrdersScreen(false)
                  }}
                >
                  <Home className="w-6 h-6 mr-2" />
                  Voltar para o Início
                </button>
              </div>
            </div>
          </main>

          {/* Bottom Navigation */}
          <nav className="bg-white border-t border-gray-200">
            <div className="flex justify-around">
              <button
                onClick={() => {
                  setActiveTab("inicio")
                  setCurrentScreen("categories")
                  setShowOrdersScreen(false)
                }}
                className={`flex flex-col items-center p-3 flex-1 ${activeTab === "inicio" ? "text-pink-500" : "text-gray-500"}`}
              >
                <Home className="w-6 h-6" />
                <span className="text-xs mt-1">Início</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("categorias")
                  setCurrentScreen("categories")
                  setShowOrdersScreen(false)
                }}
                className={`flex flex-col items-center p-3 flex-1 ${activeTab === "categorias" ? "text-pink-500" : "text-gray-500"}`}
              >
                <Grid className="w-6 h-6" />
                <span className="text-xs mt-1">Categorias</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("pedidos")
                  setCurrentScreen("orders")
                  setShowOrdersScreen(true)
                }}
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
      )}

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
            onClick={() => {
              setActiveTab("pedidos")
              setCurrentScreen("orders")
              setShowOrdersScreen(true)
            }}
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
