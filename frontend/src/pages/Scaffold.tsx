import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Scaffold.css";

function Scaffold() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("ASC");

  useEffect(() => {
    const fetchData = async() => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/grna`, {
          params: {
            sortField,
            sortDirection
          }
        });
        setItems(response.data);
        setFilteredItems(response.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }};
    fetchData();
  }, [sortField, sortDirection]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(items.map((item) => item.id));
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
      selectedItems.includes(item.id)
    );

    const headers = Object.keys(selectedData[0]).join(",");
    const rows = selectedData.map((item) =>
      Object.values(item)
        .map((value) => `"${value}"`)
        .join(",")
    );
    const csvContent = [headers, ...rows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected_data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (column) => {
    setSortField(column);
    setSortDirection((prevDirection) =>
      prevDirection === "ASC" ? "DESC" : "ASC"
    );
  };

  const renderSortIcon = (column) => {
    if (sortField === column) {
      return sortDirection === "ASC" ? (<i className="bi bi-caret-up-fill"></i>) : (<i className="bi bi-caret-down-fill"></i>);
    }
    return null;
  };

  return (
    <div>
      <div className="header-container">
        <div className="header">
          <h1>gRNA Scaffolds</h1>
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
              placeholder="Search by scaffold name... (e.g., SaCas9 scaffold 1)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button onClick={handleSearch}>Search</button>
          </div>

          <div className="download-link">
            <a
              href="#download"
              onClick={(event) => {
                event.preventDefault();
                handleDownload();
              }}
            >
              Download Checked <i className="bi bi-file-earmark-arrow-down-fill"></i>
            </a>
          </div>
        </div>
      </div>

      <table className="general-table-container">
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={selectedItems.length === items.length}
              />
            </th>
            <th id="gRNA_scaffold" onClick={() => handleSort("gRNA_scaffold")}>gRNA Scaffold {renderSortIcon("gRNA_scaffold")}</th>
            <th id="gRNA_scaffold_sequence" onClick={() => handleSort("gRNA_scaffold_sequence")}>gRNA Scaffold Sequence {renderSortIcon("gRNA_scaffold_sequence")}</th>
            <th id="polyT_length" onClick={() => handleSort("polyT_length")}>PolyT Length {renderSortIcon("polyT_length")}</th>
            <th id="gRNA_scaffold_sequence_length" onClick={() => handleSort("gRNA_scaffold_sequence_length")}>gRNA Scaffold Sequence Length {renderSortIcon("gRNA_scaffold_sequence_length")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelect(item.id)}
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
