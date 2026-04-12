/**
 * W3 Aave Action entrypoint.
 *
 * Thin wrapper that calls run() from main.js. The split exists so that
 * tests can import run() directly without triggering execution at module
 * load time.
 *
 * Do not add logic here — keep it in main.js.
 */

import { run } from './main.js'

process.on('unhandledRejection', (err) => {
  console.error('[w3-aave-action] Unhandled rejection:', err)
})

run()
