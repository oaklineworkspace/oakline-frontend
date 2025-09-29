// pages/test-render.js
import { useEffect, useState } from 'react';

export default function TestRender() {
  const [result, setResult] = useState('Loading...');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/health`)
      .then(res => res.json())
      .then(data => setResult(JSON.stringify(data, null, 2)))
      .catch(err => setResult(`Error: ${err.message}`));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Render Backend Test</h1>
      <pre>{result}</pre>
    </div>
  );
}
