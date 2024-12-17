import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import QRCode from 'react-qr-code';

import './App.css';
import ProgressBar from './ProgressBar';

const socket = io(process.env.REACT_APP_LINK_URL);

const App = () => {
  const [sessionId, setSessionId] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [filesSentSuccessfully, setFilesSentSuccessfully] = useState(false);
  const [filesReceivedSuccessfully, setFilesReceivedSuccessfully] = useState(false);
  const [receivePressed, setReceivePressed] = useState(false);
  const [loading, setLoading] = useState(false)
  const loadingText = "Loading"
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
    setDotCount(0);
  }, [loading]);

  const CHUNK_SIZE = 512 * 1024;

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

  const sendFileChunks = (file, sessionId, totalFiles, fileIndex) => {
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
          chunkData: btoa(chunkData),
          totalFiles,
          fileIndex,
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

      const totalFiles = selectedFiles.length;

      for (let index = 0; index < totalFiles; index++) {
        const file = selectedFiles[index];

        await sendFileChunks(file, id, totalFiles, index);
        setProgress((index + 1 / totalFiles) * 100)
        if (index + 1 === totalFiles) {
          setFilesSentSuccessfully(true)
        }
      }
    });
  };


  const handleFetch = () => {
    setReceivePressed(true)
    setLoading(true)
    setProgress(0);
    setFilesReceivedSuccessfully(false);
    const receivedFiles = [];

    socket.emit('fetch-files', sessionIdInput);

    socket.on('receive-file-chunk', ({ file, index, totalFiles }) => {
      receivedFiles.push(file);
      setLoading(false)
      setProgress(((index / totalFiles) * 100).toFixed(2));

      if (index === totalFiles) {
        setFilesReceivedSuccessfully(true);
        setReceivedFiles(receivedFiles);
      }
    });

    socket.on('error', (errorMessage) => {
      alert(errorMessage);
    });
    // setReceivePressed(false)
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
                  {filesSentSuccessfully ? (
                    <div>
                      <QRCode value={sessionId} size={150} />
                      <p style={{ fontFamily: "EB Garamond", fontSize: 16, color: '#ead5bf', marginTop: 5 }}>{sessionId}</p>
                    </div>
                  ) : (
                    <div style={{ width: "100%" }}>
                      <p style={{ textAlign: 'right', marginBottom: 5, fontFamily: "EB Garamond", fontWeight: 500, color: '#ead5bf' }}>{progress}%</p>
                      <ProgressBar progress={progress} />
                    </div>
                  )}
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
            <div className='inputDivcenter'>
              <input
                type="text"
                placeholder="Enter Input Code"
                value={sessionIdInput}
                onChange={(e) => setSessionIdInput(e.target.value)}
                className="receiveinp"
              />
              <button onClick={handleFetch} className="recbtn">Receive</button>
            </div>
            {filesReceivedSuccessfully ? (
              <div>
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
            ) : (
              <div style={{ width: "100%" }}>
                {receivePressed && (
                  <div>
                    <div style={{display: 'flex', flexDirection: 'row', justifyContent: "space-between", alignItems: 'center'}}>
                      {loading && (
                        <p style={{ marginBottom: 5, fontFamily: "EB Garamond", fontWeight: 500, color: '#ead5bf', fontSize: 18 }}>{`${loadingText}${'.'.repeat(dotCount)}`}</p>
                      )}
                      <p style={{ marginBottom: 5, fontFamily: "EB Garamond", fontWeight: 500, color: '#ead5bf', fontSize: 18 }}>{progress}%</p>
                    </div>
                    <ProgressBar progress={progress} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
