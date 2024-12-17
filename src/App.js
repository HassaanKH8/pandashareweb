import React, { useRef, useState } from 'react';
import { io } from 'socket.io-client';
import QRCode from 'react-qr-code';

import './App.css';

const socket = io(process.env.REACT_APP_LINK_URL);

const App = () => {
  const [sessionId, setSessionId] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);

  const CHUNK_SIZE = 512 * 1024; // 512 KB

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleFileDelete = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendFileChunks = (file, sessionId) => {
    return new Promise((resolve) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let chunkIndex = 0;

      const reader = new FileReader();
      reader.onload = (e) => {
        const chunkData = e.target.result;

        socket.emit('send-file-chunk', {
          sessionId,
          fileName: file.name,
          chunkIndex,
          totalChunks,
          chunkData: btoa(chunkData), // Convert to Base64
        });

        chunkIndex++;
        if (chunkIndex < totalChunks) {
          readNextChunk();
        } else {
          resolve();
        }
      };

      const readNextChunk = () => {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const blob = file.slice(start, end);
        reader.readAsBinaryString(blob);
      };

      readNextChunk();
    });
  };

  const handleSend = async () => {
    socket.emit('start-session');

    socket.on('session-created', async (id) => {
      setSessionId(id);

      for (const file of selectedFiles) {
        await sendFileChunks(file, id);
      }

      console.log('All files sent successfully');
    });
  };

  const handleFetch = () => {
    socket.emit('fetch-files', sessionIdInput);

    socket.on('receive-files', (files) => {
      setReceivedFiles(files);
    });

    socket.on('error', (errorMessage) => {
      alert(errorMessage);
    });
  };

  const downloadFile = (fileData, fileName) => {
    const blob = new Blob([Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0))]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const handleGoBack = () => {
    setSessionId('');
  };

  return (
    <div className="page">
      <div className="navbar">
        <h1 className="heading">🏴‍☠️ Pirate File Sharing App 🏴‍☠️</h1>
      </div>
      <div className="bottomsection">
        <div className="themaincontainer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="containerheading">Send</h1>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              multiple
              onChange={handleFileChange}
            />
            <div style={{ cursor: 'pointer' }} onClick={handleButtonClick}>
              {selectedFiles.length !== 0 && !sessionId && <h1 className="addmoreheading">+ Add More</h1>}
            </div>
            {sessionId && (
              <div style={{ cursor: 'pointer' }} onClick={handleGoBack}>
                <h1 className="addmoreheading">←</h1>
              </div>
            )}
          </div>
          <div className="filescontainer">
            {selectedFiles.length === 0 && (
              <div className="filescontainerbtn" onClick={handleButtonClick}>
                <h1 className="sendBtn">+</h1>
              </div>
            )}
            <div>
              {sessionId ? (
                <div className='sessionscontainer'>
                  <QRCode value={sessionId} size={150} />
                  <p style={{ fontFamily: "EB Garamond", fontSize: 16, color: '#dec7ae', marginTop: 5 }}>{sessionId}</p>
                </div>
              ) : (
                <div>
                  {selectedFiles.length > 0 && selectedFiles.map((file, index) => (
                    <div key={index} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginBottom: 5 }}>
                      <p className='filelistitem'>{file.name}</p>
                      <img alt='delete' src={require('./delete.png')} style={{ width: 20, height: 20, cursor: 'pointer' }} onClick={() => handleFileDelete(index)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {selectedFiles.length > 0 && <button onClick={handleSend} className="sendbutton">Send</button>}
        </div>
        <div className="themaincontainer">
          <h1 className="containerheading">Receive</h1>
          <div className="filescontainer">
            <input
              type="text"
              placeholder="Enter Input Code"
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              className="receiveinp"
            />
            <button onClick={handleFetch} className="recbtn">Receive</button>
            {receivedFiles.length > 0 && (
              <div>
                <h2 className="secondlyheading">Files:</h2>
                {receivedFiles.map((file, index) => (
                  <div className="recfile" key={index}>
                    <p>{file.fileName}</p>
                    <button onClick={() => downloadFile(file.fileData, file.fileName)}>Download</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
