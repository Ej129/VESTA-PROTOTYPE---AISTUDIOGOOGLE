import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, FeedbackReason, Finding, KnowledgeCategory, Workspace, WorkspaceMember, UserRole, CustomRegulation, WorkspaceInvitation } from './types';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import UploadScreen from './screens/UploadScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import AuditTrailScreen from './screens/AuditTrailScreen';
import SettingsScreen from './screens/SettingsScreen';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import ManageMembersModal from './components/ManageMembersModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import UploadModal from './components/UploadModal';
import * as workspaceApi from './api/workspace';
import { AlertTriangleIcon, BriefcaseIcon } from './components/Icons';
import { NotificationToast } from './components/NotificationToast';
import { Layout } from './components/Layout';
import { improvePlan, analyzePlan } from './api/vesta';
import ConfirmationModal from './components/ConfirmationModal';

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4 text-center">
        <div className="max-w-2xl bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-red-700">
            <AlertTriangleIcon className="w-16 h-16 mx-auto text-red-700" />
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-600 mt-4">Application Configuration Error</h1>
            <p className="text-gray-500 dark:text-neutral-400 mt-2">
                The application cannot start because a required configuration is missing.
            </p>
            <div className="mt-4 p-4 bg-red-700/10 rounded-md text-left">
                <p className="font-mono text-sm text-red-700">{message}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-6">
                <strong>Action Required:</strong> Please add the `API_KEY` environment variable in your Netlify site settings under "Site configuration" {'>'} "Build & deploy" {'>'} "Environment" and then trigger a new deploy.
            </p>
        </div>
    </div>
);


const InitializingScreen: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-700"></div>
        <p className="mt-4 text-lg font-semibold text-gray-500 dark:text-neutral-400">
            Initializing Session...
        </p>
    </div>
);

const NoWorkspaceSelectedScreen: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BriefcaseIcon className="w-16 h-16 text-gray-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-200">No Workspace Selected</h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-2 max-w-sm">
            Please select a workspace from the sidebar to view its content, or create a new one to get started.
        </p>
        <button
            onClick={onCreate}
            className="mt-6 bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 inline-flex items-center shadow-sm hover:shadow-md hover:bg-red-800"
        >
            Create Your First Workspace
        </button>
    </div>
);

