import { User } from '../types';

// In a real app, this would be a secure backend service.
// For this prototype, we use localStorage to simulate a user database and session management.

const USERS_KEY = 'vesta-users';
const SESSION_KEY = 'vesta-session';

const getMockUsers = (): any[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const setMockUsers = (users: any[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

// Initialize with some default users if none exist
const initializeUsers = () => {
    if (!localStorage.getItem(USERS_KEY)) {
        const defaultUsers = [
            { name: "Jel Suson", email: "jel.suson@example.com", password: "password123" },
            { name: "Alex Chen", email: "alex.chen@example.com", password: "password123" },
            { name: "Maria Garcia", email: "maria.garcia@example.com", password: "password123" },
        ];
        setMockUsers(defaultUsers);
    }
};
initializeUsers();


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


export const signUp = (name: string, email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => { 
            let users = getMockUsers();
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
            setMockUsers(users);

            const sessionUser: User = { name, email };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
            resolve(sessionUser);
        }, 500);
    });
};

export const login = (email: string, password: string): Promise<User> => {
     return new Promise((resolve, reject) => {
        setTimeout(() => { 
            const users = getMockUsers();
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
            let users = getMockUsers();
            let user = users.find((u:any) => u.email === email);

            if (!user) {
                user = {
                    name: emailToName(email),
                    email: email,
                    password: `social-login-${Date.now()}` // placeholder
                };
                users.push(user);
                setMockUsers(users);
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
            let users = getMockUsers();
            const userIndex = users.findIndex((u: any) => u.email === userToUpdate.email);

            if (userIndex !== -1) {
                 users[userIndex] = { ...users[userIndex], name: userToUpdate.name, avatar: userToUpdate.avatar };
                 setMockUsers(users);
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

export const userExists = (email: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const users = getMockUsers();
        const exists = users.some(u => u.email === email);
        resolve(exists);
    });
};