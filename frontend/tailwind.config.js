/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5659bd', // Dimmer Indigo
          dark: '#4548a3',
        },
        secondary: {
          DEFAULT: '#1f906f', // Dimmer Emerald
          dark: '#147a5b',
        },
        dark: {
          bg: '#101423', // Softer dark background
          card: '#1b2035', // Softer card background
          border: '#292f4c', // Softer borders
          text: '#cbd5e1', // Dimmer text (Slate 300 instead of 50)
        },
        accent: {
          gold: '#e0a91c', // Dimmer Gold
          platinum: '#cbd5e1',
          silver: '#8a99ad',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.8s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
