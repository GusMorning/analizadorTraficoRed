const withBase = (settings, path) => {
    const base = settings.apiBaseUrl.replace(/\/$/, '');
    return `${base}${path}`;
};
const handleResponse = async (response) => {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'API error');
    }
    return (await response.json());
};
export const api = {
    listTests: (settings) => fetch(withBase(settings, '/tests')).then((res) => handleResponse(res)),
    getTestDetail: (settings, id) => fetch(withBase(settings, `/tests/${id}`)).then((res) => handleResponse(res)),
    createTest: (settings, payload) => fetch(withBase(settings, '/tests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then((res) => handleResponse(res)),
    scanNetwork: (settings, range) => fetch(withBase(settings, `/scan?range=${encodeURIComponent(range)}`)).then((res) => handleResponse(res)),
    runSpeedtest: (settings) => fetch(withBase(settings, '/speedtest')).then((res) => handleResponse(res)),
    portScan: (settings, target, range) => fetch(withBase(settings, `/port-scan?target=${encodeURIComponent(target)}&ports=${encodeURIComponent(range)}`)).then((res) => handleResponse(res))
};
