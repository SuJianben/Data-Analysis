type DataSourceNoticeProps = {
  onRetry?: () => void;
};

export function DataSourceNotice({ onRetry }: DataSourceNoticeProps) {
  return (
    <section className="data-source-notice" role="alert">
      <span className="eyebrow">DATA SOURCE</span>
      <h1>数据源暂时不可用</h1>
      <p>页面本身仍可使用。云端数据恢复后重新加载即可继续查看，不会因此删除已有数据。</p>
      {onRetry ? <button className="button button-primary" type="button" onClick={onRetry}>重新加载</button> : null}
    </section>
  );
}
