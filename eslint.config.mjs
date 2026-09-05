import eslintConfigPrettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const featureInternalsPattern = {
  group: ["@/features/*/**"],
  message: "Import feature modules through their public index.",
};

const prismaClientPattern = {
  group: [
    "@prisma/client",
    "@prisma/client/**",
    "@/generated/prisma",
    "@/generated/prisma/**",
  ],
  message: "Import Prisma only through src/lib/db.ts.",
};

const databasePattern = {
  group: ["@/lib/db", "@/lib/db/**"],
  message: "Only repository files may import the database client.",
};

const editorRuntimePattern = {
  group: ["@tiptap/*", "@tiptap/*/**"],
  message:
    "Only src/features/post/content/editor may import the TipTap runtime; public pages must not bundle the editor.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [featureInternalsPattern],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [featureInternalsPattern, prismaClientPattern],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db.ts", "src/features/**/server/*.repository.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            featureInternalsPattern,
            prismaClientPattern,
            databasePattern,
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/db.ts",
      "src/features/**/server/*.repository.ts",
      "src/features/post/content/editor/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            featureInternalsPattern,
            prismaClientPattern,
            databasePattern,
            editorRuntimePattern,
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
  globalIgnores([".next/**", "out/**", "build/**", "dist/**", "next-env.d.ts"]),
]);

export default eslintConfig;
