import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function buildProject() {
  console.log("Starting build process...");
  const repoPath = path.join(__dirname, "output");

  return new Promise<void>((resolve, reject) => {
    const p = exec(`cd ${repoPath} && npm install && npm run build`);

    p.stdout?.on("data", (data) => console.log(data.toString()));
    p.stderr?.on("data", (data) => console.error("Error:", data.toString()));

    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("Build failed"))
    );
  });
}

async function main() {
  try {
    await buildProject();
    console.log("Build completed successfully");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
