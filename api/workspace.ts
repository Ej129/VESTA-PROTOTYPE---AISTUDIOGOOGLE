import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, KnowledgeCategory, WorkspaceData, CustomRegulation } from '../types';
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
    auditLogs: get<Record<string, AuditLog[]>>('vesta-audit-logs', {}),
    knowledgeSources: get<KnowledgeSource[]>('vesta-knowledge-sources', []),
    dismissalRules: get<DismissalRule[]>('vesta-dismissal-rules', []),
    customRegulations: get<Record<string, CustomRegulation[]>>('vesta-custom-regulations', {}),
};

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

// Minimal Netlify User type
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
      appUser = {
        name,
        email: netlifyUser.email,
        avatar,
        password: `netlify-${Date.now()}`, // Dummy password for mock DB structure
      };
      users.push(appUser);
    } else {
      // Update existing user's info from Netlify on every login
      appUser.name = name;
      appUser.avatar = avatar;
    }
    
    set(USERS_KEY, users);

    const vestaUser: User = { name: appUser.name, email: appUser.email, avatar: appUser.avatar };
    resolve(vestaUser);
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
        DB.customRegulations[newWorkspace.id] = [];
        DB.auditLogs[newWorkspace.id] = [];
        
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
        const users = get<any[]>(USERS_KEY, []);
        const userExistsInApp = users.some(u => u.email === email);
        
        if (!userExistsInApp) {
             // In a real app, you'd check Netlify Identity. Here we check our own DB.
            reject(new Error(`User with email "${email}" must sign up to Vesta first.`));
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

export const getWorkspaceData = async (workspaceId: string, userEmail: string): Promise<WorkspaceData> => {
    return new Promise(resolve => {
        // Security Rule Simulation: A user can only get data for a workspace they are a member of.
        const members = DB.workspaceMembers[workspaceId] || [];
        if (!members.some(member => member.email === userEmail)) {
            console.error(`SECURITY CHECK FAILED: User ${userEmail} attempted to access workspace ${workspaceId} without being a member.`);
            // In a real Firestore scenario, this would throw a permission denied error.
            // Here, we return empty/default data to simulate the effect of the security rule.
            resolve({
                reports: [],
                auditLogs: [],
                knowledgeBaseSources: [],
                dismissalRules: [],
                customRegulations: [],
            });
            return;
        }

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