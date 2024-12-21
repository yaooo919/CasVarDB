import React, { useEffect, useState } from "react";
import axios from "axios";
import './Data.css';

function Data() {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchField, setSearchField] = useState("spacer_sequence_raw");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(100); 
    
    useEffect(() => {
        axios
          .get(`http://localhost:5000/data?page=${currentPage}&pageSize=${pageSize}`)
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
      const filtered = items.filter((item) =>{
        const fieldValue = item[searchField];
        return (
            fieldValue &&
            fieldValue.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredItems(filtered);
    }
  };

  const handleDownload = () => {
    const selectedData = filteredItems.filter((item) =>
      selectedItems.includes(item.ID)
    );

    if (selectedData.length === 0) {
        alert("No items selected for download");
        return;
    }
  
    const headers = Object.keys(selectedData[0]).join(",");
    const rows = selectedData.map((item) =>
      Object.values(item)
        .map((value) => `"${value}"`) 
        .join(",")
    );
    const csvContent = [headers, ...rows].join("\n");
  
    const blob = new Blob([csvContent], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected_data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
    return (
        
        <div>
            <div className="header-container">
                <div className="header">
                    <h1>Data</h1>
                </div>
            </div>
            
            <div className="controls">
                <div className="total-count-column">
                    <p><span id="total">Total: </span><span id="item-count">{items.length}</span></p>
                </div>
                <div className="search-download-column">
                    <div className="search-field">
                        <span className="search-by">
                            <select>
                                <option value="col-1">Spacer sequence (raw)</option>
                                <option value="col-2">Target context sequence (raw)</option>
                                <option value="col-3">Spacer sequence</option>
                                <option value="col-">Target context sequence</option>
                                <option value="col-">Variant</option>
                                <option value="col-">Nuclease</option>
                                <option value="col-">gRNA scaffold</option>
                                <option value="col-">Day</option>
                                <option value="col-">tRNA feature</option>
                                <option value="col-">Study</option>
                            </select>
                        </span>
                        <input
                            type="text"
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
                        <th className="col-1">Spacer sequence (raw)</th>
                        <th className="col-2">Target context sequence (raw)</th>
                        <th className="col-3">Spacer sequence</th>
                        <th className="col-4">Target context sequence</th>
                        <th className='col-5'>Variant</th>
                        <th className='col-6'>Nuclease</th>
                        <th className='col-7'>gRNA scaffold</th>
                        <th className='col-8'>Day</th>
                        <th className='col-9'>tRNA feature</th>
                        <th className='col-10'>Study</th>
                        <th className='col-11'>Library</th>
                        <th className='col-12'>Table</th>
                        <th className='col-13'>Sheet</th>
                        <th className='col-14'>src_idx</th>
                        <th className='col-15'>n_data</th>
                        <th className='col-16'>Partition</th>
                        <th className='col-17'>Barcode</th>
                        <th className='col-18'>Background subtracted indel frequency (%)</th>
                        <th className='col-19'>Mean background subtracted indel frequency (source, %)</th>
                        <th className='col-20'>mean background subtracted indel frequency</th>
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
                    <td>{item.spacer_sequence_raw}</td>
                    <td>{item.target_context_sequence_raw}</td>
                    <td>{item.spacer_sequence}</td>
                    <td>{item.target_context_sequence}</td>
                    <td>{item.variant}</td>
                    <td>{item.nuclease}</td>
                    <td>{item.gRNA_scaffold}</td>
                    <td>{item.day}</td>
                    <td>{item.tRNA_feature}</td>
                    <td>{item.study}</td>
                    <td>{item.library}</td>
                    <td>{item.table_number}</td>
                    <td>{item.sheet_number}</td>
                    <td>{item.src_idx}</td>
                    <td>{item.n_data}</td>
                    <td>{item.partition}</td>
                    <td>{item.barcode}</td>
                    <td>{item.background_subtracted_indel_frequencies}</td>
                    <td>{item.mean_background_subtracted_indel_frequency_source}</td>
                    <td>{item.mean_background_subtracted_indel_frequency}</td>
                    </tr>
                ))}
                </tbody>
            </table>  
        </div>
    )
}

export default Data;