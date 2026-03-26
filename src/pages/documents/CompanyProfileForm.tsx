import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Save,
  Building2,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

import { CompanyProfile } from "../../types";
import { getCompanyProfile, saveCompanyProfile } from "../../services/documentsStorage";

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
    terms: "",
  } as CompanyProfile);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = getCompanyProfile();
    if (existing) {
      setProfile({
        ...existing,
        footerNote: existing.footerNote || "",
        terms: existing.terms || "",
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center font-extrabold text-slate-800">
          <ImageIcon className="mr-2 text-blue-600" size={20} />
          {t("company.logo_title", { defaultValue: "Logo & identité visuelle" })}
        </h3>

        <div className="flex items-start gap-6">
          <div className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
            {profile.logoUrl ? (
              <>
                <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={removeLogo} className="rounded-full p-2 text-white hover:bg-red-500">
                    <Trash2 size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="p-2 text-center text-slate-400">
                <ImageIcon size={32} className="mx-auto mb-1 opacity-50" />
                <span className="text-[10px] font-medium">
                  {t("company.no_logo", { defaultValue: "Aucun logo" })}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="mb-3 text-sm text-slate-600">
              {t("company.logo_hint", {
                defaultValue: "Ajoutez votre logo pour personnaliser vos devis et factures.",
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
              className="flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Upload size={16} className="mr-2" />
              {t("company.upload_logo", { defaultValue: "Importer un logo" })}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center font-extrabold text-slate-800">
          <Building2 className="mr-2 text-blue-600" size={20} />
          {t("company.details_title", { defaultValue: "Coordonnées entreprise" })}
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.name", { defaultValue: "Nom / Raison sociale *" })}
            </label>
            <input required name="name" value={profile.name} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.siret", { defaultValue: "SIRET *" })}
            </label>
            <input required name="siret" value={profile.siret} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.address", { defaultValue: "Adresse" })}
            </label>
            <input name="address" value={profile.address} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.zip", { defaultValue: "Code postal" })}
            </label>
            <input name="zip" value={profile.zip} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.city", { defaultValue: "Ville" })}
            </label>
            <input name="city" value={profile.city} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.email", { defaultValue: "Email" })}
            </label>
            <input type="email" name="email" value={profile.email} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.phone", { defaultValue: "Téléphone" })}
            </label>
            <input name="phone" value={profile.phone} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-500">
              {t("company.vat", { defaultValue: "N° TVA (optionnel)" })}
            </label>
            <input name="tvaNumber" value={profile.tvaNumber || ""} onChange={handleChange} className="w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white" />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-extrabold text-slate-500">
            {t("company.footer_note", { defaultValue: "Pied de page / Mentions / RIB" })}
          </label>
          <textarea
            name="footerNote"
            value={profile.footerNote || ""}
            onChange={handleChange}
            className="h-24 w-full rounded border bg-slate-50 p-2 text-sm transition-colors focus:bg-white"
            placeholder={t("company.footer_note_ph", { defaultValue: "Ex: IBAN: FR76... / Mentions..." })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center font-extrabold text-slate-800">
          <FileText className="mr-2 text-blue-600" size={20} />
          {t("company.terms_title", { defaultValue: "Conditions générales des devis" })}
        </h3>

        <p className="mb-3 text-sm text-slate-600">
          {t("company.terms_hint", {
            defaultValue: "Ce texte sera ajouté automatiquement à la fin des devis et factures imprimés.",
          })}
        </p>

        <label className="mb-1 block text-xs font-extrabold text-slate-500">
          {t("company.terms", { defaultValue: "Conditions générales" })}
        </label>
        <textarea
          name="terms"
          value={profile.terms || ""}
          onChange={handleChange}
          className="min-h-[180px] w-full rounded border bg-slate-50 p-3 text-sm transition-colors focus:bg-white"
          placeholder={t("company.terms_ph", {
            defaultValue:
              "Ex: Devis valable 30 jours. Acompte de 30% à la commande. Solde à la réception des travaux. Délais donnés à titre indicatif sous réserve des approvisionnements. Toute prestation complémentaire fera l'objet d'un avenant.",
          })}
        />

        <div className="mt-6 flex justify-end">
          <button type="submit" className="flex items-center rounded-xl bg-blue-600 px-6 py-3 font-extrabold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95">
            <Save size={18} className="mr-2" />
            {t("common.save", { defaultValue: "Enregistrer" })}
          </button>
        </div>
      </div>
    </form>
  );
};
