import React from "react";
import { motion } from "framer-motion";
import { User, Camera, Building2, Lock } from "lucide-react";

interface ProfileStepProps {
  formData: any;
  setFormData: (data: any) => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Onboarding-Schritt 1: Profildaten des Users.
 *
 * Pflichtfeld: Name. Firma und Tätigkeit sind optional. Das Foto wird
 * als Data-URL in formData.photo abgelegt; die Kompression übernimmt
 * das umgebende System via FileReader.
 */
const ProfileStep: React.FC<ProfileStepProps> = ({ formData, setFormData, photoInputRef, onPhotoUpload }) => {
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
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Deine Profildaten werden nur lokal gespeichert und erscheinen in deinen PDF-Berichten.
        </p>
      </div>

      {/* Foto */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {formData.photo ? (
              <img
                src={formData.photo}
                alt="Profil"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={32} className="text-zinc-400" />
            )}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
            aria-label="Foto auswählen"
          >
            <Camera size={14} />
          </button>
        </div>
        <div className="flex-1">
          <p className="text-sm text-zinc-500">
            Profilbild (optional)
          </p>
          <p className="text-xs text-zinc-400">
            Wird in Berichten und PDFs angezeigt
          </p>
        </div>
        <input
          type="file"
          ref={photoInputRef}
          onChange={onPhotoUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Name *
        </label>
        <input
          type="text"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Max Mustermann"
          className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
          required
        />
      </div>

      {/* Firma */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Firma (optional)
        </label>
        <div className="relative">
          <Building2 size={18} className="absolute left-3 top-3.5 text-zinc-400" />
          <input
            type="text"
            value={formData.company || ""}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Muster GmbH"
            className="w-full p-3 pl-10 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Tätigkeit */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Tätigkeit (optional)
        </label>
        <input
          type="text"
          value={formData.role || ""}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="Softwareentwickler"
          className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Du kannst diese Angaben später jederzeit in den Einstellungen ändern.
        </p>
      </div>
    </motion.div>
  );
};

export default ProfileStep;