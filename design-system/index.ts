/**
 * Clawed Design — public API.
 *
 * Styles ship separately: import `@clawed/design-system/tokens.css` then
 * `@clawed/design-system/components.css` once at the application root.
 */

// Tokens
export * from './tokens';

// Schemas and types
export * from './schemas';

// Business logic (pure functions — no React)
export * from './utils/formatting';
export * from './utils/status';
export * from './utils/validation';
export * from './utils/productCompatibility';
export * from './utils/designQualityAudit';

// Primitives
export * from './components/Button';
export * from './components/Card';
export * from './components/Badge';
export * from './components/Field';
export * from './components/Input';
export * from './components/Select';
export * from './components/Textarea';
export * from './components/Modal';
export * from './components/Tabs';
export * from './components/DataTable';
export * from './components/StatusBadge';
export * from './components/ProgressBar';
export * from './components/SectionHeader';
export * from './components/EmptyState';
export * from './components/DetailList';
export * from './components/DimensionsText';
export * from './components/SpecValueText';
export * from './components/StatementList';

// Domain components
export * from './components/ClientBriefCard';
export * from './components/RoomCard';
export * from './components/ProductCard';
export * from './components/MaterialCard';
export * from './components/ApprovalCard';
export * from './components/IssueCard';
export * from './components/ProductIntegrationTable';
export * from './components/RequirementsMatrix';
export * from './components/DesignBriefView';
export * from './components/DesignTokenPreview';
