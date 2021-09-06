const fs = require("fs");
const wav = require("node-wav");
const path = require("path");

const tempDir = "./temp";
const soundDir = "./sounds";

const soundPaths = fs.readdirSync("sounds");
let loadedSounds = [];
let offset = 0;
for (let p in soundPaths)
{
	const soundPath = path.join(soundDir, soundPaths[p]);
	if (fs.statSync(soundPath).isDirectory())
	{
		offset++;
		continue;
	}

	let buffer = fs.readFileSync(soundPath);
	let decoded = wav.decode(buffer);
	loadedSounds[p - offset] = decoded;
}

// somehow this works
// idk how to merge audio of different sample rates
// i tried looking it up and didn't find anything
// so i just made sure the sound files were exported with 48000 bytes per second
async function mergeBuffers (buffers, playtime = -1)
{
	// for the final length, either use the specified playtime, or the length of the first sound
	let length = playtime > 0 ? playtime * 48000 : buffers[0].length;
	let finalBuffer = [];
	for (let f_nr = 0; f_nr < length; f_nr++)
	{
		// literally add all the sound bytes together
		// yeah, this works??
		let value = 0;
		for (let buffer of buffers)
			if (buffer[f_nr]) value += buffer[f_nr];
		finalBuffer.push(value);
	}
	return Float32Array.from(finalBuffer);
}

class MemeAudio
{
	constructor()
	{
		this.tracks = [];
	}

	playSound (soundId, position = 0, track = -1)
	{
		// track not specified, go up one from previous
		if (track < 0)
			track = this.tracks.length;

		// track doesn't exist, initialize a new one
		let stereoTrackBuffer = this.tracks[track];
		if (!this.tracks[track])
			stereoTrackBuffer = [[], []];

		// get the data of the sound to play
		let sound = loadedSounds[soundId];
		for (let ch in stereoTrackBuffer) // should just be left/right audio channels
		{
			let loadedChannel = sound.channelData[ch];
			let byteArray = [];

			// add empty space until the sound should play
			for (let i = 0; i < position * 48000; i++)
				byteArray[i] = 0;

			// copy audio data from sound's channel
			for (let byte of loadedChannel)
				byteArray.push(byte);

			// convert to Float32array
			stereoTrackBuffer[ch] = Float32Array.from(byteArray);
		}

		// add to timeline
		this.tracks[track] = stereoTrackBuffer;

		return this;
	}

	async encode (duration)
	{
		let ac = { sampleRate: 48000, float: true, bitDepth: 32 }; // encoding config

		// make an array of all left channel audio and all right channel audio
		let combinedTrack = [[], []];
		for (let track in this.tracks)
		{
			combinedTrack[0].push(this.tracks[track][0]);
			combinedTrack[1].push(this.tracks[track][1]);
		}

		// make a single stereo track
		let mergedTrack = await Promise.all([mergeBuffers(combinedTrack[0], duration), mergeBuffers(combinedTrack[1], duration)]);

		let encoded = wav.encode(mergedTrack, ac);
		return encoded;
	}
}

async function generateAudio (seconds)
{
	let audio = new MemeAudio();
	let pos = 0;
	while (pos < seconds)
	{
		audio.playSound(Math.floor(Math.random() * loadedSounds.length), pos);
		pos += (Math.random() * 1) - 0.25;
	}
	let encoded = await audio.encode(seconds);
	resultPath = path.join(tempDir, `snd_${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}.wav`);
	await fs.promises.writeFile(resultPath, encoded);
	return resultPath;
}

module.exports = { generateAudio };