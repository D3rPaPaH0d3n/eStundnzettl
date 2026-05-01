import React, { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";

/**
 * CollapsibleCard — Standard-Karten-Wrapper mit klickbarem Kopf zum
 * Ein-/Ausklappen. Wird in Settings/* verwendet, um lange Listen
 * uebersichtlicher zu machen.
 *
 * Standardmaessig ist die Karte aufgeklappt; das Kollabieren persistiert
 * sich nicht — erkannte Use-Cases sind temporaer (User scrollt weiter).
 */

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Optionales rechts ausgerichtetes Header-Element (z.B. ein Master-Toggle). */
  headerExtra?: React.ReactNode;
  /** Initial aufgeklappt? Default: true. */
  defaultExpanded?: boolean;
  children: React.ReactNode;
  /** Padding der Body-Sektion. Default: "p-4 pt-0". */
  bodyClassName?: string;
}

const CollapsibleCard: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  headerExtra,
  defaultExpanded = true,
  children,
  bodyClassName = "p-4 pt-0",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const toggle = useCallback(() => {
    setIsExpanded((v) => !v);
    Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  return (
    <Card className="overflow-visible">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left select-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors rounded-xl"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon ? <div className="shrink-0">{icon}</div> : null}
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-800 dark:text-white truncate">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          <ChevronDown
            size={18}
            className={`text-zinc-400 transition-transform ${
              isExpanded ? "rotate-0" : "-rotate-90"
            }`}
          />
        </div>
      </button>
      {isExpanded ? <div className={bodyClassName}>{children}</div> : null}
    </Card>
  );
};

export default CollapsibleCard;
