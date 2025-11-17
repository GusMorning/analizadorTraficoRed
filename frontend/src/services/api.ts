import { AppSettings } from '../context/SettingsContext';
import { CreateTestPayload, PortScanResult, ScanResult, SpeedtestSnapshot, TestDetail, TestRecord } from '../types/test';

const withBase = (settings: AppSettings, path: string) => {
  const base = settings.apiBaseUrl.replace(/\/$/, '');
  return `${base}${path}`;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API error');
  }
  return (await response.json()) as T;
};

export const api = {
  listTests: (settings: AppSettings) =>
    fetch(withBase(settings, '/tests')).then((res) => handleResponse<TestRecord[]>(res)),
  getTestDetail: (settings: AppSettings, id: string) =>
    fetch(withBase(settings, `/tests/${id}`)).then((res) => handleResponse<TestDetail>(res)),
  createTest: (settings: AppSettings, payload: CreateTestPayload) =>
    fetch(withBase(settings, '/tests'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then((res) => handleResponse<{ id: string; createdAt: string }>(res)),
  scanNetwork: (settings: AppSettings, range: string) =>
    fetch(withBase(settings, `/scan?range=${encodeURIComponent(range)}`)).then((res) =>
      handleResponse<ScanResult>(res)
    ),
  runSpeedtest: (settings: AppSettings) =>
    fetch(withBase(settings, '/speedtest')).then((res) => handleResponse<SpeedtestSnapshot>(res)),
  portScan: (settings: AppSettings, target: string, range: string) =>
    fetch(
      withBase(
        settings,
        `/port-scan?target=${encodeURIComponent(target)}&ports=${encodeURIComponent(range)}`
      )
    ).then((res) => handleResponse<PortScanResult>(res))
};
