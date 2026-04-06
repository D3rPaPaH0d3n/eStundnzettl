// @ts-nocheck
import React, { useRef, useState, ChangeEvent } from "react";
import { User, Camera, Trash2 } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import toast from "react-hot-toast";
import { logger } from "../../utils/logger";
import { UserData } from "../../types";

interface ProfileSettingsProps {
  userData: UserData;
  setUserData: (data: UserData) => void;
  onOpenWorkCodeManager: () => void;
  onOpenDecimalPicker: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  userData, 
  setUserData,
  onOpenWorkCodeManager,
  onOpenDecimalPicker
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  const safeUserData = userData || {};

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result as string;
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
          if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Nur Bilder erlaubt");
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }
    
    setIsProcessingImg(true);
    try {
      const dataUrl = await processImage(file);
      setUserData({
        ...userData,
        photo: dataUrl,
      });
      toast.success("Profilbild aktualisiert");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error("Image processing failed:", error);
      toast.error("Bild konnte nicht verarbeitet werden");
      Haptics.impact({ style: ImpactStyle.Medium });
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setUserData({
      ...userData,
      photo: null,
    });
    toast.success("Profilbild entfernt");
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    setUserData({
      ...userData,
      [field]: value,
    });
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold text-lg mb-4">Profil</h3>
      
      {/* Photo */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {safeUserData.photo ? (
              <img 
                src={safeUserData.photo} 
                alt="Profil" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={32} className="text-zinc-400" />
            )}
          </div>
          
          <div className="absolute -bottom-1 -right-1 flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImg}
              className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              aria-label="Bild auswählen"
            >
              <Camera size={14} />
            </button>
            
            {safeUserData.photo && (
              <button
                onClick={handleRemovePhoto}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Bild entfernen"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <p className="text-sm text-zinc-500 mb-2">
            Profilbild (optional)
          </p>
          <p className="text-xs text-zinc-400">
            Wird in Berichten und PDFs angezeigt
          </p>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImagePick}
          accept="image/*"
          className="hidden"
        />
      </div>
      
      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Name
        </label>
        <input
          type="text"
          value={safeUserData.name || ""}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Max Mustermann"
          className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      
      {/* Company */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Firma
        </label>
        <input
          type="text"
          value={safeUserData.company || ""}
          onChange={(e) => handleInputChange("company", e.target.value)}
          placeholder="Muster GmbH"
          className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      
      {/* Role */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Position
        </label>
        <input
          type="text"
          value={safeUserData.role || ""}
          onChange={(e) => handleInputChange("role", e.target.value)}
          placeholder="Softwareentwickler"
          className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      
      {/* Work Code Manager Button */}
      <div className="mb-6">
        <button
          onClick={onOpenWorkCodeManager}
          className="w-full py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
        >
          Tätigkeiten verwalten
        </button>
        <p className="text-xs text-zinc-500 mt-2">
          Legen Sie Tätigkeits-Codes für Ihre Einträge an
        </p>
      </div>
      
      {/* Monthly Target */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Monatliches Stunden-Soll
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg">
            <div className="text-lg font-bold">
              {(safeUserData.monthlyTargetMinutes || 0) / 60} Stunden
            </div>
            <div className="text-sm text-zinc-500">
              {(safeUserData.monthlyTargetMinutes || 0)} Minuten
            </div>
          </div>
          <button
            onClick={onOpenDecimalPicker}
            className="px-4 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Ändern
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Wird für Überstunden-Berechnung verwendet
        </p>
      </div>
    </Card>
  );
};

export default ProfileSettings;