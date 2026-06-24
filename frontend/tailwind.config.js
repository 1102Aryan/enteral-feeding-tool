/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
      extend: {
        colors: {
          ink: "#1a1f24",
          primary: "#16181d",      // near-black primary buttons
          canvas: "#fdf9ef",       // warm cream page background
          cream: "#fbf6e9",        // selected / accent surfaces
          creamline: "#f0e4c3",
          // Glucose-band + status colours, always paired with a label.
          band: {
            hypo: "#c0392b",
            looming: "#d98a00",
            target: "#1f8a4c",
            above: "#b9430f",
          },
        },
        fontFamily: {
          sans: ["Inter", "system-ui", "sans-serif"],
        },
      },
    },
    plugins: [],
  };