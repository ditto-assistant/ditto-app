import "../styles/animations.css";
import "./LoadingSpinner.css";

export default function FullScreenSpinner({ text }) {
  return (
    <div className="loading-spinner-overlay">
      <LoadingSpinner size={100} />
      {text && <div className="loading-spinner-text">{text}</div>}
    </div>
  );
}

export function LoadingSpinner({ size = 50, inline = false }) {
  const containerClassName = `loading-spinner-container ${inline ? "inline" : "fullscreen"}`;

  return (
    <div
      className={containerClassName}
      style={{
        width: inline ? size : "100%",
        height: inline ? size : "100%",
        "--spinner-size": `${size}px`,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="spinner-ring" />
      ))}
    </div>
  );
}
