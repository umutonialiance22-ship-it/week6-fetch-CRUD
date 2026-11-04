const BASE = 'https://jsonplaceholder.typicode.com';
const TIMEOUT_MS = 8000;

export async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE + path);
  if (params) url.search = new URLSearchParams(params).toString();

  const options = {
    method,
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS), // bonus: 8s timeout
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json; charset=UTF-8';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error('Request timed out after 8 seconds');
    }
    throw new Error('Network error: ' + err.message);
  }

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  list: (params) => request('/posts', { params }),
  get: (id) => request(`/posts/${id}`),
  create: (data) => request('/posts', { method: 'POST', body: data }),
  update: (id, data) => request(`/posts/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
};