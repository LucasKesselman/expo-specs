import { useState, useEffect, useCallback } from "react";
import type { SavedDesignWithId } from "@/lib/savedDesigns";
import { getSavedDesignsForUser, removeSavedDesign } from "@/lib/savedDesigns";

export function useSavedDesigns(userId: string | null) {
  const [savedDesigns, setSavedDesigns] = useState<SavedDesignWithId[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSavedDesigns([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getSavedDesignsForUser(userId);
      setSavedDesigns(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved designs.");
      setSavedDesigns([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const remove = useCallback(
    async (savedDesignId: string) => {
      if (!userId) return;
      setRemovingId(savedDesignId);
      try {
        await removeSavedDesign(userId, savedDesignId);
        setSavedDesigns((prev) => prev.filter((item) => item.id !== savedDesignId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove design.");
      } finally {
        setRemovingId(null);
      }
    },
    [userId]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { savedDesigns, loading, error, refresh, remove, removingId };
}
