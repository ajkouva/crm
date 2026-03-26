/**
 * Skeleton shimmer components for premium loading states.
 * Usage: <Skeleton width="100%" height="20px" />
 *        <SkeletonCard />
 *        <SkeletonTable rows={5} cols={6} />
 */

const SHIMMER_KEYFRAMES = `
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
`;

const shimmerBase = {
  backgroundSize: '400% 100%',
  animation: 'shimmer 2s ease-in-out infinite',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden',
};

const getShimmer = () => ({
  ...shimmerBase,
  background: 'linear-gradient(90deg, var(--bg-body) 20%, var(--bg-section, #f3f4f5) 40%, var(--bg-body) 60%)',
});

export function Skeleton({ width = '100%', height = '16px', style = {}, rounded = false }) {
  return (
    <>
      <div style={{ width, height, ...getShimmer(), borderRadius: rounded ? '50%' : '8px', flexShrink: 0, ...style }} />
      <style>{SHIMMER_KEYFRAMES}</style>
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="card stat-card" style={{ gap: '14px', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="55%" height="11px" />
        <Skeleton width="28px" height="28px" rounded />
      </div>
      <Skeleton width="38%" height="32px" style={{ borderRadius: '6px' }} />
      <Skeleton width="70%" height="9px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  const widths = ['90px', '200px', '120px', '80px', '100px', '90px', '80px'];
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <style>{SHIMMER_KEYFRAMES}</style>
      {/* Header */}
      <div style={{
        display: 'flex', gap: '16px', padding: '14px 20px',
        borderBottom: '2px solid var(--border-color)', background: 'var(--bg-body)',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ width: widths[i] || '100px', height: '10px', ...getShimmer(), opacity: 0.7 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'flex', gap: '16px', padding: '18px 20px', alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: r % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)',
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{
              width: widths[c] || '100px', height: c === 0 ? '18px' : '13px',
              ...getShimmer(),
              borderRadius: c === 3 || c === 4 ? '20px' : '6px',
              animationDelay: `${(r * cols + c) * 0.03}s`,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = '📭', title = 'Nothing here yet', subtitle = '', action = null }) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 40px', gap: '12px', textAlign: 'center',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'var(--bg-body)', border: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.2rem', marginBottom: '8px',
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-mist)', maxWidth: '300px', lineHeight: 1.7 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 40px', gap: '12px', textAlign: 'center',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.2rem', marginBottom: '8px',
      }}>
        ⚠️
      </div>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: 'var(--red)', letterSpacing: '-0.3px' }}>
        Failed to Load
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-mist)', maxWidth: '300px', lineHeight: 1.7 }}>
        {message}
      </div>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry} style={{ marginTop: '8px' }}>
          ↺ Try Again
        </button>
      )}
    </div>
  );
}
