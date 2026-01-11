import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { getAudioContext } from './audioContext';

type FFmpegInstance = {
  FS: (op: string, ...args: any[]) => any;
  run: (...args: string[]) => Promise<void>;
  load: (opts?: any) => Promise<void>;
};

let ffmpegInstance: FFmpegInstance | null = null;
let ffmpegLoaded = false;

async function ensureFFmpeg(): Promise<FFmpegInstance> {
  if (!ffmpegInstance) {
    const mod = await import('@ffmpeg/ffmpeg');
    const create =
      (mod as any).createFFmpeg || (mod as any).default?.createFFmpeg || (mod as any).default?.default?.createFFmpeg;
    if (!create) {
      throw new Error('createFFmpeg not found in @ffmpeg/ffmpeg');
    }
    ffmpegInstance = create({ log: false }) as FFmpegInstance;
  }
  if (!ffmpegLoaded) {
    try {
      // Prefer local assets to avoid network when possible.
      const corePath = '/ffmpeg/ffmpeg-core.js';
      // If running without the asset, @ffmpeg/util falls back to CDN.
      await ffmpegInstance.load({
        coreURL: await toBlobURL(corePath, 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      });
      ffmpegLoaded = true;
    } catch (err) {
      console.warn('FFmpeg load failed, using fallback', err);
      ffmpegLoaded = false;
      throw err;
    }
  }
  return ffmpegInstance;
}

export async function extractWavFromVideo(file: File): Promise<Blob> {
  const ffmpeg = await ensureFFmpeg();
  const inputName = 'input.' + (file.name.split('.').pop() || 'mp4');
  const outputName = 'output.wav';
  ffmpeg.FS('writeFile', inputName, await fetchFile(file));
  await ffmpeg.run(
    '-i',
    inputName,
    '-ac',
    '1',
    '-ar',
    '48000',
    '-map',
    '0:a:0',
    outputName,
  );
  const data = ffmpeg.FS('readFile', outputName);
  const wavBlob = new Blob([data.buffer], { type: 'audio/wav' });
  ffmpeg.FS('unlink', inputName);
  ffmpeg.FS('unlink', outputName);
  return wavBlob;
}

async function decodeToBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

function isVideoFile(file: File) {
  return file.type.startsWith('video') || file.name.toLowerCase().endsWith('.mp4');
}

export interface LoadedMedia {
  audioBuffer: AudioBuffer;
  audioUrl: string;
  videoUrl?: string;
}

export async function loadMediaFile(file: File): Promise<LoadedMedia> {
  if (isVideoFile(file)) {
    // Attempt to extract audio while also returning a video URL for preview.
    const videoUrl = URL.createObjectURL(file);
    try {
      const wavBlob = await extractWavFromVideo(file);
      const audioBuffer = await decodeToBuffer(wavBlob);
      const audioUrl = URL.createObjectURL(wavBlob);
      return { audioBuffer, audioUrl, videoUrl };
    } catch (error) {
      console.warn('Falling back to direct decode for video file', error);
      // Some MP4 files contain AAC audio that the browser can decode directly.
      const audioBuffer = await decodeToBuffer(file);
      const audioUrl = URL.createObjectURL(file);
      return { audioBuffer, audioUrl, videoUrl };
    }
  }

  const audioBuffer = await decodeToBuffer(file);
  const audioUrl = URL.createObjectURL(file);
  return { audioBuffer, audioUrl };
}
