import { useState, useCallback } from "react";
import { ModelPreference, ModelFilter } from "../components/ui/modals/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface UseModelPreferencesStateProps {
  initialFilter?: Partial<ModelFilter>;
}

export const useModelPreferencesState = ({
  initialFilter = {},
}: UseModelPreferencesStateProps = {}) => {
  const queryClient = useQueryClient();
  const [activeFilters, setActiveFilters] = useState<ModelFilter>({
    speed: null,
    pricing: null,
    imageSupport: false,
    vendor: null,
    ...initialFilter,
  });

  // Fetch model preferences
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery<ModelPreference[]>({
    queryKey: ["modelPreferences"],
    queryFn: async () => {
      // Replace with actual API call
      return [];
    },
  });

  // Update preferences mutation
  const { mutate: updatePreferences } = useMutation({
    mutationFn: async (newPreferences: Partial<ModelPreference>) => {
      // Replace with actual API call
      return newPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelPreferences"] });
    },
  });

  const toggleFilter = useCallback(
    (filterType: keyof ModelFilter, value: any) => {
      setActiveFilters((prev) => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value,
      }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setActiveFilters({
      speed: null,
      pricing: null,
      imageSupport: false,
      vendor: null,
    });
  }, []);

  const filteredPreferences = preferences?.filter((model) => {
    if (activeFilters.speed && model.speed !== activeFilters.speed)
      return false;
    if (activeFilters.pricing && model.pricing !== activeFilters.pricing)
      return false;
    if (activeFilters.imageSupport && !model.hasImageSupport) return false;
    if (activeFilters.vendor && model.vendor !== activeFilters.vendor)
      return false;
    return true;
  });

  return {
    preferences: filteredPreferences,
    isLoading,
    error,
    activeFilters,
    toggleFilter,
    resetFilters,
    updatePreferences,
  };
};
