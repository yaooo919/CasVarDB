import React, { useState } from "react";
import axios from "axios";
import './Submit.css';
import { Tooltip, OverlayTrigger, Modal, Button } from 'react-bootstrap';

const SubmitPage = () => {
  const [file, setFile] = useState(null); 
  const [metadata, setMetadata] = useState(""); 
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleMetadataChange = (e) => {
    setMetadata(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !metadata) {
      setMessage("Please upload a file and enter metadata.");
      setShowModal(true);
      return;
    }

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setMessage("Only CSV files are allowed.");
        setShowModal(true);
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", metadata);

    try {
        const response = await axios.post("http://localhost:5000/submit", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setMessage(response.data.message);
      } catch (error) {
        console.error("Error uploading file:", error);
        setMessage("Failed to upload. Please try again.");
      }
      setShowModal(true);
    };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div>
      <div className="header-container">
        <div className="header">
            <h1>Submit</h1>
        </div>
      </div>
      
      <div id="flex-container">
        <div id="flex-left">
            <p id="submit-paragraph">
                We welcome submissions of comma separated text files containing the following columns, to be included in the database:
            </p>
            <ul>
                <li>Spacer sequence (raw)</li>
                <li>Target sequence (raw)</li>
                <li>Spacer sequence</li>
                <li>Target context sequence</li>
                <li>Variant</li>
                <li>Nuclease</li>
                <li>gRNA scaffold</li>
                <li>Day</li>
                <li>tRNA feature</li>
                <li>Study</li>
                <li>Library</li>
                <li>Table</li>
                <li>Sheet</li>
                <li>src_idx</li>
                <li>n_data</li>
                <li>Partition</li>
                <li>Barcode</li>
                <li>Number of mismatches</li>
                <li>Background subtracted indel frequencies (%)</li>
                <li>Mean background subtracted indel frequency (source, %)</li>
                <li>Mean background subtracted indel frequency</li>
            </ul>
        </div>
        <div id="flex-right">
            <form onSubmit={handleSubmit}>
              <div id="select-file">
                <label>
                    <strong>Select File:</strong>
                </label>
                <input type="file" accept=".csv" onChange={handleFileChange} />
              </div>
              <div id="metadata">
                <label>
                    <strong>Enter Metadata:</strong>
                </label>
                <textarea
                    id="meta-text"
                    value={metadata}
                    onChange={handleMetadataChange}
                    rows="10"
                    cols="70"
                    placeholder="Enter publication metadata here..."
                ></textarea>
               </div>
               <button type="submit">Submit</button>
            </form>  
        </div>
      </div>

      <Modal
        show={showModal}
        onHide={closeModal}
        backdrop="static" 
        keyboard={true}   
        centered          
      >
        <Modal.Body>{message}</Modal.Body>
        <Modal.Footer>
            <Button id="close-button" onClick={closeModal}>
                Close
            </Button>
        </Modal.Footer>
      </Modal>   
        

    </div>
      
  );
};

export default SubmitPage;
