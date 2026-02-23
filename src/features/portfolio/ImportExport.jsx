import { useRef, useState } from 'react';
import { z } from 'zod';
import {
  Download, CheckCircle, AlertCircle, FileJson,
  CloudUpload, CloudDownload, LogIn, LogOut, Cloud, Loader,
} from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';

// ---------------------------------------------------------------------------
// Validation schema for imported files
// ---------------------------------------------------------------------------

const assetImportSchema = z.object({
  id:           z.number(),
  symbol:       z.string(),
  name:         z.string(),
  // Accept any string so custom markets (e.g. 'LSE') round-trip correctly.
  market:       z.string(),
  currency:     z.string(),
  amount:       z.number(),
  avgPrice:     z.number(),
  currentPrice: z.number(),
  group:        z.string().optional(),
});

const snapshotImportSchema = z.object({
  date:     z.string(),
  totalUSD: z.number(),
});

const marketImportSchema = z.object({
  id:       z.string(),
  name:     z.string(),
  currency: z.string(),
  builtIn:  z.boolean().optional(),
});

const importFileSchema = z.object({
  version:         z.number(),
  exportedAt:      z.string(),
  assets:          z.array(assetImportSchema),
  snapshots:       z.array(snapshotImportSchema),
  displayCurrency: z.string(),
  markets:         z.array(marketImportSchema).optional(),
});

// ---------------------------------------------------------------------------
// Export helper
// ---------------------------------------------------------------------------

/**
 * Builds the full portfolio export payload from store state.
 * @param {{ assets: Array, snapshots: Array, displayCurrency: string, markets: Array }} state
 * @returns {object}
 */
const buildExportPayload = (state) => ({
  version:         1,
  exportedAt:      new Date().toISOString(),
  assets:          state.assets,
  snapshots:       state.snapshots,
  displayCurrency: state.displayCurrency,
  markets:         state.markets,
});

/**
 * Serialises current store state and triggers a file download.
 * @param {{ assets: Array, snapshots: Array, displayCurrency: string, markets: Array }} state
 */
