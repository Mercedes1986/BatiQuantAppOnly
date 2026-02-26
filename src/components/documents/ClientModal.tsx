
import React, { useState, useEffect } from 'react';
import { ClientInfo } from '../../../types';
import { X, User, MapPin, Phone, Mail } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (client: ClientInfo) => void;
}

export const ClientModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const [client, setClient] = useState<ClientInfo>({ name: '', address: '', zip: '', city: '', email: '', phone: '' });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setClient({ name: '', address: '', zip: '', city: '', email: '', phone: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(client);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Nouveau Devis</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Client / Raison Sociale *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                required
                placeholder="Ex: M. Dupont" 
                value={client.name} 
                onChange={e => setClient({...client, name: e.target.value})}
                className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Téléphone</label>
               <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <input 
                    type="tel" 
                    placeholder="06..." 
                    value={client.phone || ''} 
                    onChange={e => setClient({...client, phone: e.target.value})}
                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email</label>
               <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <input 
                    type="email" 
                    placeholder="@" 
                    value={client.email || ''} 
                    onChange={e => setClient({...client, email: e.target.value})}
                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Adresse</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                placeholder="1 rue de la Paix" 
                value={client.address} 
                onChange={e => setClient({...client, address: e.target.value})}
                className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1/3">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">CP</label>
              <input 
                type="text" 
                placeholder="75000" 
                value={client.zip} 
                onChange={e => setClient({...client, zip: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ville</label>
              <input 
                type="text" 
                placeholder="Paris" 
                value={client.city} 
                onChange={e => setClient({...client, city: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Annuler</button>
            <button 
              type="submit"
              disabled={!client.name}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Générer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
