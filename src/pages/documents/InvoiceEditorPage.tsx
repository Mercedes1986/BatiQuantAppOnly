
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, saveInvoice, getCompanyProfile } from '../../services/documentsStorage';
import { recalculateTotals } from '../../services/documentLogic';
import { InvoiceDocument, DocumentLine, CompanyProfile } from '../../types';
import { ArrowLeft, Save, Printer, Phone, Mail, MapPin, Building2 } from 'lucide-react';

export const InvoiceEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDocument | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (id) {
      const doc = getInvoice(id);
      if (doc) setInvoice(doc);
      else navigate('/app/house');
      
      setCompany(getCompanyProfile());
    }
  }, [id, navigate]);

  if (!invoice) return <div className="p-10 text-center">Chargement...</div>;

  const handleSave = () => {
    const updated = recalculateTotals(invoice) as InvoiceDocument;
    saveInvoice(updated);
    setInvoice(updated);
    
    const btn = document.getElementById('save-btn');
    if(btn) { btn.classList.add('bg-green-100', 'text-green-700'); setTimeout(() => btn.classList.remove('bg-green-100', 'text-green-700'), 1000); }
  };

  const handlePrint = () => {
    handleSave();
    navigate(`/app/print/invoice/${invoice.id}`);
  };

  const updateLine = (lineId: string, field: keyof DocumentLine, val: any) => {
    const newLines = invoice.lines.map(l => l.id === lineId ? { ...l, [field]: val } : l);
    setInvoice({ ...invoice, lines: newLines });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-colors"><ArrowLeft size={20}/></button>
          <div className="flex items-center">
             {company?.logoUrl && <img src={company.logoUrl} alt="Logo" className="h-8 w-8 object-contain mr-3 rounded border border-slate-100" />}
             <div>
               <h1 className="text-lg font-bold text-slate-800 flex items-center">{invoice.number}</h1>
               <p className="text-xs text-slate-500">{company?.name || 'Mon Entreprise'} &bull; {new Date(invoice.date).toLocaleDateString()}</p>
             </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button id="save-btn" onClick={handleSave} className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-bold text-sm">
             <Save size={18} className="mr-2"/> Sauvegarder
          </button>
          <button onClick={handlePrint} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-md">
             <Printer size={20}/>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Status Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide text-[10px]">Statut</span>
            <select 
              value={invoice.status} 
              onChange={e => setInvoice({...invoice, status: e.target.value as any})}
              className="bg-slate-100 border-none rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="paid">Payée</option>
              <option value="late">En retard</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-slate-500 uppercase">Date Paiement</span>
             <input type="date" value={invoice.paymentDate || ''} onChange={e => setInvoice({...invoice, paymentDate: e.target.value})} className="border border-slate-300 rounded-lg p-1.5 text-sm"/>
          </div>
        </div>

        {/* Client Info Edit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase flex items-center">
             <Building2 className="mr-2 text-emerald-600" size={18}/> Informations Client
          </h3>
          <div className="space-y-3">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom / Raison Sociale</label>
                   <input 
                     value={invoice.client.name} 
                     onChange={e => setInvoice({...invoice, client: {...invoice.client, name: e.target.value}})}
                     className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white transition-colors"
                     placeholder="Ex: M. Dupont"
                   />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Contact</label>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                         <Phone size={14} className="absolute left-3 top-3 text-slate-400"/>
                         <input 
                           value={invoice.client.phone || ''} 
                           onChange={e => setInvoice({...invoice, client: {...invoice.client, phone: e.target.value}})}
                           className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                           placeholder="Téléphone"
                         />
                      </div>
                      <div className="relative">
                         <Mail size={14} className="absolute left-3 top-3 text-slate-400"/>
                         <input 
                           value={invoice.client.email || ''} 
                           onChange={e => setInvoice({...invoice, client: {...invoice.client, email: e.target.value}})}
                           className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                           placeholder="Email"
                         />
                      </div>
                   </div>
                </div>
             </div>
             
             <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Adresse Complète</label>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <MapPin size={14} className="absolute left-3 top-3 text-slate-400"/>
                      <input 
                        value={invoice.client.address} 
                        onChange={e => setInvoice({...invoice, client: {...invoice.client, address: e.target.value}})}
                        className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                        placeholder="N° et Rue"
                      />
                   </div>
                   <input 
                     value={invoice.client.zip} 
                     onChange={e => setInvoice({...invoice, client: {...invoice.client, zip: e.target.value}})}
                     className="p-2.5 border border-slate-300 rounded-lg text-sm w-24 text-center"
                     placeholder="CP"
                   />
                   <input 
                     value={invoice.client.city} 
                     onChange={e => setInvoice({...invoice, client: {...invoice.client, city: e.target.value}})}
                     className="p-2.5 border border-slate-300 rounded-lg text-sm flex-1"
                     placeholder="Ville"
                   />
                </div>
             </div>
          </div>
        </div>

        {/* Lines View */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6 w-[50%]">Désignation</th>
                <th className="p-4 w-[15%] text-center">Qté</th>
                <th className="p-4 w-[15%] text-right">P.U.</th>
                <th className="p-4 w-[15%] text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map(line => (
                <tr key={line.id}>
                  <td className="p-2 pl-4">
                    <span className={`block ${line.unitPrice === 0 ? 'font-bold mt-2 uppercase text-xs tracking-wider text-slate-800' : 'text-slate-700'}`}>{line.description}</span>
                  </td>
                  <td className="p-2">
                    {line.unitPrice !== 0 && (
                      <input 
                        type="number" 
                        value={line.quantity} 
                        onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value))}
                        className="w-full text-center bg-slate-50 rounded border border-transparent hover:border-blue-200 p-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </td>
                  <td className="p-2 text-right text-slate-600">
                    {line.unitPrice !== 0 && line.unitPrice.toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800">
                    {line.unitPrice !== 0 ? (line.quantity * line.unitPrice).toFixed(2) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col items-end gap-1">
             <div className="flex justify-between w-64 text-sm text-slate-500">
                <span>Total HT</span>
                <span className="font-medium text-slate-700">{invoice.totalHT.toFixed(2)} €</span>
             </div>
             <div className="flex justify-between w-64 text-sm text-slate-500">
                <span>TVA ({(invoice.totalVAT/invoice.totalHT*100 || 0).toFixed(1)}%)</span>
                <span className="font-medium text-slate-700">{invoice.totalVAT.toFixed(2)} €</span>
             </div>
             <div className="flex justify-between w-64 text-xl font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
                <span>Total TTC</span>
                <span className="text-blue-600">{invoice.totalTTC.toFixed(2)} €</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
