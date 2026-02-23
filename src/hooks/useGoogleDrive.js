import { useState, useCallback, useRef } from 'react';

/**
 * Google Drive integration hook.
 *
 * Uses the Google Identity Services (GIS) token model — no backend required.
 * Requires VITE_GOOGLE_CLIENT_ID to be set in your .env file.
 *
 * Drive scope used: `drive.file` — only accesses files created by this app,
 * keeping read/write access minimal and safe for the user.
 *
 * Backup file name in Drive: "portfolio-tracker-backup.json"
 */

const DRIVE_FILE_NAME = 'portfolio-tracker-backup.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const GIS_SCRIPT_ID = 'gis-client-script';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

// ---------------------------------------------------------------------------
// Drive REST helpers — plain fetch, no SDK needed
// ---------------------------------------------------------------------------

/**
 * Searches for the portfolio backup file in the user's Drive.
 * @param {string} accessToken
 * @returns {Promise<{ id: string, name: string, modifiedTime: string } | null>}
 */
async function findBackupFile(accessToken) {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Failed to search Google Drive.');
  }
  const data = await res.json();
  return data.files?.[0] ?? null;
}

/**
 * Creates or updates the backup file in Drive using a multipart upload.
 * @param {string} accessToken
 * @param {string} jsonContent  Serialised portfolio JSON
 * @param {string | null} existingFileId  Pass to update, omit to create
 */
async function uploadBackupFile(accessToken, jsonContent, existingFileId = null) {
  const metadata = { name: DRIVE_FILE_NAME, mimeType: 'application/json' };
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', new Blob([jsonContent], { type: 'application/json' }));

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Failed to upload to Google Drive.');
  }
  return res.json();
}

/**
 * Downloads the content of a Drive file as text.
 * @param {string} accessToken
 * @param {string} fileId
 * @returns {Promise<string>}
 */
async function downloadBackupFile(accessToken, fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Failed to download from Google Drive.');
  }
  return res.text();
}

/**
 * Fetches the authenticated user's basic profile info (name, email, picture).
 * @param {string} accessToken
 * @returns {Promise<{ name: string, email: string, picture: string } | null>}
 */
async function fetchUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   isConnected: boolean,
 *   userInfo: { name: string, email: string, picture: string } | null,
 *   driveStatus: null | 'saving' | 'loading' | { success: string } | { error: string },
 *   clearDriveStatus: () => void,
 *   signIn: () => Promise<void>,
 *   signOut: () => void,
 *   saveToDrive: (portfolioData: object) => Promise<void>,
 *   loadFromDrive: () => Promise<string | null>,
 * }} GoogleDriveHook
 */

/**
 * @returns {GoogleDriveHook}
 */
export function useGoogleDrive() {
  const [accessToken, setAccessToken]   = useState(null);
  const [userInfo, setUserInfo]         = useState(null);
  const [driveStatus, setDriveStatus]   = useState(null);

  /** Cached GIS token-client instance */
  const tokenClientRef = useRef(null);

  // -------------------------------------------------------------------------
  // Lazily load the GIS <script> tag once
  // -------------------------------------------------------------------------

  const loadGisScript = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (document.getElementById(GIS_SCRIPT_ID)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.id    = GIS_SCRIPT_ID;
        script.src   = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload  = resolve;
        script.onerror = () =>
          reject(new Error('Failed to load Google Identity Services script.'));
        document.head.appendChild(script);
      }),
    []
  );

  // -------------------------------------------------------------------------
  // Sign in — requests an access token via GIS popup
  // -------------------------------------------------------------------------

  const signIn = useCallback(async () => {
    if (!CLIENT_ID) {
      setDriveStatus({
        error:
          'Google Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.',
      });
      return;
    }

    try {
      await loadGisScript();

      if (!tokenClientRef.current) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope:     SCOPES,
          callback:  async (response) => {
            if (response.error) {
              setDriveStatus({ error: `Authentication failed: ${response.error}` });
              return;
            }
            setAccessToken(response.access_token);
            const info = await fetchUserInfo(response.access_token);
            setUserInfo(info);
            setDriveStatus(null);
          },
          // Suppress the "Select account" screen when a token is already cached
          prompt: '',
        });
      }

      tokenClientRef.current.requestAccessToken();
    } catch (err) {
      setDriveStatus({ error: err.message });
    }
  }, [loadGisScript]);

  // -------------------------------------------------------------------------
  // Sign out — revokes the token and clears local state
  // -------------------------------------------------------------------------

  const signOut = useCallback(() => {
    if (accessToken) {
      window.google?.accounts?.oauth2?.revoke(accessToken, () => {});
    }
    setAccessToken(null);
    setUserInfo(null);
    setDriveStatus(null);
    // Reset the token client so the next sign-in shows the account picker again
    tokenClientRef.current = null;
  }, [accessToken]);

  // -------------------------------------------------------------------------
  // Save portfolio data to Drive
  // -------------------------------------------------------------------------

  const saveToDrive = useCallback(
    async (portfolioData) => {
      if (!accessToken) {
        signIn();
        return;
      }

      setDriveStatus('saving');
      try {
        const jsonContent  = JSON.stringify(portfolioData, null, 2);
        const existingFile = await findBackupFile(accessToken);
        await uploadBackupFile(accessToken, jsonContent, existingFile?.id ?? null);

        setDriveStatus({
          success: existingFile
            ? 'Portfolio updated in Google Drive.'
            : 'Portfolio saved to Google Drive (new file created).',
        });
      } catch (err) {
        // Token may have expired — clear it so the user can reconnect
        if (err.message?.includes('401') || err.message?.toLowerCase().includes('invalid')) {
          setAccessToken(null);
          setUserInfo(null);
          setDriveStatus({ error: 'Session expired. Please reconnect to Google Drive.' });
        } else {
          setDriveStatus({ error: err.message });
        }
      }
    },
    [accessToken, signIn]
  );

  // -------------------------------------------------------------------------
  // Load portfolio data from Drive — returns raw JSON string or null
  // -------------------------------------------------------------------------

  const loadFromDrive = useCallback(async () => {
    if (!accessToken) {
      signIn();
      return null;
    }

    setDriveStatus('loading');
    try {
      const file = await findBackupFile(accessToken);
      if (!file) {
        setDriveStatus({ error: 'No backup file found in Google Drive.' });
        return null;
      }

      const content = await downloadBackupFile(accessToken, file.id);
      const lastModified = new Date(file.modifiedTime).toLocaleString();
      setDriveStatus({ success: `Loaded from Google Drive (last saved ${lastModified}).` });
      return content;
    } catch (err) {
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('invalid')) {
        setAccessToken(null);
        setUserInfo(null);
        setDriveStatus({ error: 'Session expired. Please reconnect to Google Drive.' });
      } else {
        setDriveStatus({ error: err.message });
      }
      return null;
    }
  }, [accessToken, signIn]);

  return {
    isConnected: !!accessToken,
    userInfo,
    driveStatus,
    clearDriveStatus: () => setDriveStatus(null),
    signIn,
    signOut,
    saveToDrive,
    loadFromDrive,
  };
}
