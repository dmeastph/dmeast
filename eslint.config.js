import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

export default [
  // Ignore built output and node_modules
  { ignores: ["dist/**", "node_modules/**"] },

  // Base JS rules
  js.configs.recommended,

  // React + React Hooks rules for all JSX/JS source files
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
      react,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // React Hooks — keep rules-of-hooks; skip the noisy set-state-in-effect rule
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",   // valid pattern: setLoading(true) inside useEffect fetch
      "react-hooks/immutability": "off",           // too strict for current codebase
      "react-hooks/purity": "off",                 // Date.now() inside event handlers is fine

      // React
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",

      // Catch obvious mistakes
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-empty": ["error", { allowEmptyCatch: true }],  // allow empty catch(_){}

      // Keep off
      "react/prop-types": "off",
      "react/display-name": "off",
    },
  },
];
