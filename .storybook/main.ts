import type { StorybookConfig } from "@storybook/react-vite";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../resources/packages/ui/src/**/*.mdx",
    "../resources/packages/ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../resources/packages/shell/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../resources/packages/stellar/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {},
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@helm/ui": join(__dirname, "../resources/packages/ui/src"),
          "@helm/actions": join(__dirname, "../resources/packages/actions/src"),
          "@helm/shell": join(__dirname, "../resources/packages/shell/src"),
          "@helm/errors": join(__dirname, "../resources/packages/errors/src"),
          "@helm/stellar": join(__dirname, "../resources/packages/stellar/src"),
          "@helm/types": join(__dirname, "../resources/packages/types/src"),
        },
        dedupe: ["react", "react-dom"],
      },
      optimizeDeps: {
        include: ["@wordpress/components"],
      },
    });
  },
};

export default config;
