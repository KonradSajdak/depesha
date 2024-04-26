import { defineProject } from "vitest/config"

export default defineProject({
  test: {
    exclude: ["**/.stryker-tmp/**", "node_modules"],
  },
})
