import { AppSettings } from '../context/SettingsContext';
import { CreateTestPayload, TestDetail, TestRecord } from '../types/test';

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
    }).then((res) => handleResponse<{ id: string; createdAt: string }>(res))
};
