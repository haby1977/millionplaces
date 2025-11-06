export default async function handler(req, res) {
  const { path } = req.query;
  if (!Array.isArray(path) || path.length === 0) {
    return res.status(400).json({ error: 'Path required' });
  }

  const table = path[0];
  const rest = path.slice(1).join('/');
  let url = `https://krioqbogdddqxgzhqzh.supabase.co/rest/v1/${table}`;
  if (rest) url += `/${rest}`;

  const query = req.url.split('?')[1];
  if (query) url += `?${query}`;

  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const body = ['POST', 'PATCH', 'PUT'].includes(req.method) 
    ? JSON.stringify(req.body) 
    : undefined;

  try {
    const response = await fetch(url, { method: req.method, headers, body });
    const data = await response.json();
    res.status(response.status).json(data || {});
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}
	