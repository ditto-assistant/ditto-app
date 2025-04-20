# Hooks Usage Examples

## User Preferences

The `useUser` and `useUserPreferences` hooks allow you to access and update user preferences.

### Access User Preferences

```tsx
import { useUser } from "@/hooks/useUser";

function SettingsComponent() {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Current Settings</h2>
      <p>Theme: {user?.theme}</p>
      <p>Main Model: {user?.preferredMainModel}</p>
      <p>Programmer Model: {user?.preferredProgrammerModel}</p>
      <p>Image Model: {user?.preferredImageModel}</p>
    </div>
  );
}
```

### Update User Preferences

```tsx
import { useUserPreferences } from "@/hooks/useUserPreferences";

function ThemeSelector() {
  const { mutate: updatePreferences, isPending } = useUserPreferences();
  
  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    updatePreferences({ theme });
  };

  return (
    <div>
      <h3>Select Theme</h3>
      <button 
        onClick={() => handleThemeChange("light")} 
        disabled={isPending}
      >
        Light
      </button>
      <button 
        onClick={() => handleThemeChange("dark")} 
        disabled={isPending}
      >
        Dark
      </button>
      <button 
        onClick={() => handleThemeChange("system")} 
        disabled={isPending}
      >
        System
      </button>
    </div>
  );
}
```

### Update Model Preferences

```tsx
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { DEFAULT_MODELS } from "@/constants";

function ModelSelector() {
  const { mutate: updatePreferences, isPending } = useUserPreferences();
  
  const handleModelChange = (modelId: string) => {
    updatePreferences({ preferredMainModel: modelId });
  };

  return (
    <div>
      <h3>Select Default Model</h3>
      <select 
        onChange={(e) => handleModelChange(e.target.value)}
        disabled={isPending}
      >
        {DEFAULT_MODELS.map(model => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

The error handling is taken care of by the hook, which will show toast notifications for errors.