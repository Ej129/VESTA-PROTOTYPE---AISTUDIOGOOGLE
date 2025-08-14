import React, { useState, useMemo } from 'react';
import { NavigateTo, Screen, User, KnowledgeSource, KnowledgeCategory, UserRole, ScreenLayoutProps } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { Header } from '../components/Header';
import { PlusIcon, TrashIcon, LibraryIcon, ChevronDownIcon, GlobeIcon, RefreshIcon, BriefcaseIcon, KeyIcon, ShieldIcon } from '../components/Icons';

interface KnowledgeBaseScreenProps extends ScreenLayoutProps {
  sources: KnowledgeSource[];
  onAddSource: (title: string, content: string, category: KnowledgeCategory) => void;
  onDeleteSource: (id: string) => void;
  onAddAutomatedSource: (source: Omit<KnowledgeSource, 'id'>) => void;
  userRole?: UserRole;
}

const KnowledgeSourceCard = ({ source, onDelete, canDelete }: { source: KnowledgeSource, onDelete: (id: string) => void, canDelete: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="bg-light-card dark:bg-dark-card rounded-lg card-shadow border border-border-light dark:border-border-dark relative overflow-hidden">
             {source.isNew && (
                <div className="absolute top-2 right-2 bg-accent-success text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse z-10">
                    NEW
                </div>
            )}
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <h4 className="font-bold text-primary-text-light dark:text-primary-text-dark pr-12">{source.title}</h4>
                <div className="flex items-center">
                    {canDelete && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(source.id); }} 
                            className="p-1 text-secondary-text-light dark:text-secondary-text-dark hover:text-accent-critical dark:hover:text-accent-critical mr-2"
                            aria-label="Delete source"
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    )}
                    <ChevronDownIcon className={`w-6 h-6 text-secondary-text-light dark:text-secondary-text-dark transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && (
                <div className="p-4 pt-0">
                    <div className="bg-light-main dark:bg-dark-main p-4 rounded-md max-h-60 overflow-y-auto">
                        <pre className="text-sm text-secondary-text-light dark:text-secondary-text-dark whitespace-pre-wrap font-sans">{source.content}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

const AddSourceForm = ({ category, onAddSource }: { category: KnowledgeCategory, onAddSource: (title: string, content: string, category: KnowledgeCategory) => void }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddSource = () => {
        if (!newTitle.trim() || !newContent.trim()) {
            alert("Please provide both a title and content.");
            return;
        }
        setIsAdding(true);
        onAddSource(newTitle, newContent, category);
        setTimeout(() => {
          setNewTitle('');
          setNewContent('');
          setIsAdding(false);
        }, 300);
    };

    return (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg card-shadow border border-border-light dark:border-border-dark mt-4">
            <h3 className="text-lg font-bold text-primary-text-light dark:text-primary-text-dark mb-4">Add New Document</h3>
            <div className="space-y-4">
                <input 
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Document Title"
                    className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark"
                    disabled={isAdding}
                />
                 <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Paste the full text of the document here..."
                    className="w-full h-40 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark resize-y"
                    disabled={isAdding}
                />
                <div className="flex justify-end">
                    <button 
                        onClick={handleAddSource}
                        disabled={isAdding || !newTitle.trim() || !newContent.trim()}
                        className="flex-shrink-0 flex items-center justify-center px-6 py-2 btn-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Document
                    </button>
                </div>
            </div>
        </div>
    )
}

const KnowledgeCategorySection = ({ title, icon, children, actionButton }: { title: string, icon: React.ReactNode, children: React.ReactNode, actionButton?: React.ReactNode }) => (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg card-shadow border border-border-light dark:border-border-dark">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
                {icon}
                <h2 className="text-xl font-bold text-primary-text-light dark:text-primary-text-dark">{title}</h2>
            </div>
            {actionButton}
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const KnowledgeBaseScreen: React.FC<KnowledgeBaseScreenProps> = ({ sources, onAddSource, onDeleteSource, onAddAutomatedSource, userRole, ...layoutProps }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);

    const handleCheckForUpdates = () => {
        setIsChecking(true);
        setTimeout(() => {
            const newRegulation = {
                title: 'SEC Memorandum Circular No. 8, Series of 2022',
                content: 'Guidelines on the Issuance of Sustainability Bonds under the ASEAN Sustainability Bond Standards in the Philippines. This establishes the framework for sustainable financing.',
                category: KnowledgeCategory.Government,
                isEditable: false,
                isNew: true,
            };
            onAddAutomatedSource(newRegulation);
            
            if (!sources.some(s => s.title === newRegulation.title)) {
                setUpdateMessage(`New regulation found: "${newRegulation.title}"`);
            } else {
                setUpdateMessage('Knowledge base is up-to-date.');
            }
            
            setIsChecking(false);
            setTimeout(() => setUpdateMessage(null), 5000);
        }, 1500);
    };

    const canEditRisk = useMemo(() => userRole === 'Administrator' || userRole === 'Risk Management Officer', [userRole]);
    const canEditStrategy = useMemo(() => userRole === 'Administrator' || userRole === 'Strategy Officer', [userRole]);

    const getCanDelete = (source: KnowledgeSource) => {
        if (!source.isEditable) return false;
        if (userRole === 'Administrator') return true;
        if (source.category === KnowledgeCategory.Risk) return canEditRisk;
        if (source.category === KnowledgeCategory.Strategy) return canEditStrategy;
        return false;
    };

    const governmentSources = sources.filter(s => s.category === KnowledgeCategory.Government);
    const riskSources = sources.filter(s => s.category === KnowledgeCategory.Risk);
    const strategySources = sources.filter(s => s.category === KnowledgeCategory.Strategy);

  return (
    <SidebarMainLayout {...layoutProps} activeScreen={Screen.KnowledgeBase}>
      <Header title="Knowledge Base" />
      <div className="p-8 space-y-8">
        
        {updateMessage && (
            <div className="fixed top-24 right-8 bg-primary-blue text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in-down">
                {updateMessage}
                 <style>{`
                    @keyframes fade-in-down {
                        0% { opacity: 0; transform: translateY(-20px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
                 `}</style>
            </div>
        )}
        
        <KnowledgeCategorySection
            title={KnowledgeCategory.Government}
            icon={<GlobeIcon className="w-6 h-6 mr-3 text-primary-blue" />}
            actionButton={
                <button onClick={handleCheckForUpdates} disabled={isChecking} className="flex items-center px-4 py-2 btn-primary text-sm font-semibold rounded-lg disabled:opacity-50">
                    <RefreshIcon className={`w-5 h-5 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Checking...' : 'Check for New Regulations'}
                </button>
            }
        >
          {governmentSources.length > 0 ? (
              governmentSources.map(source => (
                  <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
              ))
          ) : (
             <div className="text-center bg-light-main dark:bg-dark-main p-8 rounded-lg">
                <p className="text-secondary-text-light dark:text-secondary-text-dark">No government regulations found. Click "Check for New Regulations" to fetch them.</p>
            </div>
          )}
        </KnowledgeCategorySection>

        <KnowledgeCategorySection
            title={KnowledgeCategory.Risk}
            icon={<ShieldIcon className="w-6 h-6 mr-3 text-accent-warning" />}
        >
          {riskSources.length > 0 ? (
              riskSources.map(source => (
                  <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
              ))
          ) : (
            <p className="text-center text-secondary-text-light dark:text-secondary-text-dark p-4">No risk management plans have been added yet.</p>
          )}
          {canEditRisk && <AddSourceForm category={KnowledgeCategory.Risk} onAddSource={onAddSource} />}
        </KnowledgeCategorySection>
        
        <KnowledgeCategorySection
            title={KnowledgeCategory.Strategy}
            icon={<KeyIcon className="w-6 h-6 mr-3 text-accent-success" />}
        >
          {strategySources.length > 0 ? (
              strategySources.map(source => (
                  <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
              ))
          ) : (
            <p className="text-center text-secondary-text-light dark:text-secondary-text-dark p-4">No strategic direction documents have been added yet.</p>
          )}
          {canEditStrategy && <AddSourceForm category={KnowledgeCategory.Strategy} onAddSource={onAddSource} />}
        </KnowledgeCategorySection>

      </div>
    </SidebarMainLayout>
  );
};

export default KnowledgeBaseScreen;
