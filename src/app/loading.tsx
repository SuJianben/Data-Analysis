export default function Loading() {
  return (
    <div className="page route-loading" role="status" aria-live="polite" aria-label="正在载入页面数据">
      <div className="route-loading-heading">
        <span />
        <strong />
        <i />
      </div>
      <div className="route-loading-metrics">
        <span /><span /><span /><span />
      </div>
      <div className="route-loading-content">
        <span /><span /><span />
      </div>
      <span className="sr-only">正在载入页面数据</span>
    </div>
  );
}
