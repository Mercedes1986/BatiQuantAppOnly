
import React, { useState, useEffect } from 'react';
import { Trash2, Printer, ChevronRight, PieChart, FileText } from 'lucide-react';
import { getProjects, deleteProject } from '../services/storage';
import { Project, ClientInfo } from '../types';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { createQuoteFromSimpleProject } from '../services/documentLogic';
import { getCompanyProfile } from '../services/documentsStorage';
import { useNavigate } from 'react-router-dom';
import { ClientModal } from '../components/documents/ClientModal';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    setProjects(getProjects());
  }, [selectedProject]); // Reload when selection changes

  const handleDelete = (id: string, e: React.MouseEvent) => { 
    e.stopPropagation();
    if (confirm('Supprimer définitivement ce projet ?')) {
      deleteProject(id);
      setProjects(getProjects());
      if (selectedProject?.id === id) setSelectedProject(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateQuote = () => {
    const profile = getCompanyProfile();
    if (!profile || !profile.name) {
      if(confirm("Pour créer un devis, vous devez d'abord configurer votre profil entreprise (Nom, SIRET...). Aller aux réglages ?")) {
        navigate('/app/settings');
      }
      return;
    }
    setShowClientModal(true);
  };

  const onConfirmClient = (client: ClientInfo) => {
    if (!selectedProject) return;
    const profile = getCompanyProfile();
    if (!profile) return;

    try {
      const quoteId = createQuoteFromSimpleProject(selectedProject, profile, client);
      setShowClientModal(false);
      navigate(`/app/quotes/${quoteId}`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création du devis.");
    }
  };

  // --- DETAIL VIEW ---
  if (selectedProject) {
    const totalCost = selectedProject.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const chartData = selectedProject.items.map(item => ({
      name: item.name,
      value: item.totalPrice
    }));
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
      <div className="pb-20 bg-white min-h-screen relative">
        {/* Sticky Header with HIGH Z-Index to ensure clickability */}
        <div className="sticky top-0 bg-white/95 backdrop-blur z-30 border-b border-slate-100 p-4 flex items-center justify-between no-print shadow-sm">
          <button 
            onClick={() => setSelectedProject(null)} 
            className="text-slate-500 font-bold flex items-center hover:text-blue-600 transition-colors"
          >
            <ChevronRight className="rotate-180 mr-1" size={20} /> Retour
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={handleGenerateQuote} 
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
               <FileText size={18} className="mr-2"/> Devis
            </button>
            <button 
              onClick={handlePrint} 
              className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title="Imprimer"
            >
               <Printer size={22} />
            </button>
            <button 
              onClick={(e) => handleDelete(selectedProject.id, e)} 
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Supprimer"
            >
               <Trash2 size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-3xl mx-auto printable-content">
          <div className="mb-8 border-b-2 border-slate-800 pb-4">
             <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{selectedProject.name}</h1>
             <p className="text-slate-500 font-medium">Créé le {new Date(selectedProject.date).toLocaleDateString()}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center text-slate-800">
                Liste des matériaux
              </h2>
              <ul className="space-y-3">
                {selectedProject.items.map((item) => (
                  <li key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-300">
                    <div>
                      <span className="font-bold text-slate-700 block text-sm">{item.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{item.quantity} {item.unit} x {item.unitPrice}€</span>
                    </div>
                    <span className="font-bold text-slate-800">{item.totalPrice.toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-5 bg-blue-50 rounded-2xl flex justify-between items-center print:bg-transparent print:border-t-2 print:border-slate-900">
                <span className="font-bold text-xl text-blue-900">Total Estimé</span>
                <span className="font-bold text-2xl text-blue-600 print:text-black">{totalCost.toFixed(2)} €</span>
              </div>
            </div>

            <div className="print:hidden">
               <h2 className="text-lg font-bold mb-4 flex items-center text-slate-800">
                  <PieChart className="mr-2 text-slate-400" size={20}/> Répartition des coûts
               </h2>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(2)} €`} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </RePieChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {selectedProject.notes && (
            <div className="mt-10 p-5 bg-amber-50 border border-amber-100 rounded-2xl print:border-slate-300">
              <h3 className="font-bold text-amber-800 mb-2 print:text-black">Notes & Conseils</h3>
              <p className="text-sm text-amber-900/80 whitespace-pre-line print:text-black leading-relaxed">{selectedProject.notes}</p>
            </div>
          )}
          
          <div className="mt-12 text-center text-xs text-slate-400 print:block hidden">
             Document généré par BatiQuant - Estimations non contractuelles.
          </div>
        </div>

        {/* Client Modal - Rendered here to be accessible */}
        <ClientModal 
          isOpen={showClientModal} 
          onClose={() => setShowClientModal(false)} 
          onConfirm={onConfirmClient} 
        />
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-4 pb-24 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 px-2">Mes Projets (Calculs)</h1>
      
      {projects.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <FolderOpenIcon />
          <p className="mt-4 text-slate-500 font-medium">Aucun calcul sauvegardé.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => setSelectedProject(project)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer hover:border-blue-200"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{project.name}</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {new Date(project.date).toLocaleDateString()} • {project.items.length} éléments
                </p>
              </div>
              <div className="flex items-center space-x-3">
                 <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
                   {project.items.reduce((s, i) => s + i.totalPrice, 0).toFixed(0)} €
                 </span>
                 <ChevronRight className="text-slate-300" size={20} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FolderOpenIcon = () => (
  <svg className="w-16 h-16 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);
