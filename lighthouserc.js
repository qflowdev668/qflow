module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/login",
        "http://localhost:3000/onboarding",
        "http://localhost:3000/status",
      ],
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.75 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.85 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 3000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        interactive: ["warn", { maxNumericValue: 5000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
}
