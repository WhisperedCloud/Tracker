/** @type {import('tailwindcss').Config} */

// TaskSync design system: Earthy & Minimalist
//
// Brand colors
//   Brown  #7B3F00  primary actions, links, focus      -> primary-600
//   Cream  #F6F1E9  page background                    -> slate-50 / cream
//   Beige  #D2B48C  borders, inputs, soft accents      -> slate-300 / beige
//   Surface #FFFCF8 cards, panels, menus, dialogs       -> surface
//
// The components use Tailwind's color names by meaning, so each palette below
// is redefined as an earthy equivalent with the same meaning:
//   slate   -> warm sand neutrals (text, surfaces, borders)
//   primary -> brown (brand)
//   emerald -> moss       success / completed
//   rose    -> terracotta danger / overdue
//   amber   -> ochre      warning / high priority
//   orange  -> rust       changes requested
//   indigo  -> dusty teal in progress
//   blue    -> slate blue info / medium priority
//   purple  -> plum       under review
// Use these names (not raw hex) in new code so everything stays on-palette.

const brown = {
  50: '#FAF4EC',
  100: '#F2E4D2',
  200: '#E5C9A6',
  300: '#D2A776',
  400: '#B07A45',
  500: '#93581F',
  600: '#7B3F00',
  700: '#663405',
  800: '#522A08',
  900: '#3F2109',
  950: '#26140A',
  DEFAULT: '#7B3F00',
};

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: brown,
        // Warm off-white for cards, panels, menus and dialogs.
        surface: '#FFFCF8',
        brown,
        cream: {
          DEFAULT: '#F6F1E9',
          light: '#FBF8F3',
          dark: '#EFE7DA',
        },
        beige: {
          DEFAULT: '#D2B48C',
          light: '#E5D9C6',
          dark: '#B89A72',
        },
        slate: {
          50: '#F6F1E9',
          100: '#EFE7DA',
          200: '#E5D9C6',
          300: '#D2B48C',
          400: '#9A8268',
          500: '#76634F',
          600: '#5E4E40',
          700: '#483B31',
          800: '#342A23',
          900: '#231C17',
          950: '#18130F',
        },
        emerald: {
          50: '#F3F5EA', 100: '#E4EACF', 200: '#CBD6A6', 300: '#AEBF7A', 400: '#8FA357',
          500: '#73883F', 600: '#5C6F31', 700: '#485728', 800: '#374221', 900: '#2A321B', 950: '#171C0E',
        },
        rose: {
          50: '#FBF0EC', 100: '#F5DCD3', 200: '#EBB9A8', 300: '#DC9078', 400: '#C96A50',
          500: '#B04E35', 600: '#963D28', 700: '#7A3122', 800: '#5F271C', 900: '#481F17', 950: '#2A110C',
        },
        amber: {
          50: '#FBF5E6', 100: '#F4E6C2', 200: '#EACF8C', 300: '#DDB55A', 400: '#CC9B36',
          500: '#B08024', 600: '#8F661B', 700: '#714F17', 800: '#573D14', 900: '#422F11', 950: '#261A09',
        },
        orange: {
          50: '#FBF1E8', 100: '#F5DDC7', 200: '#EBBD93', 300: '#DE9A60', 400: '#CC7A3A',
          500: '#B06128', 600: '#8F4C1F', 700: '#713C1B', 800: '#573019', 900: '#422515', 950: '#26140A',
        },
        indigo: {
          50: '#EFF4F3', 100: '#D8E4E2', 200: '#B3CBC7', 300: '#8BAEA9', 400: '#67908B',
          500: '#507671', 600: '#3F5F5B', 700: '#344D4A', 800: '#2A3D3B', 900: '#21302E', 950: '#121B1A',
        },
        blue: {
          50: '#F0F3F5', 100: '#DCE4E9', 200: '#BBCAD4', 300: '#95ABBA', 400: '#728DA0',
          500: '#5A7487', 600: '#475D6E', 700: '#3A4C5A', 800: '#2E3C47', 900: '#243037', 950: '#141B20',
        },
        purple: {
          50: '#F6EFF1', 100: '#EBDCE1', 200: '#D8BBC4', 300: '#C096A3', 400: '#A57483',
          500: '#8A5A69', 600: '#714755', 700: '#5C3A46', 800: '#482E37', 900: '#37242A', 950: '#201417',
        },
        success: { DEFAULT: '#5C6F31', 50: '#F3F5EA', 500: '#73883F', 600: '#5C6F31' },
        warning: { DEFAULT: '#B08024', 50: '#FBF5E6', 500: '#B08024', 600: '#8F661B' },
        danger: { DEFAULT: '#963D28', 50: '#FBF0EC', 500: '#B04E35', 600: '#963D28' },
      },
      // Two families, two weights each:
      //   Manrope (font-heading): headings, display text, buttons, article body
      //   Inter   (font-sans):    body, UI, forms, article titles
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Only 400 and 500 are loaded, so every heavier weight class resolves
      // to 500 (no browser-faked bold) and lighter ones to 400.
      fontWeight: {
        thin: '400',
        extralight: '400',
        light: '400',
        normal: '400',
        medium: '500',
        semibold: '500',
        bold: '500',
        extrabold: '500',
        black: '500',
      },
      boxShadow: {
        // Soft, warm shadows instead of cool gray ones.
        xs: '0 1px 1px 0 rgba(59, 32, 11, 0.04)',
        sm: '0 1px 2px 0 rgba(59, 32, 11, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(59, 32, 11, 0.08), 0 1px 2px -1px rgba(59, 32, 11, 0.06)',
        md: '0 4px 10px -2px rgba(59, 32, 11, 0.08), 0 2px 4px -2px rgba(59, 32, 11, 0.05)',
        lg: '0 12px 24px -6px rgba(59, 32, 11, 0.12), 0 4px 8px -4px rgba(59, 32, 11, 0.06)',
        xl: '0 20px 36px -10px rgba(59, 32, 11, 0.16), 0 8px 14px -8px rgba(59, 32, 11, 0.08)',
        '2xl': '0 28px 56px -16px rgba(59, 32, 11, 0.24)',
        popover: '0 14px 32px -10px rgba(59, 32, 11, 0.22), 0 2px 6px -2px rgba(59, 32, 11, 0.08)',
      },
      keyframes: {
        'ts-fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'ts-pop-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ts-slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Cards entering the page (staggered with animation-delay).
        'ts-rise': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Dialogs: settle in with a hint of depth, leave a little faster.
        'ts-dialog-in': {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.97)', filter: 'blur(2px)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        'ts-dialog-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
        },
        'ts-fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        // Popovers open from the edge that touches their trigger.
        'ts-drop-down': {
          from: { opacity: '0', transform: 'translateY(-6px) scaleY(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scaleY(1)' },
        },
        'ts-drop-up': {
          from: { opacity: '0', transform: 'translateY(6px) scaleY(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scaleY(1)' },
        },
        'ts-toast-in': {
          from: { opacity: '0', transform: 'translateX(24px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'ts-grow-x': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        // One soft ring pulse to draw the eye to a dialog's icon.
        'ts-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(123, 63, 0, 0.28)' },
          '100%': { boxShadow: '0 0 0 10px rgba(123, 63, 0, 0)' },
        },
      },
      animation: {
        'fade-in': 'ts-fade-in 150ms ease-out',
        'pop-in': 'ts-pop-in 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slide-up': 'ts-slide-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        rise: 'ts-rise 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'dialog-in': 'ts-dialog-in 260ms cubic-bezier(0.2, 0.9, 0.25, 1)',
        'dialog-out': 'ts-dialog-out 150ms ease-in forwards',
        'fade-out': 'ts-fade-out 150ms ease-in forwards',
        'drop-down': 'ts-drop-down 170ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'drop-up': 'ts-drop-up 170ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'toast-in': 'ts-toast-in 260ms cubic-bezier(0.2, 0.9, 0.25, 1)',
        'grow-x': 'ts-grow-x 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        ring: 'ts-ring 900ms ease-out 1',
      },
    },
  },
  plugins: [],
};
