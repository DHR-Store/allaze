import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useActivitiesStore = create(
  persist(
    (set, get) => ({
      // ---------- Analysis State ----------
      analysisResults: [],
      analysisGene: '',
      refSeq: '',
      patientSeq: '',
      seqId: '',
      analysisLog: '',
      isAnalysisLoading: false,

      setAnalysisResults: (results) => set({ analysisResults: results }),
      setAnalysisGene: (gene) => set({ analysisGene: gene }),
      setRefSeq: (seq) => set({ refSeq: seq }),
      setPatientSeq: (seq) => set({ patientSeq: seq }),
      setSeqId: (id) => set({ seqId: id }),
      setAnalysisLog: (log) => set({ analysisLog: log }),
      setIsAnalysisLoading: (loading) => set({ isAnalysisLoading: loading }),
      clearAnalysis: () => set({
        analysisResults: [],
        analysisGene: '',
        refSeq: '',
        patientSeq: '',
        seqId: '',
        analysisLog: '',
        isAnalysisLoading: false
      }),

      // ---------- BLAST State ----------
      blastQuery: '',
      blastHits: [],
      blastLog: '',
      isBlastLoading: false,

      setBlastQuery: (query) => set({ blastQuery: query }),
      setBlastHits: (hits) => set({ blastHits: hits }),
      setBlastLog: (log) => set({ blastLog: log }),
      setIsBlastLoading: (loading) => set({ isBlastLoading: loading }),
      clearBlast: () => set({
        blastQuery: '',
        blastHits: [],
        blastLog: '',
        isBlastLoading: false
      }),

      // ---------- Structure State ----------
      structureGene: '',
      structureInfo: null,
      selectedPdbUrl: '',
      structureLoading: false,

      setStructureGene: (gene) => set({ structureGene: gene }),
      setStructureInfo: (info) => set({ structureInfo: info }),
      setSelectedPdbUrl: (url) => set({ selectedPdbUrl: url }),
      setStructureLoading: (loading) => set({ structureLoading: loading }),
      clearStructure: () => set({
        structureGene: '',
        structureInfo: null,
        selectedPdbUrl: '',
        structureLoading: false
      }),

      // ---------- Helper to sync analysis → structure ----------
      syncAnalysisToStructure: () => {
        const { analysisGene, analysisResults, refSeq, patientSeq } = get();
        set({
          structureGene: analysisGene,
          // Keep mutations and sequences in structure state implicitly via getters
        });
      }
    }),
    {
      name: 'allaze-activities-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields (omit loading states)
        analysisResults: state.analysisResults,
        analysisGene: state.analysisGene,
        refSeq: state.refSeq,
        patientSeq: state.patientSeq,
        seqId: state.seqId,
        blastQuery: state.blastQuery,
        blastHits: state.blastHits,
        structureGene: state.structureGene,
        structureInfo: state.structureInfo,
        selectedPdbUrl: state.selectedPdbUrl,
      })
    }
  )
);

export default useActivitiesStore;