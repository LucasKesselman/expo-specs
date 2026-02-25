import { useState, useEffect, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import type { SavedDesignWithId } from "@/lib/savedDesigns";
import { getSavedDesignsForUser, removeSavedDesign } from "@/lib/savedDesigns";
import type { DesignProduct } from "@/types/product";

/**
 * Loads and manages the current user's saved designs from Firestore. Call refresh
 * when the tab gains focus or on pull-to-refresh. Use on the account tab and marketplace.
 *
 * @param userId - Current user uid or null; when null, returns empty list and no loading.
 * @returns savedDesigns, loading, error, refresh, remove, addOptimistic, removingId
 */
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

  /**
   * Appends a saved design to state without a Firestore read. Use after saveDesign()
   * succeeds so the bookmark updates immediately (minimal queries).
   */
  const addOptimistic = useCallback(
    (product: DesignProduct, savedDesignId: string) => {
      setSavedDesigns((prev) => [
        ...prev,
        {
          id: savedDesignId,
          productId: product.productId,
          product,
          savedAt: Timestamp.now(),
        } as SavedDesignWithId,
      ]);
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { savedDesigns, loading, error, refresh, remove, addOptimistic, removingId };
}
