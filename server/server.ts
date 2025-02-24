import express from "express";
import { execSync } from "child_process";
import path from "path";

const app = express();
const PORT = 3000;

app.use(express.json());
app.post("/deploy", (req, res) => {
  try {
    const { repourl, projectid } = req.body;
    console.log("Spinning up container...");

    const hostPath = path.resolve("local-output", projectid);

    execSync(
      `docker run  -v ${hostPath}:/home/app/output/dist -e GIT_REPOSITORY__URL=${repourl} --name ${projectid}-builder builder`
    );

    console.log("Container started, serving files...");

    res.json({
      message: "Build started, check local-output for results.",
      projectid,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to start build" });
  }
});

app.use("/output", express.static(path.join(__dirname, "local-output")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