const triggerExport = (state) => {
  const payload = buildExportPayload(state);

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `portfolio-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Shared validation helper
// ---------------------------------------------------------------------------

/**
 * Validates a parsed JSON object against the import schema and calls importData.
 * Returns null on success, or an error string on failure.
 * @param {unknown} raw
 * @param {(data: object) => void} importData
 * @returns {string | null}
 */
function validateAndImport(raw, importData) {
  const result = importFileSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.errors[0]?.message ?? 'Invalid file format.';
    return `Validation failed: ${msg}`;
  }
  const { assets, snapshots, displayCurrency, markets } = result.data;
  importData({ assets, snapshots, displayCurrency, markets });
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal with Export / Import / Google Drive Sync controls.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
const ImportExport = ({ isOpen, onClose }) => {
  const assets          = usePortfolioStore((s) => s.assets);
  const snapshots       = usePortfolioStore((s) => s.snapshots);
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);
  const markets         = usePortfolioStore((s) => s.markets);
  const importData      = usePortfolioStore((s) => s.importData);

  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null); // null | 'success' | { error: string }

  const {
    isConnected,
    userInfo,
    driveStatus,
    clearDriveStatus,
    signIn,
    signOut,
    saveToDrive,
    loadFromDrive,
  } = useGoogleDrive();

  const handleExport = () => {
    triggerExport({ assets, snapshots, displayCurrency, markets });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw   = JSON.parse(ev.target.result);
        const error = validateAndImport(raw, importData);
        setImportStatus(error ? { error } : 'success');
      } catch {
        setImportStatus({ error: 'Could not parse the file. Make sure it is a valid JSON backup.' });
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
  };

  const handleSaveToDrive = () => {
    saveToDrive(buildExportPayload({ assets, snapshots, displayCurrency, markets }));
  };

  const handleLoadFromDrive = async () => {
    const content = await loadFromDrive();
    if (!content) return;
    try {
      const raw   = JSON.parse(content);
      const error = validateAndImport(raw, importData);
      if (error) {
        // Override the success status set by loadFromDrive
        clearDriveStatus();
        // Re-set via the hook is not possible directly; surface via importStatus instead
        setImportStatus({ error });
      }
    } catch {
      setImportStatus({ error: 'Could not parse the Drive backup. The file may be corrupted.' });
    }
  };

  const handleClose = () => {
    setImportStatus(null);
    clearDriveStatus();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Backup & Sync" size="md">
      <div className="flex flex-col gap-5">

        {/* Export section */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Export</p>
          <p className="text-sm text-zinc-400">
            Download a JSON backup of your entire portfolio — assets, history snapshots, and display settings.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExport}
            disabled={assets.length === 0}
            className="w-full justify-center"
          >
            <Download size={14} />
            Download Backup
            {assets.length > 0 && (
              <span className="ml-auto text-xs text-zinc-500">
                {assets.length} asset{assets.length !== 1 ? 's' : ''}
              </span>
            )}
          </Button>
          {assets.length === 0 && (
            <p className="text-xs text-zinc-600">Add at least one asset to export.</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Import section */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Import</p>
          <p className="text-sm text-zinc-400">
            Load a backup file. <span className="text-amber-400 font-medium">This will replace all current data.</span>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            className="w-full justify-center"
          >
            <FileJson size={14} />
            Choose Backup File
          </Button>

          {/* Status feedback */}
          {importStatus === 'success' && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
              <CheckCircle size={14} className="shrink-0" />
              Portfolio imported successfully.
            </div>
          )}
          {importStatus?.error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {importStatus.error}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Google Drive Sync section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Cloud size={13} className="text-zinc-500" />
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Google Drive Sync</p>
          </div>

          {!isConnected ? (
            <>
              <p className="text-sm text-zinc-400">
                Connect your Google account to save and restore your portfolio backup from Drive.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={signIn}
                className="w-full justify-center"
              >
                <LogIn size={14} />
                Connect Google Drive
              </Button>
            </>
          ) : (
            <>
              {/* Connected user info */}
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2">
                {userInfo?.picture && (
                  <img
                    src={userInfo.picture}
                    alt={userInfo.name}
                    className="h-7 w-7 rounded-full shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {userInfo?.name  && <p className="text-sm text-zinc-200 font-medium truncate">{userInfo.name}</p>}
                  {userInfo?.email && <p className="text-xs text-zinc-500 truncate">{userInfo.email}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="shrink-0 text-zinc-500 hover:text-red-400"
                >
                  <LogOut size={13} />
                  Disconnect
                </Button>
              </div>

              {/* Drive action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleSaveToDrive}
                  disabled={assets.length === 0 || driveStatus === 'saving'}
                  loading={driveStatus === 'saving'}
                  className="flex-1 justify-center"
                >
                  {driveStatus !== 'saving' && <CloudUpload size={14} />}
                  {driveStatus === 'saving' ? 'Saving…' : 'Save to Drive'}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLoadFromDrive}
                  disabled={driveStatus === 'loading'}
                  loading={driveStatus === 'loading'}
                  className="flex-1 justify-center"
                >
                  {driveStatus !== 'loading' && <CloudDownload size={14} />}
                  {driveStatus === 'loading' ? 'Loading…' : 'Load from Drive'}
                </Button>
              </div>
            </>
          )}

          {/* Drive status feedback */}
          {driveStatus?.success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
              <CheckCircle size={14} className="shrink-0" />
              {driveStatus.success}
            </div>
          )}
          {driveStatus?.error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {driveStatus.error}
            </div>
          )}
          {(driveStatus === 'saving' || driveStatus === 'loading') && (
            <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
              <Loader size={12} className="animate-spin" />
              {driveStatus === 'saving' ? 'Saving portfolio to Google Drive…' : 'Loading portfolio from Google Drive…'}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};

export default ImportExport;
