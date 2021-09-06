const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require(`path`);
const config = require(`./config`);

const tempDir = "./temp";
const imagesDir = "./images";

// load images
let initialized = false;
let images = [];
let imgPromises = [];
fs.promises.readdir(imagesDir).then(filenames =>
{
	for (var filename of filenames)
		imgPromises.push(loadImage(path.join(imagesDir, filename)).then(data => images.push(data)));

	Promise.all(imgPromises).then(() => initialized = true);
});

async function generateFrames (sourceImagePath, duration)
{
	if (!initialized)
		return null;

	let outputPath = path.join(tempDir, "frames_" + Math.floor(Math.random() * 10000).toString().padStart(4, "0"));
	let sourceImage;

	await Promise.all([
		fs.promises.mkdir(outputPath),
		loadImage(sourceImagePath).then(data => sourceImage = data)
	]);

	const totalFrames = config.video.framerate * duration;

	// init timeline
	let objects = [];

	// define classes
	class Object
	{
		constructor(arg = {})
		{
			this.imageId = arg.imageId || -1;
			this.spawnFrame = arg.spawnFrame || 0;
			this.lifetime = config.video.framerate * duration;
			this.pos = arg.pos || [0.5, 0.5];
			this.scale = arg.scale || [1, 1];
			this.pivot = arg.pivot || [0.5, 0.5];
			this.rot = arg.rot || 0;
			this.blink = false;
			this.sineDur = 0;

			this.actions = arg.actions || [];

			objects.push(this);
		}
	}

	class Action
	{
		constructor(arg = {})
		{
			this.type = arg.type;
			this.delta = arg.delta;
			this.start = arg.start || 0;
		}
	}

	// generate timeline
	const base = new Object();
	if (randomChance(80)) base.actions.push(new Action({ type: "scale", delta: [randomRange(0, 0.1), randomRange(0, 0.05)] }));

	for (i = 0; i < randomRange(2, 12); i++)
	{
		const obj = new Object();
		obj.pos = [Math.random(), Math.random()];
		const uniformScale = randomRange(0.1, 0.7);
		obj.scale = [uniformScale + Math.random() * 0.01, uniformScale + Math.random() * 0.01];
		obj.imageId = Math.floor(Math.random() * images.length);
		obj.spawnFrame = Math.floor(Math.random() * totalFrames);
		obj.lifetime = randomRange(config.video.framerate * 0.25, config.video.framerate * 3);
		obj.pivot = [Math.random(), Math.random()];

		if (randomChance(25))
			obj.actions.push(new Action({ type: "rotate", delta: randomRange(-8, 8) }))
		if (randomChance(25))
			obj.actions.push(new Action({ type: "scale", delta: [randomRange(0, 0.05), 0] }))

		if (randomChance(25))
			obj.blink = true;
		else if (randomChance(25))
			obj.actions.push(new Action({ type: "move", delta: [randomRange(-0.05, 0.05), randomRange(-0.05, 0.05)] }))

		if (randomChance(75))
			obj.sineDur = randomRange(1, 5);
	}

	// sort by spawnframe
	objects.sort((a, b) => (a.spawnFrame > b.spawnFrame) ? 1 : -1);

	// render frames
	let framePromises = [];
	for (var _f = 0; _f < totalFrames; _f++)
	{
		const f = _f;
		framePromises.push(async () =>
		{
			const canvas = createCanvas(config.video.resoltuion, config.video.resoltuion);
			const ctx = canvas.getContext("2d");

			// draw objects
			for (var object of objects)
			{
				var life = f - object.spawnFrame; // frames passed since init
				if (life < 0) continue;
				if (life > object.lifetime) continue;
				if (object.blink && life % 2 == 1) continue;

				var pos = object.pos;
				var rot = object.rot;
				var scale = object.scale;
				var image = object.imageId == -1 ? sourceImage : images[object.imageId];

				// process actions
				for (var action of object.actions)
				{
					if (f < object.spawnFrame + action.start + 1 || ((action.dur > 0) && (f > object.spawnFrame + action.start + action.dur))) continue; // ignore
					const progress = object.sineDur > 0 ? 10 * Math.sin(life * object.sineDur) : life;
					switch (action.type)
					{
						case "move":
							pos = [object.pos[0] + action.delta[0] * progress, object.pos[1] + action.delta[1] * progress];
							break;

						case "scale":
							scale = [object.scale[0] + action.delta[0] * progress, object.scale[1] + action.delta[1] * progress];
							break;

						case "rotate":
							rot = object.rot + action.delta * life;
							break;
					}
				}

				var size = [scale[0] * config.video.resoltuion, scale[1] * config.video.resoltuion]; // size in pixels
				var cpos = [pos[0] * config.video.resoltuion, pos[1] * config.video.resoltuion]; // center pos
				var blpos = [cpos[0] - size[0] * object.pivot[0], cpos[1] - size[1] * object.pivot[1]] // bottom left pos

				// save base canvas transform
				ctx.save();

				// rotate canvas to match object rotation
				ctx.translate(cpos[0], cpos[1]);
				ctx.rotate(rot * Math.PI / 180);
				ctx.translate(-cpos[0], -cpos[1]);

				// draw
				ctx.drawImage(image, blpos[0], blpos[1], size[0], size[1])

				// restore transform
				ctx.restore();

				// save the frame
				const buffer = canvas.toBuffer("image/png");
				await fs.promises.writeFile(path.join(outputPath, `${f}.png"`), buffer);
			}
		});
	}

	await Promise.all(framePromises.map(fn => fn()));

	return outputPath;
}

function randomRange (x, y)
{
	return Math.random() * (y - x) + x;
}

function randomChance (percent)
{
	return (Math.random() * 100) <= percent;
}

module.exports = { generateFrames };