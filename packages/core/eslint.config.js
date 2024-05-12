// @ts-check

import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import unusedImports from "eslint-plugin-unused-imports"
import promise from "eslint-plugin-promise"

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.js", "tests/**/*.ts", "tests/**/*.js"],
    plugins: { unusedImports, promise },
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "never"],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true }],
      "unusedImports/no-unused-imports": "error",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
  {
    files: [
      "**/*.js",
      ".playground/**/*.ts",
      "**/*.test.ts",
      "vitest.config.ts",
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
]
