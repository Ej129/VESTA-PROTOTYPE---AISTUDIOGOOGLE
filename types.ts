export enum Screen {
  Login,
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
  title: string;
  resilienceScore: number;
  findings: Finding[];
  summary: {
    critical: number;
    warning: number;
    checks: number;
  };
  documentContent: string;
}

export type UserRole = 'Administrator' | 'Risk Management Officer' | 'Strategy Officer' | 'Compliance Officer' | 'Member';

// A user is now a global entity without a fixed role.
export interface User {
    name: string;
    email: string;
    avatar?: string;
}

// Represents a user's membership and role within a specific workspace.
export interface WorkspaceMember {
    email: string;
    role: UserRole;
}

export interface Workspace {
    id: string;
    name: string;
    members: WorkspaceMember[];
}

export interface Invitation {
    id: string;
    workspaceId: string;
    workspaceName: string;
    inviterName: string;
    status: 'pending' | 'accepted' | 'declined';
}


// This is a display type for the settings screen.
export interface WorkspaceUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export type FeedbackReason = "Not relevant to this project" | "This is a false positive" | "This is an accepted business risk";

export interface TourStep {
    selector: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export type AuditLogAction = 'User Login' | 'User Logout' | 'Social Login' | 'Analysis Run' | 'Document Upload' | 'Auto-Fix' | 'Finding Resolved' | 'Finding Dismissed' | 'Workspace Created' | 'User Invited' | 'User Joined';

export interface AuditLog {
    id: string;
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
    title: string;
    content: string;
    category: KnowledgeCategory;
    isEditable: boolean;
    isNew?: boolean;
}

export interface DismissalRule {
    id: string;
    findingTitle: string;
    reason: FeedbackReason;
    timestamp: string;
}

export interface ScreenLayoutProps {
  navigateTo: NavigateTo;
  currentUser: User;
  onLogout: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  invitations: Invitation[];
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onAcceptInvitation: (invitationId: string) => void;
  onDeclineInvitation: (invitationId: string) => void;
}
