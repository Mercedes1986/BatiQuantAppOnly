
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuote, saveQuote, deleteQuote, getCompanyProfile } from '../../services/documentsStorage';
import { convertQuoteToInvoice, recalculateTotals } from '../../services/documentLogic';
import { QuoteDocument, DocumentLine, CompanyProfile } from '../../types';
import { ArrowLeft, Save, Printer, Trash2, FileText, Mail, Phone, MapPin, Building2 } from 'lucide-react';

export const QuoteEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteDocument | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (id) {
      const q = getQuote(id);
      if (q) setQuote(q);
      else navigate('/app/house');
      
      setCompany(getCompanyProfile());
    }
  }, [id, navigate]);

  if (!quote) return <div className="p-10 text-center text-slate-500">Chargement...</div>;

  const handleSave = () => {
    const updated = recalculateTotals(quote) as QuoteDocument;
    saveQuote(updated);
    setQuote(updated);
    // Visual feedback
    const btn = document.getElementById('save-btn');
    if(btn) { btn.classList.add('bg-green-100', 'text-green-700'); setTimeout(() => btn.classList.remove('bg-green-100', 'text-green-700'), 1000); }
  };

  const handlePrint = () => {
    handleSave(); // Auto save
    navigate(`/app/print/quote/${quote.id}`);
  };

  const handleDelete = () => {
    if (confirm('Supprimer définitivement ce devis ?')) {
      deleteQuote(quote.id);
      navigate(-1);
    }
  };

  const handleConvertToInvoice = () => {
    if (confirm('Créer une facture à partir de ce devis ?')) {
      handleSave();
      const invoiceId = convertQuoteToInvoice(quote.id);
      if (invoiceId) navigate(`/app/invoices/${invoiceId}`);
    }
  };

  const updateLine = (lineId: string, field: keyof DocumentLine, val: any) => {
    const newLines = quote.lines.map(l => l.id === lineId ? { ...l, [field]: val } : l);
    setQuote({ ...quote, lines: newLines });
  };

  const deleteLine = (lineId: string) => {
    setQuote({ ...quote, lines: quote.lines.filter(l => l.id !== lineId) });
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
               <h1 className="text-lg font-bold text-slate-800 flex items-center">{quote.number}</h1>
               <p className="text-xs text-slate-500">{company?.name || 'Mon Entreprise'} &bull; {new Date(quote.date).toLocaleDateString()}</p>
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
        
        {/* Actions Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide text-[10px]">État du document</span>
            <select 
              value={quote.status} 
              onChange={e => setQuote({...quote, status: e.target.value as any})}
              className="bg-slate-100 border-none rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="accepted">Accepté</option>
              <option value="rejected">Refusé</option>
              <option value="invoiced">Facturé</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            {quote.status === 'accepted' && (
              <button onClick={handleConvertToInvoice} className="flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">
                <FileText size={16} className="mr-1"/> Convertir en Facture
              </button>
            )}
            <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20}/></button>
          </div>
        </div>

        {/* Client Info Edit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase flex items-center">
             <Building2 className="mr-2 text-blue-600" size={18}/> Informations Client
          </h3>
          <div className="space-y-3">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom / Raison Sociale</label>
                   <input 
                     value={quote.client.name} 
                     onChange={e => setQuote({...quote, client: {...quote.client, name: e.target.value}})}
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
                           value={quote.client.phone || ''} 
                           onChange={e => setQuote({...quote, client: {...quote.client, phone: e.target.value}})}
                           className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                           placeholder="Téléphone"
                         />
                      </div>
                      <div className="relative">
                         <Mail size={14} className="absolute left-3 top-3 text-slate-400"/>
                         <input 
                           value={quote.client.email || ''} 
                           onChange={e => setQuote({...quote, client: {...quote.client, email: e.target.value}})}
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
                        value={quote.client.address} 
                        onChange={e => setQuote({...quote, client: {...quote.client, address: e.target.value}})}
                        className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                        placeholder="N° et Rue"
                      />
                   </div>
                   <input 
                     value={quote.client.zip} 
                     onChange={e => setQuote({...quote, client: {...quote.client, zip: e.target.value}})}
                     className="p-2.5 border border-slate-300 rounded-lg text-sm w-24 text-center"
                     placeholder="CP"
                   />
                   <input 
                     value={quote.client.city} 
                     onChange={e => setQuote({...quote, client: {...quote.client, city: e.target.value}})}
                     className="p-2.5 border border-slate-300 rounded-lg text-sm flex-1"
                     placeholder="Ville"
                   />
                </div>
             </div>
          </div>
        </div>

        {/* Lines Editor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6 w-[50%]">Désignation</th>
                <th className="p-4 w-[15%] text-center">Qté</th>
                <th className="p-4 w-[15%] text-right">P.U.</th>
                <th className="p-4 w-[15%] text-right">Total</th>
                <th className="w-[5%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lines.map(line => (
                <tr key={line.id} className="hover:bg-blue-50/30 group transition-colors">
                  <td className="p-2 pl-4">
                    <input 
                      value={line.description} 
                      onChange={e => updateLine(line.id, 'description', e.target.value)}
                      className={`w-full bg-transparent outline-none rounded p-2 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all ${line.unitPrice === 0 ? 'font-bold text-slate-800 mt-2 uppercase text-xs tracking-wider' : 'text-slate-700'}`} 
                    />
                  </td>
                  <td className="p-2">
                    {line.unitPrice !== 0 && (
                      <input 
                        type="number" 
                        value={line.quantity} 
                        onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value))}
                        className="w-full text-center bg-transparent outline-none rounded p-2 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </td>
                  <td className="p-2">
                    {line.unitPrice !== 0 && (
                      <input 
                        type="number" 
                        value={line.unitPrice} 
                        onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value))}
                        className="w-full text-right bg-transparent outline-none rounded p-2 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800">
                    {line.unitPrice !== 0 ? (line.quantity * line.unitPrice).toFixed(2) : ''}
                  </td>
                  <td className="p-2 text-center">
                    <button onClick={() => deleteLine(line.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col items-end gap-1">
             <div className="flex justify-between w-64 text-sm text-slate-500">
                <span>Total HT</span>
                <span className="font-medium text-slate-700">{quote.totalHT.toFixed(2)} €</span>
             </div>
             <div className="flex justify-between w-64 text-sm text-slate-500">
                <span>TVA ({(quote.totalVAT/quote.totalHT*100 || 0).toFixed(1)}%)</span>
                <span className="font-medium text-slate-700">{quote.totalVAT.toFixed(2)} €</span>
             </div>
             <div className="flex justify-between w-64 text-xl font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
                <span>Total TTC</span>
                <span className="text-blue-600">{quote.totalTTC.toFixed(2)} €</span>
             </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-700 mb-2 text-xs uppercase tracking-wide">Notes & Conditions de paiement</h3>
           <textarea 
             value={quote.notes || ''} 
             onChange={e => setQuote({...quote, notes: e.target.value})}
             className="w-full p-3 border border-slate-200 rounded-lg text-sm min-h-[100px] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-300"
             placeholder="Ex: Acompte de 30% à la commande..."
           />
        </div>

      </div>
    </div>
  );
};
