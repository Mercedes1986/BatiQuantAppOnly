import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronRight,
  Plus,
  Ruler,
  FileText,
  Layers,
  X,
  FileCheck,
  AlertTriangle,
  Pencil,
  Home,
  Trash2,
} from 'lucide-react';
import {
  getHouseProjects,
  saveHouseProject,
  deleteHouseProject,
  generateId,
} from '../services/storage';
import { HouseProject, ConstructionStepId, ClientInfo } from '../types';
import { CONSTRUCTION_STEPS } from '../constants';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuotePanel } from '../components/quote/QuotePanel';
import { calculateQuote } from '../services/quote';
import { createQuoteFromProject } from '../services/documentLogic';
import { getCompanyProfile, getQuotes } from '../services/documentsStorage';
import { ClientModal } from '../components/documents/ClientModal';

export const HouseProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('id');

  const [projects, setProjects] = useState<HouseProject[]>([]);
  const [currentProject, setCurrentProject] = useState<HouseProject | null>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'steps' | 'quote'>('steps');

  // New Project Form
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSurface, setNewSurface] = useState('');

  // Editing Params Mode
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [editParams, setEditParams] = useState({ surface: '', perimeter: '', height: '' });

  // Official Quote Creation
  const [showClientModal, setShowClientModal] = useState(false);

  // ✅ Image de fond pour la carte “Créer un chantier”
  // Mets ton image dans /public/images/chantiers/creer-chantier.png (recommandé)
  const createCardImageSrc = '/images/chantiers/creer-chantier.png';
  // Si tu n’as pas encore l’image, tu peux mettre une image existante :
  // const createCardImageSrc = '/landing/hero-bg.png';

  useEffect(() => {
    const allProjects = getHouseProjects();
    setProjects(allProjects);

    // Sync URL with State
    if (projectIdFromUrl) {
      const p = allProjects.find((p) => p.id === projectIdFromUrl);
      if (p) setCurrentProject(p);
      else setSearchParams({}); // Reset if invalid ID
    } else {
      setCurrentProject(null);
    }
  }, [projectIdFromUrl, setSearchParams]);

  const selectProject = (p: HouseProject) => {
    setSearchParams({ id: p.id });
  };

  const closeProject = () => {
    setSearchParams({});
  };

  // Filter quotes for current project
  const projectQuotes = useMemo(() => {
    if (!currentProject) return [];
    return getQuotes()
      .filter((q) => q.projectId === currentProject.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentProject]);

  const handleCreate = () => {
    if (!newName) return;

    const surface = parseFloat(newSurface) || 100;

    const newProj: HouseProject = {
      id: generateId(),
      name: newName,
      date: new Date().toISOString(),
      params: {
        surfaceArea: surface,
        groundArea: surface, // Default to same
        perimeter: Math.sqrt(surface) * 4, // Rough estimation
        levels: 1,
        ceilingHeight: 2.5,
      },
      steps: {},
    };

    saveHouseProject(newProj);
    setProjects(getHouseProjects());
    selectProject(newProj);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce chantier ?')) {
      deleteHouseProject(id);
      setProjects(getHouseProjects());
      if (currentProject?.id === id) closeProject();
    }
  };

  const startEditParams = () => {
    if (!currentProject) return;

    setEditParams({
      surface: currentProject.params.surfaceArea.toString(),
      perimeter: currentProject.params.perimeter.toString(),
      height: currentProject.params.ceilingHeight.toString(),
    });
    setIsEditingParams(true);
  };

  const saveEditedParams = () => {
    if (!currentProject) return;

    const updated = { ...currentProject };
    updated.params.surfaceArea = parseFloat(editParams.surface) || 0;
    updated.params.perimeter = parseFloat(editParams.perimeter) || 0;
    updated.params.ceilingHeight = parseFloat(editParams.height) || 0;

    saveHouseProject(updated);
    setProjects(getHouseProjects());
    setCurrentProject(updated);
    setIsEditingParams(false);
  };

  const openStepCalculator = (stepId: ConstructionStepId, calcType: any) => {
    if (!currentProject || !calcType) return;
    navigate(`/app/calculator?calc=${calcType}&projectId=${currentProject.id}&stepId=${stepId}`);
  };

  const reloadProject = () => {
    const updated = getHouseProjects().find((p) => p.id === currentProject?.id);
    if (updated) setCurrentProject(updated);
  };

  // --- Official Quote Logic ---
  const handleStartOfficialQuote = () => {
    const profile = getCompanyProfile();
    if (!profile || !profile.name) {
      if (
        confirm(
          "Vous devez d'abord configurer votre profil entreprise dans les réglages. Y aller maintenant ?"
        )
      ) {
        navigate('/app/settings');
      }
      return;
    }
    setShowClientModal(true);
  };

  const generateOfficialQuote = (clientInfo: ClientInfo) => {
    if (!currentProject) return;
    const profile = getCompanyProfile();
    if (!profile) return;

    try {
      const computed = calculateQuote(currentProject);
      const quoteId = createQuoteFromProject(currentProject, computed, profile, clientInfo);
      setShowClientModal(false);
      navigate(`/app/quotes/${quoteId}`);
    } catch (e) {
      console.error('Erreur génération devis', e);
      alert('Une erreur est survenue lors de la création du devis.');
    }
  };

  // --- VIEW: PROJECT DASHBOARD ---
  if (currentProject) {
    const totalBudget = (Object.values(currentProject.steps) as any[]).reduce(
      (sum, s) => sum + (s?.cost || 0),
      0
    );

    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={closeProject}
              className="flex items-center text-slate-500 font-medium hover:text-blue-600"
            >
              <ArrowLeft size={20} className="mr-1" /> Retour
            </button>
            <div className="text-right">
              <h1 className="text-lg font-bold text-slate-800">{currentProject.name}</h1>
              <p className="text-xs text-slate-500">Budget Steps: {totalBudget.toFixed(0)} €</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-4 space-x-6 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('steps')}
              className={`py-3 text-sm font-bold flex items-center border-b-2 transition-colors ${
                activeTab === 'steps'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers size={18} className="mr-2" /> Étapes
            </button>
            <button
              onClick={() => setActiveTab('quote')}
              className={`py-3 text-sm font-bold flex items-center border-b-2 transition-colors ${
                activeTab === 'quote'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={18} className="mr-2" /> Devis
            </button>
          </div>
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="p-4">
          {/* Steps Tab */}
          {activeTab === 'steps' && (
            <>
              {/* Global Params Card */}
              {isEditingParams ? (
                <div className="bg-white rounded-xl shadow-md border-2 border-blue-100 p-4 mb-6 animate-in fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-blue-600 uppercase">
                      Modification Données
                    </h2>
                    <button onClick={() => setIsEditingParams(false)}>
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Surface (m²)
                      </label>
                      <input
                        type="number"
                        value={editParams.surface}
                        onChange={(e) =>
                          setEditParams({ ...editParams, surface: e.target.value })
                        }
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Périmètre (m)
                      </label>
                      <input
                        type="number"
                        value={editParams.perimeter}
                        onChange={(e) =>
                          setEditParams({ ...editParams, perimeter: e.target.value })
                        }
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        H. Sous Plafond (m)
                      </label>
                      <input
                        type="number"
                        value={editParams.height}
                        onChange={(e) => setEditParams({ ...editParams, height: e.target.value })}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                  </div>
                  <button
                    onClick={saveEditedParams}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm"
                  >
                    Valider
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6 relative group">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-sm font-bold text-slate-400 uppercase flex items-center">
                      <Ruler size={16} className="mr-2" /> Données Chantier
                    </h2>
                    <button
                      onClick={startEditParams}
                      className="p-1.5 bg-slate-50 text-slate-400 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-500 text-xs">Surface Habitable</span>
                      <span className="font-bold text-slate-800 text-lg">
                        {currentProject.params.surfaceArea} m²
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-xs">Périmètre</span>
                      <span className="font-bold text-slate-800 text-lg">
                        {currentProject.params.perimeter.toFixed(1)} m
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-xs">Hauteur plafond</span>
                      <span className="font-bold text-slate-800">
                        {currentProject.params.ceilingHeight} m
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-xs">Niveaux</span>
                      <span className="font-bold text-slate-800">
                        {currentProject.params.levels === 1
                          ? 'Plain-pied'
                          : `R+${currentProject.params.levels - 1}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps List */}
              <div className="space-y-6">
                {CONSTRUCTION_STEPS.map((group) => (
                  <div key={group.id}>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 px-1">{group.label}</h3>
                    <div className="space-y-2">
                      {group.steps.map((step) => {
                        const stepData = currentProject.steps[step.id];
                        const isDone = stepData?.status === 'done';
                        const Icon = step.icon;

                        return (
                          <button
                            key={step.id}
                            onClick={() => openStepCalculator(step.id, step.calc)}
                            disabled={!step.calc}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-white border-slate-200'
                            } ${
                              !step.calc
                                ? 'opacity-60 cursor-not-allowed'
                                : 'hover:border-blue-300 active:scale-[0.99]'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <Icon size={20} />
                              </div>
                              <div className="text-left">
                                <span
                                  className={`block font-medium ${
                                    isDone ? 'text-emerald-900' : 'text-slate-700'
                                  }`}
                                >
                                  {step.label}
                                </span>
                                {stepData && stepData.cost > 0 && (
                                  <span className="text-xs text-emerald-600 font-bold">
                                    {stepData.cost.toFixed(0)} €
                                  </span>
                                )}
                                {!step.calc && (
                                  <span className="text-[10px] text-slate-400">
                                    Bientôt disponible
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {isDone ? (
                                <CheckCircle2 size={20} className="text-emerald-500" />
                              ) : (
                                <Circle size={20} className="text-slate-300" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Quote Tab */}
          {activeTab === 'quote' && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              {/* 1. Official Documents */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center">
                    <FileCheck className="mr-2 text-emerald-600" size={20} /> Documents Officiels
                  </h3>
                  <button
                    onClick={handleStartOfficialQuote}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Générer Devis
                  </button>
                </div>

                {projectQuotes.length > 0 ? (
                  <div className="space-y-3">
                    {projectQuotes.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/app/quotes/${q.id}`)}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">{q.number}</span>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                q.status === 'draft'
                                  ? 'bg-slate-100 text-slate-500'
                                  : q.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : q.status === 'invoiced'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {q.status === 'draft'
                                ? 'Brouillon'
                                : q.status === 'invoiced'
                                ? 'Facturé'
                                : q.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(q.date).toLocaleDateString()} • {q.client.name}
                          </div>
                        </div>
                        <span className="font-bold text-slate-700">{q.totalTTC.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-sm">
                    Aucun document officiel créé.
                  </div>
                )}
              </section>

              <hr className="border-slate-200" />

              {/* 2. Estimator (Existing QuotePanel) */}
              <section>
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center">
                  <AlertTriangle className="mr-2 text-amber-500" size={20} /> Estimateur Rapide
                </h3>
                <QuotePanel project={currentProject} onUpdate={reloadProject} />
              </section>
            </div>
          )}
        </div>

        {/* --- MODAL CLIENT INFO --- */}
        <ClientModal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          onConfirm={generateOfficialQuote}
        />
      </div>
    );
  }

  // --- VIEW: LIST ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mes Chantiers</h1>

      {isCreating ? (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100 animate-in zoom-in-95">
          <h2 className="font-bold text-lg mb-4">Nouveau Chantier</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nom du projet</label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Maison Lotissement"
                className="w-full p-3 border rounded-lg bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Surface Habitable (m²)
              </label>
              <input
                type="number"
                value={newSurface}
                onChange={(e) => setNewSurface(e.target.value)}
                placeholder="100"
                className="w-full p-3 border rounded-lg bg-white text-slate-900"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-slate-500">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => selectProject(p)}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <Home size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500">
                    {p.params.surfaceArea} m² • {new Date(p.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>
                <ChevronRight className="text-slate-300" size={20} />
              </div>
            </div>
          ))}

          {/* ✅ Bouton “Créer un chantier” carré + centré */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsCreating(true)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform active:scale-[0.98] hover:shadow-md
                         w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]"
            >
              {/* Image */}
              <div className="absolute inset-0">
                <img
                  src={createCardImageSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {/* Lisibilité */}
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
              </div>

              {/* Contenu */}
              <div className="relative z-10 h-full w-full p-4 flex flex-col justify-end items-start text-left">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/90 border border-white/60 flex items-center justify-center shadow-sm">
                    <Plus className="text-blue-600" size={22} />
                  </div>
                  <div>
                    <div className="text-white font-extrabold text-base leading-tight">
                      Créer un chantier
                    </div>
                    <div className="text-white/80 text-xs font-semibold mt-0.5">
                      Nouveau projet
                    </div>
                  </div>
                </div>

                <div className="mt-3 w-full flex justify-end">
                  <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <ChevronRight className="text-white" size={18} />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
