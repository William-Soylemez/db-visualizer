export type Confidence = "Low" | "Medium" | "High" | "";

// GO term names are NOT stored alongside counts — resolve id -> name via go_terms.json.
export type GoTermCount = {
  id: string;
  count: number;
};

export type ClusterSummary = {
  hash: string;
  title: string;
  description: string;
  confidence: Confidence;
  size: number;
  edges: number;
  triangles: number;
  max_degree: number;
  top_function: string | null;
  top_go_terms: GoTermCount[];
};

export type ClusterGraphNode = {
  id: string;
  size: number;
  top_function: string | null;
};

export type ClusterGraphEdge = {
  source: string;
  target: string;
  weight: number;
};

export type ClusterGraph = {
  nodes: ClusterGraphNode[];
  edges: ClusterGraphEdge[];
};

export type ClusterMember = {
  accession: string;
  go_terms: string[];
};

export type ClusterDetail = {
  hash: string;
  title: string;
  description: string;
  confidence: Confidence;
  size: number;
  edges: number;
  triangles: number;
  max_degree: number;
  top_function: string | null;
  members: ClusterMember[];
  graph: [string, string, number][];
  all_go_terms: Record<string, number>;
  recipe_readded: string[];
};

export type ProteinDetail = {
  accession: string;
  pfam: string[];
  go_terms: string[];
  cluster_hash: string | null;
  ncbi_url: string;
};

export type SpeciesManifest = {
  id: string;
  display_name: string;
  taxid: number | null;
  lineage: string[];
  image_url: string | null;
  n_clusters: number;
  n_proteins: number;
  recipe: Record<string, string[]>;
  has_network_download: boolean;
};

export type SpeciesIndexEntry = {
  id: string;
  display_name: string;
  taxid: number | null;
  lineage: string[];
};

export type GoTerm = {
  name: string;
  namespace: string;
};
