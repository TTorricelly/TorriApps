import { Users, Briefcase, ArrowLeftRight } from '../components/icons'
import { useViewModeStore } from '../stores/viewModeStore'
import { useAuthStore } from '../stores/authStore'
import { useNavigation } from '../shared/hooks/useNavigation'
import { ROUTES } from '../shared/navigation'

const ViewModeSwitcher = ({ compact = false }) => {
  const { navigate } = useNavigation()
  const { currentMode, switchToProfessionalMode, switchToClientMode } = useViewModeStore()
  const { isProfessional } = useAuthStore()
  
  // Only show for professional users
  if (!isProfessional()) {
    return null
  }

  const handleModeSwitch = () => {
    if (currentMode === 'professional') {
      switchToClientMode()
      navigate(ROUTES.DASHBOARD) // Go to client dashboard
    } else {
      switchToProfessionalMode()
      navigate(ROUTES.PROFESSIONAL.DASHBOARD) // Go to professional dashboard
    }
  }

  const getCurrentModeInfo = () => {
    if (currentMode === 'professional') {
      return {
        label: 'Modo Profissional',
        icon: Briefcase,
        bgColor: 'bg-pink-500',
        textColor: 'text-white',
        switchLabel: 'Ver como Cliente',
        description: 'Você está no modo profissional com acesso completo às ferramentas de gestão.'
      }
    } else {
      return {
        label: 'Modo Cliente',
        icon: Users,
        bgColor: 'bg-blue-500',
        textColor: 'text-white',
        switchLabel: 'Voltar ao Profissional',
        description: 'Você está vendo a aplicação como um cliente veria.'
      }
    }
  }

  const modeInfo = getCurrentModeInfo()
  const IconComponent = modeInfo.icon

  if (compact) {
    return (
      <button
        onClick={handleModeSwitch}
        className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`${modeInfo.bgColor} ${modeInfo.textColor} p-2 rounded-lg`}>
            <IconComponent size={20} />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">{modeInfo.label}</p>
            <p className="text-sm text-gray-600">Toque para alternar</p>
          </div>
        </div>
        <ArrowLeftRight size={20} className="text-gray-400" />
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Modo de Visualização</h3>
      
      {/* Current Mode Display */}
      <div className="mb-4">
        <div className={`${modeInfo.bgColor} ${modeInfo.textColor} px-4 py-3 rounded-xl flex items-center space-x-3 mb-3`}>
          <IconComponent size={24} />
          <div>
            <p className="font-semibold">{modeInfo.label}</p>
            <p className="text-sm opacity-90">{modeInfo.description}</p>
          </div>
        </div>
      </div>
      
      {/* Switch Mode Button */}
      <button
        onClick={handleModeSwitch}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-xl flex items-center justify-center space-x-2 transition-colors font-medium"
      >
        <ArrowLeftRight size={20} />
        <span>{modeInfo.switchLabel}</span>
      </button>
    </div>
  )
}

export default ViewModeSwitcher