/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "slime-bg": "hsl(150 10% 97%)",
        "slime-card": "hsl(0 0% 100%)",
        "slime-surface": "hsl(150 8% 95%)",
        "slime-border": "hsl(150 10% 88%)",
        "slime-text": "hsl(155 20% 12%)",
        "slime-muted": "hsl(155 10% 52%)",
        "slime-accent": "hsl(152 60% 38%)",
        "slime-accent-hover": "hsl(152 60% 32%)",
      },
      boxShadow: {
        slime: "0 4px 24px 0 hsl(152 40% 50% / 0.12)",
        "slime-sm": "0 2px 8px 0 hsl(152 40% 50% / 0.08)",
      },
    },
  },
  plugins: [],
};
