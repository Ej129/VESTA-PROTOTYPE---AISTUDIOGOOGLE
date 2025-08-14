import { User, UserRole, Workspace, WorkspaceMember, Invitation } from '../types';

// In a real app, this would be a secure backend service.
// For this prototype, we use localStorage to simulate a user database and session management.

const USERS_KEY = 'vesta-users';
const SESSION_KEY = 'vesta-session';
const WORKSPACES_KEY = 'vesta-workspaces';
const INVITATIONS_KEY = 'vesta-invitations';


const emailToName = (email: string): string => {
    if (!email || !email.includes('@')) {
        return "User";
    }
    const namePart = email.split('@')[0];
    return namePart
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const getWorkspaces = (): Workspace[] => {
    return JSON.parse(localStorage.getItem(WORKSPACES_KEY) || '[]');
}

const saveWorkspaces = (workspaces: Workspace[]) => {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

const getInvitations = (): Invitation[] => {
    return JSON.parse(localStorage.getItem(INVITATIONS_KEY) || '[]');
}

const saveInvitations = (invitations: Invitation[]) => {
    localStorage.setItem(INVITATIONS_KEY, JSON.stringify(invitations));
}

export const signUp = (name: string, email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => { 
            let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            if (users.find((user: any) => user.email === email)) {
                reject(new Error("An account with this email already exists."));
                return;
            }

            if (password.length < 8) {
                reject(new Error("Password must be at least 8 characters long."));
                return;
            }

            const newUser = { name, email, password }; 
            users.push(newUser);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));

            const sessionUser: User = { name, email };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
            resolve(sessionUser);
        }, 500);
    });
};

export const login = (email: string, password: string): Promise<User> => {
     return new Promise((resolve, reject) => {
        setTimeout(() => { 
            const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const user = users.find((u: any) => u.email === email);

            if (!user || user.password !== password) {
                reject(new Error("Invalid email or password."));
                return;
            }

            const sessionUser: User = { name: user.name, email: user.email, avatar: user.avatar };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
            resolve(sessionUser);
        }, 500);
    });
};

export const socialLogin = (email: string): Promise<User> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            let user = users.find((u:any) => u.email === email);

            if (!user) {
                user = {
                    name: emailToName(email),
                    email: email,
                    password: `social-login-${Date.now()}` // placeholder
                };
                users.push(user);
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
            }
            
            const sessionUser: User = { name: user.name, email: user.email, avatar: user.avatar };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
            resolve(sessionUser);
        }, 300);
    });
};

export const logout = (): void => {
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
};

export const updateUser = (userToUpdate: User): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => { 
            let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const userIndex = users.findIndex((u: any) => u.email === userToUpdate.email);

            if (userIndex !== -1) {
                 users[userIndex] = { ...users[userIndex], name: userToUpdate.name, avatar: userToUpdate.avatar };
                 localStorage.setItem(USERS_KEY, JSON.stringify(users));
            }
            
            const session = localStorage.getItem(SESSION_KEY);
            if (session) {
                const sessionUser = JSON.parse(session);
                if (sessionUser.email === userToUpdate.email) {
                    const updatedSessionUser = { ...sessionUser, ...userToUpdate };
                    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSessionUser));
                    resolve(updatedSessionUser);
                } else {
                     resolve(userToUpdate);
                }
            } else {
                resolve(userToUpdate);
            }
        }, 300);
    });
};

// --- Workspace Management Functions ---

export const createWorkspace = (name: string, creatorEmail: string): Promise<Workspace> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const allWorkspaces = getWorkspaces();
            const newWorkspace: Workspace = {
                id: `ws-${Date.now()}`,
                name,
                members: [{ email: creatorEmail, role: 'Administrator' }]
            };
            allWorkspaces.push(newWorkspace);
            saveWorkspaces(allWorkspaces);
            resolve(newWorkspace);
        }, 300);
    });
};

export const getWorkspacesForUser = (email: string): Promise<Workspace[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const allWorkspaces = getWorkspaces();
            const userWorkspaces = allWorkspaces.filter(ws => 
                ws.members.some(member => member.email === email)
            );
            resolve(userWorkspaces);
        }, 100);
    });
};

