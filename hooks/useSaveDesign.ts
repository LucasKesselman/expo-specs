import { useState, useCallback } from "react";
import { useAuthState } from "@/hooks/useAuth";
import { saveDesignForUser } from "@/lib/savedDesigns";
import type { DesignProduct } from "@/types/product";

type SaveDesignResult = { success: true } | { success: false; error: string };

export function useSaveDesign() {
  const user = useAuthState();
  const [saving, setSaving] = useState(false);

  const saveDesign = useCallback(
    async (product: DesignProduct): Promise<SaveDesignResult> => {
      if (!user) {
        return { success: false, error: "You must be logged in to save designs." };
      }
      setSaving(true);
      try {
        await saveDesignForUser(user.uid, product);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save design.";
        return { success: false, error: message };
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  return { saveDesign, saving, isLoggedIn: !!user };
}
