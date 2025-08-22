

import React from 'react';
import { AnalysisReport } from '../types';
import { PlusIcon, CheckCircleIcon, BriefcaseIcon, AlertTriangleIcon } from '../components/Icons';

interface DashboardScreenProps {
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  onNewAnalysisClick: () => void;
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

const UploadScreen: React.FC<DashboardScreenProps> = ({ reports, onSelectReport, onNewAnalysisClick }) => {
    
    const analysesCompleted = reports.length;
    const pendingReviews = reports.filter(r => r.findings.some(f => f.status === 'active')).length;
    const avgScore = reports.length > 0 ? Math.round(reports.reduce((acc, r) => acc + (r.scores?.project || r.resilienceScore), 0) / reports.length) : 0;

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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-neutral-200 mb-4">Recent Analyses</h2>
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <div className="overflow-x-auto">
                        {reports.length > 0 ? (
                             <table className="w-full text-left">
                                <thead className="border-b border-gray-200 dark:border-neutral-700">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Document Title</th>
                                        <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Date</th>
                                        <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Score</th>
                                        <th className="p-4 font-semibold text-gray-500 dark:text-neutral-400 text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.slice(0, 5).map(report => {
                                        const hasActiveFindings = report.findings.some(f => f.status === 'active');
                                        return (
                                            <tr key={report.id} onClick={() => onSelectReport(report)} className="border-b border-gray-200 dark:border-neutral-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                                                <td className="p-4 font-semibold text-gray-800 dark:text-neutral-200">{report.title}</td>
                                                <td className="p-4 text-gray-500 dark:text-neutral-400">{new Date(report.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 font-bold text-red-700">{report.scores?.project || report.resilienceScore}%</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${hasActiveFindings ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                                        {hasActiveFindings ? 'Review Needed' : 'Completed'}
                                                    </span>
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