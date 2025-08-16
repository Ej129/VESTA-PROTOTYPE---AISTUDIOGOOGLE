
import React, { useState } from 'react';
import { Screen, KnowledgeSource, KnowledgeCategory, ScreenLayoutProps, UserRole } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { PlusIcon, TrashIcon, ChevronDownIcon, GlobeIcon, RefreshIcon, ShieldIcon, KeyIcon } from '../components/Icons';

interface KnowledgeBaseScreenProps extends ScreenLayoutProps {
  sources: KnowledgeSource[];
  onAddSource: (title: string, content: string, category: KnowledgeCategory) => void;
  onDeleteSource: (id: string) => void;
  onAddAutomatedSource: () => void;
}

const KnowledgeSourceCard = ({ source, onDelete, canDelete }: { source: KnowledgeSource, onDelete: (id: string) => void, canDelete: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-sm border border-border-light dark:border-border-dark relative overflow-hidden">
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
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mt-4">
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
                        className="flex-shrink-0 flex items-center justify-center px-6 py-2 bg-primary-blue text-white font-bold rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md border border-border-light dark:border-border-dark">
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
    const getCanDelete = (source: KnowledgeSource) => {
        return source.isEditable && userRole === 'Administrator';
    };
    
    const getCanAdd = () => {
        return userRole === 'Administrator';
    }

    const governmentSources = sources.filter(s => s.category === KnowledgeCategory.Government);
    const riskSources = sources.filter(s => s.category === KnowledgeCategory.Risk);
    const strategySources = sources.filter(s => s.category === KnowledgeCategory.Strategy);

  return (
    <SidebarMainLayout {...layoutProps} userRole={userRole} activeScreen={Screen.KnowledgeBase}>
      <div className="p-8 space-y-8">
        <KnowledgeCategorySection
            title={KnowledgeCategory.Government}
            icon={<GlobeIcon className="w-6 h-6 mr-3 text-primary-blue" />}
            actionButton={
                <button onClick={onAddAutomatedSource} className="flex items-center px-4 py-2 bg-primary-blue text-white text-sm font-semibold rounded-lg">
                    <RefreshIcon className="w-5 h-5 mr-2" />
                    Add Automated Source
                </button>
            }
        >
          {governmentSources.length > 0 ? (
              governmentSources.map(source => (
                  <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
              ))
          ) : (
            <p className="text-center text-secondary-text-light dark:text-secondary-text-dark p-4">No government regulations have been added yet.</p>
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
          {getCanAdd() && <AddSourceForm category={KnowledgeCategory.Risk} onAddSource={onAddSource} />}
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
          {getCanAdd() && <AddSourceForm category={KnowledgeCategory.Strategy} onAddSource={onAddSource} />}
        </KnowledgeCategorySection>

      </div>
    </SidebarMainLayout>
  );
};

export default KnowledgeBaseScreen;