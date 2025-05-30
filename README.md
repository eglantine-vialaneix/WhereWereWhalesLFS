# Website of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Camille Challier | 311020 |
| Cyrill Strassburg | 377372 |
| Eglantine Vialaneix | 324293 |

## Usage

Explore the live interactive visualization and learn more about our findings.
🌐 [Final Project Website](https://eglantine-vialaneix.github.io/WhereWereWhalesLFS/)  

- Open `index.html` in a web browser to start exploring the website.  
- Use `maps.html` to view whale sightings and threat visualizations on interactive maps.  
- Explore evolutionary relationships on `phylogenetic_tree.html`.  
- View detailed species profiles and search functionality via `profiles.html` and `profiles_search.html`.

---

## Organisation

- All scripts are written in JavaScript and use D3.js for data visualization.  
- Stylesheets are located within the `docs` folder, organized by feature for easy maintenance.  
- Data files are stored separately in the `data` directory for clarity and separation of concerns.

```
.
├── README.md
│
├── data
│   ├── Copernicus_temperature_plot.csv
│   │
│   ├── PhylogeneticTree
│   │   ├── Figure_S1.pdf
│   │   ├── Figure_S1_Cetacea_screenshot.png
│   │   ├── Figure_S3.pdf
│   │   ├── Figure_S3_Cetacea_screenshot.png
│   │   ├── hierarchical_tree.json
│   │   ├── paper_phylogenomic_cetacean_tree.pdf
│   │   └── species_tree_of_life.csv
│   │
│   ├── WikipediaImages
│   │   └── image_urls.csv
│   │
│   ├── cetacean_names.json
│   ├── df_traffic_plot.csv
│   ├── direct_catches_plot.csv
│   ├── grouped_species.csv
│   └── simplified_marine_data.geojson
│
│
├── docs
│   ├── assets
│   │
│   ├── styles.css
│   │
│   ├── challenges
│   │   ├── BarChartRace.js
│   │   ├── climate.js
│   │   ├── main.js
│   │   └── traffic_plot.js
│   │
│   ├── maps
│   │   ├── circle.js
│   │   ├── maps.js
│   │   └── style.css
│   │
│   ├── notebooks
│   │   ├── data_exploration.ipynb
│   │   ├── image_url_scrapper.py
│   │   └── images.ipynb
│   │
│   ├── profiles
│   │   ├── profiles.js
│   │   └── style.css
│   │
│   └── tree
│       └── phylo_tree.js
│
│
├── index.html
├── maps.html
├── phylogenetic_tree.html
├── profiles.html
└── profiles_search.html

```
