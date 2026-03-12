import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CompanyProfile } from "../../types";
import { getCompanyProfile, saveCompanyProfile } from "../../services/documentsStorage";
import { Save, Building2, Upload, Trash2, Image as ImageIcon } from "lucide-react";

export const CompanyProfileForm: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const { t } = useTranslation();

  const [profile, setProfile] = useState<CompanyProfile>({
    name: "",
    address: "",
    city: "",
    zip: "",
    phone: "",
    email: "",
    siret: "",
    logoUrl: "",
    tvaNumber: "",
    footerNote: "",
  } as any);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = getCompanyProfile();
    if (existing) setProfile(existing);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert(
        t("company.logo_too_big", {
          defaultValue: "L'image est trop volumineuse (Max 500ko). Veuillez la réduire avant de l'importer.",
        })
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setProfile((prev) => ({ ...prev, logoUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanyProfile(profile);
    if (onSaved) onSaved();
    alert(t("company.saved", { defaultValue: "Informations entreprise et logo enregistrés." }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-extrabold text-slate-800 mb-4 flex items-center">
          <ImageIcon className="mr-2 text-blue-600" size={20} />
          {t("company.logo_title", { defaultValue: "Logo & identité visuelle" })}
        </h3>

        <div className="flex items-start gap-6">
          <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative group">
            {profile.logoUrl ? (
              <>
                <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={removeLogo} className="text-white p-2 hover:bg-red-500 rounded-full">
                    <Trash2 size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 p-2">
                <ImageIcon size={32} className="mx-auto mb-1 opacity-50" />
                <span className="text-[10px] font-medium">{t("company.no_logo", { defaultValue: "Aucun logo" })}</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">
              {t("company.logo_hint", {
                defaultValue:
                  "Ajoutez votre logo pour personnaliser vos devis et factures.",
              })}
              <br />
              <span className="text-xs text-slate-400">
                {t("company.logo_format", { defaultValue: "Format: JPG/PNG. Max 500 ko." })}
              </span>
            </p>

            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-extrabold hover:bg-slate-200 transition-colors"
            >
              <Upload size={16} className="mr-2" /> {t("company.upload_logo", { defaultValue: "Importer un logo" })}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-extrabold text-slate-800 mb-4 flex items-center">
          <Building2 className="mr-2 text-blue-600" size={20} />
          {t("company.details_title", { defaultValue: "Coordonnées entreprise" })}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.name", { defaultValue: "Nom / Raison sociale *" })}
            </label>
            <input required name="name" value={profile.name} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.siret", { defaultValue: "SIRET *" })}
            </label>
            <input required name="siret" value={profile.siret} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.address", { defaultValue: "Adresse" })}
            </label>
            <input name="address" value={profile.address} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.zip", { defaultValue: "Code postal" })}
            </label>
            <input name="zip" value={profile.zip} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.city", { defaultValue: "Ville" })}
            </label>
            <input name="city" value={profile.city} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.email", { defaultValue: "Email" })}
            </label>
            <input type="email" name="email" value={profile.email} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.phone", { defaultValue: "Téléphone" })}
            </label>
            <input name="phone" value={profile.phone} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("company.vat", { defaultValue: "N° TVA (optionnel)" })}
            </label>
            <input name="tvaNumber" value={(profile as any).tvaNumber || ""} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-slate-50 focus:bg-white transition-colors" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-extrabold text-slate-500 mb-1">
            {t("company.footer_note", { defaultValue: "Pied de page / Mentions / RIB" })}
          </label>
          <textarea
            name="footerNote"
            value={(profile as any).footerNote || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded text-sm h-24 bg-slate-50 focus:bg-white transition-colors"
            placeholder={t("company.footer_note_ph", { defaultValue: "Ex: IBAN: FR76... / Mentions..." })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-extrabold hover:bg-blue-700 shadow-md transition-all active:scale-95">
            <Save size={18} className="mr-2" /> {t("common.save", { defaultValue: "Enregistrer" })}
          </button>
        </div>
      </div>
    </form>
  );
};