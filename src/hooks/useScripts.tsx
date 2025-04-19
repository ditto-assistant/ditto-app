import React, { createContext, useContext, ReactNode } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  saveScriptToFirestore,
  deleteScriptFromFirestore,
  renameScriptInFirestore,
  getVersionsOfScriptFromFirestore,
  syncLocalScriptsWithFirestore,
  getScriptTimestamps
} from "../control/firebase"
import { useAuth } from "./useAuth"
import { useCallback, useState } from "react"

// Create context with default values
const ScriptsContext = createContext<ScriptsManagerReturnType | null>(null)

interface ScriptsProviderProps {
  children: ReactNode
}

/**
 * Provider component for scripts management
 * This wraps the useScriptsManager hook to share state across components
 */
export function ScriptsProvider({ children }: ScriptsProviderProps) {
  const scriptsManager = useScriptsManager()

  return (
    <ScriptsContext.Provider value={scriptsManager}>
      {children}
    </ScriptsContext.Provider>
  )
}

/**
 * Hook to access the scripts context
 * @returns {ScriptsManagerReturnType} Methods and data for script management
 */
export function useScripts(): ScriptsManagerReturnType {
  const context = useContext(ScriptsContext)

  if (context === null) {
    throw new Error("useScripts must be used within a ScriptsProvider")
  }

  return context
}

// Define types for scripts
export interface ScriptObject {
  id: string
  name: string
  content: string
  contents?: string // Some places use content, others use contents
  scriptType: ScriptType
  timestamp?: any
  timestampString?: string
}

export type ScriptType = "webApps" | "openSCAD"

export interface SelectedScriptInfo {
  script: string
  contents: string
  scriptType: ScriptType
}

export interface TimestampInfo {
  timestamp: any
  timestampString: string
}

export interface ScriptsState {
  webApps: ScriptObject[]
  openSCAD: ScriptObject[]
}

export interface TimestampsState {
  [key: string]: TimestampInfo
}

export interface ScriptsManagerReturnType {
  // Data
  scripts: ScriptsState
  webAppsScripts: ScriptObject[]
  openSCADScripts: ScriptObject[]
  webAppsTimestamps: TimestampsState
  openSCADTimestamps: TimestampsState
  scriptVersions: ScriptObject[]
  selectedScript: SelectedScriptInfo | null

  // Data manipulation methods
  setSelectedScript: (
    script: ScriptObject | Partial<SelectedScriptInfo> | null
  ) => void
  handleDeselectScript: () => void
  saveScript: (
    content: string,
    scriptType: ScriptType,
    name: string
  ) => Promise<void>
  deleteScript: (scriptType: ScriptType, name: string) => Promise<void>
  renameScript: (
    timestampString: string,
    scriptType: ScriptType,
    oldName: string,
    newName: string
  ) => Promise<void>
  revertScript: (scriptType: ScriptType, name: string) => Promise<void>
  refreshScripts: () => void

  // Loading states
  isLoading: boolean
  isSaving: boolean
  isDeleting: boolean
  isRenaming: boolean
}

/**
 * Hook to manage scripts in the application
 *
 * @returns {ScriptsManagerReturnType} Methods and data for script management
 */
