import React from "react";
import { motion } from "framer-motion";
import { User, Camera, Upload, Building2, Lock } from "lucide-react";

/**
 * Onboarding-Schritt 1: Profildaten des Users.
 *
 * Pflichtfeld: Name. Firma und Tätigkeit sind optional. Das Foto wird
 * als Data-URL in formData.photo abgelegt; die Kompression übernimmt
 * das umgebende System via FileReader.
 */
const ProfileStep = ({ formData, setFormData, photoInputRef, onPhotoUpload }) => {
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
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Sag uns wer du bist</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Damit dein Stundenzettel auch deinen Namen trägt.</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
        <Lock size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          <span className="font-bold">Keine Sorge:</span> Dein Name, das Foto und alle
          weiteren Daten bleiben ausschließlich auf deinem Handy. Es geht nix raus, außer du willst's so.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div
            onClick={() => photoInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center cursor-pointer overflow-hidden relative group"
          >
            {formData.photo ? (
              <img src={formData.photo} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <Camera className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload size={20} className="text-white" />
            </div>
          </div>
          <span className="text-xs text-zinc-400">Profilbild (optional)</span>
          <input
            type="file"
            ref={photoInputRef}
            className="hidden"
            accept="image/*"
            onChange={onPhotoUpload}
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">
              Dein Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-bold text-zinc-900 dark:text-white"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">
              Firma
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full p-4 pl-12 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200"
                placeholder="Firmenname GmbH"
              />
              <Building2
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={20}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">
              Tätigkeit / Anstellung
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200"
              placeholder="z.B. Monteur, Techniker, Büro..."
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileStep;
