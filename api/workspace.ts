
import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, WorkspaceData, CustomRegulation } from '../types';

// --- API Helper ---
// This helper makes authenticated requests to our serverless functions.
const authenticatedFetch = async (path: string, options: RequestInit = {}) => {
    const user = window.netlifyIdentity?.currentUser();
    if (!user) {
        // This will be caught by the serverless function which returns a 401.
        // Allowing the request to proceed simplifies calling code, as the backend is the source of truth for auth.
    }
    const token = user ? await user.jwt() : null;
    
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // For GET requests, append params to URL
    let fullPath = `/.netlify/functions/${path}`;
    if (options.method === 'GET' && options.body) {
        const params = new URLSearchParams(options.body as unknown as Record<string, string>);
        fullPath += `?${params.toString()}`;
        delete options.body;
    }

    const response = await fetch(fullPath, { ...options, headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
        throw new Error(errorData.error || `An unknown network error occurred.`);
    }
    
    // Handle responses that might not have a body (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
    }
    return { success: true };
};


// --- User Management (from Netlify Identity) ---
const USERS_KEY = 'vesta-users'; // User profile data can still live in local storage as it's not collaborative

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

export const createWorkspace = (name: string): Promise<Workspace> => {
    return authenticatedFetch('create-workspace', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
};

export const getWorkspacesForUser = (): Promise<Workspace[]> => {
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

export const updateWorkspaceStatus = (workspaceId: string, status: 'active' | 'archived'): Promise<void> => {
    return authenticatedFetch('update-workspace-status', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, status }),
    });
};

export const deleteWorkspace = (workspaceId: string): Promise<void> => {
    return authenticatedFetch('delete-workspace', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
    });
};

// --- Workspace Data Management ---

export const getWorkspaceData = (workspaceId: string): Promise<WorkspaceData> => {
    const params = new URLSearchParams({ workspaceId });
    return authenticatedFetch(`get-workspace-data?${params.toString()}`, { method: 'GET' });
};

export const addReport = (reportData: Omit<AnalysisReport, 'id' | 'createdAt'>): Promise<AnalysisReport> => {
    return authenticatedFetch('add-report', {
        method: 'POST',
        body: JSON.stringify(reportData),
    });
};

export const updateReportStatus = (reportId: string, status: 'active' | 'archived'): Promise<void> => {
     return authenticatedFetch('update-report-status', {
        method: 'POST',
        body: JSON.stringify({ reportId, status }),
    });
};

export const deleteReport = (reportId: string): Promise<void> => {
    return authenticatedFetch('delete-report', {
        method: 'POST',
        body: JSON.stringify({ reportId }),
    });
};

export const addAuditLog = (workspaceId: string, userEmail: string, action: AuditLogAction, details: string): Promise<void> => {
     return authenticatedFetch('add-audit-log', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, userEmail, action, details }),
    });
};

export const addKnowledgeSource = (workspaceId: string, sourceData: Omit<KnowledgeSource, 'id' | 'workspaceId'>): Promise<void> => {
    return authenticatedFetch('add-knowledge-source', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ...sourceData }),
    });
};

export const deleteKnowledgeSource = (workspaceId: string, sourceId: string): Promise<void> => {
    return authenticatedFetch('delete-knowledge-source', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, sourceId }),
    });
};

export const addDismissalRule = (workspaceId: string, ruleData: Omit<DismissalRule, 'id' | 'workspaceId' | 'timestamp'>): Promise<void> => {
    return authenticatedFetch('add-dismissal-rule', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ...ruleData }),
    });
};

export const deleteDismissalRule = (workspaceId: string, ruleId: string): Promise<void> => {
    return authenticatedFetch('delete-dismissal-rule', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ruleId }),
    });
};

export const addCustomRegulation = (workspaceId: string, ruleText: string, createdBy: string): Promise<CustomRegulation> => {
    return authenticatedFetch('add-custom-regulation', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ruleText, createdBy }),
    });
};

export const deleteCustomRegulation = (workspaceId: string, regulationId: string): Promise<void> => {
     return authenticatedFetch('delete-custom-regulation', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, regulationId }),
    });
};