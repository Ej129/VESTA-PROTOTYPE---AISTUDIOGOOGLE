import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, KnowledgeCategory, WorkspaceData } from '../types';
import * as auth from './auth';

// --- LocalStorage Simulation of Firestore ---

const get = <T>(key: string, defaultValue: T): T => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
};

const set = <T>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const DB = {
    workspaces: get<Workspace[]>('vesta-workspaces', []),
    workspaceMembers: get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {}),
    reports: get<AnalysisReport[]>('vesta-reports', []),
    auditLogs: get<AuditLog[]>('vesta-audit-logs', []),
    knowledgeSources: get<KnowledgeSource[]>('vesta-knowledge-sources', []),
    dismissalRules: get<DismissalRule[]>('vesta-dismissal-rules', []),
};

const persist = () => {
    set('vesta-workspaces', DB.workspaces);
    set('vesta-workspace-members', DB.workspaceMembers);
    set('vesta-reports', DB.reports);
    set('vesta-audit-logs', DB.auditLogs);
    set('vesta-knowledge-sources', DB.knowledgeSources);
    set('vesta-dismissal-rules', DB.dismissalRules);
};

// --- API Functions ---

export const createWorkspace = async (name: string, creator: User): Promise<Workspace> => {
    return new Promise(resolve => {
        const newWorkspace: Workspace = {
            id: `ws-${Date.now()}`,
            name,
            creatorId: creator.email,
            createdAt: new Date().toISOString(),
        };
        DB.workspaces.push(newWorkspace);
        DB.workspaceMembers[newWorkspace.id] = [{ email: creator.email, role: 'Administrator' }];
        
        // Add default knowledge sources for the new workspace
        const initialSources: Omit<KnowledgeSource, 'id'|'workspaceId'>[] = [
            { title: 'BSP Circular No. 1108: Guidelines on Virtual Asset Service Providers', content: 'This circular covers the rules and regulations for Virtual Asset Service Providers (VASPs) operating in the Philippines...', category: KnowledgeCategory.Government, isEditable: false },
            { title: 'Q1 2024 Internal Risk Assessment', content: 'Our primary risk focus for this quarter is supply chain integrity and third-party vendor management...', category: KnowledgeCategory.Risk, isEditable: true },
            { title: '5-Year Plan: Digital Transformation', content: 'Our strategic goal is to become the leading digital-first bank in the SEA region by 2029...', category: KnowledgeCategory.Strategy, isEditable: true },
        ];
        initialSources.forEach(source => addKnowledgeSource(newWorkspace.id, source));

        persist();
        resolve(newWorkspace);
    });
};

export const getWorkspacesForUser = async (userEmail: string): Promise<Workspace[]> => {
    return new Promise(resolve => {
        const userWorkspaces = DB.workspaces.filter(ws => 
            DB.workspaceMembers[ws.id]?.some(member => member.email === userEmail)
        );
        resolve(userWorkspaces);
    });
};

export const getWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
    return new Promise(resolve => {
        resolve(DB.workspaceMembers[workspaceId] || []);
    });
};

export const inviteUser = async (workspaceId: string, email: string, role: UserRole): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const userExists = await auth.userExists(email);
        if (!userExists) {
            reject(new Error(`User with email "${email}" does not exist.`));
            return;
        }

        const members = DB.workspaceMembers[workspaceId] || [];
        if (members.some(m => m.email === email)) {
            reject(new Error(`User "${email}" is already a member of this workspace.`));
            return;
        }

        DB.workspaceMembers[workspaceId].push({ email, role });
        persist();
        resolve();
    });
};

export const removeUser = async (workspaceId: string, email: string): Promise<void> => {
    return new Promise((resolve) => {
        const members = DB.workspaceMembers[workspaceId] || [];
        DB.workspaceMembers[workspaceId] = members.filter(m => m.email !== email);
        persist();
        resolve();
    });
};

export const updateUserRole = async (workspaceId: string, email: string, role: UserRole): Promise<void> => {
    return new Promise((resolve) => {
        const members = DB.workspaceMembers[workspaceId] || [];
        const memberIndex = members.findIndex(m => m.email === email);
        if (memberIndex !== -1) {
            members[memberIndex].role = role;
            DB.workspaceMembers[workspaceId] = members;
            persist();
        }
        resolve();
    });
};


// --- Workspace Data Management ---

export const getWorkspaceData = async (workspaceId: string): Promise<WorkspaceData> => {
    return new Promise(resolve => {
        const data: WorkspaceData = {
            reports: DB.reports.filter(r => r.workspaceId === workspaceId),
            auditLogs: DB.auditLogs.filter(log => log.workspaceId === workspaceId),
            knowledgeBaseSources: DB.knowledgeSources.filter(ks => ks.workspaceId === workspaceId),
            dismissalRules: DB.dismissalRules.filter(dr => dr.workspaceId === workspaceId),
        };
        resolve(data);
    });
};

export const addReport = async (reportData: Omit<AnalysisReport, 'id' | 'createdAt'>): Promise<AnalysisReport> => {
    return new Promise(resolve => {
        const newReport: AnalysisReport = {
            ...reportData,
            id: `rep-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'active',
        };
        DB.reports.unshift(newReport);
        persist();
        resolve(newReport);
    });
};

export const updateReportStatus = async (reportId: string, status: 'active' | 'archived'): Promise<void> => {
    return new Promise(resolve => {
        const reportIndex = DB.reports.findIndex(r => r.id === reportId);
        if (reportIndex !== -1) {
            DB.reports[reportIndex].status = status;
            persist();
        }
        resolve();
    });
};

export const deleteReport = async (reportId: string): Promise<void> => {
    return new Promise(resolve => {
        DB.reports = DB.reports.filter(r => r.id !== reportId);
        persist();
        resolve();
    });
};

export const addAuditLog = async (workspaceId: string, userEmail: string, action: AuditLogAction, details: string): Promise<void> => {
    return new Promise(resolve => {
        const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            workspaceId,
            timestamp: new Date().toISOString(),
            user: userEmail,
            action,
            details,
        };
        DB.auditLogs.unshift(newLog);
        persist();
        resolve();
    });
};

export const addKnowledgeSource = async (workspaceId: string, sourceData: Omit<KnowledgeSource, 'id' | 'workspaceId'>): Promise<void> => {
    return new Promise(resolve => {
        const newSource: KnowledgeSource = {
            ...sourceData,
            id: `ks-${Date.now()}`,
            workspaceId,
        };
        DB.knowledgeSources.push(newSource);
        persist();
        resolve();
    });
};

export const deleteKnowledgeSource = async (workspaceId: string, sourceId: string): Promise<void> => {
    return new Promise(resolve => {
        DB.knowledgeSources = DB.knowledgeSources.filter(ks => !(ks.id === sourceId && ks.workspaceId === workspaceId));
        persist();
        resolve();
    });
};

export const addDismissalRule = async (workspaceId: string, ruleData: Omit<DismissalRule, 'id' | 'workspaceId' | 'timestamp'>): Promise<void> => {
    return new Promise(resolve => {
        const newRule: DismissalRule = {
            ...ruleData,
            id: `dr-${Date.now()}`,
            workspaceId,
            timestamp: new Date().toISOString(),
        };
        DB.dismissalRules.push(newRule);
        persist();
        resolve();
    });
};

export const deleteDismissalRule = async (workspaceId: string, ruleId: string): Promise<void> => {
    return new Promise(resolve => {
        DB.dismissalRules = DB.dismissalRules.filter(dr => !(dr.id === ruleId && dr.workspaceId === workspaceId));
        persist();
        resolve();
    });
};