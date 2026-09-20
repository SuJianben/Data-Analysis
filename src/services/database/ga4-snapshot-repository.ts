import { db } from "@/services/database/db";
import {
  saveGlobalClickMetrics,
  saveHeatmapMetrics,
  saveMenuMetrics,
  saveSiteMetrics,
  saveSnapshot,
} from "@/services/database/repositories";
import type { SiteKey } from "@/config/sites";
import type { GlobalClickMetricInput, HeatmapMetricInput, MenuMetricInput, SiteMetricInput } from "@/types/analytics";

type Ga4Dataset = {
  menuMetrics: MenuMetricInput[];
  siteMetrics: SiteMetricInput[];
  heatmapMetrics: HeatmapMetricInput[];
  globalClickMetrics: GlobalClickMetricInput[];
  warnings: string[];
  availability: {
    menu: boolean;
    site: true;
    heatmap: boolean;
    globalClicks: boolean;
  };
};

type ReplaceGa4SnapshotInput = {
  siteKey: SiteKey;
  source: string;
  startDate: string;
  endDate: string;
  dataset: Ga4Dataset;
};

const tableByDataset = {
  menu: "menu_click_metrics",
  site: "site_metrics",
  heatmap: "heatmap_click_metrics",
  globalClicks: "global_click_metrics",
} as const;

function deletePeriod(table: string, siteKey: SiteKey, source: string, startDate: string, endDate: string) {
  db.prepare(`DELETE FROM ${table} WHERE site_key = ? AND source = ? AND event_date BETWEEN ? AND ?`)
    .run(siteKey, source, startDate, endDate);
}

export function replaceGa4Snapshot(input: ReplaceGa4SnapshotInput) {
  const { dataset, siteKey, source, startDate, endDate } = input;
  const transaction = db.transaction(() => {
    for (const [datasetKey, table] of Object.entries(tableByDataset) as [keyof Ga4Dataset["availability"], string][]) {
      if (dataset.availability[datasetKey]) deletePeriod(table, siteKey, source, startDate, endDate);
    }

    if (dataset.availability.menu) saveMenuMetrics(source, dataset.menuMetrics, siteKey);
    saveSiteMetrics(source, dataset.siteMetrics, siteKey);
    if (dataset.availability.heatmap) saveHeatmapMetrics(source, dataset.heatmapMetrics, siteKey);
    if (dataset.availability.globalClicks) saveGlobalClickMetrics(source, dataset.globalClickMetrics, siteKey);

    saveSnapshot({
      siteKey,
      source,
      counts: {
        menus: dataset.menuMetrics.length,
        metrics: dataset.siteMetrics.length,
        heatmap: dataset.heatmapMetrics.length,
        globalClicks: dataset.globalClickMetrics.length,
      },
      availability: dataset.availability,
      warnings: dataset.warnings,
    }, startDate, endDate, source, siteKey);
  });

  transaction();
  return dataset.menuMetrics.length
    + dataset.siteMetrics.length
    + dataset.heatmapMetrics.length
    + dataset.globalClickMetrics.length;
}
