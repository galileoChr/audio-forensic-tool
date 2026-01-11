import { pipeline } from '@xenova/transformers';

const SEGMENT_COUNT = 16;

export type EmbeddingVector = Float32Array;

function fallbackEmbedding(buffer: AudioBuffer): EmbeddingVector {
  const channel = buffer.getChannelData(0);
  const segmentLength = Math.floor(channel.length / SEGMENT_COUNT);
  const data = new Float32Array(SEGMENT_COUNT);
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const start = i * segmentLength;
    const end = i === SEGMENT_COUNT - 1 ? channel.length : start + segmentLength;
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += channel[j] * channel[j];
    }
    const rms = Math.sqrt(sum / Math.max(1, end - start));
    data[i] = rms;
  }
  return data;
}

function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-6);
}

class ClapService {
  private audioExtractor?: any;
  private textExtractor?: any;

  private async ensureAudio() {
    if (this.audioExtractor) return;
    this.audioExtractor = await pipeline('feature-extraction', 'Xenova/clap-htsat-unfused');
  }

  private async ensureText() {
    if (this.textExtractor) return;
    this.textExtractor = await pipeline('feature-extraction', 'Xenova/clap-htsat-unfused', { quantized: true });
  }

  async embedAudio(buffer: AudioBuffer): Promise<EmbeddingVector> {
    try {
      await this.ensureAudio();
      const pcm = buffer.getChannelData(0);
      const result = await this.audioExtractor(pcm, { sampling_rate: buffer.sampleRate, chunk_length: 10 });
      const data = result?.data ?? result?.tensor?.data ?? result;
      if (data) return Float32Array.from(data as Iterable<number>);
    } catch (error) {
      console.warn('CLAP audio embedding fallback', error);
    }
    return fallbackEmbedding(buffer);
  }

  async embedText(prompt: string): Promise<EmbeddingVector> {
    try {
      await this.ensureText();
      const result = await this.textExtractor(prompt);
      const data = result?.data ?? result?.tensor?.data ?? result;
      if (data) return Float32Array.from(data as Iterable<number>);
    } catch (error) {
      console.warn('CLAP text embedding fallback', error);
    }
    // Simple hashed vector fallback to keep similarity deterministic.
    const hash = new Float32Array(SEGMENT_COUNT);
    for (let i = 0; i < prompt.length; i++) {
      hash[i % SEGMENT_COUNT] += (prompt.charCodeAt(i) % 7) / 7;
    }
    return hash;
  }

  score(a: EmbeddingVector, b: EmbeddingVector) {
    return cosineSimilarity(a, b);
  }
}

export const clapService = new ClapService();

export interface SemanticSegment {
  start: number;
  end: number;
  score: number;
}

export async function findSemanticMatches(buffer: AudioBuffer, query: string): Promise<SemanticSegment[]> {
  if (!query.trim()) return [];
  const audioEmbedding = await clapService.embedAudio(buffer);
  const textEmbedding = await clapService.embedText(query);
  const baseScore = clapService.score(audioEmbedding, textEmbedding);

  // Heuristic: split into windows and weigh by energy and base similarity.
  const windowSeconds = Math.max(0.5, buffer.duration / SEGMENT_COUNT);
  const segments: SemanticSegment[] = [];
  const channel = buffer.getChannelData(0);
  const samplesPerWindow = Math.floor(buffer.sampleRate * windowSeconds);
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const startSample = i * samplesPerWindow;
    const endSample = Math.min(channel.length, startSample + samplesPerWindow);
    if (startSample >= channel.length) break;
    let sum = 0;
    for (let j = startSample; j < endSample; j++) {
      sum += channel[j] * channel[j];
    }
    const rms = Math.sqrt(sum / Math.max(1, endSample - startSample));
    const energyScore = Math.min(1, rms * 12);
    const combined = Math.max(0, baseScore) * 0.7 + energyScore * 0.3;
    if (combined > 0.2) {
      segments.push({
        start: startSample / buffer.sampleRate,
        end: endSample / buffer.sampleRate,
        score: combined,
      });
    }
  }
  return segments;
}
