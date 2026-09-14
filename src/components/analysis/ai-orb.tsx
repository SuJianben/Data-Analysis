export function AiOrb({ active }: { active: boolean }) {
  return (
    <div className={`ai-orb ${active ? "is-active" : ""}`} aria-hidden="true">
      <span className="ai-orb-ring ai-orb-ring-outer" />
      <span className="ai-orb-ring ai-orb-ring-inner" />
      <span className="ai-orbit ai-orbit-primary"><i /></span>
      <span className="ai-orbit ai-orbit-secondary"><i /></span>
      <span className="ai-orb-glow" />
      <strong>AI</strong>
    </div>
  );
}