export const inviteUserToWorkspace = (workspaceId: string, inviterEmail: string, inviteeEmail: string): Promise<Invitation> => {
     return new Promise((resolve, reject) => {
        setTimeout(() => {
            const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const allWorkspaces = getWorkspaces();
            const allInvitations = getInvitations();

            const inviteeExists = allUsers.some((u: any) => u.email === inviteeEmail);
            if (!inviteeExists) {
                return reject(new Error("User is not registered with Vesta."));
            }

            const workspace = allWorkspaces.find(ws => ws.id === workspaceId);
            if (!workspace) {
                return reject(new Error("Workspace not found."));
            }
            
            if (workspace.members.some(m => m.email === inviteeEmail)) {
                return reject(new Error("User is already in this workspace."));
            }

            const inviter = allUsers.find((u: any) => u.email === inviterEmail);

            const newInvitation: Invitation = {
                id: `inv-${Date.now()}`,
                workspaceId,
                workspaceName: workspace.name,
                inviterName: inviter.name,
                status: 'pending'
            };

            const existingInvite = allInvitations.find(inv => inv.workspaceId === workspaceId && inv.id === inviteeEmail);
            if (!existingInvite) {
                 // In a real DB, we'd associate the invite with the user. Here we'll just put it in a global pool.
                 // Let's add the invitee's email to the invite object to make lookup easy.
                 const inviteWithEmail = { ...newInvitation, inviteeEmail };
                 saveInvitations([...allInvitations, inviteWithEmail]);
            }
           
            resolve(newInvitation);
        }, 500);
    });
};

export const getInvitationsForUser = (email: string): Promise<Invitation[]> => {
    return new Promise((resolve) => {
        const allInvitations = getInvitations();
        // @ts-ignore
        resolve(allInvitations.filter(inv => inv.inviteeEmail === email));
    });
};

export const respondToInvitation = (invitationId: string, userEmail: string, accept: boolean): Promise<void> => {
    return new Promise((resolve) => {
        let allInvitations = getInvitations();
        const invitationIndex = allInvitations.findIndex(inv => inv.id === invitationId);
        if (invitationIndex === -1) return resolve();

        if (accept) {
            allInvitations[invitationIndex].status = 'accepted';
            const { workspaceId } = allInvitations[invitationIndex];
            
            let allWorkspaces = getWorkspaces();
            const workspaceIndex = allWorkspaces.findIndex(ws => ws.id === workspaceId);
            if (workspaceIndex !== -1) {
                allWorkspaces[workspaceIndex].members.push({ email: userEmail, role: 'Member' });
                saveWorkspaces(allWorkspaces);
            }
        } else {
            allInvitations[invitationIndex].status = 'declined';
        }
        
        saveInvitations(allInvitations);
        resolve();
    });
};

export const updateUserRoleInWorkspace = (workspaceId: string, userEmail: string, newRole: UserRole): Promise<Workspace> => {
    return new Promise((resolve, reject) => {
        let allWorkspaces = getWorkspaces();
        const workspaceIndex = allWorkspaces.findIndex(ws => ws.id === workspaceId);
        if (workspaceIndex === -1) return reject(new Error("Workspace not found"));

        const memberIndex = allWorkspaces[workspaceIndex].members.findIndex(m => m.email === userEmail);
        if (memberIndex === -1) return reject(new Error("Member not found"));

        allWorkspaces[workspaceIndex].members[memberIndex].role = newRole;
        saveWorkspaces(allWorkspaces);
        resolve(allWorkspaces[workspaceIndex]);
    });
};

export const removeUserFromWorkspace = (workspaceId: string, userEmailToRemove: string): Promise<Workspace> => {
     return new Promise((resolve, reject) => {
        let allWorkspaces = getWorkspaces();
        const workspaceIndex = allWorkspaces.findIndex(ws => ws.id === workspaceId);
        if (workspaceIndex === -1) return reject(new Error("Workspace not found"));

        allWorkspaces[workspaceIndex].members = allWorkspaces[workspaceIndex].members.filter(m => m.email !== userEmailToRemove);
        saveWorkspaces(allWorkspaces);
        resolve(allWorkspaces[workspaceIndex]);
    });
}