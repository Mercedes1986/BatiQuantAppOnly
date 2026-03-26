import React from "react";
import { ArrowLeft, FileText, HardDrive, Shield, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const goBackSafely = (navigate: ReturnType<typeof useNavigate>) => {
  if (window.history.length > 1) {
    navigate(-1);
    return;
  }

  navigate("/app/settings", { replace: true });
};

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections = [
    {
      icon: HardDrive,
      title: t("support_pages.help.sections.backup.title"),
      body: t("support_pages.help.sections.backup.body"),
    },
    {
      icon: Shield,
      title: t("support_pages.help.sections.privacy.title"),
      body: t("support_pages.help.sections.privacy.body"),
    },
    {
      icon: FileText,
      title: t("support_pages.help.sections.documents.title"),
      body: t("support_pages.help.sections.documents.body"),
    },
    {
      icon: Smartphone,
      title: t("support_pages.help.sections.mobile.title"),
      body: t("support_pages.help.sections.mobile.body"),
    },
  ];

  return (
    <div className="app-shell app-shell--settings min-h-full bg-transparent p-4 safe-bottom-offset">
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md md:p-6">
          <button
            type="button"
            onClick={() => goBackSafely(navigate)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </button>

          <div className="mt-4 flex items-start gap-3">
           <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
  <FileText size={22} />
</div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{t("support_pages.help.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {t("support_pages.help.subtitle")}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {sections.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default HelpPage;
