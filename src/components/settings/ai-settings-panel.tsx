import { useState } from 'react'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AiSettingsPanelProps {
  apiKey: string
  onApiKeyChange: (key: string) => void
  autoCategorizOnImport: boolean
  onAutoCategorizChange: (enabled: boolean) => void
}

export function AiSettingsPanel({
  apiKey,
  onApiKeyChange,
  autoCategorizOnImport,
  onAutoCategorizChange,
}: AiSettingsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempKey, setTempKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    onApiKeyChange(tempKey)
    setIsEditing(false)
    setTempKey('')
    setShowKey(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempKey('')
    setShowKey(false)
  }

  const handleStartEditing = () => {
    setTempKey(apiKey)
    setIsEditing(true)
  }

  const handleRemove = () => {
    onApiKeyChange('')
    setIsEditing(false)
    setTempKey('')
    setShowKey(false)
  }

  const maskApiKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 8) return '••••••••'
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`
  }

  return (
    <div className="space-y-4">
      {/* API Key Section */}
      <div className="space-y-2">
        <Label>Claude API Key (Optional)</Label>
        <p className="text-xs text-muted-foreground">
          Enable AI-powered categorization.{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Get your API key
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        {isEditing ? (
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!tempKey} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        ) : apiKey ? (
          <div className="space-y-2">
            <div className="bg-muted px-3 py-2 rounded text-sm font-mono">
              {maskApiKey(apiKey)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleStartEditing} className="flex-1">
                Change
              </Button>
              <Button
                variant="outline"
                onClick={handleRemove}
                className="flex-1 text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={handleStartEditing} className="w-full">
            Add API Key
          </Button>
        )}
      </div>

      {/* Auto-Categorize Toggle */}
      {apiKey && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-categorize on import</Label>
              <p className="text-xs text-muted-foreground">
                Automatically categorize transactions when importing from CSV or Plaid
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAutoCategorizChange(!autoCategorizOnImport)}
              className={autoCategorizOnImport ? 'bg-green-100' : ''}
            >
              {autoCategorizOnImport ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2 border-t">
        Your API key is stored locally in your browser and never sent to our servers.
      </p>
    </div>
  )
}
