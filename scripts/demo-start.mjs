// Arranca la app contra la base de DEMOSTRACIÓN, para grabar el vídeo:
//
//   npm run demo:start      (http://localhost:3000, datos de hireflow_demo)
//
// Es lo mismo que "npm start" en backend/, pero con DB_NAME=hireflow_demo,
// sin tener que escribir la variable a mano (en PowerShell y en Bash se
// escribe distinto). Ver docs/demoVideo.md.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_DB = process.env.DEMO_DB_NAME || "hireflow_demo";

console.log(`HireFlow con los datos de demostración (${DEMO_DB}). Ctrl+C para parar.`);
const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(ROOT, "backend"),
    env: { ...process.env, DB_NAME: DEMO_DB },
    stdio: "inherit"
});
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
