// Vercel Services entrypoint. Vercel runs the exported Express app as a
// serverless function (no app.listen here — that's only for local `pnpm dev`).
import { createApp } from '../src/app.js';

const app = createApp();

export default app;
