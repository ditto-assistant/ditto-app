import reactPlugin from "eslint-plugin-react"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import typescriptPlugin from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import tanstackPlugin from "@tanstack/eslint-plugin-query"
import globals from "globals"

export default [
  {
    ignores: [
      "**/functions/**",
      "**/websocket-server/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/dev-dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/vite.config.ts"
    ]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2022
      }
    },
    plugins: {
      react: reactPlugin,
      "@typescript-eslint": typescriptPlugin,
      "react-hooks": reactHooksPlugin,
      "@tanstack/query": tanstackPlugin
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      ...typescriptPlugin.configs["recommended"].rules,
      ...reactPlugin.configs["recommended"].rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...tanstackPlugin.configs.recommended.rules,

      // Custom rule overrides
      "react/prop-types": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
]
