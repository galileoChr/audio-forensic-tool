let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ sampleRate: 48000 });
  }
  return ctx;
}
