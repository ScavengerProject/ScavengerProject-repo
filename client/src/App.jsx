import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchMessageFromServer = async () => {
    try {
      const response = await fetch('http://localhost:5000/api');

      if (!response.ok) {
        throw new Error('Erro ao conectar com o servidor');
      }
      
      const data = await response.json();
      setMessage(data.message);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Falha ao buscar mensagem do servidor.');
      setMessage('');
    }
  };

  return (
    <div>
      <button onClick={fetchMessageFromServer}>
      </button>
      
      {message && <h2 style={{ color: 'green' }}>{message}</h2>}
      {error && <h2 style={{ color: 'red' }}>{error}</h2>}
    </div>
  );
}

export default App;