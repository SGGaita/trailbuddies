import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next/**", "e2e/screenshots/**", "playwright-report/**", "test-results/**"] },
  ...nextVitals,
];

export default config;
