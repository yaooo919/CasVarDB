import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tooltip, OverlayTrigger, Modal, Button } from 'react-bootstrap';
import axios from "axios";
import ReactPaginate from "react-paginate";
import './Data.css';
import colDescriptionImg from "../assets/col-description.png";

const studyURLs = {
  "['Base Editor']": "https://www.nature.com/articles/s41587-023-01792-x",
  "['xCas9_NG']": "https://www.nature.com/articles/s41551-019-0505-1",
  "['Small Cas9']": "https://www.nature.com/articles/s41592-023-01875-2",
  "['DeepHF']": "https://www.nature.com/articles/s41467-019-12281-8",
  "['SpCas9']": "https://www.nature.com/articles/s41587-020-0537-9",
  "['Sniper']": "https://www.science.org/doi/10.1126/sciadv.aax9249",
  "['Wild SpCas9']": "https://www.science.org/doi/10.1126/sciadv.aax9249",
}

const columnDescriptions = {
  "spacer_sequence_raw": {
    title: "Spacer Sequence (Raw)",
    short: "The DNA representation of the sgRNA's spacer region",
    full: (
      <>
        <p>The DNA representation of the sgRNA's spacer region without any added padding. 
        A 5' guanosine (G) was added if it was missing (i.e., implied) in the raw sequences from the source data. 
        Different Cas9 variants may have different lengths, but the spacer sequence is typically 20 nt long for SpCas9.</p>
        <img src={colDescriptionImg} alt="sequence diagram" style={{ width: "100%", height: "auto" }} />
      </>
    )
  },
  "target_context_sequence_raw": {
    title: "Target Sequence (Raw)",
    short: "Target context sequence taken from the non-target DNA strand",
    full: (
      <>
        <p>The original target context sequence taken directly from the non-target DNA strand in the source data. It includes</p>
        <ul>
          <li><b>5' context sequence:</b> Optional nucleotides upstream of the target sequence</li>
          <li><b>target sequence:</b> Main target sequence (e.g., 20 nt for SpCas9)</li>
          <li><b>PAM sequence:</b> Protospacer Adjacent Motif, specific to each Cas9 variant (e.g., 5'-NGG for SpCas9)</li>
          <li><b>3' context sequence:</b> Optional nucleotides downstream of the PAM</li>
        </ul>
        <img src={colDescriptionImg} alt="sequence diagram" style={{ width: "100%", height: "auto" }} />
      </>
    ),
  },
  "spacer_sequence": {
    title: "Spacer Sequence",
    short: "The padded version of the raw spacer sequence",
    full: (
      <>
        <p>The padded version of the raw spacer sequence, with 'N' padding added to the 5' and 3' ends. The padding extends the total length of the spacer sequence to 42 nt, ensuring alignment with the target context sequence.</p>
        <img src={colDescriptionImg} alt="sequence diagram" style={{ width: "100%", height: "auto" }} />
      </>
    ),
  },
  "target_context_sequence": {
    title: "Target Context Sequence",
    short: "The padded version of the raw target sequence",
    full: (
      <>
        <p>Derived from the raw target sequence with added 'N' padding on both the 5' and 3' ends to align the PAM with the 28th nucleotide position. The full padded sequence is 42 nt long and can be divided into</p>
        <ul>
          <li><b>5' context + target:</b> 27 nt</li>
          <li><b>PAM + 3' context:</b> 15 nt</li>
        </ul>
        <img src={colDescriptionImg} alt="sequence diagram" style={{ width: "100%", height: "auto" }} />
      </>
    ),
  },
  "variant": {
    title: "Variant",
    short: "The protein containing the Cas9 nuclease",
    full: (
      <>
        <p>The protein containing the Cas9 nuclease. Variants come in two types, </p>
        <ul>
          <li><b>Cas9-NLS-FLAG-P2A:</b> for nucleases not from the "Small Cas9" paper. </li>
          <li><b>NLS-Cas9-NLS-FLAG-P2A:</b> for nucleases from the "Small Cas9" paper. </li>
        </ul>
        <p>In these names, <b>NLS</b> refers to a nuclear localization signal, <b>FLAG</b> refers to the FLAG protein tag, and <b>P2A</b> is a type of 2A peptide.</p>
      </>
    )
  },
  "nuclease": {
    title: "Nuclease",
    short: "The Cas9 nuclease contained within each variant",
    full: "The Cas9 nuclease contained within each variant."
  },
  "gRNA_scaffold": {
    title: "gRNA Scaffold",
    short: "The scaffold of the sgRNA",
    full: (
      <>
        <p>The scaffold of the sgRNA, consisting of the repeat-anti-repeat loop and other stem loops.</p>
        See <a href="/grna" style={{ color: 'blue', textDecoration: 'underline' }} target="_blank">gRNA Scaffold</a> for more details.
      </>
    )
  },
  "day": {
    title: "Day",
    short: "The timepoint at which indel frequencies were measured",
    full: "The timepoint at which indel frequencies were measured. After introducing Cas9 into cells via transfection (for \"Wild SpCas9,\" \"xCas9_NG,\" and \"DeepHF\" studies) or transduction (for \"SpCas9,\" \"Small Cas9,\" \"Base Editor,\" and \"Sniper\" studies), cells were harvested and indel frequencies were analyzed by deep sequencing."
  },
  "tRNA_feature": {
    title: "tRNA Feature",
    short: "Whether tRNA-associated processing happened",
    full: "Indicates whether tRNA-associated processing happened. If so, the tRNA-N20 sgRNA was cleaved to yield an N20 sgRNA (for more details, refer to Supplementary Figure 3 of the \"SpCas9\" study)."
  },
  "study": {
    title: "Study",
    short: "The source study from which the data was obtained.",
    full: (
      <>
        <p>The source study from which the data was obtained. Each study has an abbreviated name.
          See <a href="/studies" style={{ color: 'blue', textDecoration: 'underline' }}>Studies</a> for more details.
        </p>
      </>
    )
  },
  "library": {
    title: "Library",
    short: "The lentiviral library used for the data point",
    full: "The lentiviral library used for the data point."
  },
  "table_number": {
    title: "Table",
    short: "The supplementary table number from the publication containing the data",
    full: "The supplementary table number from the publication containing the data."
  },
  "sheet_number": {
    title: "Sheet",
    short: "The sheet in the supplementary table where the data can be found",
    full: "The sheet in the supplementary table where the data can be found."
  },
  "src_idx": {
    title: "src_idx",
    short: "Row number in the sheet corresponding to the specific data point",
    full: "Row number in the sheet corresponding to the specific data point."
  },
  "n_data": {
    title: "n_data",
    short: "Number of times the experiment was repeated for the same guide-target-scaffold-Cas9 combination",
    full: "Number of times the experiment was repeated for the same guide-target-scaffold-Cas9 combination."
  },
  "partition": {
    title: "Partition",
    short: "The part the data point belongs to",
    full: "Indicates whether the data point was used in deep learning, and if so, whether it was part of the training or test set, or which fold it belongs to."
  },
  "barcode": {
    title: "Barcode",
    short: "A unique identifier for each experiment",
    full: "A unique identifier for each experiment, allowing identification of individual experiments, especially where some guide-target pairs were included multiple times for reliable data recovery. "
  },
  "number_of_mismatches": {
    title: "Number of Mismatches",
    short: "Number of base mismatches between spacer and target sequences",
    full: (
      <>
        <p>Number of base mismatches between spacer and target sequences. Mismatches are highlighted in red.</p>
      </>
    )
  },
  "background_subtracted_indel_frequencies": {
    title: "Background Subtracted Indel Frequencies (%)",
    short: "A list of lists of floats, where each inner list corresponds to data from a single study",
    full: "This is represented as a list of lists of floats, where each inner list corresponds to data from a single study. Each float in these lists is capped at 100 but may occasionally fall slightly below zero due to experimental error."
  },
  "mean_background_subtracted_indel_frequency_source": {
    title: "Mean Background Subtracted Indel Frequency (Source, %)",
    short: "A list of floats, where each float represents the average value of the Background Subtracted Indel Frequencies (%) for a corresponding list",
    full: (
      <>
        <p>A list of floats, where each float represents the average value of the <b> Background Subtracted Indel Frequencies (%)</b> for a corresponding list.</p>
      </>
    )
  },
  "mean_background_subtracted_indel_frequency": {
    title: "Mean Background Subtracted Indel Frequency",
    short: "A single float obtained through a weighted average",
    full: (
      <>
        <p>This is a single float obtained through a weighted average. The weights are the number of floats in each list in <b>Background Subtracted Indel Frequencies (%)</b>, and the values are the floats in <b>Mean Background Subtracted Indel Frequency (Source, %)</b>. It is computed as the dot product of these two vectors divided by the sum of the weights.</p>
      </>
    )
  }
}

function Data() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchField, setSearchField] = useState(searchParams.get("field") || "spacer_sequence_raw");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
  const [pendingSearchField, setPendingSearchField] = useState(searchField);
  const [loading, setLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({title:"", full:""});

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("ASC");
  
  const startIndex = (currentPage - 1) * pageSize;
  const startItem = totalItems > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(startIndex + pageSize, totalItems);
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

  const fetchData = async() => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/data`, {
        params: {
          page: currentPage,
          pageSize,
          searchField,
          searchTerm,
          sortField,
          sortDirection,
        },
      });
      setItems(response.data.rows);
      setTotalItems(response.data.total);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, searchField, searchTerm, sortField, sortDirection]);

  const handleSearch = () => {
    setSearchField(pendingSearchField); 
    setSearchParams({ field: pendingSearchField, query: searchTerm });
    setCurrentPage(1);
    setLoading(true);
  };

  const handleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

  const handlePageClick = (data) => {
    setCurrentPage(data.selected + 1);
  }

  const handleDownload = async () => {
    if (selectedItems.length === 0) {
      alert("No items selected for download");
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/download`, {
        selectedIds: selectedItems,
      }, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: "text/csv"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "selected_data.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading data:", err)
    }
  };

  const renderTooltip = (column) => (
    <Tooltip id={`tooltip-${column}`}>
      {columnDescriptions[column].short} <br />
      <a 
        href="#"
        onClick={(event) => {
          event.stopPropagation();
          handleShowModal(column);
        }}
        style={{ fontSize: '12px', color: 'blue', textDecoration: 'underline' }}
      >
        View More
      </a>
    </Tooltip>
  );

  const handleShowModal = (column) => {
    setModalContent({
      title: columnDescriptions[column].title,
      full: columnDescriptions[column].full
    });
    setShowModal(true);
  }

  const handleCloseModal = () => setShowModal(false);

  const handleSort = (column) => {
    setSortField(column);
    setSortDirection((prevDirection) =>
      prevDirection === "ASC" ? "DESC" : "ASC"
    );
    setCurrentPage(1);
  };

  const renderSortIcon = (column) => {
    if (sortField === column) {
      return sortDirection === "ASC" ? (<i className="bi bi-caret-up-fill"></i>) : (<i className="bi bi-caret-down-fill"></i>);
    }
    return null;
  }

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
                value={pendingSearchField}
                onChange={(e) => setPendingSearchField(e.target.value)}
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
                <option value="number_of_mismatches">Number of mismatches</option>
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

      <div className="legend">
          <span className="color-box" style={{ backgroundColor: "#bfee90" }}></span> Matched bases
          <span className="color-box" style={{ backgroundColor: "#BF2C34" }}></span> Mismatched bases
          {/* <span className="color-box" style={{ backgroundColor: "#43A5BE" }}></span> PAM */}
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

              {Object.keys(columnDescriptions).map((column) => (
                <th
                  key={column}
                  onMouseEnter={() => setHoveredColumn(column)}
                  onMouseLeave={() => setHoveredColumn(null)}
                  onClick={() => handleSort(column)}
                >                            
                <OverlayTrigger
                  show={hoveredColumn === column}
                  placement="top"
                  overlay={renderTooltip(column)}
                >
                <span>{columnDescriptions[column].title} {renderSortIcon(column)}</span>
                </OverlayTrigger>
                </th>
              ))}                        
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="20" style={{ textAlign: "center", fontSize: "16px", padding: "20px" }}>
                  Loading...
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const highlightSequence = (targetContextSequenceRaw, bestMatchingSubstring, mismatchIndexes) => {
                  const cleanBestMatch = bestMatchingSubstring.replace(/\r/g, "");                
                  const matchIndex = targetContextSequenceRaw.indexOf(cleanBestMatch);
                
                  if (matchIndex === -1) {
                    return targetContextSequenceRaw;
                  }

                  const mismatchPositions = mismatchIndexes ? mismatchIndexes.split("|").map(num => parseInt(num)) : [];
                
                  let highlightedSubstring = '';
                  for (let i = 0; i < cleanBestMatch.length; i++) {
                    const globalIndex = matchIndex + i;
                    if (mismatchPositions.includes(globalIndex)) {
                      highlightedSubstring += `<span style="color: #BF2C34;">${cleanBestMatch[i]}</span>`;
                    } else {
                      highlightedSubstring += `<span style="color: #bfee90;">${cleanBestMatch[i]}</span>`;
                    }
                  }

                  // let highlightedExtra = '';
                  // for (let i = 0; i < 3; i++) {
                  //   const nextChar = targetContextSequenceRaw[matchIndex + cleanBestMatch.length + i];
                  //   highlightedExtra += `<span style="color: #43A5BE;">${nextChar}</span>`;
                  // }

                  const highlightedSequence = 
                    targetContextSequenceRaw.slice(0, matchIndex) +
                    highlightedSubstring +
                    // highlightedExtra +
                    targetContextSequenceRaw.slice(matchIndex + cleanBestMatch.length);

                  return highlightedSequence;
                };
                
                const highlightSpacerSequence = (spacerSequence, spacerSequenceRaw) => {
                  if (!spacerSequenceRaw) return spacerSequence;
                
                  const regex = new RegExp(spacerSequenceRaw, "g");
                
                  return spacerSequence.replace(regex, `<span style="color: #bfee90;">${spacerSequenceRaw}</span>`);
                };

                const highlightTargetContext = (targetContextSequence, targetContextSequenceRaw) => {
                  if (!targetContextSequenceRaw) return targetContextSequence;
                
                  const matchIndex = targetContextSequence.indexOf(targetContextSequenceRaw);
                
                  if (matchIndex === -1) {
                    return targetContextSequence; 
                  }
                
                  return (
                    targetContextSequence.substring(0, matchIndex) +
                    highlightSequence(item.target_context_sequence_raw, item.best_matching_substring, item.mismatch_indexes) +
                    targetContextSequence.substring(matchIndex + targetContextSequenceRaw.length)
                  );
                };
                
                
                
               return (
                <tr key={item.id}>
                  <td>
                      <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelect(item.id)}
                      />
                  </td>
                  <td>{item.spacer_sequence_raw}</td>
                  <td dangerouslySetInnerHTML={{ __html: highlightSequence(item.target_context_sequence_raw, item.best_matching_substring, item.mismatch_indexes) }}></td>
                  <td dangerouslySetInnerHTML={{ __html: highlightSpacerSequence(item.spacer_sequence, item.spacer_sequence_raw) }}></td>
                  <td dangerouslySetInnerHTML={{ __html: highlightTargetContext(item.target_context_sequence, item.target_context_sequence_raw) }}></td>
                  <td>{item.variant}</td>
                  <td>{item.nuclease}</td>
                  <td>{item.gRNA_scaffold}</td>
                  <td>{item.day}</td>
                  <td>{item.tRNA_feature}</td>
                  <td><a href={studyURLs[item.study]} style={{ color:"#3a89c9"}}>{item.study}</a></td>
                  <td>{item.library}</td>
                  <td>{item.table_number}</td>
                  <td>{item.sheet_number}</td>
                  <td>{item.src_idx}</td>
                  <td>{item.n_data}</td>
                  <td>{item.partition}</td>
                  <td>{item.barcode}</td>
                  <td>{item.number_of_mismatches}</td>
                  <td>{item.background_subtracted_indel_frequencies}</td>
                  <td>{item.mean_background_subtracted_indel_frequency_source}</td>
                  <td>{item.mean_background_subtracted_indel_frequency}</td>
                </tr>
              );
            })
          )}
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
            forcePage={currentPage - 1}  
          />
        </div>
      </div>

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop="static" 
        keyboard={true}   
        centered          
      >
        <Modal.Header>
          <Modal.Title>{modalContent.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalContent.full}</Modal.Body>
        <Modal.Footer>
          <Button id="modal-button" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>      
    </div>
  )
}

export default Data;