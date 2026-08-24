#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const path = process.argv[2] ?? 'store-assets/video/foreground-service-connected-device.mp4';
let bytes;
try {
  bytes = readFileSync(path);
} catch (error) {
  console.error(`ÉCHEC : vidéo FGS illisible : ${path}`);
  process.exit(1);
}

function boxesBetween(start, end) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const extended = bytes.readBigUInt64BE(offset + 8);
      if (extended > BigInt(Number.MAX_SAFE_INTEGER)) break;
      size = Number(extended);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) break;
    boxes.push({ type, start: offset, dataStart: offset + headerSize, end: offset + size });
    offset += size;
  }
  return boxes;
}

function child(box, type) {
  return boxesBetween(box.dataStart, box.end).find((candidate) => candidate.type === type);
}

const topLevel = boxesBetween(0, bytes.length);
const ftyp = topLevel.find((box) => box.type === 'ftyp');
const moov = topLevel.find((box) => box.type === 'moov');
const mdat = topLevel.find((box) => box.type === 'mdat');
if (!ftyp || !moov || !mdat) {
  console.error('ÉCHEC : conteneur MP4 incomplet (ftyp, moov ou mdat absent).');
  process.exit(1);
}

const mvhd = child(moov, 'mvhd');
if (!mvhd || mvhd.dataStart + 20 > mvhd.end) {
  console.error('ÉCHEC : durée MP4 introuvable.');
  process.exit(1);
}

const mvhdVersion = bytes.readUInt8(mvhd.dataStart);
let timescale;
let durationUnits;
if (mvhdVersion === 0) {
  timescale = bytes.readUInt32BE(mvhd.dataStart + 12);
  durationUnits = bytes.readUInt32BE(mvhd.dataStart + 16);
} else if (mvhdVersion === 1 && mvhd.dataStart + 32 <= mvhd.end) {
  timescale = bytes.readUInt32BE(mvhd.dataStart + 20);
  const duration64 = bytes.readBigUInt64BE(mvhd.dataStart + 24);
  durationUnits = duration64 <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(duration64) : 0;
} else {
  console.error(`ÉCHEC : version mvhd MP4 non prise en charge : ${mvhdVersion}.`);
  process.exit(1);
}

const durationSeconds = timescale > 0 ? durationUnits / timescale : 0;
if (!Number.isFinite(durationSeconds) || durationSeconds < 10 || durationSeconds > 180) {
  console.error(`ÉCHEC : durée vidéo ${durationSeconds.toFixed(1)} s ; attendu entre 10 et 180 s.`);
  process.exit(1);
}

let videoTrack = null;
for (const trak of boxesBetween(moov.dataStart, moov.end).filter((box) => box.type === 'trak')) {
  const mdia = child(trak, 'mdia');
  const hdlr = mdia ? child(mdia, 'hdlr') : null;
  const tkhd = child(trak, 'tkhd');
  if (!hdlr || !tkhd || hdlr.dataStart + 12 > hdlr.end || tkhd.end - tkhd.dataStart < 8) continue;
  if (bytes.toString('ascii', hdlr.dataStart + 8, hdlr.dataStart + 12) !== 'vide') continue;
  const width = bytes.readUInt32BE(tkhd.end - 8) / 65536;
  const height = bytes.readUInt32BE(tkhd.end - 4) / 65536;
  videoTrack = { width, height };
  break;
}

if (!videoTrack) {
  console.error('ÉCHEC : aucune piste vidéo MP4 détectée.');
  process.exit(1);
}

const shortSide = Math.min(videoTrack.width, videoTrack.height);
const longSide = Math.max(videoTrack.width, videoTrack.height);
if (shortSide < 480 || longSide < 800) {
  console.error(`ÉCHEC : résolution ${videoTrack.width}×${videoTrack.height} insuffisante ; minimum 480×800.`);
  process.exit(1);
}

console.log(
  `Vidéo FGS validée : ${durationSeconds.toFixed(1)} s, ${videoTrack.width}×${videoTrack.height}, ${(bytes.length / 1_048_576).toFixed(1)} Mio.`,
);
