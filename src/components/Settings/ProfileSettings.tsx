import React, { useRef, useState } from "react";
import { User, Camera, Trash2 } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import toast from "react-hot-toast";
import { logger } from "../../utils/logger";

import type { UserData } from "../../types";

interface Props {
  userData: UserData & { company?: string };
  setUserData: (data: any) => void;
}

const ProfileSettings: React.FC<Props> = ({ userData, setUserData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  const safeUserData = userData || {};

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    try {
      const compressedBase64 = await processImage(file);
      setUserData({ ...userData, photo: compressedBase64 });
      toast.success("Profilbild aktualisiert");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
      logger.error(err);
      toast.error("Fehler beim Bild");
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.impact({ style: ImpactStyle.Medium });
    const newData = { ...userData };
    delete newData.photo;
    setUserData(newData);
    toast.success("Bild entfernt");
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-700 pb-4">
        <div className="relative group shrink-0">
          <div
            onClick={() => !isProcessingImg && fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-transparent hover:border-emerald-500 transition-all shadow-inner relative"
          >
            {isProcessingImg ? (
              <div className="animate-spin text-emerald-500">⟳</div>
            ) : safeUserData.photo ? (
              <img src={safeUserData.photo} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-zinc-400 dark:text-zinc-500" />
            )}
            {!isProcessingImg && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          {safeUserData.photo && !isProcessingImg && (
            <button
              onClick={removePhoto}
              className="absolute -bottom-1 -right-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform border border-white dark:border-zinc-800"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg dark:text-white truncate">Benutzerdaten</h3>
          <p className="text-xs text-zinc-400">Tippe auf das Bild, um es zu ändern.</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Dein Name</label>
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 mt-1 focus-within:border-emerald-500 transition-colors">
            <User size={18} className="text-zinc-400" />
            <input
              type="text"
              value={safeUserData.name || ""}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              className="w-full bg-transparent font-bold text-zinc-800 dark:text-white outline-none"
              placeholder="Max Mustermann"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Firma</label>
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 mt-1 focus-within:border-emerald-500 transition-colors">
            <svg width="18" height="18" className="text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>
            <input
              type="text"
              value={safeUserData.company || ""}
              onChange={(e) => setUserData({ ...userData, company: e.target.value })}
              className="w-full bg-transparent font-bold text-zinc-800 dark:text-white outline-none"
              placeholder="Firmenname GmbH"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Position / Job</label>
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 mt-1 focus-within:border-emerald-500 transition-colors">
            <svg width="18" height="18" className="text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            <input
              type="text"
              value={safeUserData.position || ""}
              onChange={(e) => setUserData({ ...userData, position: e.target.value })}
              className="w-full bg-transparent font-bold text-zinc-800 dark:text-white outline-none"
              placeholder="Monteur"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileSettings;
