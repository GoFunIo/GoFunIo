import './assets/global.css';

import { useState, useEffect } from 'react';
import { Select } from './components/ui/Select';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';

function App() {
  const [backendMessage, setBackendMessage] = useState('');
  const [count, setCount] = useState(0);

  const [selected, setSelected] = useState<string | number>('');
  const options = [
    { value: 1, label: 'test' },
    { value: 2, label: 'test123213' },
    { value: 3, label: 'qweqweqwe' },
  ];
  const [selectedLang, setSelectedLang] = useState<string | number>('');
  const optionsAnother = [
    { value: 'react', label: 'REACT JS' },
    { value: 'js', label: 'JAVASCRIPT' },
    { value: 'ts', label: 'TYPESCRIPT' },
  ];
  const [test, setTest] = useState<string | number>(0);
  const testOptions = [
    { value: 0, label: 'Correct' },
    { value: 1, label: 'Incorrect' },
  ];

  console.log(selected, selectedLang);

  useEffect(() => {
    fetch('http://localhost:3000/status')
      .then((res) => res.json())
      .then((data) => setBackendMessage(data.message))
      .catch((err) => setBackendMessage(err + 'Cannot connect to backend'));
  }, []);

  const [value, setValue] = useState('');

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

      <p className="pt-10 text-4xl font-bold">UI components</p>
      <Input value={value} onChange={setValue} />
      <Button
        onClick={() => {
          console.log('button');
        }}
      >
        Button
      </Button>
      <Select
        options={options}
        value={selected}
        onChange={setSelected}
        placeholder={'TestSelect'}
      />
      <Select
        options={optionsAnother}
        value={selectedLang}
        onChange={setSelectedLang}
        placeholder={'Choose a language'}
      />
      <Select options={testOptions} value={test} onChange={setTest} placeholder={'Test'} />
    </>
  );
}

export default App;
