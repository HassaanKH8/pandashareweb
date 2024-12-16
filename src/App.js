import React, { useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(process.env.REACT_APP_LINK);

const App = () => {
  const [sessionId, setSessionId] = useState('');

  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([])

  const [receivedFiles, setReceivedFiles] = useState([]);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFiles((prevFiles) => [...prevFiles, file]);
    }
  };

  const handlefiledelete = (id) => {
    const updatedFiles = selectedFiles.filter((file, index) => index !== id);
    setSelectedFiles(updatedFiles);
  }

  const handleSend = () => {
    const fileDataArray = [];

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        fileDataArray.push({
          fileName: file.name,
          fileData: reader.result,
        });

        if (fileDataArray.length === selectedFiles.length) {
          socket.emit('send-files', fileDataArray);

          socket.on('files-sent', (id) => {
            setSessionId(id);
          });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFetch = () => {
    socket.emit('fetch-files', sessionId);

    socket.on('receive-files', (files) => {
      setReceivedFiles(files); // Store received files in state
    });

    socket.on('error', (errorMessage) => {
      alert(errorMessage);
    });
  };

  const downloadFile = (fileData, fileName) => {
    const blob = new Blob([new Uint8Array(fileData)]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  return (
    <div className="page">
      <div className='navbar'>
        <h1 className='heading'>🏴‍☠️ Pirate File Sharing App 🏴‍☠️</h1>
      </div>
      <div className='bottomsection'>
        <div className='themaincontainer'>
          <h1 className='containerheading'>Send</h1>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ cursor: "pointer" }} onClick={handleButtonClick}>
            {selectedFiles.length !== 0 && (
              <div>
                <h1 className='addmoreheading'>+ Add More</h1>
              </div>
            )}
          </div>
          <div className='filescontainer'>
            {selectedFiles.length === 0 && (
              <div className='filescontainerbtn' style={{ cursor: "pointer" }} onClick={handleButtonClick}>
                <h1 className='sendBtn'>+</h1>
              </div>
            )}
            <div>
              {selectedFiles.length > 0 && selectedFiles.map((file, index) => {
                return (
                  <div key={index} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginBottom: 5 }}>
                    <p className='filelistitem'>{file.name}</p>
                    <img src={require('./delete.png')} style={{ width: 20, height: 20, cursor: 'pointer' }} onClick={() => { handlefiledelete(index) }} />
                  </div>
                )
              })}
            </div>
          </div>
          {selectedFiles.length > 0 && (
            <button onClick={handleSend}>Send</button>
          )}
        </div>
        <div className='themaincontainer'>
          <h1 className='containerheading'>Receive</h1>
          <div className='filescontainer'>
            <div>
              <h1>Receive Files</h1>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
              <button onClick={handleFetch}>Fetch Files</button>
              {receivedFiles.length > 0 && (
                <div>
                  <h2>Files:</h2>
                  <ul>
                    {receivedFiles.map((file, index) => (
                      <li key={index}>
                        {file.fileName}{' '}
                        <button onClick={() => downloadFile(file.fileData, file.fileName)}>
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;