const App: React.FC = () => {
  // --- FAIL-FAST CHECK ---
  if (!import.meta.env.VITE_API_KEY) {
    return <ErrorScreen message="The 'VITE_API_KEY' environment variable is not set. This key is required to communicate with the Google Gemini API." />;
  }
  
  const { user: currentUser, loading, logout: handleLogout } = useAuth();

  const [screen, setScreen] = useState<Screen>(Screen.Dashboard);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('Member');
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  
  // Data scoped to the selected workspace
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [knowledgeBaseSources, setKnowledgeBaseSources] = useState<KnowledgeSource[]>([]);
  const [dismissalRules, setDismissalRules] = useState<DismissalRule[]>([]);
  const [customRegulations, setCustomRegulations] = useState<CustomRegulation[]>([]);
  
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  
  // Modal State
  const [isCreateWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [isManageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [isKnowledgeBaseModalOpen, setKnowledgeBaseModalOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => Promise<void>; confirmText?: string; } | null>(null);

  
  // Notification State
  const [notification, setNotification] = useState<{ message: string; workspaceName: string } | null>(null);
  const knownWorkspaceIds = useRef(new Set<string>());

  // Loading State
  const [isSyncingSources, setIsSyncingSources] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Enhancing state
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Auto-enhance handler: improve the document then re-run analysis to update scores
  const handleAutoEnhance = useCallback(async (maybeReport?: AnalysisReport) => {
    // Resolve the real target report: prefer report by id, otherwise fall back to activeReport
    const targetReport = (maybeReport && maybeReport.id)
      ? reports.find(r => r.id === maybeReport.id) ?? maybeReport
      : activeReport;

    if (!targetReport || !selectedWorkspace) {
      console.warn('Auto-enhance: no target report or workspace');
      return;
    }

    setIsEnhancing(true);
    try {
      // 1) Improve document text
      const improvedText = await improvePlan(targetReport.documentContent, targetReport);

      // 2) Re-run analysis on improved text
      const newReportData = await analyzePlan(
        improvedText,
        knowledgeBaseSources,
        dismissalRules,
        customRegulations
      );

      // 3) Merge results, preserving identity fields
      const updatedReport: AnalysisReport = {
        ...targetReport,
        documentContent: improvedText,
        title: newReportData.title ?? targetReport.title,
        summary: newReportData.summary ?? targetReport.summary,
        findings: newReportData.findings ?? targetReport.findings,
        scores: newReportData.scores ?? targetReport.scores,
        resilienceScore: newReportData.resilienceScore ?? targetReport.resilienceScore,
      };

      // 4) Update local state
      setReports(prev =>
        updatedReport.id
          ? prev.map(r => (r.id === updatedReport.id ? updatedReport : r))
          : prev.map(r => (r === targetReport ? updatedReport : r))
      );
      setActiveReport(updatedReport);

      // 5) Persist if available (optional)
      // await workspaceApi.updateReport?.(selectedWorkspace.id, updatedReport);

      // 6) Audit log but preserve activeReport during reloads
      await addAuditLog('Auto-Fix', `Auto-enhanced report: ${updatedReport.title}`, true);

    } catch (err) {
      console.error('Auto-enhance failed', err);
    } finally {
      setIsEnhancing(false);
    }
  }, [
    reports,
    activeReport,
    selectedWorkspace,
    knowledgeBaseSources,
    dismissalRules,
    customRegulations,
    addAuditLog,
    setReports,
    setActiveReport
  ]);


  // Global Theme Persistence Fix
  useEffect(() => {
    const handleThemeChange = () => {
      if (localStorage.getItem('vesta-theme') === 'dark' || (!('vesta-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    window.addEventListener('storage', handleThemeChange);
    handleThemeChange();

    return () => {
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const navigateTo: NavigateTo = (newScreen: Screen) => {
    setScreen(newScreen);
  };
  
const loadWorkspaceData = useCallback(async (workspaceId: string, keepActiveReport = false) => {
  if (!currentUser) return;
  
  console.log("loadWorkspaceData called with keepActiveReport:", keepActiveReport);
  
  const data = await workspaceApi.getWorkspaceData(workspaceId);
  setReports(data.reports);
  setAuditLogs(data.auditLogs);
  setKnowledgeBaseSources(data.knowledgeBaseSources);
  setDismissalRules(data.dismissalRules);
  setCustomRegulations(data.customRegulations);
  
  const members = await workspaceApi.getWorkspaceMembers(workspaceId);
  setWorkspaceMembers(members);
  const member = members.find(m => m.email === currentUser.email);
  setUserRole(member?.role || 'Member');
  
  // Only reset activeReport if not explicitly keeping it
  if (!keepActiveReport) {
    console.log("Resetting activeReport to null");
    setActiveReport(null);
  } else {
    console.log("Keeping current activeReport");
  }
}, [currentUser]);

  const refreshWorkspaces = useCallback(async () => {
    if (!currentUser) return;
    const userWorkspaces = await workspaceApi.getWorkspacesForUser();
    setWorkspaces(userWorkspaces);
    knownWorkspaceIds.current = new Set(userWorkspaces.map(ws => ws.id));
    // If no workspace is selected, or the selected one is no longer available, select the first one.
    if ((!selectedWorkspace || !userWorkspaces.some(ws => ws.id === selectedWorkspace.id)) && userWorkspaces.length > 0) {
      handleSelectWorkspace(userWorkspaces[0]);
    } else if (userWorkspaces.length === 0) {
      setSelectedWorkspace(null);
    }
  }, [currentUser, selectedWorkspace]);

  const refreshInvitations = useCallback(async () => {
      if (!currentUser) return;
      const pendingInvitations = await workspaceApi.getPendingInvitations();
      setInvitations(pendingInvitations);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshWorkspaces();
      refreshInvitations();
    } else {
      // Clear all state when user logs out
      setWorkspaces([]);
      setSelectedWorkspace(null);
      setReports([]);
      setAuditLogs([]);
      setKnowledgeBaseSources([]);
      setDismissalRules([]);
      setCustomRegulations([]);
      setActiveReport(null);
      setInvitations([]);
      knownWorkspaceIds.current.clear();
    }
  }, [currentUser, refreshWorkspaces, refreshInvitations]);

  // Poll for new workspaces (from invitations being accepted)
  useEffect(() => {
      if (!currentUser) return;
      const intervalId = setInterval(async () => {
          const currentWorkspaces = await workspaceApi.getWorkspacesForUser();
          const newWorkspaces = currentWorkspaces.filter(ws => !knownWorkspaceIds.current.has(ws.id));
          if (newWorkspaces.length > 0) {
              const newWorkspace = newWorkspaces[0];
              await refreshWorkspaces();
              setNotification({
                  message: `You've been added to a new workspace!`,
                  workspaceName: newWorkspace.name,
              });
          }
          refreshInvitations();
      }, 30000);
      return () => clearInterval(intervalId);
  }, [currentUser, refreshWorkspaces, refreshInvitations]);
  
  const addAuditLog = useCallback(async (action: AuditLogAction, details: string, keepActiveReport = false) => {
    if (!currentUser || !selectedWorkspace) return;
    await workspaceApi.addAuditLog(selectedWorkspace.id, currentUser.email, action, details);
    // Reload workspace data; optionally preserve the current active report
    await loadWorkspaceData(selectedWorkspace.id, keepActiveReport);
  }, [currentUser, selectedWorkspace, loadWorkspaceData]);

  const handleCreateWorkspace = async (name: string) => {
    if (!currentUser) return;
    try {
        const newWorkspace = await workspaceApi.createWorkspace(name);
        await refreshWorkspaces();
        setCreateWorkspaceModalOpen(false);
        await handleSelectWorkspace(newWorkspace);
    } catch (error) {
        console.error("Failed to create workspace:", error);
        throw error;
    }
  };

const handleSelectWorkspace = async (workspace: Workspace, reportToSelect?: AnalysisReport) => {
  if(selectedWorkspace?.id === workspace.id && screen !== Screen.Analysis && !reportToSelect) return;
  
  setSelectedWorkspace(workspace);
  setActiveReport(reportToSelect || null); // Keep the report if provided
  await loadWorkspaceData(workspace.id);
  
  // Only navigate to dashboard if we're not selecting a specific report
  if (!reportToSelect) {
    navigateTo(Screen.Dashboard);
  }
};

  const handleAnalysisComplete = async (report: AnalysisReport) => {
    if (!selectedWorkspace) return;
    const newReport = { ...report, workspaceId: selectedWorkspace.id };
    const addedReport = await workspaceApi.addReport(newReport);
    await addAuditLog('Analysis Run', JSON.stringify({ message: `Analysis completed for: ${report.title}`, reportId: addedReport.id }));
    await loadWorkspaceData(selectedWorkspace.id);
    setActiveReport(addedReport);
    return addedReport;
  };

const handleFileUpload = async (content: string, fileName: string) => {
  if (!selectedWorkspace) return;

  try {
    // Add to audit log that file was uploaded
    addAuditLog('Document Upload', `File uploaded: ${fileName}`);

    // Start analyzing → keep modal open
    setIsAnalyzing(true);

    // Call API to analyze document
    const reportData = await analyzePlan(
      content,
      knowledgeBaseSources,
      dismissalRules,
      customRegulations
    );

    // Create new report object
    const report = {
      ...reportData,
      title: fileName || "Pasted Text Analysis",
    };

    // Save analysis result
    await handleAnalysisComplete(report as AnalysisReport);

    // Stop analyzing + close modal
    setIsAnalyzing(false);
    setUploadModalOpen(false);

    // Navigate to analysis screen
    navigateTo(Screen.Analysis);

  } catch (error) {
    console.error("Analysis failed:", error);
    setIsAnalyzing(false);
    alert("Analysis failed. Please try again.");
  }
};

  
const handleSelectReport = (report: AnalysisReport) => {
  if (!report) return;
  
  // First, check if this report belongs to a different workspace
  if (selectedWorkspace?.id !== report.workspaceId) {
    // Find the workspace this report belongs to
    const reportWorkspace = workspaces.find(ws => ws.id === report.workspaceId);
    if (reportWorkspace) {
      // Switch to the correct workspace first
      handleSelectWorkspace(reportWorkspace).then(() => {
        // After workspace is loaded, set the active report
        setActiveReport(report);
        navigateTo(Screen.Analysis);
      });
      return;
    }
  }
  
  // If already in the correct workspace, just set the report and navigate
  setActiveReport(report);
  navigateTo(Screen.Analysis);
};


  const handleUpdateReport = async (updatedReport: AnalysisReport) => {
      try {
          const savedReport = await workspaceApi.updateReport(updatedReport);
          setReports(prevReports => prevReports.map(r => r.id === savedReport.id ? savedReport : r));
          setActiveReport(savedReport);
      } catch (error) {
          console.error("Failed to update report:", error);
          alert((error as Error).message);
      }
  };
  


  // Auto-enhance handler: improve the document then re-run analysis to update scores
  const handleAutoEnhance = useCallback(async (maybeReport?: AnalysisReport) => {
    // Resolve the real target report: prefer report by id, otherwise fall back to activeReport
    const targetReport = (maybeReport && maybeReport.id)
      ? reports.find(r => r.id === maybeReport.id) ?? maybeReport
      : activeReport;

    if (!targetReport || !selectedWorkspace) {
      console.warn('Auto-enhance: no target report or workspace');
      return;
    }

    setIsEnhancing(true);
    try {
      // 1) Improve document text
      const improvedText = await improvePlan(targetReport.documentContent, targetReport);

      // 2) Re-run analysis on improved text
      const newReportData = await analyzePlan(
        improvedText,
        knowledgeBaseSources,
        dismissalRules,
        customRegulations
      );

      // 3) Merge results, preserving identity fields
      const updatedReport: AnalysisReport = {
        ...targetReport,
        documentContent: improvedText,
        title: newReportData.title ?? targetReport.title,
        summary: newReportData.summary ?? targetReport.summary,
        findings: newReportData.findings ?? targetReport.findings,
        scores: newReportData.scores ?? targetReport.scores,
        resilienceScore: newReportData.resilienceScore ?? targetReport.resilienceScore,
      };

      // 4) Update local state
      setReports(prev =>
        updatedReport.id
          ? prev.map(r => (r.id === updatedReport.id ? updatedReport : r))
          : prev.map(r => (r === targetReport ? updatedReport : r))
      );
      setActiveReport(updatedReport);

      // 5) Persist if available (optional)
      // await workspaceApi.updateReport?.(selectedWorkspace.id, updatedReport);

      // 6) Audit log but preserve activeReport during reloads
      await addAuditLog('Auto-Fix', `Auto-enhanced report: ${updatedReport.title}`, true);

    } catch (err) {
      console.error('Auto-enhance failed', err);
    } finally {
      setIsEnhancing(false);
    }
  }, [
    reports,
    activeReport,
    selectedWorkspace,
    knowledgeBaseSources,
    dismissalRules,
    customRegulations,
    addAuditLog,
    setReports,
    setActiveReport
  ]);


  const addKnowledgeSource = async (title: string, content: string, category: KnowledgeCategory) => {
    if (!selectedWorkspace) return;
    await workspaceApi.addKnowledgeSource(selectedWorkspace.id, { title, content, category, isEditable: true });
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const deleteKnowledgeSource = async (id: string) => {
    if (!selectedWorkspace) return;
    await workspaceApi.deleteKnowledgeSource(selectedWorkspace.id, id);
    await loadWorkspaceData(selectedWorkspace.id);
  };
  
  const addDismissalRule = async (finding: Finding, reason: FeedbackReason) => {
    if (!selectedWorkspace) return;
    await workspaceApi.addDismissalRule(selectedWorkspace.id, { findingTitle: finding.title, reason });
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const deleteDismissalRule = async (id: string) => {
    if (!selectedWorkspace) return;
    await workspaceApi.deleteDismissalRule(selectedWorkspace.id, id);
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleAddRegulation = async (ruleText: string) => {
      if (!selectedWorkspace || !currentUser) return;
      await workspaceApi.addCustomRegulation(selectedWorkspace.id, ruleText, currentUser.email);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleDeleteRegulation = async (regulationId: string) => {
      if (!selectedWorkspace) return;
      await workspaceApi.deleteCustomRegulation(selectedWorkspace.id, regulationId);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
        await workspaceApi.updateUser(updatedUser);
        alert("Profile updated. Note: some changes from Netlify may override this on your next session.");
    } catch(err) {
        console.error("Failed to update user:", err);
    }
  };
  
  const handleInviteUser = async (email: string, role: UserRole) => {
      if (!selectedWorkspace) return;
      try {
          await workspaceApi.inviteUser(selectedWorkspace.id, email, role);
          await addAuditLog('User Invited', `Invited ${email} as ${role}.`);
          await loadWorkspaceData(selectedWorkspace.id); // Refresh member list
      } catch (error) {
          alert((error as Error).message);
      }
  };

  const handleRemoveUser = async (email: string, status: 'active' | 'pending') => {
      if (!selectedWorkspace) return;
      await workspaceApi.removeUser(selectedWorkspace.id, email);
      const action = status === 'active' ? 'User Removed' : 'Invitation Revoked';
      const details = status === 'active' ? `Removed user ${email}.` : `Revoked invitation for ${email}.`;
      await addAuditLog(action, details);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUpdateRole = async (email: string, role: UserRole) => {
      if (!selectedWorkspace) return;
      await workspaceApi.updateUserRole(selectedWorkspace.id, email, role);
      await addAuditLog('Role Changed', `Changed role for ${email} to ${role}.`);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUpdateWorkspaceName = async (workspaceId: string, name: string) => {
    try {
        await workspaceApi.updateWorkspaceName(workspaceId, name);
        setSelectedWorkspace(prev => prev ? { ...prev, name } : null);
        setWorkspaces(prev => prev.map(ws => ws.id === workspaceId ? { ...ws, name } : ws));
        await loadWorkspaceData(workspaceId);
    } catch (error) {
        console.error("Failed to update workspace name:", error);
        alert((error as Error).message);
        refreshWorkspaces();
    }
  };
  
  const handleRespondToInvitation = async (workspaceId: string, response: 'accept' | 'decline') => {
    try {
        await workspaceApi.respondToInvitation(workspaceId, response);
        await refreshInvitations();
        if (response === 'accept') {
            await refreshWorkspaces();
        }
    } catch (error) {
        alert((error as Error).message);
    }
  };

  const handleUpdateWorkspaceStatus = async (workspaceId: string, status: 'active' | 'archived') => {
    try {
        await workspaceApi.updateWorkspaceStatus(workspaceId, status);
        // The serverless function now handles audit logging, so we just refresh.
        await refreshWorkspaces();
        // If the currently selected workspace was archived, navigate away
        if (selectedWorkspace?.id === workspaceId && status === 'archived') {
            const firstActive = workspaces.find(ws => ws.status !== 'archived' && ws.id !== workspaceId);
            if (firstActive) {
                handleSelectWorkspace(firstActive);
            } else {
                setSelectedWorkspace(null);
            }
        }
    } catch (error) {
        console.error(`Failed to ${status === 'active' ? 'unarchive' : 'archive'} workspace:`, error);
        alert((error as Error).message);
    }
  };

  const handleDeleteWorkspace = (workspace: Workspace) => {
    setConfirmation({
        title: "Delete Workspace",
        message: `Are you sure you want to permanently delete the "${workspace.name}" workspace? This will also delete all associated analyses and data. This action cannot be undone.`,
        confirmText: "Delete Workspace",
        onConfirm: async () => {
            try {
                if (currentUser) {
                     // The delete function will remove all data, so log first. The function itself cannot log to a store that's about to be deleted.
                    await workspaceApi.addAuditLog(workspace.id, currentUser.email, 'Workspace Deleted', `Workspace "${workspace.name}" was permanently deleted.`);
                }
                await workspaceApi.deleteWorkspace(workspace.id);
                await refreshWorkspaces();
            } catch (error) {
                console.error("Failed to delete workspace:", error);
                alert((error as Error).message);
            }
        }
    });
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'active' | 'archived') => {
    if (!selectedWorkspace) return;
    try {
        await workspaceApi.updateReportStatus(reportId, status);
        const action = status === 'archived' ? 'Analysis Archived' : 'Analysis Unarchived';
        const report = reports.find(r => r.id === reportId);
        await addAuditLog(action, `Analysis "${report?.title || reportId}" status changed to ${status}.`);
        await loadWorkspaceData(selectedWorkspace.id);
    } catch (error) {
        console.error(`Failed to ${status === 'active' ? 'unarchive' : 'archive'} report:`, error);
        alert((error as Error).message);
    }
  };

  const handleDeleteReport = (report: AnalysisReport) => {
    if (!selectedWorkspace) return;
    setConfirmation({
        title: "Delete Analysis",
        message: `Are you sure you want to permanently delete the analysis for "${report.title}"? This action cannot be undone.`,
        confirmText: "Delete Analysis",
        onConfirm: async () => {
            try {
                await addAuditLog('Analysis Deleted', `Analysis "${report.title}" was permanently deleted.`);
                await workspaceApi.deleteReport(report.id);
                if (activeReport?.id === report.id) {
                    setActiveReport(null);
                    navigateTo(Screen.Dashboard);
                }
                await loadWorkspaceData(selectedWorkspace.id);
            } catch (error) {
                console.error("Failed to delete report:", error);
                alert((error as Error).message);
            }
        }
    });
  };

const renderScreenComponent = () => {
  // Allow Analysis to render if we already have an activeReport,
  // even if selectedWorkspace is momentarily null.
  if (screen === Screen.Analysis && activeReport) {
    const layoutProps = {
      navigateTo,
      currentUser: currentUser!,
      onLogout: handleLogout,
      currentWorkspace: selectedWorkspace, // can be null briefly
      onManageMembers: () => setManageMembersModalOpen(true),
      userRole,
    };

    return (
      <AnalysisScreen
        key={activeReport.id}                 // force fresh mount per report
        {...layoutProps}
        activeReport={activeReport}
        onUpdateReport={handleUpdateReport}
        onAutoEnhance={handleAutoEnhance}
        isEnhancing={isEnhancing}
        analysisStatusText={isEnhancing ? "Enhancing…" : (isAnalyzing ? "Analyzing…" : "")}
        onNewAnalysis={handleFileUpload}
      />
    );
  }

  // For all other screens, still require a workspace.
  if (!selectedWorkspace) {
    return <NoWorkspaceSelectedScreen onCreate={() => setCreateWorkspaceModalOpen(true)} />;
  }

  const layoutProps = {
    navigateTo,
    currentUser: currentUser!,
    onLogout: handleLogout,
    currentWorkspace: selectedWorkspace,
    onManageMembers: () => setManageMembersModalOpen(true),
    userRole,
  };

  switch (screen) {
    case Screen.Dashboard:
      return (
        <UploadScreen
          reports={reports}
          onSelectReport={handleSelectReport}
          onNewAnalysisClick={() => setUploadModalOpen(true)}
          onUpdateReportStatus={handleUpdateReportStatus}
          onDeleteReport={handleDeleteReport}
        />
      );
    case Screen.Analysis: // fallback if no activeReport yet
      return (
        <div className="flex items-center justify-center h-full p-8 text-gray-500">
          Loading analysis…
        </div>
      );
    case Screen.AuditTrail:
      return <AuditTrailScreen {...layoutProps} logs={auditLogs} reports={reports} onSelectReport={handleSelectReport} />;
    case Screen.Settings:
      return <SettingsScreen {...layoutProps} dismissalRules={dismissalRules} onDeleteDismissalRule={deleteDismissalRule} onUserUpdate={handleUserUpdate} customRegulations={customRegulations} onAddRegulation={handleAddRegulation} onDeleteRegulation={handleDeleteRegulation} />;
    default:
      return (
        <UploadScreen
          reports={reports}
          onSelectReport={handleSelectReport}
          onNewAnalysisClick={() => setUploadModalOpen(true)}
          onUpdateReportStatus={handleUpdateReportStatus}
          onDeleteReport={handleDeleteReport}
        />
      );
  }
};


  if (loading) return <InitializingScreen />;
  if (!currentUser) return <LoginScreen />;

  return (
    <div className="font-sans bg-gray-50 dark:bg-neutral-950 min-h-screen text-gray-800 dark:text-neutral-200">
        {confirmation && (
            <ConfirmationModal
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                onConfirm={confirmation.onConfirm}
                onCancel={() => setConfirmation(null)}
            />
        )}
        {notification && (
            <NotificationToast 
                message={notification.message}
                workspaceName={notification.workspaceName}
                onClose={() => setNotification(null)}
            />
        )}
        {isCreateWorkspaceModalOpen && (
            <CreateWorkspaceModal 
                onClose={() => setCreateWorkspaceModalOpen(false)}
                onCreate={handleCreateWorkspace}
            />
        )}
        {selectedWorkspace && isManageMembersModalOpen && (
            <ManageMembersModal 
                onClose={() => setManageMembersModalOpen(false)}
                currentMembers={workspaceMembers}
                currentUserEmail={currentUser.email}
                onInviteUser={handleInviteUser}
                onRemoveUser={handleRemoveUser}
                onUpdateRole={handleUpdateRole}
            />
        )}
        {isKnowledgeBaseModalOpen && selectedWorkspace && (
             <KnowledgeBaseModal
                onClose={() => setKnowledgeBaseModalOpen(false)}
                sources={knowledgeBaseSources}
                onAddSource={addKnowledgeSource}
                onDeleteSource={deleteKnowledgeSource}
                isSyncing={isSyncingSources}
                userRole={userRole}
            />
        )}
        {isUploadModalOpen && (
            <UploadModal
                onClose={() => setUploadModalOpen(false)}
                onUpload={handleFileUpload}
                isAnalyzing={isAnalyzing}
            />
        )}
        <Layout
            navigateTo={navigateTo}
            currentUser={currentUser}
            onLogout={handleLogout}
            currentWorkspace={selectedWorkspace}
            workspaces={workspaces}
            onSelectWorkspace={handleSelectWorkspace}
            onManageMembers={() => setManageMembersModalOpen(true)}
            userRole={userRole}
            onCreateWorkspace={() => setCreateWorkspaceModalOpen(true)}
            onUpdateWorkspaceName={handleUpdateWorkspaceName}
            onKnowledgeBase={() => setKnowledgeBaseModalOpen(true)}
            onNewAnalysis={() => setUploadModalOpen(true)}
            onUpdateWorkspaceStatus={handleUpdateWorkspaceStatus}
            onDeleteWorkspace={handleDeleteWorkspace}
            invitations={invitations}
            onRespondToInvitation={handleRespondToInvitation}
        >
            {renderScreenComponent()}
        </Layout>
    </div>
  );
}

export default App;