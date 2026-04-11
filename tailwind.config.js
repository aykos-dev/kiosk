const fontCombosPlugin = require('./tailwind.fontCombos.plugin.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}', './electron/**/*.js'],
  safelist: [
    { pattern: /^font-product-(100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^font-inter-(200|300|400|500|600|700|800|900)$/ },
    'font-product-regular',
    'font-product-medium',
    'font-product-bold',
    'font-inter-regular',
    'font-inter-semibold',
    'font-inter-bold',
  ],
  theme: {
    extend: {
      keyframes: {
        kioskFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        kioskSheetUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        kioskSheetUpSoft: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        kioskCardIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        kioskQtyPop: {
          '0%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'kiosk-backdrop': 'kioskFadeIn 0.25s ease-out forwards',
        'kiosk-sheet': 'kioskSheetUp 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'kiosk-content': 'kioskSheetUpSoft 0.22s ease-out forwards',
        'kiosk-card': 'kioskCardIn 0.35s cubic-bezier(0.32, 0.72, 0, 1) both',
        'kiosk-qty': 'kioskQtyPop 0.18s ease-out',
      },
      maxWidth: {
        kiosk: '962px',
      },
      colors: {
        brand: {
          orange: '#ff3300',
          green: '#04522c',
          accent: '#ff3300',
        },
        ink: {
          DEFAULT: '#161616',
          muted: '#8e8e8e',
        },
        surface: '#f2f2f2',
      },
      boxShadow: {
        card: '0px 2px 20px 0px rgba(0,0,0,0.16)',
        dock: '0px 4px 32px 0px rgba(0,0,0,0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        product: ['Product', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [fontCombosPlugin],
};
