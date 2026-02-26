
import React, { useState, useMemo } from 'react';
import { HouseProject, QuoteManualLine, Unit } from '../../../types';
import { calculateQuote, generateQuoteCSV, ComputedQuote } from '../../services/quote';
import { saveHouseProject, generateId } from '../../services/storage';
import { Settings, Download, Plus, Trash2, ChevronDown, ChevronRight, Euro, Percent, FileText } from 'lucide-react';

interface Props {
  project: HouseProject;
  onUpdate: () => void;
}

export const QuotePanel: React.FC<Props> = ({ project, onUpdate }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showAddLine, setShowAddLine] = useState<string | null>(null); // section ID to add line to

  // Memoize calculation to avoid re-running on every render unless project changes
  const computed: ComputedQuote = useMemo(() => calculateQuote(project), [project]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateSettings = (newSettings: any) => {
    project.quote = {
      ...project.quote,
      settings: { ...project.quote?.settings, ...newSettings } as any,
      manualLines: project.quote?.manualLines || [],
      updatedAt: new Date().toISOString()
    };
    saveHouseProject(project);
    onUpdate();
  };

  const handleAddLine = (stepId: string, line: Partial<QuoteManualLine>) => {
    const newLine: QuoteManualLine = {
      id: generateId(),
      stepId,
      label: line.label || 'Nouvelle ligne',
      quantity: line.quantity || 1,
      unit: line.unit || Unit.PIECE,
      unitPrice: line.unitPrice || 0,
      category: line.category || 'material'
    };
    
    project.quote = {
      ...project.quote,
      settings: project.quote?.settings || { taxRate: 20, marginPercent: 0, discountAmount: 0, showLabor: true },
      manualLines: [...(project.quote?.manualLines || []), newLine],
      updatedAt: new Date().toISOString()
    };
    saveHouseProject(project);
    setShowAddLine(null);
    onUpdate();
  };

  const handleDeleteLine = (lineId: string) => {
    if (!project.quote) return;
    project.quote.manualLines = project.quote.manualLines.filter(l => l.id !== lineId);
    saveHouseProject(project);
    onUpdate();
  };

  const handleExport = () => {
    const csv = generateQuoteCSV(computed, project.name);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Devis_${project.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header / Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-lg font-bold text-slate-800">Devis Estimatif</h2>
            <p className="text-xs text-slate-500">Mis à jour instantanément</p>
         </div>
         <div className="flex space-x-2">
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}>
               <Settings size={20}/>
            </button>
            <button onClick={handleExport} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
               <Download size={20}/>
            </button>
         </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-blue-100 space-y-4">
           <h3 className="font-bold text-sm text-slate-700 uppercase">Paramètres du devis</h3>
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">TVA (%)</label>
                 <select 
                    value={project.quote?.settings?.taxRate ?? 20}
                    onChange={(e) => handleUpdateSettings({ taxRate: Number(e.target.value) })}
                    className="w-full p-2 border rounded bg-white text-slate-900"
                 >
                    <option value={20}>20% (Standard)</option>
                    <option value={10}>10% (Rénovation)</option>
                    <option value={5.5}>5.5% (Énergétique)</option>
                    <option value={0}>0% (Auto-entrepreneur)</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Marge (%)</label>
                 <div className="relative">
                    <input 
                      type="number" 
                      value={project.quote?.settings?.marginPercent ?? 0} 
                      onChange={(e) => handleUpdateSettings({ marginPercent: Number(e.target.value) })}
                      className="w-full p-2 pl-8 border rounded bg-white text-slate-900"
                    />
                    <Percent size={14} className="absolute left-2.5 top-3 text-slate-400"/>
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Remise (€)</label>
                 <div className="relative">
                    <input 
                      type="number" 
                      value={project.quote?.settings?.discountAmount ?? 0} 
                      onChange={(e) => handleUpdateSettings({ discountAmount: Number(e.target.value) })}
                      className="w-full p-2 pl-8 border rounded bg-white text-slate-900"
                    />
                    <Euro size={14} className="absolute left-2.5 top-3 text-slate-400"/>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white border-2 border-blue-600 text-slate-900 p-6 rounded-2xl shadow-lg relative overflow-hidden">
         <div className="grid grid-cols-2 gap-y-2 text-sm relative z-10">
            <span className="text-slate-500">Total Matériaux HT</span>
            <span className="text-right font-medium">{computed.totalMaterialsHT.toFixed(2)} €</span>
            
            <span className="text-slate-500">Total Main d'Œuvre HT</span>
            <span className="text-right font-medium">{computed.totalLaborHT.toFixed(2)} €</span>
            
            {(computed.marginAmount > 0) && (
               <>
               <span className="text-emerald-600">Marge ({project.quote?.settings?.marginPercent}%)</span>
               <span className="text-right font-medium text-emerald-600">+{computed.marginAmount.toFixed(2)} €</span>
               </>
            )}

            <div className="col-span-2 h-px bg-slate-100 my-2"></div>
            
            <span className="text-slate-700 font-bold">TOTAL HT</span>
            <span className="text-right font-bold text-lg">{computed.finalHT.toFixed(2)} €</span>
            
            <span className="text-slate-500">TVA ({project.quote?.settings?.taxRate ?? 20}%)</span>
            <span className="text-right">{computed.taxAmount.toFixed(2)} €</span>
            
            <div className="col-span-2 pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
               <span className="text-lg font-bold">NET À PAYER</span>
               <span className="text-3xl font-bold text-blue-600">{computed.totalTTC.toFixed(2)} €</span>
            </div>
         </div>
         <FileText className="absolute -bottom-4 -right-4 text-slate-100" size={120} />
      </div>

      {/* Breakdown by Section */}
      <div className="space-y-4">
         {computed.sections.map(section => (
            <div key={section.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
               <button 
                 onClick={() => toggleSection(section.id)}
                 className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
               >
                  <div className="flex items-center space-x-3">
                     {expandedSections[section.id] ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
                     <span className="font-bold text-slate-800">{section.label}</span>
                     <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{section.items.length}</span>
                  </div>
                  <span className="font-bold text-slate-700">{section.totalHT.toFixed(2)} €</span>
               </button>

               {expandedSections[section.id] && (
                  <div className="p-0">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                           <tr>
                              <th className="p-3 pl-4">Désignation</th>
                              <th className="p-3 text-center">Qté</th>
                              <th className="p-3 text-right">P.U.</th>
                              <th className="p-3 text-right pr-4">Total</th>
                              <th className="w-8"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {section.items.map((item, idx) => (
                              <tr key={`${section.id}-${idx}`} className={item.isManual ? "bg-amber-50/30" : ""}>
                                 <td className="p-3 pl-4">
                                    <div className="font-medium text-slate-800">{item.label}</div>
                                    {item.type === 'labor' && <span className="text-[10px] text-amber-600 bg-amber-100 px-1 rounded">Main d'œuvre</span>}
                                 </td>
                                 <td className="p-3 text-center text-slate-600">
                                    {item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span>
                                 </td>
                                 <td className="p-3 text-right text-slate-600">{item.unitPrice.toFixed(2)}</td>
                                 <td className="p-3 text-right font-medium text-slate-800 pr-4">{item.totalPrice.toFixed(2)}</td>
                                 <td className="p-3 text-center">
                                    {item.isManual && (
                                       <button onClick={() => handleDeleteLine(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                          <Trash2 size={16} />
                                       </button>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                     
                     {/* Add Line Form */}
                     <div className="p-3 bg-slate-50 border-t border-slate-100">
                        {showAddLine === section.id ? (
                           <AddLineForm 
                              onCancel={() => setShowAddLine(null)} 
                              onAdd={(line) => handleAddLine(section.id, line)} 
                           />
                        ) : (
                           <button onClick={() => setShowAddLine(section.id)} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800">
                              <Plus size={16} className="mr-1"/> Ajouter une ligne (MO, Location...)
                           </button>
                        )}
                     </div>
                  </div>
               )}
            </div>
         ))}

         {/* Empty State */}
         {computed.sections.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
               <p>Aucune donnée.</p>
               <p className="text-sm">Sauvegardez des calculs pour générer le devis.</p>
            </div>
         )}
         
         {/* Button to add Global Line if section list is empty or just always visible? */}
         <div className="flex justify-center">
             <button onClick={() => setShowAddLine('global')} className="flex items-center px-4 py-2 bg-white border border-slate-300 shadow-sm rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50">
                <Plus size={16} className="mr-2"/> Ajouter frais généraux
             </button>
         </div>
         {showAddLine === 'global' && (
             <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100">
                <h4 className="font-bold text-sm mb-3">Ajouter une ligne globale</h4>
                <AddLineForm 
                   onCancel={() => setShowAddLine(null)} 
                   onAdd={(line) => handleAddLine('global', line)} 
                />
             </div>
         )}
      </div>
    </div>
  );
};

const AddLineForm: React.FC<{ onCancel: () => void, onAdd: (l: any) => void }> = ({ onCancel, onAdd }) => {
   const [label, setLabel] = useState('');
   const [qty, setQty] = useState('');
   const [price, setPrice] = useState('');
   const [type, setType] = useState('labor');
   const [unit, setUnit] = useState(Unit.PIECE);

   const handleSubmit = () => {
      if (!label || !qty || !price) return;
      onAdd({
         label,
         quantity: parseFloat(qty),
         unitPrice: parseFloat(price),
         category: type,
         unit
      });
   };

   return (
      <div className="grid grid-cols-2 gap-3 animate-in fade-in">
         <div className="col-span-2">
            <input autoFocus type="text" placeholder="Désignation" value={label} onChange={e => setLabel(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm"/>
         </div>
         <div className="flex space-x-2">
            <input type="number" placeholder="Qté" value={qty} onChange={e => setQty(e.target.value)} className="w-20 p-2 border rounded bg-white text-slate-900 text-sm"/>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
               <option value={Unit.PIECE}>Unit</option>
               <option value={Unit.HOUR}>Heures</option>
               <option value={Unit.DAY}>Jours</option>
               <option value={Unit.PACKAGE}>Forfait</option>
               <option value={Unit.M2}>m²</option>
            </select>
         </div>
         <div className="flex space-x-2">
            <input type="number" placeholder="Prix Unitaire" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm"/>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
               <option value="labor">Main d'œuvre</option>
               <option value="material">Matériel</option>
               <option value="service">Service</option>
            </select>
         </div>
         <div className="col-span-2 flex justify-end space-x-2 mt-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-slate-500">Annuler</button>
            <button onClick={handleSubmit} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded">Valider</button>
         </div>
      </div>
   );
};
