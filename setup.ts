import { join } from "node:path";

for (const service of ["BE", "FE"]) {
  console.log(`\nInstalling ${service} dependencies...`);
  const process = Bun.spawn(["bun", "install"], {
    cwd: join(import.meta.dir, service),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await process.exited;
  if (code !== 0) {
    console.error(`${service} installation failed with exit code ${code}.`);
    globalThis.process.exit(code);
  }
}

console.log("\nSetup complete. Run: bun run dev");
