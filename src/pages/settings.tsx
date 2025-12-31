import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaidLinkButton, LinkedInstitutions, ImportTransactionsDialog } from '@/components/plaid'
import { sheetsClient } from '@/lib/sheets-client'
import { plaidClient } from '@/lib/plaid-client'
import { usePlaidHealth } from '@/hooks/use-plaid'
import { SHEET_NAMES, SHEET_COLUMNS, DEFAULT_CATEGORIES, STORAGE_KEYS } from '@/lib/constants'
import { generateId } from '@/lib/utils'
import { CheckCircle, XCircle, Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react'

type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'error'
type InitStatus = 'idle' | 'initializing' | 'success' | 'error'

export function SettingsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [isChangingSheet, setIsChangingSheet] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [initStatus, setInitStatus] = useState<InitStatus>('idle')
  const [initError, setInitError] = useState<string | null>(null)
  const [sheetsStatus, setSheetsStatus] = useState<{
    initialized: boolean
    missingSheets: string[]
  }>({ initialized: false, missingSheets: [] })

  // Plaid state
  const [plaidServerUrl, setPlaidServerUrl] = useState(plaidClient.getServerUrl())
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const { data: plaidHealth, isLoading: plaidLoading, error: plaidError, refetch: refetchPlaidHealth } = usePlaidHealth()

  const checkConnection = async (id: string) => {
    setConnectionStatus('checking')
    setConnectionError(null)

    try {
      sheetsClient.setSpreadsheetId(id)
      await sheetsClient.health()
      const sheets = await sheetsClient.listSheets()
      const sheetNames = sheets.map((s) => s.title)
      const requiredSheets = Object.values(SHEET_NAMES)
      const missingSheets = requiredSheets.filter(
        (name) => !sheetNames.includes(name)
      )

      setSheetsStatus({
        initialized: missingSheets.length === 0,
        missingSheets,
      })
      setConnectionStatus('connected')
      setIsChangingSheet(false)
    } catch (error) {
      setConnectionStatus('error')
      setConnectionError(
        error instanceof Error ? error.message : 'Connection failed'
      )
    }
  }

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID)
    if (savedId) {
      setSpreadsheetId(savedId)
      setInputValue(savedId)
      checkConnection(savedId)
    }
  }, [])

  const handlePlaidServerUrlChange = (url: string) => {
    setPlaidServerUrl(url)
    plaidClient.setServerUrl(url)
    refetchPlaidHealth()
  }

  const extractSpreadsheetId = (input: string): string => {
    // Handle full Google Sheets URL
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      return match[1]
    }
    return input.trim()
  }

  const handleInputChange = (value: string) => {
    const id = extractSpreadsheetId(value)
    setInputValue(id)
  }

  const handleTestConnection = async () => {
    if (!inputValue) return
    setSpreadsheetId(inputValue)
    await checkConnection(inputValue)
  }

  const handleChangeSheet = () => {
    setIsChangingSheet(true)
    setInputValue(spreadsheetId)
  }

  const handleCancelChange = () => {
    setIsChangingSheet(false)
    setInputValue(spreadsheetId)
  }

  const handleInitializeSheets = async () => {
    setInitStatus('initializing')
    setInitError(null)

    try {
      // Get existing sheets
      const existingSheets = await sheetsClient.listSheets()
      const existingNames = existingSheets.map((s) => s.title)

      // Create missing sheets
      for (const [key, name] of Object.entries(SHEET_NAMES)) {
        if (!existingNames.includes(name)) {
          await sheetsClient.createSheet(name)

          // Initialize with headers by creating a placeholder row
          const columns = SHEET_COLUMNS[key as keyof typeof SHEET_COLUMNS]
          const headerRow = columns.reduce(
            (acc, col) => {
              acc[col] = ''
              return acc
            },
            {} as Record<string, string>
          )

          const result = await sheetsClient.createRow(name, headerRow)
          // Delete the placeholder row (keeps headers)
          if (result?.rowIndex) {
            await sheetsClient.deleteRow(name, result.rowIndex)
          }
        }
      }

      // Seed default categories if Categories sheet is empty
      const categories = await sheetsClient.categories().getRows()
      if (categories.length === 0) {
        const now = new Date().toISOString()
        for (const cat of DEFAULT_CATEGORIES) {
          await sheetsClient.categories().createRow({
            id: generateId(),
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            budget_amount: '',
            is_active: 'true',
            created_at: now,
            updated_at: now,
          })
        }
      }

      setSheetsStatus({ initialized: true, missingSheets: [] })
      setInitStatus('success')
    } catch (error) {
      setInitStatus('error')
      setInitError(
        error instanceof Error ? error.message : 'Initialization failed'
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      {/* Spreadsheet Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Connection</CardTitle>
          <CardDescription>
            Connect to your Google Sheets spreadsheet to store budget data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show connected state */}
          {connectionStatus === 'connected' && !isChangingSheet ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Sheet
                  </a>
                  <Button variant="outline" size="sm" onClick={handleChangeSheet}>
                    Change
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded truncate">
                {spreadsheetId}
              </div>

              {!sheetsStatus.initialized && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Missing sheets: {sheetsStatus.missingSheets.join(', ')}
                    </span>
                  </div>
                  <Button
                    onClick={handleInitializeSheets}
                    disabled={initStatus === 'initializing'}
                    variant="outline"
                    className="w-full"
                  >
                    {initStatus === 'initializing' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      'Initialize Sheets'
                    )}
                  </Button>
                </div>
              )}

              {initStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Sheets initialized with default categories!
                  </span>
                </div>
              )}

              {initError && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{initError}</span>
                </div>
              )}
            </div>
          ) : (
            /* Show input for new connection or when changing */
            <div className="space-y-2">
              <label className="text-sm font-medium">Spreadsheet ID or URL</label>
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Paste spreadsheet URL or ID"
                  className="flex-1"
                />
                <Button
                  onClick={handleTestConnection}
                  disabled={!inputValue || connectionStatus === 'checking'}
                >
                  {connectionStatus === 'checking' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </Button>
                {isChangingSheet && (
                  <Button variant="outline" onClick={handleCancelChange}>
                    Cancel
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                You can paste the full Google Sheets URL or just the spreadsheet
                ID.
              </p>

              {connectionStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600 pt-2">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{connectionError}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plaid Bank Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Connection (Plaid)</CardTitle>
          <CardDescription>
            Connect your bank accounts to automatically import transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server URL Configuration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Plaid Server URL</label>
            <div className="flex gap-2">
              <Input
                value={plaidServerUrl}
                onChange={(e) => setPlaidServerUrl(e.target.value)}
                onBlur={() => handlePlaidServerUrlChange(plaidServerUrl)}
                placeholder="http://localhost:3001"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => refetchPlaidHealth()}
                disabled={plaidLoading}
              >
                {plaidLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              URL of the Plaid backend server. Run <code className="bg-muted px-1 rounded">node server/plaid-server.js</code> to start it.
            </p>
          </div>

          {/* Connection Status */}
          {plaidHealth && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">
                Connected to Plaid server ({plaidHealth.env} environment)
              </span>
            </div>
          )}

          {plaidError && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                Cannot connect to Plaid server. Make sure it's running.
              </span>
            </div>
          )}

          {/* Link Bank / Import */}
          {plaidHealth && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Linked Banks</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <PlaidLinkButton onSuccess={() => refetchPlaidHealth()} />
                </div>
              </div>
              <LinkedInstitutions />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Google Sheets Setup</h4>
            <ol className="space-y-1 text-sm list-decimal list-inside">
              <li>Create a new Google Sheet</li>
              <li>
                Share it with:{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  sheets-db-api@kinetic-object-322814.iam.gserviceaccount.com
                </code>
              </li>
              <li>Give the service account "Editor" access</li>
              <li>Copy the spreadsheet URL and paste it above</li>
              <li>Click "Test" to verify the connection</li>
              <li>Click "Initialize Sheets" to create the required tabs</li>
            </ol>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Plaid Setup (Optional)</h4>
            <ol className="space-y-1 text-sm list-decimal list-inside">
              <li>Create a Plaid developer account at <code className="bg-muted px-1 rounded">dashboard.plaid.com</code></li>
              <li>Copy <code className="bg-muted px-1 rounded">server/.env.example</code> to <code className="bg-muted px-1 rounded">server/.env</code></li>
              <li>Add your Plaid credentials to the .env file</li>
              <li>Run <code className="bg-muted px-1 rounded">node server/plaid-server.js</code></li>
              <li>Click "Connect Bank" above to link your accounts</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ImportTransactionsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  )
}
