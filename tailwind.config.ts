import type { Config } from "tailwindcss";
import daisyui from "daisyui";

type DaisyUIConfig = {
  daisyui?: {
    themes?: object[];
    darkTheme?: boolean | string;
    base?: boolean;
    styled?: boolean;
    utils?: boolean;
  };
};

const config: Config & DaisyUIConfig = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'input': '8px',
        'card': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        kyston: {
          "primary": "#6D28D9",
          "primary-content": "#ffffff",
          "secondary": "#06B6D4",
          "secondary-content": "#ffffff",
          "accent": "#A78BFA",
          "accent-content": "#1e1b4b",
          "neutral": "#1E1B2E",
          "neutral-content": "#E2E8F0",
          "base-100": "#F8F7FF",
          "base-200": "#EEECFD",
          "base-300": "#DDD9FB",
          "base-content": "#1E1B2E",
          "info": "#38BDF8",
          "success": "#34D399",
          "warning": "#FBBF24",
          "error": "#F87171",
        }
      }
    ],
    darkTheme: false,
    base: true,
    styled: true,
    utils: true,
  },
};

export default config;