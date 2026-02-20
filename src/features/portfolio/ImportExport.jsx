import { useRef, useState } from 'react';
import { z } from 'zod';
import { Download, Upload, CheckCircle, AlertCircle, FileJson } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';

// ---------------------------------------------------------------------------
// Validation schema for imported files
// ---------------------------------------------------------------------------

const assetImportSchema = z.object({
  id:           z.number(),
  symbol:       z.string(),
  name:         z.string(),
  market:       z.enum(['BIST', 'US', 'CRYPTO']),
  currency:     z.enum(['TRY', 'USD']),
  amount:       z.number(),
  avgPrice:     z.number(),
  currentPrice: z.number(),
  group:        z.string().optional(),
});

const snapshotImportSchema = z.object({
  date:     z.string(),
  totalUSD: z.number(),
});

const importFileSchema = z.object({
  version:         z.number(),
  exportedAt:      z.string(),
  assets:          z.array(assetImportSchema),
  snapshots:       z.array(snapshotImportSchema),
  displayCurrency: z.enum(['USD', 'TRY']),
});

// ---------------------------------------------------------------------------
// Export helper
// ---------------------------------------------------------------------------

/**
 * Serialises current store state and triggers a file download.
 * @param {{ assets: Array, snapshots: Array, displayCurrency: string }} state
 */
const triggerExport = (state) => {
  const payload = {
    version:         1,
    exportedAt:      new Date().toISOString(),
    assets:          state.assets,
    snapshots:       state.snapshots,
    displayCurrency: state.displayCurrency,
  };

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
// Component
// ---------------------------------------------------------------------------

/**
 * Modal with Export and Import controls.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
const ImportExport = ({ isOpen, onClose }) => {
  const assets          = usePortfolioStore((s) => s.assets);
  const snapshots       = usePortfolioStore((s) => s.snapshots);
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);
  const importData      = usePortfolioStore((s) => s.importData);

  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null); // null | 'success' | { error: string }

  const handleExport = () => {
    triggerExport({ assets, snapshots, displayCurrency });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw    = JSON.parse(ev.target.result);
        const result = importFileSchema.safeParse(raw);

        if (!result.success) {
          const msg = result.error.errors[0]?.message ?? 'Invalid file format.';
          setImportStatus({ error: `Validation failed: ${msg}` });
          return;
        }

        const { assets: a, snapshots: s, displayCurrency: dc } = result.data;
        importData({ assets: a, snapshots: s, displayCurrency: dc });
        setImportStatus('success');
      } catch {
        setImportStatus({ error: 'Could not parse the file. Make sure it is a valid JSON backup.' });
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
  };

  const handleClose = () => {
    setImportStatus(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Export / Import" size="sm">
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

      </div>
    </Modal>
  );
};

export default ImportExport;
