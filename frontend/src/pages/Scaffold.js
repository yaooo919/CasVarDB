import React, { useEffect, useState } from "react";
import axios from "axios";
import './Scaffold.css';

function Scaffold() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:5000/grna")
      .then((response) => {
        setItems(response.data);
        setFilteredItems(response.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(items.map((item) => item.ID));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSearch = () => {
    if (searchTerm.trim() === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter((item) =>
        item.gRNA_scaffold.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  };

  const handleDownload = () => {
    const selectedData = filteredItems.filter((item) =>
      selectedItems.includes(item.ID)
    );
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected_data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="header-container">
        <div className="header">
          <h1>gRNA Scaffold Data</h1>
        </div>
      </div>  

      <div className="controls">
        <div className="total-count-column">
          <p><span id="total">Total: </span><span id="item-count">{items.length}</span></p>
        </div>
        <div className="search-download-column">
          <div className="search-field">
            <input
              type="text"
              placeholder="Search by scaffold name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button onClick={handleSearch}>Search</button>
          </div>
          
          <div className="download-link">
            <a href="#" onClick={handleDownload}>Download Checked <i class="bi bi-file-earmark-arrow-down-fill"></i></a>
          </div> 
        </div>
      </div>

      <table className="table-container"> 
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={selectedItems.length === items.length}
              />
            </th>
            <th className="col-scaffold">gRNA Scaffold</th>
            <th className="col-sequence">gRNA Scaffold Sequence</th>
            <th className="col-polyT">PolyT Length</th>
            <th className="col-length">gRNA Scaffold Sequence Length</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.ID}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.ID)}
                  onChange={() => handleSelect(item.ID)}
                />
              </td>
              <td>{item.gRNA_scaffold}</td>
              <td>{item.gRNA_scaffold_sequence}</td>
              <td>{item.polyT_length}</td>
              <td>{item.gRNA_scaffold_sequence_length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Scaffold;
