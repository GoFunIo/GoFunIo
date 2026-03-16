import './assets/global.css';

import { useState, useEffect } from 'react';

function App() {
  const [backendMessage, setBackendMessage] = useState('');
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('http://localhost:3000/status')
      .then((res) => res.json())
      .then((data) => setBackendMessage(data.message))
      .catch((err) => setBackendMessage(err + 'Cannot connect to backend'));
  }, []);

  return (
    <>
      <h1>Vite + React</h1>
      <h2>{backendMessage}</h2>
      <h2 className="text-red-500">tailwind css installed</h2>
      <h2>
        <strong>Tests on github workflow v6</strong>
      </h2>
      <div className="">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  );
}

export default App;
