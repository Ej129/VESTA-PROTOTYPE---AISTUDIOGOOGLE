// src/screens/UploadScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import { AnalysisReport } from '../types';
import { PlusIcon, CheckCircleIcon, BriefcaseIcon, AlertTriangleIcon, MoreVerticalIcon } from '../components/Icons';

interface DashboardScreenProps {
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  onNewAnalysisClick: () => void;
  onUpdateReportStatus: (reportId: string, status: 'active' | 'archived') => void;
  onDeleteReport: (report: AnalysisReport) => void;
}

const KPITile: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 flex items-center space-x-4">
        <div className="bg-red-700/10 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-neutral-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-neutral-200">{value}</p>
        </div>
    </div>
);

const UploadScreen: React.FC<DashboardScreenProps> = ({ reports, onSelectReport, onNewAnalysisClick, onUpdateReportStatus, onDeleteReport }) => {
    const [showArchived, setShowArchived] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const activeReports = reports.filter(r => r.status !== 'archived');
    const displayedReports = showArchived ? reports : activeReports;

    const analysesCompleted = activeReports.length;
    const pendingReviews = activeReports.filter(r => r.findings.some(f => f.status === 'active')).length;
    const avgScore = activeReports.length > 0 ? Math.round(activeReports.reduce((acc, r) => acc + (r.scores?.project || r.resilienceScore), 0) / activeReports.length) : 0;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-neutral-200">Dashboard</h1>
                <button 
                    onClick={onNewAnalysisClick}
                    className="flex items-center bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:bg-red-800"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    New Analysis
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPITile title="Analyses Completed" value={analysesCompleted} icon={<CheckCircleIcon className="w-6 h-6 text-red-700" />} />
                <KPITile title="Pending Reviews" value={pendingReviews} icon={<AlertTriangleIcon className="w-6 h-6 text-red-700" />} />
                <KPITile title="Avg. Compliance Score" value={`${avgScore}%`} icon={<BriefcaseIcon className="w-6 h-6 text-red-700" />} />
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-neutral-200">Recent Analyses</h2>
                     <label className="flex items-center space-x-2 cursor-pointer">
                         <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-red-700 focus:ring-red-700 bg-gray-100 dark:bg-neutral-800"/>
                         <span className="text-sm text-gray-500 dark:text-neutral-400">Show archived</span>
                     </label>
                </div>
                {/* --- FIX #1: Removed the `overflow-x-auto` from this container div --- */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <div>
                        {reports.length > 0 ? (
                             <table className="w-full text-left">
                                 <thead className="border-b border-gray-200 dark:border-neutral-700">
                                     <tr>
                                         <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Document Title</th>
                                         <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Date</th>
                                         <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Score</th>
                                         <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Status</th>
                                         <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm text-right">Actions</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {displayedReports.map(report => {
                                         const hasActiveFindings = report.findings.some(f => f.status === 'active');
                                         return (
                                             <tr key={report.id} className={`border-b border-gray-200 dark:border-neutral-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${report.status === 'archived' ? 'opacity-60' : ''}`}>
                                                 <td onClick={() => onSelectReport(report)} className="p-4 font-semibold text-gray-800 dark:text-neutral-200 cursor-pointer">{report.title}</td>
                                                 <td className="p-4 text-gray-500 dark:text-neutral-400">{new Date(report.createdAt).toLocaleDateString()}</td>
                                                 <td className="p-4 font-bold text-red-700">{report.scores?.project || report.resilienceScore}%</td>
                                                 <td className="p-4">
                                                     {report.status === 'archived' ? (
                                                         <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800 dark:bg-neutral-700 dark:text-neutral-200">
                                                             Archived
                                                         </span>
                                                     ) : (
                                                         <span className={`px-3 py-1 text-xs font-semibold rounded-full ${hasActiveFindings ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                                             {hasActiveFindings ? 'Review Needed' : 'Completed'}
                                                         </span>
                                                     )}
                                                 </td>
                                                 <td className="p-4 text-right">
                                                     <div className="relative inline-block" ref={activeMenu === report.id ? menuRef : null}>
                                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === report.id ? null : report.id); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700">
                                                            <MoreVerticalIcon className="w-5 h-5 text-gray-500"/>
                                                        </button>
                                                        {activeMenu === report.id && (
                                                            <div className="absolute z-10 right-0 mt-2 w-40 bg-white dark:bg-neutral-950 rounded-md shadow-lg border border-gray-200 dark:border-neutral-700 py-1">
                                                                <button onClick={() => { onSelectReport(report); setActiveMenu(null); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800">View</button>
                                                                <div className="my-1 h-px bg-gray-200 dark:bg-neutral-700" />
                                                                {report.status === 'archived' ? (
                                                                    <button onClick={() => { setActiveMenu(null); onUpdateReportStatus(report.id, 'active'); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800">Unarchive</button>
                                                                ) : (
                                                                    <button onClick={() => { setActiveMenu(null); onUpdateReportStatus(report.id, 'archived'); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800">Archive</button>
                                                                )}
                                                                {/* --- FIX #2: Close the menu BEFORE showing the confirmation --- */}
                                                                <button onClick={() => { setActiveMenu(null); onDeleteReport(report); }} className="block w-full text-left px-3 py-1.5 text-sm text-red-700 hover:bg-gray-100 dark:hover:bg-neutral-800">Delete</button>
                                                            </div>
                                                        )}
                                                     </div>
                                                 </td>
                                             </tr>
                                         );
                                     })}
                                 </tbody>
                             </table>
                        ) : (
                            <div className="p-12 text-center">
                                <BriefcaseIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-neutral-600" />
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-neutral-200 mt-4">No Analyses Yet</h3>
                                <p className="mt-1 text-gray-500 dark:text-neutral-400">Click "New Analysis" to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadScreen;