/** @type {import('tailwindcss').Config} */
module.exports = {
  // ⚠️ IMPORTANT: ne JAMAIS matcher node_modules (perf catastrophique)
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
