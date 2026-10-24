// Optional browser tooling lives outside the application dependency tree.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
exports.launchBrowser = async () => {
  if (process.env.CHROMIUM_MODULE) {
    const imported = require(process.env.CHROMIUM_MODULE)
    const binary = imported.default || imported
    return chromium.launch({ executablePath: await binary.executablePath(), args: process.env.PIVOTT_BROWSER_MULTIPROCESS ? binary.args.filter((arg) => arg !== '--single-process') : binary.args, headless: true })
  }
  return chromium.launch({ headless: true, ...(process.env.PIVOTT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PIVOTT_CHROMIUM_EXECUTABLE } : {}) })
}
