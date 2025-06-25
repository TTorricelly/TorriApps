import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { updateUserProfile } from '../services/userService';
import { ArrowLeft, User, Mail, Phone, Save, Calendar } from 'lucide-react';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, setProfile } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    hair_type: user?.hair_type || '',
    gender: user?.gender || '',
    date_of_birth: user?.date_of_birth || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const updatedProfile = await updateUserProfile(formData);
    setIsSaving(false);

    if (updatedProfile) {
      setProfile(updatedProfile);
      navigate('/profile');
    } else {
      // Handle error case, e.g., show a notification
      alert('Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center p-4 bg-white border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 ml-4">Editar Perfil</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Hair Type */}
          <div>
            <label htmlFor="hair_type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Cabelo
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">💇</span>
              <select
                id="hair_type"
                name="hair_type"
                value={formData.hair_type}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">Selecione...</option>
                <option value="LISO">Liso</option>
                <option value="ONDULADO">Ondulado</option>
                <option value="CACHEADO">Cacheado</option>
                <option value="CRESPO">Crespo</option>
              </select>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gênero
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">Selecione...</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTROS">Outro</option>
              </select>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
              Data de Nascimento
            </label>
            <div className="relative">
              <Calendar size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors disabled:bg-pink-300"
            >
              {isSaving ? (
                <>
                  <span className="spinner-border animate-spin ..."></span>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
