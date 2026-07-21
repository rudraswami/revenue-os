/**
 * Single loading entry point (Growvisi DS v1).
 * One skeleton contract: the base `Skeleton` (animate-pulse, theme-aware
 * `bg-muted`, rounded). All page/section skeletons compose it. Import loaders
 * and skeletons from here — do not deep-import the underlying files.
 */
export {
  GrowvisiLogoLoader,
  GrowvisiLogoMark,
  GrowvisiSpinner,
} from "./growvisi-logo-loader";
export type { GrowvisiLogoLoaderSize } from "./growvisi-logo-loader";

export { LoadingScreen } from "@/components/ui/loading-screen";

export {
  Skeleton,
  InboxListSkeleton,
  InboxThreadSkeleton,
  MetricCardsSkeleton,
  PipelineSkeleton,
  ChartSkeleton,
} from "@/components/ui/skeleton";

export {
  InlineLoader,
  PanelRowsSkeleton,
  DashboardHomeSkeleton,
  DashboardListSkeleton,
  DashboardAnalyticsSkeleton,
} from "@/components/ui/page-loading";
