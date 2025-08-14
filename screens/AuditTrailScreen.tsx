import React from 'react';
import { NavigateTo, Screen, User, AuditLog, ScreenLayoutProps } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { Header } from '../components/Header';
import { ExportIcon, HistoryIcon } from '../components/Icons';


interface AuditTrailScreenProps extends ScreenLayoutProps {
  logs: AuditLog[];
}

const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({ logs, ...layoutProps }) => {
    
    const handleExport = () => {
        alert("Exporting log...\nIn a real application, this would generate a CSV or PDF file of the audit trail.");
    };

  return (
    <SidebarMainLayout {...layoutProps} activeScreen={Screen.AuditTrail}>
      <Header title="Audit Trail" />
      <div className="p-8 space-y-6">
        <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg card-shadow border border-border-light dark:border-border-dark flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                <input
                    type="search"
                    placeholder="Search by details..."
                    className="w-full md:w-72 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark"
                />
                <select className="w-full md:w-64 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark appearance-none bg-no-repeat" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                    <option>Filter by Project</option>
                    <option>Q3 Mobile Banking App Relaunch</option>
                    <option>Digital Onboarding Revamp</option>
                    <option>Internal Process Automation</option>
                </select>
            </div>
            <button
                onClick={handleExport}
                className="flex items-center justify-center w-full md:w-auto px-4 py-2 btn-primary font-bold rounded-lg transition whitespace-nowrap"
            >
                <ExportIcon className="w-5 h-5 mr-2" />
                Export Log
            </button>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-lg card-shadow overflow-hidden border border-border-light dark:border-border-dark">
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-dark-main/20 border-b border-border-light dark:border-border-dark">
                    <tr>
                      <th className="p-4 font-semibold text-secondary-text-light dark:text-secondary-text-dark text-sm">Timestamp</th>
                      <th className="p-4 font-semibold text-secondary-text-light dark:text-secondary-text-dark text-sm">User</th>
                      <th className="p-4 font-semibold text-secondary-text-light dark:text-secondary-text-dark text-sm">Action</th>
                      <th className="p-4 font-semibold text-secondary-text-light dark:text-secondary-text-dark text-sm">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border-light dark:border-border-dark last:border-b-0 hover:bg-gray-50 dark:hover:bg-dark-main/20 transition-colors">
                        <td className="p-4 text-secondary-text-light dark:text-secondary-text-dark whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-4 text-primary-text-light dark:text-primary-text-dark font-medium">{log.user}</td>
                        <td className="p-4 text-secondary-text-light dark:text-secondary-text-dark">
                            <span className="px-3 py-1 text-xs font-semibold text-primary-blue bg-primary-blue/10 rounded-full">
                              {log.action}
                            </span>
                        </td>
                        <td className="p-4 text-primary-text-light dark:text-primary-text-dark max-w-lg truncate">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          ) : (
            <div className="p-12 text-center">
                <HistoryIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-primary-text-light dark:text-primary-text-dark mt-4">No Activity Yet</h3>
                <p className="mt-1 text-secondary-text-light dark:text-secondary-text-dark">Your activity, such as document uploads and analyses, will be logged here.</p>
            </div>
          )}
        </div>
      </div>
    </SidebarMainLayout>
  );
};

export default AuditTrailScreen;
