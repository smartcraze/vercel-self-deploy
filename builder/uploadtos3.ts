import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import dotenv from "dotenv";

dotenv.config();

const PROJECT_ID = process.env.PROJECT_ID;

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

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

async function uploadToS3() {
  console.log("Uploading files...");

  const distPath = path.join(__dirname, "output", "dist");
  const files = fs.readdirSync(distPath, { recursive: true });

  for (const file of files) {
    const filePath = path.join(distPath, file as string);
    if (fs.lstatSync(filePath).isDirectory()) continue;

    const s3Key = `__outputs/${PROJECT_ID}/${file
      .toString()
      .replace(/\\/g, "/")}`;
    console.log(`Uploading: ${s3Key}`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: "output.surajv.me",
        Key: s3Key,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || "application/octet-stream",
      })
    );
  }

  console.log("Upload complete.");
}

function copyDistToHost() {
  console.log("Copying built files from container to host...");

  const containerId = execSync("docker ps -lq").toString().trim();
  if (!containerId) {
    console.error("No running container found.");
    return;
  }

  const hostPath = path.join(__dirname, "local-output");
  if (!fs.existsSync(hostPath)) fs.mkdirSync(hostPath, { recursive: true });

  const containerPath = "/home/app/output/dist";
  execSync(`docker cp ${containerId}:${containerPath} ${hostPath}`);

  console.log("Files copied successfully to:", hostPath);
}

async function main() {
  try {
    await buildProject();
    await uploadToS3();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
