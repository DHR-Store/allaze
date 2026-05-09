# 🧬 Allaze – DNA Analyzer Pro

A comprehensive web-based bioinformatics platform for DNA sequence analysis, variant detection, and 3D protein structure visualization. Allaze combines powerful sequence alignment algorithms with interactive visualization tools to streamline genomic research and clinical analysis.

## 📋 Overview

Allaze is a modern React-based application designed for researchers, clinicians, and bioinformaticians to:
- Analyze DNA sequences and detect genetic variants/mutations
- Perform BLAST sequence similarity searches
- Visualize 3D protein structures with mutations
- Generate comprehensive analysis reports with interactive charts

**Live Demo:** [https://allaze-sooty.vercel.app](https://allaze-sooty.vercel.app)

## ✨ Key Features

### 🚀 Run Analysis Tab
- **Sequence Input:** Upload or paste reference and patient DNA sequences
- **Variant Detection:** Automatically identify mutations and differences between sequences
- **Gene Identification:** Auto-detect genes from BLAST results
- **Interactive Charts:** Visualize mutation statistics with Chart.js
- **Real-time Updates:** Live mutation count and analysis status

### 🔍 BLAST Search Tab
- **Sequence Similarity Search:** Query sequences against NCBI BLAST database
- **Multiple BLAST Hits:** View and filter top database matches
- **Gene Detection:** Extract gene names from BLAST descriptions
- **Results Management:** Integrate BLAST findings with analysis pipeline
- **Hit Visualization:** Sortable results with alignment scores

### 🏗 3D Structure Tab
- **Protein Structure Viewer:** Interactive 3D visualization of protein structures
- **Mutation Mapping:** Highlight genetic variants on protein surface
- **Multiple Representations:** Cartoon, ribbon, stick, and ball-and-stick views
- **Color Schemes:** Chain-based, element, and residue coloring options
- **Custom Settings:** Toggle 2D/3D views, labels, and visualization options
- **Swiss-Model Integration:** Query 3D protein models (protein identification required)

### ⚙️ Settings Tab
- **Display Preferences:** Configure 2D/3D viewer settings
- **Visualization Options:** Customize representation and color schemes
- **Data Display:** Toggle graph and table visualizations
- **Persistent Settings:** User preferences saved across sessions

## 🛠 Technology Stack

- **Frontend Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.0
- **Styling:** Bootstrap 5.3.0 with custom CSS
- **State Management:** Zustand 5.0.12
- **Charts & Visualization:** Chart.js 4.5.1 & react-chartjs-2 5.3.1
- **HTTP Client:** Axios 1.6.0
- **Language Composition:**
  - JavaScript: 99.9%
  - HTML: 0.03%
  - CSS: 0.07%

## 📦 Project Structure

```
allaze/
├── src/
│   ├── components/        # React UI components
│   │   ├── AnalysisTab.jsx
│   │   ├── BlastTab.jsx
│   │   ├── StructureTab.jsx
│   │   ├── SettingsTab.jsx
│   │   └── SettingsSwiss.jsx
│   ├── api/              # API integration modules
│   ├── store/            # State management (Zustand)
│   ├── styles/           # CSS stylesheets
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Main application component
│   └── index.jsx         # React DOM entry point
├── public/               # Static assets
├── index.html            # HTML entry point
├── package.json          # Project dependencies
├── vite.config.js        # Vite configuration
├── reference.fasta       # Sample reference DNA sequence
├── patient.fasta         # Sample patient DNA sequence
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DHR-Store/allaze.git
   cd allaze
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173
   ```

## 📖 Usage Guide

### Analyzing DNA Sequences

1. Navigate to the **"Run Analysis"** tab
2. Input reference sequence (FASTA format)
3. Input patient sequence (FASTA format)
4. Click "Analyze" to start the analysis
5. View detected variants and mutation statistics
6. Results update nav badge showing mutation count

### Performing BLAST Searches

1. Go to the **"BLAST Search"** tab
2. Enter a DNA sequence
3. Select BLAST parameters
4. Click "Search" to query database
5. Review hits with alignment scores
6. Gene names auto-detected from hit descriptions

### Viewing 3D Structures

1. Navigate to **"3D Structure"** tab
2. Enter gene name (from analysis or manual input)
3. System queries Swiss-Model for protein structure
4. Interact with 3D visualization:
   - Rotate: Click and drag
   - Zoom: Scroll wheel
   - Pan: Right-click and drag
5. Use settings to customize view

### Customizing Settings

1. Click **"⚙️ Settings"** tab
2. Toggle display options:
   - Show/hide 2D and 3D views
   - Toggle mutation highlighting
   - Change representation style (cartoon, ribbon, etc.)
   - Adjust color schemes
3. Settings persist automatically

## 🔧 Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Project Scripts
- `npm run dev` - Start Vite dev server
- `npm run build` - Build optimized production bundle
- `npm run preview` - Preview production build locally

## 📊 Features in Detail

### Mutation Detection Algorithm
- Compares reference and patient sequences position-by-position
- Identifies substitutions, insertions, and deletions
- Calculates mutation frequency and distribution
- Generates visual charts of variant hotspots

### BLAST Integration
- Queries NCBI BLAST API for sequence similarity
- Returns top database matches with E-values
- Extracts gene identifiers from descriptions
- Supports multiple sequence query types

### 3D Protein Visualization
- Integrates with Swiss-Model API
- Displays protein structures in interactive 3D canvas
- Highlights mutation sites on protein surface
- Multiple rendering modes and color schemes
- Label and annotation support

### State Management
- Zustand-based centralized state store
- Persistent user preferences
- Shared state across application tabs
- Efficient state updates and re-renders

## 🌐 API Integration

Allaze integrates with external bioinformatics services:
- **NCBI BLAST API** - Sequence similarity searches
- **Swiss-Model API** - 3D protein structure models
- **External bioinformatics tools** - Enhanced analysis capabilities

## 📝 Sample Data

The repository includes sample FASTA files for testing:
- `reference.fasta` - Reference DNA sequence
- `patient.fasta` - Patient DNA sequence for comparison

Load these files in the Analysis tab to test the full pipeline.

## 🎨 UI/UX Features

- **Responsive Design:** Bootstrap 5 responsive grid system
- **Tab Navigation:** Organized workflow with tabbed interface
- **Badge Indicators:** Real-time counters for analysis results
- **Status Messages:** Clear feedback on analysis progress
- **Interactive Charts:** Chart.js powered visualizations
- **Accessible Forms:** Labeled inputs and proper form structure

## 🔐 Data Privacy

- All analysis performed client-side where possible
- Sequences handled securely without permanent storage
- No personal data collected or stored
- Compliance with bioinformatics best practices

## 📈 Performance Optimization

- Vite's fast build tooling and HMR (Hot Module Replacement)
- Code splitting and lazy loading
- Efficient React rendering with hooks
- Optimized 3D visualization for smooth interaction

## 🤝 Contributing

Contributions are welcome! Areas for enhancement:
- Additional analysis algorithms
- Support for more file formats (GFF, VCF)
- Enhanced 3D visualization features
- Performance optimization
- Extended API integrations

## 📄 License

This project is open source. Check the repository for license details.

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? [Open an issue](https://github.com/DHR-Store/allaze/issues) on GitHub.

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [NCBI BLAST API](https://blast.ncbi.nlm.nih.gov/)
- [Swiss-Model](https://swissmodel.expasy.org/)
- [Bootstrap 5 Docs](https://getbootstrap.com/)

## 👨‍💻 Author

**DHR-Store** - [GitHub Profile](https://github.com/DHR-Store)

---

**Last Updated:** May 2026

**Status:** Active Development

Made with 🧬 for better genomic analysis and understanding
