interface Props {
  src?: string;
}

export default function VideoPreview({ src }: Props) {
  if (!src) return null;
  return (
    <div className="panel video">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Video Reinforcement</div>
          <h2>Synchronized preview</h2>
        </div>
      </div>
      <video src={src} controls muted style={{ width: '100%', borderRadius: 12, background: '#000' }} />
    </div>
  );
}
