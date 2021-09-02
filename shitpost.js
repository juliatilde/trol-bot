const { generateAudio } = require("./shitpost-audio.js");
const { generateFrames } = require("./shitpost-video.js");
const { spawn } = require("child_process");
const fs = require("fs");

async function generateVideo (sourceImg, duration)
{
    let [framesPath, audioPath] = await Promise.all([
        generateFrames(sourceImg, duration),
        generateAudio(duration)
    ]);

    const outputPath = `./temp/output_${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}.mp4`;

    const child = spawn(`ffmpeg -i ${audioPath} -r 20 -i ${framesPath}/%d.png -c:v libx264 -vf fps=20 -pix_fmt yuv420p ${outputPath}`, { shell: true })
    child.on("exit", (code) => { finished = true; });

    let finished = false;
    while (!finished) await new Promise(resolve => setTimeout(resolve, 10));

    // delete temp files
    fs.promises.rm(framesPath, { recursive: true });
    fs.promises.rm(audioPath);
    fs.promises.rm(sourceImg);

    return outputPath;
}

module.exports = { generateVideo };