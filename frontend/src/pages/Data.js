import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactPaginate from "react-paginate";
import './Data.css';

function Data() {
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchField, setSearchField] = useState("spacer_sequence_raw");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalItems, setTotalItems] = useState(0);

    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
    const startIndex = (currentPage - 1) * pageSize;
    const startItem = totalItems > 0 ? startIndex + 1 : 0;
    const endItem = Math.min(startIndex + pageSize, totalItems);

    const fetchData = async() => {
      try {
        const response = await axios.get(`http://localhost:5000/data`, {
          params: {
            page: currentPage,
            pageSize: pageSize,
            searchTerm: searchTerm,
            searchField: searchField
          }
        });
        setItems(response.data.rows);
        setTotalItems(response.data.total);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }

    useEffect(() => {
        fetchData();
    }, [currentPage, pageSize, searchTerm, searchField]);

    const handlePageClick = (data) => {
      setCurrentPage(data.selected + 1);
    }
        
  const handleSelectAll = (e) => {
    const currentPageIds = items.map((item) => item.id);

    if (e.target.checked) {
      setSelectedItems((prev) => [...new Set([...prev, ...currentPageIds])]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const isCurrentPageAllSelected = items.every((item) => 
    selectedItems.includes(item.id)
  );

  const handleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleDownload = () => {
    const selectedData = items.filter((item) =>
      selectedItems.includes(item.id)
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
                    <p><span id="total">Total: </span><span id="item-count">{totalItems}</span></p>
                    <p id="entry-count">Showing {startItem} to {endItem} of {totalItems} entries</p>
                </div>
                <div className="search-download-column">
                    <div className="search-field">
                        <span className="search-by">
                            <select
                              value={searchField}
                              onChange={(e) => setSearchField(e.target.value)}
                            >
                                <option value="spacer_sequence_raw">Spacer sequence (raw)</option>
                                <option value="target_context_sequence_raw">Target context sequence (raw)</option>
                                <option value="spacer_sequence">Spacer sequence</option>
                                <option value="target_context_sequence">Target context sequence</option>
                                <option value="variant">Variant</option>
                                <option value="nuclease">Nuclease</option>
                                <option value="gRNA_scaffold">gRNA scaffold</option>
                                <option value="day">Day</option>
                                <option value="tRNA_feature">tRNA feature</option>
                                <option value="study">Study</option>
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

            <div className="data-table-container">
              <table> 
                  <thead>
                      <tr>
                          <th className="col-0">
                          <input
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={isCurrentPageAllSelected}
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
                  {items.map((item) => (
                      <tr key={item.id}>
                      <td>
                          <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelect(item.id)}
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
            
            <div className="pagination-container">
              <div className="page-size-selector">
                  <label>
                      Items per page:&nbsp;
                      <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))}>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                      </select>
                  </label>
              </div>  
              
              <div className="pagination">
                <ReactPaginate
                  previousLabel={"Prev"}
                  nextLabel={"Next"}
                  breakLabel={"..."}
                  pageCount={totalPages}
                  marginPagesDisplayed={1}
                  pageRangeDisplayed={5}
                  onPageChange={handlePageClick}
                  containerClassName={"pagination"}
                  activeClassName={"active"}
                  previousClassName={currentPage === 1 ? "disabled" : ""}
                  nextClassName={currentPage === totalPages ? "disabled" : ""}  
                />
              </div>
            </div>
            
        </div>

    )
}

export default Data;