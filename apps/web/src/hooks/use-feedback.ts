"use client";

import { useCallback, useState } from "react";
import { errorMessage } from "../lib/api";

/**
 * Messages d'erreur / de succès et indicateur d'action en cours,
 * partagés par les actions de l'espace de travail.
 */
export function useFeedback() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  /** Exécute une action : gère busy, efface l'erreur, affiche le succès ou l'erreur. */
  const run = useCallback(
    async (action: () => Promise<void>, fallbackError: string, successMessage?: string) => {
      setBusy(true);
      setError("");
      try {
        await action();
        if (successMessage) setSuccess(successMessage);
        return true;
      } catch (e) {
        setError(errorMessage(e, fallbackError));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  return { error, setError, success, setSuccess, busy, run, clear };
}

export type Feedback = ReturnType<typeof useFeedback>;
