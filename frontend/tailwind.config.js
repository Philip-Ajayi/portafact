/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090D16",
        surface: "#111827",
        border: "#1F2937",
        primary: "#6366F1",
        senior: "#10B981",
        junior: "#F59E0B",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
};
