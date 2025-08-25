// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction,
  KnowledgeSource, DismissalRule, FeedbackReason, Finding,
  KnowledgeCategory, Workspace, WorkspaceMember, UserRole,
  CustomRegulation, WorkspaceInvitation
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import UploadScreen from '../screens/UploadScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import AuditTrailScreen from '../screens/AuditTrailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import ManageMembersModal from '../components/ManageMembersModal';
import KnowledgeBaseModal from '../components/KnowledgeBaseModal';
import UploadModal from '../components/UploadModal';
import * as workspaceApi from '../api/workspace';
import { AlertTriangleIcon, BriefcaseIcon } from '../components/Icons';
import { NotificationToast } from '../components/NotificationToast';
import { Layout } from '../components/Layout';
import * as vestaApi from '../api/vesta';
import ConfirmationModal from '../components/ConfirmationModal';

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
  const [isAnalyzingNewReport, setIsAnalyzingNewReport] = useState(false); // 👈 NEW

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

  const loadWorkspaceData = useCallback(async (workspaceId: string) => {
    if (!currentUser) return;
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
  }, [currentUser]);

  const handleAnalysisComplete = async (report: AnalysisReport) => {
    if (!selectedWorkspace) return;
    const newReport = { ...report, workspaceId: selectedWorkspace.id };
    const addedReport = await workspaceApi.addReport(newReport);
    await loadWorkspaceData(selectedWorkspace.id);
    setActiveReport(addedReport);
    return addedReport;
  };

  const handleFileUpload = async (content: string, fileName: string) => {
    if (!selectedWorkspace) return;

    setIsAnalyzingNewReport(true);
    setUploadModalOpen(false);
    navigateTo(Screen.Analysis); // 👈 go directly to Analysis screen

    const reportData = await vestaApi.analyzePlan(content, knowledgeBaseSources, dismissalRules, customRegulations);
    const report = { ...reportData, title: fileName || "Pasted Text Analysis" };
    const saved = await handleAnalysisComplete(report as AnalysisReport);

    setActiveReport(saved);
    setIsAnalyzingNewReport(false);
  };

  const handleSelectReport = (report: AnalysisReport) => {
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

  const handleAutoEnhance = async (report: AnalysisReport): Promise<string> => {
    if (!report) return '';
    setIsAnalyzing(true);
    const improvedContentWithDiff = await vestaApi.improvePlan(report.documentContent, report);
    setIsAnalyzing(false);
    return improvedContentWithDiff;
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
        isEnhancing={isAnalyzing}
        analysisStatusText={isAnalyzing ? "Analyzing…" : ""}  // optional
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
          onCreate={() => {}}
        />
      )}
      {selectedWorkspace && isManageMembersModalOpen && (
        <ManageMembersModal 
          onClose={() => setManageMembersModalOpen(false)}
          currentMembers={workspaceMembers}
          currentUserEmail={currentUser.email}
          onInviteUser={() => {}}
          onRemoveUser={() => {}}
          onUpdateRole={() => {}}
        />
      )}
      {isKnowledgeBaseModalOpen && selectedWorkspace && (
        <KnowledgeBaseModal
          onClose={() => setKnowledgeBaseModalOpen(false)}
          sources={knowledgeBaseSources}
          onAddSource={() => {}}
          onDeleteSource={() => {}}
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
        onSelectWorkspace={setSelectedWorkspace}
        onManageMembers={() => setManageMembersModalOpen(true)}
        userRole={userRole}
        onCreateWorkspace={() => setCreateWorkspaceModalOpen(true)}
        onUpdateWorkspaceName={() => {}}
        onKnowledgeBase={() => setKnowledgeBaseModalOpen(true)}
        onNewAnalysis={() => setUploadModalOpen(true)}
        onUpdateWorkspaceStatus={() => {}}
        onDeleteWorkspace={() => {}}
        invitations={invitations}
        onRespondToInvitation={() => {}}
      >
        {renderScreenComponent()}
      </Layout>
    </div>
  );
};

export default App;