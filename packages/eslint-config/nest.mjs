import base from "./index.mjs";
import globals from "globals";

export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off"
    }
  }
];
