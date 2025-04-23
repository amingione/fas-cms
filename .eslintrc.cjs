module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "@typescript-eslint/no-unused-expressions": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-fallthrough": "warn",
    "no-empty": "off",
    "react/react-in-jsx-scope": "off", // Astro/Next auto-imports React
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/prop-types": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", "public/"],
};
