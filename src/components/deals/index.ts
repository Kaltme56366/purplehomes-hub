/**
 * Deal Pipeline Components
 *
 * Export all deal-related components for the Deal Pipeline page.
 */

// Shared components
export { BuyerAvatar } from './Shared/BuyerAvatar';
export { UrgencyIndicator, getUrgencyType } from './Shared/UrgencyIndicator';
export type { UrgencyType } from './Shared/UrgencyIndicator';
export {
  DealEmptyState,
  NoDealsEmptyState,
  NoResultsEmptyState,
  NoUpcomingEmptyState,
  AllCaughtUpEmptyState,
  EmptyStageState,
} from './Shared/DealEmptyState';

// Overview components
export { MetricCard, formatPipelineValue } from './Overview/MetricCard';
export { PipelineHealthChart } from './Overview/PipelineHealthChart';
export { NeedsAttentionCard } from './Overview/NeedsAttentionCard';
export { UpcomingCard } from './Overview/UpcomingCard';
export { PipelineOverview } from './Overview/PipelineOverview';
export { MorningBriefing } from './MorningBriefing';
export { WinProbability, WinProbabilityBadge } from './WinProbability';

// List view components
export { DealsListView } from './ListView/DealsListView';
export { DealsByBuyerView } from './ByBuyerView/DealsByBuyerView';
export { DealsByPropertyView } from './ByPropertyView/DealsByPropertyView';

// Kanban components
export { DealCard } from './KanbanView/DealCard';
export { PipelineBoard } from './KanbanView/PipelineBoard';

// Modal
export { DealDetailModal } from './DealDetailModal';
