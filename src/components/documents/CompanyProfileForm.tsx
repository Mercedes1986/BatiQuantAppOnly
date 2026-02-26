
import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile } from '../../../types';
import { getCompanyProfile, saveCompanyProfile } from '../../services/documentsStorage';
import { Save, Building2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export const CompanyProfileForm: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '', address: '', city: '', zip: '', phone: '', email: '', siret: '', logoUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = getCompanyProfile();
    if (existing) setProfile(existing);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit size to avoid LocalStorage quota issues (max ~500KB)
      if (file.size > 500 * 1024) {
        alert("L'image est trop volumineuse (Max 500ko). Veuillez la réduire avant de l'importer.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setProfile(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanyProfile(profile);
    if (onSaved) onSaved();
    alert('Informations entreprise et logo enregistrés.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
      
      {/* Logo Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
          <ImageIcon className="mr-2 text-blue-600" size={20}/>
          Logo & Identité Visuelle
        </h3>
        
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative group">
            {profile.logoUrl ? (
              <>
                <img src={profile.logoUrl} alt="Logo Entreprise" className="w-full h-full object-contain p-2"/>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <button type="button" onClick={removeLogo} className="text-white p-2 hover:bg-red-500 rounded-full">
                      <Trash2 size={20}/>
                   </button>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 p-2">
                <ImageIcon size={32} className="mx-auto mb-1 opacity-50"/>
                <span className="text-[10px] font-medium">Aucun logo</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">
              Ajoutez votre logo pour personnaliser vos devis et factures. 
              <br/><span className="text-xs text-slate-400">Format: JPG ou PNG. Max 500 ko.</span>
            </p>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*" 
              onChange={handleLogoUpload} 
              className="hidden"
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              <Upload size={16} className="mr-2"/> Importer un logo
            </button>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
          <Building2 className="mr-2 text-blue-600" size={20}/>
          Coordonnées Entreprise
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nom / Raison Sociale *</label>
            <input required name="name" value={profile.name} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">SIRET *</label>
            <input required name="siret" value={profile.siret} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
            <input name="address" value={profile.address} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Code Postal</label>
            <input name="zip" value={profile.zip} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Ville</label>
            <input name="city" value={profile.city} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
            <input type="email" name="email" value={profile.email} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
            <input name="phone" value={profile.phone} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">N° TVA (Optionnel)</label>
            <input name="tvaNumber" value={profile.tvaNumber || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors"/>
          </div>
        </div>

        <div className="mt-4">
           <label className="block text-xs font-bold text-slate-500 mb-1">Pied de page / Mentions légales / RIB</label>
           <textarea name="footerNote" value={profile.footerNote || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm h-24 bg-slate-50 focus:bg-white transition-colors" placeholder="Ex: Dispensé d'immatriculation... IBAN: FR76..."/>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95">
            <Save size={18} className="mr-2"/> Enregistrer les modifications
          </button>
        </div>
      </div>
    </form>
  );
};
