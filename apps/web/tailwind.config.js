/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "slime-bg": "#0A0A0A",
        "slime-card": "#111111",
        "slime-surface": "#1A1A1A",
        "slime-border": "#2A2A2A",
        "slime-text": "#F5F5F5",
        "slime-muted": "#888888",
        "slime-accent": "#39FF14",
        "slime-cyan": "#00F0FF",
        "slime-magenta": "#FF00E5",
        "slime-purple": "#2D0A4E",
        "slime-lime": "#7FFF00",
        "slime-violet": "#8B00FF",
        "slime-accent-hover": "#2DDC10",
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-holo": "linear-gradient(135deg, #00F0FF, #39FF14, #FF00E5)",
        "gradient-holo-radial":
          "radial-gradient(ellipse at center, #39FF14 0%, #00F0FF 50%, #FF00E5 100%)",
        "gradient-dark": "linear-gradient(180deg, #111111 0%, #0A0A0A 100%)",
        "gradient-surface": "linear-gradient(135deg, #1A1A1A 0%, #111111 100%)",
        "gradient-cta": "linear-gradient(135deg, #39FF14, #00F0FF)",
        "gradient-purple-dark":
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      },
      boxShadow: {
        slime: "0 4px 24px 0 rgba(57, 255, 20, 0.12)",
        "slime-sm": "0 2px 8px 0 rgba(57, 255, 20, 0.08)",
        "glow-green": "0 0 20px rgba(57, 255, 20, 0.3)",
        "glow-green-lg":
          "0 0 40px rgba(57, 255, 20, 0.4), 0 0 80px rgba(57, 255, 20, 0.15)",
        "glow-cyan": "0 0 20px rgba(0, 240, 255, 0.3)",
        "glow-cyan-lg":
          "0 0 40px rgba(0, 240, 255, 0.4), 0 0 80px rgba(0, 240, 255, 0.15)",
        "glow-magenta": "0 0 20px rgba(255, 0, 229, 0.3)",
        "glow-purple": "0 0 20px rgba(45, 10, 78, 0.6)",
        "card-purple":
          "0 1px 3px rgba(0,0,0,0.6), 0 4px 16px rgba(45,10,78,0.3), inset 0 0 20px rgba(45,10,78,0.15)",
        card: "0 1px 3px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
      },
      borderColor: {
        "purple-glow": "rgba(45, 10, 78, 0.8)",
      },
      animation: {
        "holo-shift": "holoShift 4s ease infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        holoShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};
