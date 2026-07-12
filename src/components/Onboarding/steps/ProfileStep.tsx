import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Camera, Upload, Building2, Lock, Target } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import type { WizardFormData } from "../../OnboardingWizard";
import { formatMonthlyTargetInput, parseMonthlyTargetInput } from "../../../utils/monthlyTarget";
import MonthlyTargetInput from "../../MonthlyTargetInput";

/**
 * Onboarding-Schritt 1: Profildaten des Users.
 *
 * Pflichtfeld: Name. Firma und Tätigkeit sind optional. Das Foto wird
 * als Data-URL in formData.photo abgelegt; die Kompression übernimmt
 * das umgebende System via FileReader.
 */

interface Props {
  formData: WizardFormData;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileStep: React.FC<Props> = ({ formData, setFormData, photoInputRef, onPhotoUpload }) => {
  const { t } = useTranslation();
  const monthlyTargetEnabled = formData.monthlyTargetMinutes !== undefined;
  const [monthlyTargetValue, setMonthlyTargetValue] = useState(
    () => formatMonthlyTargetInput(formData.monthlyTargetMinutes) || "30:00",
  );

  const updateMonthlyTarget = (value: string) => {
    setMonthlyTargetValue(value);
    const parsed = parseMonthlyTargetInput(value);
    setFormData((previous) => ({
      ...previous,
      monthlyTargetMinutes: parsed ?? 0,
    }));
  };
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("onboarding.profile.title")}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t("onboarding.profile.subtitle")}</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
        <Lock size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          <Trans i18nKey="onboarding.profile.privacyHint" components={{ b: <span className="font-bold" /> }} />
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center cursor-pointer overflow-hidden relative group"
            aria-label={t("onboarding.profile.photoLabel")}
          >
            {formData.photo ? (
              <img src={formData.photo} alt={t("onboarding.profile.photoAlt")} className="w-full h-full object-cover" />
            ) : (
              <Camera className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload size={20} className="text-white" />
            </div>
          </button>
          <span className="text-xs text-zinc-400">{t("onboarding.profile.photoLabel")}</span>
          <input
            type="file"
            ref={photoInputRef}
            className="hidden"
            accept="image/*"
            onChange={onPhotoUpload}
          />
        </div>

        {formData.simpleMode && (
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={monthlyTargetEnabled}
                onChange={(event) => setFormData((previous) => ({
                  ...previous,
                  monthlyTargetMinutes: event.target.checked
                    ? (parseMonthlyTargetInput(monthlyTargetValue) ?? 1800)
                    : undefined,
                }))}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span>
                <span className="flex items-center gap-2 font-bold text-sm text-zinc-800 dark:text-white">
                  <Target size={16} className="text-emerald-600" />
                  {t("onboarding.profile.monthlyTarget.title")}
                </span>
                <span className="block mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t("onboarding.profile.monthlyTarget.description")}
                </span>
              </span>
            </label>
            {monthlyTargetEnabled && (
              <div>
                <div className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                  {t("onboarding.profile.monthlyTarget.inputLabel")}
                </div>
                <MonthlyTargetInput
                  idPrefix="onboarding-monthly-target"
                  value={monthlyTargetValue}
                  onChange={updateMonthlyTarget}
                  invalid={formData.monthlyTargetMinutes === 0}
                  describedBy="onboarding-monthly-target-hint"
                />
                <p
                  id="onboarding-monthly-target-hint"
                  aria-live="polite"
                  className={`mt-1 text-xs ${formData.monthlyTargetMinutes === 0 ? "text-red-600" : "text-zinc-500"}`}
                >
                  {formData.monthlyTargetMinutes === 0
                    ? t("onboarding.profile.monthlyTarget.invalid")
                    : t("onboarding.profile.monthlyTarget.hint")}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="onboarding-profile-name" className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">
              {t("onboarding.profile.nameLabel")}
            </label>
            <input
              id="onboarding-profile-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-bold text-zinc-900 dark:text-white"
              placeholder={t("onboarding.profile.namePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="onboarding-profile-company" className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">
              {t("onboarding.profile.companyLabel")}
            </label>
            <div className="relative">
              <input
                id="onboarding-profile-company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full p-4 pl-12 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200"
                placeholder={t("onboarding.profile.companyPlaceholder")}
              />
              <Building2
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={20}
              />
            </div>
          </div>

          <div>
            <label htmlFor="onboarding-profile-role" className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">
              {t("onboarding.profile.roleLabel")}
            </label>
            <input
              id="onboarding-profile-role"
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200"
              placeholder={t("onboarding.profile.rolePlaceholder")}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileStep;
