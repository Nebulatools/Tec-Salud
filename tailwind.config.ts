// Tailwind config with ZULI brand colors
import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        archivo: ["var(--font-archivo)", "sans-serif"],
        brygada: ["var(--font-brygada)", "serif"],
      },
      colors: {
        // ZULI Brand Colors
        zuli: {
          // VERONICA - Magenta/Violet - Sofisticación y tecnología
          veronica: {
            DEFAULT: "#AD11FF",
            50: "#F9E6FF",
            100: "#F2CCFF",
            200: "#E699FF",
            300: "#D966FF",
            400: "#CC33FF",
            500: "#AD11FF",
            600: "#8A0DCC",
            700: "#680A99",
            800: "#450666",
            900: "#230333",
          },
          // TROPICAL INDIGO - Salud y bienestar
          indigo: {
            DEFAULT: "#7E85FC",
            50: "#F0F1FE",
            100: "#E1E3FD",
            200: "#C3C7FB",
            300: "#A5ABF9",
            400: "#878FF7",
            500: "#7E85FC",
            600: "#5158FA",
            700: "#242DF8",
            800: "#0911D6",
            900: "#070CA9",
          },
          // ELECTRIC BLUE / Cyan - Digitalización y energía
          cyan: {
            DEFAULT: "#52F1FA",
            50: "#E8FDFE",
            100: "#D1FBFD",
            200: "#A3F7FB",
            300: "#75F3F9",
            400: "#52F1FA",
            500: "#1EEDF8",
            600: "#08C9D4",
            700: "#0699A1",
            800: "#04696E",
            900: "#02393B",
          },
          // SPACE CADET - Visión y seriedad (dark background)
          space: {
            DEFAULT: "#141633",
            50: "#E8E9F0",
            100: "#D1D3E1",
            200: "#A3A7C3",
            300: "#757BA5",
            400: "#4A5087",
            500: "#2D325A",
            600: "#232747",
            700: "#1A1D35",
            800: "#141633",
            900: "#0A0B19",
          },
        },
        // Map ZULI colors to semantic colors
        primary: {
          50: "#F9E6FF",
          100: "#F2CCFF",
          200: "#E699FF",
          300: "#D966FF",
          400: "#CC33FF",
          500: "#AD11FF", // VERONICA
          600: "#8A0DCC",
          700: "#680A99",
          800: "#450666",
          900: "#230333",
          DEFAULT: "#AD11FF",
          foreground: "#FFFFFF",
        },
        // Grays based on Space Cadet
        gray: {
          50: "#F8F9FC",
          100: "#F1F3F9",
          200: "#E2E5F0",
          300: "#C5CAE0",
          400: "#9AA0C0",
          500: "#6E75A0",
          600: "#4A5080",
          700: "#2D325A",
          800: "#1A1D35",
          900: "#141633", // Space Cadet
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        // ZULI Gradients
        "zuli-tricolor": "linear-gradient(135deg, #AD11FF 0%, #7E85FC 50%, #52F1FA 100%)",
        "zuli-bicolor-1": "linear-gradient(135deg, #AD11FF 0%, #7E85FC 100%)",
        "zuli-bicolor-2": "linear-gradient(135deg, #7E85FC 0%, #52F1FA 100%)",
        "zuli-bicolor-3": "linear-gradient(135deg, #AD11FF 0%, #52F1FA 100%)",
        "zuli-light": "linear-gradient(135deg, rgba(173,17,255,0.1) 0%, rgba(126,133,252,0.1) 50%, rgba(82,241,250,0.05) 100%)",
        "zuli-dark": "linear-gradient(135deg, rgba(173,17,255,0.3) 0%, rgba(126,133,252,0.2) 50%, rgba(82,241,250,0.1) 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(173, 17, 255, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(126, 133, 252, 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config

export default config
