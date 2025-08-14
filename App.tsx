import React, { useState, useEffect, useCallback } from 'react';
import { Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, FeedbackReason, Finding, KnowledgeCategory, UserRole, Workspace, Invitation } from './types';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import AuditTrailScreen from './screens/AuditTrailScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen';
import SettingsScreen from './screens/SettingsScreen';
import * as auth from './api/auth';
import { TourProvider, useTour } from './contexts/TourContext';
import { sampleReportForTour } from './data/sample-report';

const AppContainer = () => {
  const [screen, setScreen] = useState<Screen>(Screen.Login);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Data scoped to the active workspace
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [knowledgeBaseSources, setKnowledgeBaseSources] = useState<KnowledgeSource[]>([]);
  const [dismissalRules, setDismissalRules] = useState<DismissalRule[]>([]);
  
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  
  const tour = useTour();

  const navigateTo: NavigateTo = (newScreen: Screen) => {
    setScreen(newScreen);
  };
  
  const getStorageKey = useCallback((base: string) => {
    if (!activeWorkspace) return null;
    return `${base}-${activeWorkspace.id}`;
  }, [activeWorkspace]);

  useEffect(() => {
      const knowledgeKey = getStorageKey('vesta-knowledge-sources');
      if (knowledgeKey) {
          const savedSources = localStorage.getItem(knowledgeKey);
           if (savedSources) {
              setKnowledgeBaseSources(JSON.parse(savedSources));
            } else {
                const initialSources: KnowledgeSource[] = [
                    { id: 'gov-1', title: 'BSP Circular No. 1108: Guidelines on Virtual Asset Service Providers', content: 'This circular covers the rules and regulations for Virtual Asset Service Providers (VASPs) operating in the Philippines...', category: KnowledgeCategory.Government, isEditable: false },
                    { id: 'risk-1', title: 'Q1 2024 Internal Risk Assessment', content: 'Our primary risk focus for this quarter is supply chain integrity and third-party vendor management...', category: KnowledgeCategory.Risk, isEditable: true },
                    { id: 'strategy-1', title: '5-Year Plan: Digital Transformation', content: 'Our strategic goal is to become the leading digital-first bank in the SEA region by 2029...', category: KnowledgeCategory.Strategy, isEditable: true },
                ];
                setKnowledgeBaseSources(initialSources);
                localStorage.setItem(knowledgeKey, JSON.stringify(initialSources));
            }
      } else {
        setKnowledgeBaseSources([]);
      }
      
      const rulesKey = getStorageKey('vesta-dismissal-rules');
      if(rulesKey){
        const savedRules = localStorage.getItem(rulesKey);
        setDismissalRules(savedRules ? JSON.parse(savedRules) : []);
      } else {
        setDismissalRules([]);
      }

      const reportsKey = getStorageKey('vesta-reports');
      if(reportsKey) {
        const savedReports = localStorage.getItem(reportsKey);
        setReports(savedReports ? JSON.parse(savedReports) : []);
      } else {
        setReports([]);
      }

      const auditKey = getStorageKey('vesta-audit-logs');
      if (auditKey) {
          const savedLogs = localStorage.getItem(auditKey);
          setAuditLogs(savedLogs ? JSON.parse(savedLogs) : []);
      } else {
          setAuditLogs([]);
      }

  }, [activeWorkspace, getStorageKey]);
  
  const addAuditLog = useCallback((action: AuditLogAction, details: string) => {
    if(!currentUser || !activeWorkspace) return;
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.email,
      action,
      details,
    };
    setAuditLogs(prev => {
      const updatedLogs = [newLog, ...prev];
      const key = getStorageKey('vesta-audit-logs');
      if (key) localStorage.setItem(key, JSON.stringify(updatedLogs));
      return updatedLogs;
    });
  }, [currentUser, activeWorkspace, getStorageKey]);
  
  const loadUserSession = async (user: User) => {
      setCurrentUser(user);
      const userWorkspaces = await auth.getWorkspacesForUser(user.email);
      setWorkspaces(userWorkspaces);
      const userInvitations = await auth.getInvitationsForUser(user.email);
      setInvitations(userInvitations.filter(inv => inv.status === 'pending'));

      if (userWorkspaces.length > 0) {
          setActiveWorkspace(userWorkspaces[0]);
      } else {
          setActiveWorkspace(null);
      }
      setScreen(Screen.Dashboard);
  };

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user) {
        loadUserSession(user);
        const isFirstVisit = !localStorage.getItem('vesta-tour-completed');
        if (isFirstVisit && tour) {
            setTimeout(() => tour.startTour(), 1000);
        }
    } else {
      setScreen(Screen.Login);
    }
  }, []);

  const handleLoginSuccess = async (user: User, isSocialLogin: boolean = false) => {
    await loadUserSession(user);
    // Log is added after workspace is active
    // This is a slight change, login audit will now be tied to the default workspace
    setTimeout(() => addAuditLog(isSocialLogin ? 'Social Login' : 'User Login', `User ${user.email} logged in.`), 100);

    const isFirstVisit = !localStorage.getItem('vesta-tour-completed');
    if (isFirstVisit && tour) {
      setTimeout(() => tour.startTour(), 1000); // Delay to allow dashboard to render
    }
  };
  
  const handleLogout = () => {
    // Audit log should be added before session is destroyed
    // addAuditLog('User Logout', `User ${currentUser.email} logged out.`);
    auth.logout();
    setCurrentUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setInvitations([]);
    setScreen(Screen.Login);
  };

  const handleStartNewAnalysis = () => {
    if (tour && tour.isActive && tour.currentStep === 0) {
      setActiveReport(sampleReportForTour);
      navigateTo(Screen.Analysis);
      setTimeout(() => tour.nextStep(), 500);
    } else {
      setActiveReport(null);
      navigateTo(Screen.Analysis);
    }
  };

  const handleSelectReport = (report: AnalysisReport) => {
    setActiveReport(report);
    navigateTo(Screen.Analysis);
  };

  const handleAnalysisComplete = (report: AnalysisReport) => {
    const key = getStorageKey('vesta-reports');
    if (!key) return;
    setReports(prev => {
        const updatedReports = [report, ...prev];
        localStorage.setItem(key, JSON.stringify(updatedReports));
        return updatedReports;
    });
    addAuditLog('Analysis Run', `Analysis completed for: ${report.title}`);
    setActiveReport(report);
  };

  const addKnowledgeSource = (title: string, content: string, category: KnowledgeCategory) => {
    const key = getStorageKey('vesta-knowledge-sources');
    if (!key) return;
    const newSource: KnowledgeSource = {
      id: `kb-${Date.now()}`,
      title,
      content,
      category,
      isEditable: true
    };
    setKnowledgeBaseSources(prev => {
      const updated = [...prev, newSource];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };
  
  const addAutomatedKnowledgeSource = (source: Omit<KnowledgeSource, 'id'>) => {
      const key = getStorageKey('vesta-knowledge-sources');
      if (!key) return;
      const newSource: KnowledgeSource = {
          ...source,
          id: `kb-${Date.now()}`,
      };
      setKnowledgeBaseSources(prev => {
          if(prev.some(s => s.title === newSource.title)) return prev;
          const updated = [newSource, ...prev.map(s => ({...s, isNew: false}))];
          localStorage.setItem(key, JSON.stringify(updated));
          return updated;
      });
  };

  const deleteKnowledgeSource = (id: string) => {
    const key = getStorageKey('vesta-knowledge-sources');
    if (!key) return;
    setKnowledgeBaseSources(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const addDismissalRule = (finding: Finding, reason: FeedbackReason) => {
    const key = getStorageKey('vesta-dismissal-rules');
    if (!key) return;
    const newRule: DismissalRule = {
      id: `rule-${Date.now()}`,
      findingTitle: finding.title,
      reason,
      timestamp: new Date().toISOString(),
    };
    setDismissalRules(prev => {
      const updated = [...prev, newRule];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteDismissalRule = (id: string) => {
    const key = getStorageKey('vesta-dismissal-rules');
    if (!key) return;
    setDismissalRules(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
        const user = await auth.updateUser(updatedUser);
        setCurrentUser(user);
    } catch(err) {
        console.error("Failed to update user:", err);
        const revertedUser = auth.getCurrentUser();
        if(revertedUser) setCurrentUser(revertedUser);
    }
  };

  const handleCreateWorkspace = async (name: string) => {
    if (!currentUser) return;
    const newWorkspace = await auth.createWorkspace(name, currentUser.email);
    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspace(newWorkspace);
    addAuditLog('Workspace Created', `New workspace "${name}" created.`);
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    const newActiveWorkspace = workspaces.find(w => w.id === workspaceId);
    if (newActiveWorkspace) {
        setActiveWorkspace(newActiveWorkspace);
        navigateTo(Screen.Dashboard);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!currentUser) return;
    await auth.respondToInvitation(invitationId, currentUser.email, true);
    // Refresh session data
    await loadUserSession(currentUser);
  };
  
  const handleDeclineInvitation = async (invitationId: string) => {
    if (!currentUser) return;
    await auth.respondToInvitation(invitationId, currentUser.email, false);
     setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  const handleRoleUpdate = async (email: string, role: UserRole) => {
    if (!activeWorkspace) return;
    const updatedWorkspace = await auth.updateUserRoleInWorkspace(activeWorkspace.id, email, role);
    setActiveWorkspace(updatedWorkspace);
    setWorkspaces(prev => prev.map(w => w.id === updatedWorkspace.id ? updatedWorkspace : w));
  };
  
  const currentUserRole = activeWorkspace?.members.find(m => m.email === currentUser?.email)?.role;

  const renderScreen = () => {
    if (!currentUser) return null; // Should be handled by top-level redirect

    const layoutProps = {
        navigateTo: navigateTo,
        currentUser: currentUser,
        onLogout: handleLogout,
        workspaces: workspaces,
        activeWorkspace: activeWorkspace,
        invitations: invitations,
        onSwitchWorkspace: handleSwitchWorkspace,
        onCreateWorkspace: handleCreateWorkspace,
        onAcceptInvitation: handleAcceptInvitation,
        onDeclineInvitation: handleDeclineInvitation,
    };

    switch (screen) {
      case Screen.Dashboard:
        return <DashboardScreen 
                  {...layoutProps}
                  reports={reports}
                  onSelectReport={handleSelectReport}
                  onStartNewAnalysis={handleStartNewAnalysis}
               />;
      case Screen.Analysis:
        return <AnalysisScreen
                  {...layoutProps}
                  activeReport={activeReport}
                  onAnalysisComplete={handleAnalysisComplete}
                  addAuditLog={addAuditLog}
                  knowledgeBaseSources={knowledgeBaseSources}
                  dismissalRules={dismissalRules}
                  onAddDismissalRule={addDismissalRule}
                  userRole={currentUserRole}
                />;
      case Screen.AuditTrail:
        return <AuditTrailScreen {...layoutProps} logs={auditLogs} />;
      case Screen.KnowledgeBase:
        return <KnowledgeBaseScreen 
                    {...layoutProps}
                    sources={knowledgeBaseSources} 
                    onAddSource={addKnowledgeSource} 
                    onDeleteSource={deleteKnowledgeSource} 
                    onAddAutomatedSource={addAutomatedKnowledgeSource}
                    userRole={currentUserRole}
                />;
      case Screen.Settings:
        return <SettingsScreen 
                  {...layoutProps}
                  dismissalRules={dismissalRules} 
                  onDeleteDismissalRule={deleteDismissalRule}
                  onUserUpdate={handleUserUpdate} 
                  onWorkspaceRoleUpdate={handleRoleUpdate}
                  userRole={currentUserRole}
                />;
      default:
        return <DashboardScreen 
                  {...layoutProps}
                  reports={reports}
                  onSelectReport={handleSelectReport}
                  onStartNewAnalysis={handleStartNewAnalysis}
                />;
    }
  };

  return (
    <div className="font-sans bg-light-main dark:bg-dark-main min-h-screen text-primary-text-light dark:text-primary-text-dark">
      {currentUser ? renderScreen() : <LoginScreen onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default function App() {
  return (
      <TourProvider>
        <AppContainer />
      </TourProvider>
  );
}