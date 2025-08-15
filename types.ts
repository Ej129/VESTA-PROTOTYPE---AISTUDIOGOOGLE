export enum Screen {
  Login,
  WorkspaceDashboard,
  Dashboard,
  Analysis,
  AuditTrail,
  KnowledgeBase,
  Settings,
}

export type NavigateTo = (screen: Screen) => void;

export type Severity = 'critical' | 'warning';

export type FindingStatus = 'active' | 'resolved' | 'dismissed';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  sourceSnippet: string;
  recommendation: string;
  status: FindingStatus;
}

export interface AnalysisReport {
  id: string;
  workspaceId: string;
  title: string;
  resilienceScore: number;
  findings: Finding[];
  summary: {
    critical: number;
    warning: number;
    checks: number;
  };
  documentContent: string;
  createdAt: string;
  status?: 'active' | 'archived';
}

export interface User {
    name: string;
    email: string;
    avatar?: string;
}

export type UserRole = "Administrator" | "Member";

export type FeedbackReason = "Not relevant to this project" | "This is a false positive" | "This is an accepted business risk";

export type AuditLogAction = 
  | 'User Login' 
  | 'User Logout' 
  | 'Social Login' 
  | 'Analysis Run' 
  | 'Document Upload' 
  | 'Auto-Fix' 
  | 'Finding Resolved' 
  | 'Finding Dismissed'
  | 'Workspace Created'
  | 'User Invited'
  | 'User Removed'
  | 'Role Changed'
  | 'Analysis Archived'
  | 'Analysis Unarchived'
  | 'Analysis Deleted';

export interface AuditLog {
    id: string;
    workspaceId: string;
    timestamp: string;
    user: string;
    action: AuditLogAction;
    details: string;
}

export enum KnowledgeCategory {
    Government = 'Government Regulations & Compliance',
    Risk = 'In-House Risk Management Plan',
    Strategy = 'Long-Term Strategic Direction'
}

export interface KnowledgeSource {
    id: string;
    workspaceId: string;
    title: string;
    content: string;
    category: KnowledgeCategory;
    isEditable: boolean;
    isNew?: boolean;
}

export interface DismissalRule {
    id: string;
    workspaceId: string;
    findingTitle: string;
    reason: FeedbackReason;
    timestamp: string;
}

export interface Workspace {
    id: string;
    name: string;
    creatorId: string;
    createdAt: string;
}

export interface WorkspaceMember {
    email: string;
    role: UserRole;
}

export interface ScreenLayoutProps {
  navigateTo: NavigateTo;
  currentUser: User;
  onLogout: () => void;
  currentWorkspace: Workspace;
  onBackToWorkspaces: () => void;
  onManageMembers: () => void;
  userRole: UserRole;
}

export interface TourStep {
  selector: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface WorkspaceData {
    reports: AnalysisReport[];
    auditLogs: AuditLog[];
    knowledgeBaseSources: KnowledgeSource[];
    dismissalRules: DismissalRule[];
}