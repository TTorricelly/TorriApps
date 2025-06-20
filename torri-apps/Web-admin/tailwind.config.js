const withMT = require("@material-tailwind/react/utils/withMT");

/** @type {import('tailwindcss').Config} */
module.exports = withMT({ // Wrapped with withMT
  content: [
    './index.html', 
    './src/**/*.{js,jsx,ts,tsx}' // Corrected path to src
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'Montserrat', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Tema Escuro Moderno
        'bg-primary': '#1A1A2E',      // Fundo principal
        'bg-secondary': '#1F1F3A',    // Cards e módulos
        'bg-tertiary': '#2A2A4A',     // Bordas sutis
        'bg-input': '#181830',        // Campos de input
        
        // Cores de destaque
        'accent-primary': '#00BFFF',   // Deep Sky Blue
        'accent-secondary': '#8A2BE2', // Blue Violet
        'accent-tertiary': '#32CD32',  // Lime Green
        'accent-gold': '#FFD700',      // Gold
        
        // Cores de texto
        'text-primary': '#E0E0E0',     // Texto principal
        'text-secondary': '#A0A0A0',   // Texto secundário
        'text-tertiary': '#606060',    // Texto desabilitado
        
        // Cores de status
        'status-success': '#28A745',   // Verde
        'status-warning': '#FFC107',   // Amarelo
        'status-error': '#DC3545',     // Vermelho
        'status-info': '#17A2B8',      // Azul informativo
        
        // Cores para gráficos
        'chart-1': '#FF6384',          // Rosa avermelhado
        'chart-2': '#36A2EB',          // Azul céu
        'chart-3': '#FFCE56',          // Amarelo mostarda
        'chart-4': '#4BC0C0',          // Turquesa
        'chart-5': '#9966FF',          // Roxo claro
        'chart-6': '#FF9F40',          // Laranja
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['26px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'kpi': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        's': '12px',
        'm': '16px',
        'l': '24px',
        'xl': '32px',
        'xxl': '48px',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '6px',
      },
      boxShadow: {
        'card': '0px 4px 12px rgba(0, 0, 0, 0.2)',
        'card-hover': '0px 8px 24px rgba(0, 0, 0, 0.3)',
        'button': '0px 2px 8px rgba(0, 191, 255, 0.2)',
      },
      transitionDuration: {
        'fast': '200ms',
        'normal': '300ms',
      },
    },
  },
  plugins: [
    // Other plugins can be added here
  ],
});
