import { useState } from 'react';
import { useOpenpeeps } from '../../contexts/openpeeps';

export const ACCOUNT_EXPORT_FILENAME = 'openpeeps-account-export.json';

/** Fetches the signed-in member's content archive as pretty JSON. */
export const useAccountExport = () => {
  const { client } = useOpenpeeps();
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const response = await client.accounts.current.export();
      if (!('data' in response) || !response.data) {
        throw new Error('Export failed');
      }
      return JSON.stringify(response.data, null, 2);
    } finally {
      setExporting(false);
    }
  };

  return { exporting, download };
};
