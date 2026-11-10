// Extends app.json. AVELUNE_BASE_URL serves the web build from a sub-path (the GitHub Pages demo lives at
// /avelune/app); everything else comes from app.json unchanged.
module.exports = ({ config }) => {
  const base = process.env.AVELUNE_BASE_URL;
  return base ? { ...config, experiments: { ...(config.experiments ?? {}), baseUrl: base } } : config;
};
