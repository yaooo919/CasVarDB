function Studies() {
    return (
      <div>
        <div className="header-container">
          <div className="header">
              <h1>Studies</h1>
          </div>
        </div>


        <table className="general-table-container"> 
          <thead>
            <tr>
                <th>Study</th>
                <th>Abbreviation</th>
                <th>Authors</th>
                <th>Year</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="https://www.nature.com/articles/s41587-023-01792-x">Deep learning models to predict the editing efficiencies and outcomes of diverse base editors</a></td>
              <td>Base Editor</td>
              <td>Kim et al.</td>
              <td>2023</td>
            </tr>
            <tr>
              <td><a href="https://www.nature.com/articles/s41551-019-0505-1">High-throughput analysis of the activities of xCas9, SpCas9-NG and SpCas9 at matched and mismatched target sequences in human cells</a></td>
              <td>xCas9_NG</td>
              <td>Kim et al.</td>
              <td>2020</td>
            </tr>
            <tr>
              <td><a href="https://www.nature.com/articles/s41592-023-01875-2">Massively parallel evaluation and computational prediction of the activities and specificities of 17 small Cas9s</a></td>
              <td>Small Cas9</td>
              <td>Seo et al.</td>
              <td>2023</td>
            </tr>
            <tr>
              <td><a href="https://www.nature.com/articles/s41467-019-12281-8">Optimized CRISPR guide RNA design for two high-fidelity Cas9 variants by deep learning</a></td>
              <td>DeepHF</td>
              <td>Wang et al.</td>
              <td>2019</td>
            </tr>
            <tr>
              <td><a href="https://www.nature.com/articles/s41587-020-0537-9">Prediction of the sequence-specific cleavage activity of Cas9 variants</a></td>
              <td>SpCas9</td>
              <td>Kim et al.</td>
              <td>2020</td>
            </tr>
            <tr>
              <td><a href="https://www.nature.com/articles/s41589-023-01279-5">Sniper2L is a high-fidelity Cas9 variant with high activity</a></td>
              <td>Sniper</td>
              <td>Kim et al.</td>
              <td>2023</td>
            </tr>
            <tr>
              <td><a href="https://www.science.org/doi/10.1126/sciadv.aax9249">SpCas9 activity prediction by DeepSpCas9, a deep learning–based model with high generalization performance</a></td>
              <td>Wild SpCas9</td>
              <td>Kim et al.</td>
              <td>2019</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
}

export default Studies;