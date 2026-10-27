import { join } from "node:path";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing. Set it in your terminal or in a root .env file.");
  process.exit(1);
}

const services = [
  { name: "BE", command: ["bun", "run", "index.ts"] },
  { name: "FE", command: ["bun", "run", "dev"] },
];

const children = services.map(({ name, command }) => {
  console.log(`Starting ${name}...`);
  return Bun.spawn(command, {
    cwd: join(import.meta.dir, name),
    env: process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log("\nOpen http://localhost:3001 — press Ctrl+C to stop both services.\n");
const result = await Promise.race(children.map(async (child, index) => ({
  name: services[index]!.name,
  code: await child.exited,
})));
const failed = !stopping && result.code !== 0;
stop();
await Promise.all(children.map(child => child.exited));
if (failed) console.error(`${result.name} exited with code ${result.code}.`);
process.exitCode = failed ? result.code : 0;
