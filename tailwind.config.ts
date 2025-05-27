// Tailwind config with exact colors from the image
import type { Config } from "tailwindcss"

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
      colors: {
        // Colores exactos de la imagen
        primary: {
          50: "#f0fdfa", // Verde agua muy claro para sidebar
          100: "#ccfbf1", // Verde agua claro
          200: "#99f6e4", // Verde agua medio
          300: "#5eead4", // Verde agua
          400: "#2dd4bf", // Verde agua activo
          500: "#14b8a6", // Verde agua principal
          600: "#0d9488", // Verde agua oscuro
          700: "#0f766e", // Verde agua más oscuro
          800: "#115e59", // Verde agua muy oscuro
          900: "#134e4a", // Verde agua casi negro
        },
        // Grises suaves como en la imagen
        gray: {
          50: "#f9fafb", // Fondo muy claro
          100: "#f3f4f6", // Fondo claro
          200: "#e5e7eb", // Bordes suaves
          300: "#d1d5db", // Texto secundario
          400: "#9ca3af", // Texto placeholder
          500: "#6b7280", // Texto normal
          600: "#4b5563", // Texto oscuro
          700: "#374151", // Texto muy oscuro
          800: "#1f2937", // Casi negro
          900: "#111827", // Negro
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
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
