import { env, pipeline } from '@xenova/transformers';

// Prefer local model assets served from /models to avoid network fetch issues.
env.allowLocalModels = true;
env.localModelPath = '/models';

// Resample mono audio to 16k for Whisper models.
function resampleTo16k(buffer: AudioBuffer): Float32Array {
  const targetRate = 16000;
  if (buffer.sampleRate === targetRate) {
    return buffer.getChannelData(0);
  }
  const channel = buffer.getChannelData(0);
  const duration = buffer.duration;
  const targetLength = Math.floor(duration * targetRate);
  const output = new Float32Array(targetLength);
  const ratio = channel.length / targetLength;
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const left = Math.floor(srcIndex);
    const right = Math.min(channel.length - 1, left + 1);
    const t = srcIndex - left;
    output[i] = channel[left] * (1 - t) + channel[right] * t;
  }
  return output;
}

class Transcriber {
  private asr?: any;

  private async ensureModel() {
    if (this.asr) return;
    this.asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      quantized: true,
    });
  }

  async transcribe(buffer: AudioBuffer): Promise<string> {
    try {
      await this.ensureModel();
      const pcm = resampleTo16k(buffer);
      const result = await this.asr(pcm, { sampling_rate: 16000, chunk_length_s: 30 } as any);
      const text = result?.text || '';
      if (text) return text.trim();
    } catch (error) {
      console.warn('ASR failed, returning fallback message', error);
    }
    return '[transcription unavailable]';
  }
}

export const transcriber = new Transcriber();
