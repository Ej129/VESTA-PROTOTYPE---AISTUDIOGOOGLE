import { User, Workspace, WorkspaceMember, AnalysisReport, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, UserRole, KnowledgeCategory, WorkspaceData } from '../types';

// --- LocalStorage Simulation of Firestore ---

const get = <T>(key: string, defaultValue: T): T => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
};

const set = <T>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const DB = {
    users: get<User[]>('vesta-all-users', []),
    workspaces: get<Workspace[]>('vesta-workspaces', []),
    workspaceMembers: get<Record<string, WorkspaceMember[]>>('vesta-workspace-members', {}),
    reports: get<AnalysisReport[]>('vesta-reports', []),
    auditLogs: get<AuditLog[]>('vesta-audit-logs', []),
    knowledgeSources: get<KnowledgeSource[]>('vesta-knowledge-sources', []),
    dismissalRules: get<DismissalRule[]>('vesta-dismissal-rules', []),
};

const persist = () => {
    set('vesta-all-users', DB.users);
    set('vesta-workspaces', DB.workspaces);
    set('vesta-workspace-members', DB.workspaceMembers);
    set('vesta-reports', DB.reports);
    set('vesta-audit-logs', DB.auditLogs);
    set('vesta-knowledge-sources', DB.knowledgeSources);
    set('vesta-dismissal-rules', DB.dismissalRules);
};

// --- API Functions ---

export const getOrCreateUser = async (netlifyUser: any): Promise<User> => {
    return new Promise(resolve => {
        let user = DB.users.find(u => u.id === netlifyUser.id);
        if (!user) {
            user = {
                id: netlifyUser.id,
                email: netlifyUser.email,
                name: netlifyUser.user_metadata.full_name || netlifyUser.email,
                avatar: netlifyUser.user_metadata.avatar_url,
            };
            DB.users.push(user);
            persist();
        } else {
            // Update user info if it has changed in Netlify
            const updatedUser = {
                ...user,
                name: netlifyUser.user_metadata.full_name || netlifyUser.email,
                avatar: netlifyUser.user_metadata.avatar_url,
            };
            if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
                const userIndex = DB.users.findIndex(u => u.id === user!.id);
                DB.users[userIndex] = updatedUser;
                user = updatedUser;
                persist();
            }
        }
        resolve(user);
    });
};

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
    return new Promise(resolve => {
        const user = DB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        resolve(user);
    });
};

export const createWorkspace = async (name: string, creator: User): Promise<Workspace> => {
    return new Promise(resolve => {
        const newWorkspace: Workspace = {
            id: `ws-${Date.now()}`,
            name,
            creatorId: creator.id,
            createdAt: new Date().toISOString(),
        };
        DB.workspaces.push(newWorkspace);
        DB.workspaceMembers[newWorkspace.id] = [{ userId: creator.id, email: creator.email, role: 'Administrator' }];
        
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

export const getWorkspacesForUser = async (userId: string): Promise<Workspace[]> => {
    return new Promise(resolve => {
        const userWorkspaces = DB.workspaces.filter(ws => 
            DB.workspaceMembers[ws.id]?.some(member => member.userId === userId)
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
        const userToInvite = await findUserByEmail(email);
        if (!userToInvite) {
            return reject(new Error(`User with email ${email} does not have a Vesta account.`));
        }

        const members = DB.workspaceMembers[workspaceId] || [];
        if (members.some(m => m.userId === userToInvite.id)) {
            return reject(new Error(`User ${email} is already a member of this workspace.`));
        }
        
        members.push({ userId: userToInvite.id, email: userToInvite.email, role });
        DB.workspaceMembers[workspaceId] = members;
        persist();
        resolve();
    });
};

export const removeUser = async (workspaceId: string, userId: string): Promise<void> => {
    return new Promise(resolve => {
        let members = DB.workspaceMembers[workspaceId] || [];
        members = members.filter(m => m.userId !== userId);
        DB.workspaceMembers[workspaceId] = members;
        persist();
        resolve();
    });
};

export const updateUserRole = async (workspaceId: string, userId: string, role: UserRole): Promise<void> => {
    return new Promise(resolve => {
        let members = DB.workspaceMembers[workspaceId] || [];
        const memberIndex = members.findIndex(m => m.userId === userId);
        if (memberIndex > -1) {
            members[memberIndex].role = role;
        }
        DB.workspaceMembers[workspaceId] = members;
        persist();
        resolve();
    });
};


// --- Workspace Data Getters/Setters ---

export const getWorkspaceData = async (workspaceId: string): Promise<WorkspaceData> => {
    return new Promise(resolve => {
        const reports = DB.reports.filter(r => r.workspaceId === workspaceId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const auditLogs = DB.auditLogs.filter(log => log.workspaceId === workspaceId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const knowledgeBaseSources = DB.knowledgeSources.filter(s => s.workspaceId === workspaceId);
        const dismissalRules = DB.dismissalRules.filter(r => r.workspaceId === workspaceId);
        resolve({ reports, auditLogs, knowledgeBaseSources, dismissalRules });
    });
};

export const addReport = async (report: AnalysisReport): Promise<void> => {
    return new Promise(resolve => {
        const newReport = { 
            ...report, 
            id: `rep-${Date.now()}`, 
            createdAt: new Date().toISOString(),
            status: 'active' as 'active',
        };
        newReport.findings.forEach((f, index) => f.id = `${newReport.id}-finding-${index}`);
        DB.reports.unshift(newReport);
        persist();
        resolve();
    });
};

export const updateReportStatus = async (reportId: string, status: 'active' | 'archived'): Promise<void> => {
    return new Promise(resolve => {
        const reportIndex = DB.reports.findIndex(r => r.id === reportId);
        if (reportIndex > -1) {
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

export const addAuditLog = async (workspaceId: string, user: User, action: AuditLogAction, details: string): Promise<void> => {
    return new Promise(resolve => {
        const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            workspaceId,
            timestamp: new Date().toISOString(),
            userName: user.name,
            action,
            details,
        };
        DB.auditLogs.unshift(newLog);
        persist();
        resolve();
    });
};

export const addKnowledgeSource = async (workspaceId: string, source: Omit<KnowledgeSource, 'id' | 'workspaceId'>): Promise<void> => {
    return new Promise(resolve => {
        const newSource: KnowledgeSource = { ...source, workspaceId, id: `ks-${Date.now()}` };
        DB.knowledgeSources.push(newSource);
        persist();
        resolve();
    });
};

export const deleteKnowledgeSource = async (workspaceId: string, sourceId: string): Promise<void> => {
    return new Promise(resolve => {
        DB.knowledgeSources = DB.knowledgeSources.filter(s => !(s.id === sourceId && s.workspaceId === workspaceId));
        persist();
        resolve();
    });
};

export const addDismissalRule = async (workspaceId: string, rule: Omit<DismissalRule, 'id' | 'workspaceId' | 'timestamp'>): Promise<void> => {
    return new Promise(resolve => {
        const newRule: DismissalRule = { 
            ...rule, 
            workspaceId, 
            id: `dr-${Date.now()}`,
            timestamp: new Date().toISOString(),
        };
        DB.dismissalRules.push(newRule);
        persist();
        resolve();
    });
};

export const deleteDismissalRule = async (workspaceId: string, ruleId: string): Promise<void> => {
    return new Promise(resolve => {
        DB.dismissalRules = DB.dismissalRules.filter(r => !(r.id === ruleId && r.workspaceId === workspaceId));
        persist();
        resolve();
    });
};