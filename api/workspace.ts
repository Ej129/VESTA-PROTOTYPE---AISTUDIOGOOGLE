import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, KnowledgeCategory, WorkspaceData, CustomRegulation } from '../types';

// --- API Helper ---
// This helper makes authenticated requests to our serverless functions.
const authenticatedFetch = async (path: string, options: RequestInit = {}) => {
    const user = window.netlifyIdentity?.currentUser();
    if (!user) {
        throw new Error("User not authenticated");
    }
    const token = await user.jwt();
    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // For GET requests, append params to URL
    let fullPath = `/api/${path}`;
    if (options.method === 'GET' && options.body) {
        const params = new URLSearchParams(options.body as unknown as Record<string, string>);
        fullPath += `?${params.toString()}`;
        delete options.body;
    }

    const response = await fetch(fullPath, { ...options, headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unknown network error occurred" }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    // Handle responses that might not have a body
    if (response.status === 204) { // No Content
        return { success: true };
    }
    
    try {
        return await response.json();
    } catch {
        return { success: true };
    }
};


// --- LocalStorage Simulation (for non-collaborative data) ---
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
    reports: get<AnalysisReport[]>('vesta-reports', []),
    auditLogs: get<Record<string, AuditLog[]>>('vesta-audit-logs', {}),
    knowledgeSources: get<KnowledgeSource[]>('vesta-knowledge-sources', []),
    dismissalRules: get<DismissalRule[]>('vesta-dismissal-rules', []),
    customRegulations: get<Record<string, CustomRegulation[]>>('vesta-custom-regulations', {}),
};

// Function to persist the entire DB object to localStorage
const persist = () => {
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

// --- Workspace Management (Serverless) ---

export const createWorkspace = (name: string, creator: User): Promise<Workspace> => {
    return authenticatedFetch('create-workspace', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
};

export const getWorkspacesForUser = (userEmail: string): Promise<Workspace[]> => {
    return authenticatedFetch('get-workspaces', { method: 'GET' });
};

export const getWorkspaceMembers = (workspaceId: string): Promise<WorkspaceMember[]> => {
    const params = new URLSearchParams({ workspaceId });
    return authenticatedFetch(`get-workspace-members?${params.toString()}`, { method: 'GET' });
};

export const inviteUser = (workspaceId: string, email: string, role: UserRole): Promise<void> => {
    return authenticatedFetch('invite-user', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, email, role }),
    });
};

export const removeUser = (workspaceId: string, email: string): Promise<void> => {
    return authenticatedFetch('remove-user', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, email }),
    });
};

export const updateUserRole = (workspaceId: string, email: string, role: UserRole): Promise<void> => {
    return authenticatedFetch('update-user-role', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, email, role }),
    });
};

// --- Workspace Data Management (Local Storage) ---

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