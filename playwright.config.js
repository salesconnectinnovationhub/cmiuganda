import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/browser",
    fullyParallel: false,
    workers: 1,
    reporter: "list",
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: "http://127.0.0.1:4173",
        browserName: "chromium",
        headless: true,
    },
    webServer: {
        command: "python -m http.server 4173 --bind 127.0.0.1 --directory .",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        timeout: 30_000,
    },
});