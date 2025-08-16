import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, KnowledgeCategory, WorkspaceData, CustomRegulation } from '../types';

// --- LocalStorage Simulation ---
// This file uses localStorage to simulate a backend for rapid prototyping.
// All data is stored in the user's browser.

const get = <T>(key: string, defaultValue: T): T => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
        console.error(`Error reading from localStorage key "${key}":`, e);
        return defaultValue;
    }
};

const set = <T>(key: string, value: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error writing to localStorage key "${key}":`, e);
    }
};

// Main in-memory data object, initialized from localStorage
const DB = {
    workspaces: get<Workspace[]>('vesta-workspaces', []),
    workspaceMembers: get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {}),
    reports: get<AnalysisReport[]>('vesta-reports', []),
    auditLogs: get<Record<string, AuditLog[]>>('vesta-audit-logs', {}),
    knowledgeSources: get<KnowledgeSource[]>('vesta-knowledge-sources', []),
    dismissalRules: get<DismissalRule[]>('vesta-dismissal-rules', []),
    customRegulations: get<Record<string, CustomRegulation[]>>('vesta-custom-regulations', {}),
};

// Function to persist the entire DB object to localStorage
const persist = () => {
    set('vesta-workspaces', DB.workspaces);
    set('vesta-workspace-members', DB.workspaceMembers);
    set('vesta-reports', DB.reports);
    set('vesta-audit-logs', DB.auditLogs);
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
    const users = get<User[]>(USERS_KEY, []);
    let appUser = users.find((u) => u.email === netlifyUser.email);
    const name = netlifyUser.user_metadata?.full_name || netlifyUser.email.split('@')[0];
    const avatar = netlifyUser.user_metadata?.avatar_url;

    if (!appUser) {
      appUser = { name, email: netlifyUser.email, avatar };
      users.push(appUser);
    } else {
      // Update user details on every login, in case they've changed in Netlify Identity
      appUser.name = name;
      appUser.avatar = avatar;
    }
    set(USERS_KEY, users);
    resolve({ name: appUser.name, email: appUser.email, avatar: appUser.avatar });
  });
};

export const updateUser = (userToUpdate: User): Promise<User> => {
    return new Promise((resolve) => {
        const users = get<User[]>(USERS_KEY, []);
        const userIndex = users.findIndex((u) => u.email === userToUpdate.email);
        if (userIndex !== -1) {
            users[userIndex].name = userToUpdate.name;
            users[userIndex].avatar = userToUpdate.avatar;
            set(USERS_KEY, users);
        }
        resolve(userToUpdate);
    });
};

// --- Workspace Management ---

export const createWorkspace = async (name: string, creator: User): Promise<Workspace> => {
    return new Promise(resolve => {
        const newWorkspace: Workspace = {
            id: `ws-${Date.now()}`,
            name: name.trim(),
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
        
        initialSources.forEach(source => {
            DB.knowledgeSources.push({
                ...source,
                id: `ks-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                workspaceId: newWorkspace.id
            });
        });

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
    return new Promise((resolve, reject) => {
        const members = DB.workspaceMembers[workspaceId] || [];
        if (members.some(m => m.email === email)) {
            reject(new Error(`User "${email}" is already a member of this workspace.`));
            return;
        }
        members.push({ email, role });
        DB.workspaceMembers[workspaceId] = members;
        persist();
        resolve();
    });
};

export const removeUser = async (workspaceId: string, email: string): Promise<void> => {
    return new Promise((resolve) => {
        DB.workspaceMembers[workspaceId] = (DB.workspaceMembers[workspaceId] || []).filter(m => m.email !== email);
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
