/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          500: '#10b981',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        forest: {
          50: '#f2f7f4',
          100: '#e0ebe3',
          200: '#bfd6c6',
          300: '#96b9a1',
          400: '#6b9a79',
          500: '#4a7c5a',
          600: '#396447',
          700: '#2e5039',
          800: '#1f3626',
          900: '#152619',
          950: '#0c160e',
        },
        brass: {
          50: '#fbf7ee',
          100: '#f4ead2',
          200: '#e8d4a6',
          300: '#dabb75',
          400: '#cca24d',
          500: '#b8863a',
          600: '#96692f',
          700: '#77522a',
          800: '#5f4326',
          900: '#4f3922',
        },
        parchment: {
          50: '#fdfcf9',
          100: '#faf7f0',
          200: '#f3ecdc',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        display: ['Fraunces', 'serif'],
        devanagari: ['"Noto Serif Devanagari"', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      backgroundColor: {
        'warm-ivory': '#FAF6EE',
      }
    },
  },
  plugins: [],
}