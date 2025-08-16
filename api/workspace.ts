import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, KnowledgeCategory, WorkspaceData, CustomRegulation } from '../types';
import * as auth from './auth';

// --- LocalStorage Simulation for UNMIGRATED functions ---
// This part of the file will be removed piece-by-piece as more functions
// are migrated to serverless functions in the `netlify/functions` directory.

const get = <T>(key: string, defaultValue: T): T => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
};

const set = <T>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const DB = {
    // NOTE: 'vesta-workspaces' and 'vesta-workspace-members' are now managed by Netlify Functions.
    // The keys are kept here to prevent accidental reads from old localStorage data if needed, but new logic should not use them.
    reports: get<AnalysisReport[]>('vesta-reports', []),
    auditLogs: get<Record<string, AuditLog[]>>('vesta-audit-logs', {}),
    knowledgeSources: get<KnowledgeSource[]>('vesta-knowledge-sources', []),
    dismissalRules: get<DismissalRule[]>('vesta-dismissal-rules', []),
    customRegulations: get<Record<string, CustomRegulation[]>>('vesta-custom-regulations', {}),
};

const persist = () => {
    set('vesta-reports', DB.reports);
    set('vesta-audit-logs', DB.auditLogs);
    // Note: knowledgeSources are partially managed by create-workspace function now.
    // This local persistence ensures existing workspaces function until fully migrated.
    set('vesta-knowledge-sources', DB.knowledgeSources);
    set('vesta-dismissal-rules', DB.dismissalRules);
    set('vesta-custom-regulations', DB.customRegulations);
};


// --- User Management (from Netlify Identity) ---

const USERS_KEY = 'vesta-users';

interface NetlifyUser {
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export const getOrCreateUser = (netlifyUser: NetlifyUser): Promise<User> => {
  return new Promise((resolve) => {
    const users = get<any[]>(USERS_KEY, []);
    let appUser = users.find((u) => u.email === netlifyUser.email);
    const name = netlifyUser.user_metadata?.full_name || netlifyUser.email.split('@')[0];
    const avatar = netlifyUser.user_metadata?.avatar_url;
    if (!appUser) {
      appUser = { name, email: netlifyUser.email, avatar };
      users.push(appUser);
    } else {
      appUser.name = name;
      appUser.avatar = avatar;
    }
    set(USERS_KEY, users);
    resolve({ name: appUser.name, email: appUser.email, avatar: appUser.avatar });
  });
};

export const updateUser = (userToUpdate: User): Promise<User> => {
    return new Promise((resolve) => {
        const users = get<any[]>(USERS_KEY, []);
        const userIndex = users.findIndex((u) => u.email === userToUpdate.email);
        if (userIndex !== -1) {
            users[userIndex].name = userToUpdate.name;
            users[userIndex].avatar = userToUpdate.avatar;
            set(USERS_KEY, users);
        }
        resolve(userToUpdate);
    });
};

// --- MIGRATED API Functions ---
// These functions now call our secure backend on Netlify.

export const createWorkspace = async (name: string, creator: User): Promise<Workspace> => {
    // The creator object is no longer needed as the function gets the user from the auth context.
    const response = await fetch('/.netlify/functions/create-workspace', {
        method: 'POST',
        // Netlify Identity widget automatically includes auth headers.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('Failed to create workspace:', err);
        throw new Error(err.error || 'Could not create workspace.');
    }
    return await response.json();
};

export const getWorkspacesForUser = async (userEmail: string): Promise<Workspace[]> => {
    // userEmail is no longer needed as the function gets it from the auth context,
    // but we keep the signature for now to avoid breaking App.tsx.
    const response = await fetch('/.netlify/functions/get-workspaces');
    if (!response.ok) {
        const err = await response.json();
        console.error('Failed to fetch workspaces:', err);
        throw new Error(err.error || 'Could not fetch workspaces.');
    }
    return await response.json();
};


// --- UNMIGRATED API Functions (Still using LocalStorage) ---
// TODO: Migrate these functions to their own Netlify Function endpoints.

export const getWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
    return new Promise(resolve => {
        const allMembers = get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {});
        // Fallback to localStorage for now. A real migration would create a get-members function.
        resolve(allMembers[workspaceId] || []);
    });
};

export const inviteUser = async (workspaceId: string, email: string, role: UserRole): Promise<void> => {
     // This is a placeholder and will not work correctly without a backend.
     // It needs to be migrated to a serverless function.
    return new Promise(async (resolve, reject) => {
        const allMembers = get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {});
        const members = allMembers[workspaceId] || [];
        if (members.some(m => m.email === email)) {
            reject(new Error(`User "${email}" is already a member of this workspace.`));
            return;
        }
        members.push({ email, role });
        allMembers[workspaceId] = members;
        set('vesta-workspace-members', allMembers);
        resolve();
    });
};

export const removeUser = async (workspaceId: string, email: string): Promise<void> => {
    return new Promise((resolve) => {
        const allMembers = get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {});
        allMembers[workspaceId] = (allMembers[workspaceId] || []).filter(m => m.email !== email);
        set('vesta-workspace-members', allMembers);
        resolve();
    });
};

export const updateUserRole = async (workspaceId: string, email: string, role: UserRole): Promise<void> => {
    return new Promise((resolve) => {
        const allMembers = get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {});
        const members = allMembers[workspaceId] || [];
        const memberIndex = members.findIndex(m => m.email === email);
        if (memberIndex !== -1) {
            members[memberIndex].role = role;
            allMembers[workspaceId] = members;
            set('vesta-workspace-members', allMembers);
        }
        resolve();
    });
};

export const getWorkspaceData = async (workspaceId: string, userEmail: string): Promise<WorkspaceData> => {
    return new Promise(resolve => {
        const data: WorkspaceData = {
            reports: DB.reports.filter(r => r.workspaceId === workspaceId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            auditLogs: DB.auditLogs[workspaceId] || [],
            knowledgeBaseSources: DB.knowledgeSources.filter(ks => ks.workspaceId === workspaceId),
            dismissalRules: DB.dismissalRules.filter(dr => dr.workspaceId === workspaceId),
            customRegulations: DB.customRegulations[workspaceId] || [],
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
            timestamp: new Date().toISOString(),
            userEmail,
            action,
            details,
        };
        if (!DB.auditLogs[workspaceId]) {
            DB.auditLogs[workspaceId] = [];
        }
        DB.auditLogs[workspaceId].unshift(newLog);
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

export const addCustomRegulation = async (workspaceId: string, ruleText: string, createdBy: string): Promise<CustomRegulation> => {
    return new Promise(resolve => {
        const newRegulation: CustomRegulation = {
            id: `cr-${Date.now()}`,
            workspaceId,
            ruleText,
            createdBy,
            createdAt: new Date().toISOString(),
        };
        if (!DB.customRegulations[workspaceId]) {
            DB.customRegulations[workspaceId] = [];
        }
        DB.customRegulations[workspaceId].push(newRegulation);
        persist();
        resolve(newRegulation);
    });
};

export const deleteCustomRegulation = async (workspaceId: string, regulationId: string): Promise<void> => {
    return new Promise(resolve => {
        if (DB.customRegulations[workspaceId]) {
            DB.customRegulations[workspaceId] = DB.customRegulations[workspaceId].filter(r => r.id !== regulationId);
            persist();
        }
        resolve();
    });
};
