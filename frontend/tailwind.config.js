// filepath: /Users/lucasgontijo/middleware-evolution/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/index.css", // If you have one
    "./src/**/*.{js,ts,jsx,tsx}", // Make sure this covers your components directory
  ],
  theme: {
    extend: {
        colors: {
            lightMode: {
                
              100: "#000e1b",//main
              200: "#f3f3f3",//sidebar
              300: "#3E3E3E", //text
              400: "#000000",
              500: "#0071E3", //blue
            },
            darkMode: {
              100: "#0e0e10", //main background
              200: "#1a1a1c", //sidebar
              300: "#9E9E9E", //text
              400: "#FFFFFF", // hover/active text
              500: "#818181",
            },
            dark: "#000000",
            light: "#FFFFFF",
    }
        
    },
  },
  plugins: [],
}
