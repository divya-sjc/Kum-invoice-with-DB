import React, { useState } from "react";
import axios from "axios";

const PurchasesUpload = () => {
  const [file, setFile] = useState(null);
  const [matchedData, setMatchedData] = useState([]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/upload-excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMatchedData(response.data.matchedData);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    }
  };

  return (
    <div>
      <h2>Upload Purchases Excel File</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>

      <h3>Matched Data</h3>
      <ul>
        {matchedData.map((data, index) => (
          <li key={index}>{JSON.stringify(data)}</li>
        ))}
      </ul>
    </div>
  );
};

export default PurchasesUpload;