function useScriptsManager(): ScriptsManagerReturnType {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.uid
  const [selectedScript, setSelectedScriptLocal] =
    useState<SelectedScriptInfo | null>(null)

  // Fetch web apps scripts
  const { data: webAppsScripts = [], isLoading: isLoadingWebApps } = useQuery({
    queryKey: ["scripts", userId, "webApps"],
    queryFn: async () => {
      if (!userId) return []
      return syncLocalScriptsWithFirestore(userId, "webApps")
    },
    enabled: !!userId,
    staleTime: 30000 // 30 seconds
  })

  // Fetch OpenSCAD scripts
  const { data: openSCADScripts = [], isLoading: isLoadingOpenSCAD } = useQuery(
    {
      queryKey: ["scripts", userId, "openSCAD"],
      queryFn: async () => {
        if (!userId) return []
        return syncLocalScriptsWithFirestore(userId, "openSCAD")
      },
      enabled: !!userId,
      staleTime: 30000 // 30 seconds
    }
  )

  // Fetch timestamps for scripts
  const { data: webAppsTimestamps = {} } = useQuery({
    queryKey: ["scriptTimestamps", userId, "webApps"],
    queryFn: async () => {
      if (!userId) return {}
      return getScriptTimestamps(userId, "webApps")
    },
    enabled: !!userId,
    staleTime: 30000 // 30 seconds
  })

  const { data: openSCADTimestamps = {} } = useQuery({
    queryKey: ["scriptTimestamps", userId, "openSCAD"],
    queryFn: async () => {
      if (!userId) return {}
      return getScriptTimestamps(userId, "openSCAD")
    },
    enabled: !!userId,
    staleTime: 30000 // 30 seconds
  })

  const { data: scriptVersions = [] } = useQuery({
    queryKey: [
      "scriptVersions",
      userId,
      selectedScript?.scriptType,
      selectedScript?.script
    ],
    queryFn: () => {
      if (!userId || !selectedScript?.scriptType || !selectedScript?.script)
        return []
      return getVersionsOfScriptFromFirestore(
        userId,
        selectedScript?.scriptType,
        selectedScript?.script
      )
    },
    enabled:
      !!userId && !!selectedScript?.scriptType && !!selectedScript?.script,
    staleTime: 60000 // 1 minute
  })

  // Mutation for saving a script
  const saveScriptMutation = useMutation({
    mutationFn: ({
      content,
      scriptType,
      name
    }: {
      content: string
      scriptType: ScriptType
      name: string
    }) => saveScriptToFirestore(userId, content, scriptType, name),
    onSuccess: (_, variables) => {
      refreshScriptQueries(variables.scriptType)
    }
  })

  // Mutation for deleting a script
  const deleteScriptMutation = useMutation({
    mutationFn: ({
      scriptType,
      name
    }: {
      scriptType: ScriptType
      name: string
    }) => deleteScriptFromFirestore(userId, scriptType, name),
    onSuccess: (_, variables) => {
      // If we delete the currently selected script, deselect it
      if (
        selectedScript?.script === variables.name &&
        selectedScript?.scriptType === variables.scriptType
      ) {
        handleDeselectScript()
      }
      refreshScriptQueries(variables.scriptType)
    }
  })

  // Mutation for renaming a script
  const renameScriptMutation = useMutation({
    mutationFn: ({
      timestampString,
      scriptType,
      oldName,
      newName
    }: {
      timestampString: string
      scriptType: ScriptType
      oldName: string
      newName: string
    }) =>
      renameScriptInFirestore(
        userId,
        timestampString,
        scriptType,
        oldName,
        newName
      ),
    onSuccess: (_, variables) => {
      // If we rename the currently selected script, update its name
      if (
        selectedScript?.script === variables.oldName &&
        selectedScript?.scriptType === variables.scriptType
      ) {
        setSelectedScriptLocal({
          ...selectedScript,
          script: variables.newName
        })
      }
      refreshScriptQueries(variables.scriptType)
    }
  })

  const handleDeselectScript = useCallback(() => {
    setSelectedScriptLocal(null)
  }, [])

  // Mutations for script reversion
  const revertScriptMutation = useMutation({
    mutationFn: ({
      scriptType,
      name
    }: {
      scriptType: ScriptType
      name: string
    }) => deleteScriptFromFirestore(userId, scriptType, name),
    onSuccess: (_, variables) => {
      // If we revert the currently selected script, deselect it
      if (
        selectedScript?.script === variables.name &&
        selectedScript?.scriptType === variables.scriptType
      ) {
        handleDeselectScript()
      }
      refreshScriptQueries(variables.scriptType)
    }
  })

  // Function to set the selected script (replaces localStorage)
  const setSelectedScript = useCallback(
    (script: ScriptObject | Partial<SelectedScriptInfo> | null) => {
      if (script) {
        // Update local state with consistent property naming
        if ("name" in script && script.name) {
          // Handle ScriptObject format
          setSelectedScriptLocal({
            script: script.name,
            contents: script.content || script.contents || "",
            scriptType: script.scriptType
          })
        } else if ("script" in script && script.script) {
          // Handle SelectedScriptInfo format
          setSelectedScriptLocal({
            script: script.script,
            contents: script.contents || "",
            scriptType: script.scriptType || "webApps"
          })
        }
      } else {
        setSelectedScriptLocal(null)
      }
    },
    []
  )

  const refreshScriptQueries = useCallback(
    (scriptType?: ScriptType) => {
      if (userId) {
        if (scriptType) {
          // Invalidate specific script type queries
          queryClient.invalidateQueries({
            queryKey: ["scripts", userId, scriptType]
          })
          queryClient.invalidateQueries({
            queryKey: ["scriptTimestamps", userId, scriptType]
          })
          if (selectedScript?.scriptType === scriptType) {
            queryClient.invalidateQueries({
              queryKey: [
                "scriptVersions",
                userId,
                selectedScript.scriptType,
                selectedScript.script
              ]
            })
          }
        } else {
          // Invalidate all script-related queries
          queryClient.invalidateQueries({
            queryKey: ["scripts", userId]
          })
          queryClient.invalidateQueries({
            queryKey: ["scriptTimestamps", userId]
          })
        }
      }
    },
    [userId, queryClient, selectedScript]
  )

  // Function to refresh all scripts data
  const refreshScripts = useCallback(() => {
    refreshScriptQueries()
  }, [refreshScriptQueries])

  // Combine scripts into a single object to match the old API
  const scripts: ScriptsState = {
    webApps: webAppsScripts,
    openSCAD: openSCADScripts
  }

  return {
    // Data
    scripts,
    webAppsScripts,
    openSCADScripts,
    webAppsTimestamps,
    openSCADTimestamps,
    scriptVersions,
    selectedScript,

    // Data manipulation methods
    setSelectedScript,
    handleDeselectScript,
    saveScript: (content, scriptType, name) =>
      saveScriptMutation.mutateAsync({ content, scriptType, name }),
    deleteScript: (scriptType, name) =>
      deleteScriptMutation.mutateAsync({ scriptType, name }),
    renameScript: (timestampString, scriptType, oldName, newName) =>
      renameScriptMutation.mutateAsync({
        timestampString,
        scriptType,
        oldName,
        newName
      }),
    revertScript: (scriptType, name) =>
      revertScriptMutation.mutateAsync({ scriptType, name }),
    refreshScripts,

    // Loading states
    isLoading: isLoadingWebApps || isLoadingOpenSCAD,
    isSaving: saveScriptMutation.isPending,
    isDeleting: deleteScriptMutation.isPending,
    isRenaming: renameScriptMutation.isPending
  }
}
