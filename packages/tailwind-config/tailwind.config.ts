import type { Config } from "tailwindcss";

// We want each package to be responsible for its own content.
const config: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        // Custom purple theme colors
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe', 
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#705ba0', // Main brand color
          600: '#5b4a82',
          700: '#4c3d6e',
          800: '#3d305a',
          900: '#2e2346',
        },
        // Alternative purple shades for variety
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe', 
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#705ba0',
          600: '#5b4a82',
          700: '#4c3d6e',
          800: '#3d305a',
          900: '#2e2346',
        }
      },
      backgroundImage: {
        "glow-conic":
          "conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)",
      },
      screens: {
        'xs': '475px',
        // sm: '640px' (default)
        // md: '768px' (default)
        // lg: '1024px' (default)
        // xl: '1280px' (default)
        // 2xl: '1536px' (default)
      },
    },
  },
  plugins: [],
};
export default config;
