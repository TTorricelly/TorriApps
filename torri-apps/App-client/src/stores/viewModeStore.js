import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useViewModeStore = create(
  persist(
    (set, get) => ({
      // State
      currentMode: 'professional', // 'professional' or 'client'
      
      // Actions
      switchToProfessionalMode: () => {
        set({ currentMode: 'professional' })
      },
      
      switchToClientMode: () => {
        set({ currentMode: 'client' })
      },
      
      toggleMode: () => {
        const currentMode = get().currentMode
        set({ currentMode: currentMode === 'professional' ? 'client' : 'professional' })
      },
      
      // Helpers
      isProfessionalMode: () => get().currentMode === 'professional',
      isClientMode: () => get().currentMode === 'client',
      getCurrentMode: () => get().currentMode,
    }),
    {
      name: 'torri-view-mode-storage',
    }
  )
)