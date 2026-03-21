// ... (Existing types remain unchanged)

export enum CalculatorType {
  PAINT = 'PAINT',
  CONCRETE = 'CONCRETE',
  TILES = 'TILES',
  RAGREAGE = 'RAGREAGE', // Leveling compound
  PLACO = 'PLACO', // Drywall
  STRUCTURAL = 'STRUCTURAL', // Legacy / Generic
  GROUNDWORK = 'GROUNDWORK', // Terrassement
  FOUNDATIONS = 'FOUNDATIONS', // Fondations
  SUBSTRUCTURE = 'SUBSTRUCTURE', // Soubassement
  WALLS = 'WALLS', // Murs
  STAIRS = 'STAIRS', // Escalier Béton
  // New Types
  ROOF = 'ROOF', // Toiture / Charpente
  JOINERY = 'JOINERY', // Menuiseries (Windows/Doors)
  SCREED = 'SCREED', // Chapes
  ELECTRICITY = 'ELECTRICITY',
  PLUMBING = 'PLUMBING',
  HVAC = 'HVAC', // Chauffage / VMC
  FACADE = 'FACADE', // Enduit / Bardage
  EXTERIOR = 'EXTERIOR', // Terrasse / Clôture
  QUICK_TOOLS = 'QUICK_TOOLS' // Calculs rapides chantier
}

export enum Unit {
  M2 = 'm²',
  M3 = 'm³',
  LITER = 'L',
  KG = 'kg',
  PIECE = 'unit',
  BAG = 'sac',
  BOX = 'boîte',
  BUCKET = 'pot',
  PLATE = 'plaque',
  PANEL = 'panneau',
  BAR = 'barre',
  METER = 'm',
  TON = 'T',
  PALLET = 'palette',
  ROLL = 'rlx',
  HOUR = 'h',
  DAY = 'j',
  PACKAGE = 'forfait',
  ROTATION = 'rot.'
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number; // Final quantity (rounded/packaged)
  quantityRaw: number; // Exact calculated quantity
  unit: Unit;
  unitPrice: number;
  totalPrice: number;
  category: CalculatorType;
  details?: string; // e.g. "2 pots de 10L + 1 pot de 2.5L"
  stepId?: string; // Linked to a specific construction step

  /**
   * Optional reference key to a system catalog item (DEFAULT_PRICES key).
   * If present, UI can display the matching catalog image and metadata.
   * Example: "BLOCK_20_UNIT"
   */
  refKey?: string;

  /** Optional direct image URL override for this line item */
  imageUrl?: string;
}

export interface CalculatorSnapshot {
  version: number;
  calculatorType: CalculatorType;
  values: Record<string, unknown>;
}

export interface CalculationResult {
  summary: string;
  details: { label: string; value: string | number; unit?: string }[];
  materials: MaterialItem[];
  totalCost: number;
  warnings?: string[]; // e.g. "Attention: Support poreux"
  snapshot?: CalculatorSnapshot;
}

// Legacy Project (Simple List)
export interface Project {
  id: string;
  name: string;
  date: string;
  items: MaterialItem[];
  notes: string;

  /**
   * Optional calculator metadata used to reopen the originating calculator
   * from a saved project or from a quote created from that project.
   */
  calculatorType?: CalculatorType;
  calculatorLabel?: string;
  calculatorSnapshot?: CalculatorSnapshot;
}

// --- NEW: Full House Project ---

export enum ConstructionStepId {
  STUDIES = 'studies',
  GROUNDWORK = 'groundwork',
  FOUNDATIONS = 'foundations',
  BASEMENT = 'basement', // Soubassement (Murs/Drainage)
  SLAB_GROUND = 'slab_ground', // Dalle RDC (Beton)
  WALLS = 'walls',
  STAIRS = 'stairs', // Escalier
  SLAB_UPPER = 'slab_upper',
  ROOF_FRAME = 'roof_frame',
  ROOFING = 'roofing',
  WINDOWS = 'windows',
  INSULATION_AIR = 'insulation_air',
  LINING = 'lining', // Doublage
  PARTITIONS = 'partitions', // Cloisons
  CEILINGS = 'ceilings', // Plafonds
  ELECTRICITY = 'electricity',
  PLUMBING = 'plumbing',
  HVAC = 'hvac',
  SCREED = 'screed',
  FLOORING = 'flooring',
  FACADE = 'facade',
  PAINTING = 'painting',
  EXTERIOR = 'exterior'
}

// --- QUOTE SYSTEM TYPES ---

export interface QuoteSettings {
  taxRate: number; // e.g. 20
  marginPercent: number; // e.g. 10
  discountAmount: number; // e.g. 500
  showLabor: boolean;
}

export interface QuoteManualLine {
  id: string;
  stepId: string | 'global'; // Linked to a step or general
  label: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  category: 'labor' | 'material' | 'service';
}

export interface QuoteData {
  settings: QuoteSettings;
  manualLines: QuoteManualLine[];
  updatedAt: string;
}

export type QuoteSourceKind = "simple_project" | "house_project" | "house_step";

export interface QuoteSource {
  kind: QuoteSourceKind;
  projectId?: string;
  calculatorType?: CalculatorType;
  stepId?: ConstructionStepId;
  stepIds?: ConstructionStepId[];
}

export interface HouseProject {
  id: string;
  name: string;
  date: string;

  // Global Parameters
  params: {
    surfaceArea: number; // m² Habitable
    groundArea: number; // m² Emprise
    perimeter: number; // m
    levels: number; // 1 (RDC), 2 (R+1)
    ceilingHeight: number;
  };

  // Steps Data
  steps: Partial<
    Record<
      ConstructionStepId,
      {
        status: 'pending' | 'done';
        materials: MaterialItem[];
        cost: number;
        notes?: string;

        /**
         * Optional metadata used to reopen the exact calculator/step state
         * that produced this construction step.
         */
        calculatorType?: CalculatorType;
        calculatorSnapshot?: CalculatorSnapshot;
      }
    >
  >;

  // Dynamic Quote Data
  quote?: QuoteData;
}

export interface CalculatorConfig {
  id: CalculatorType;
  name: string;
  icon: string;
  color: string;
  description: string;

  // ✅ AJOUT (optionnel)
  imageSrc?: string; // ex: "/images/calculators/terrassement.png"
  imageAlt?: string; // texte alternatif SEO/accessibilité
}


export interface UserSettings {
  currency: string;
  taxRate: number;
  isPro: boolean;
}

// --- MATERIAL MANAGEMENT TYPES (ADVANCED) ---

export interface MaterialMetadata {
  label: string;
  category: string;
  unit: string;

  /** Optional UI illustration URL (Materials list, calculators, saved projects) */
  imageUrl?: string;
}

export interface CustomMaterial {
  id: string;
  label: string;
  category: string;
  unit: Unit | string;
  price: number; // HT Price
  createdAt: number;
}

export interface TaxSettings {
  mode: 'HT' | 'TTC';
  vatRate: number; // 20, 10, 5.5
}

export interface LaborSettings {
  globalHourlyRate: number;
  enabled: boolean;
  // Could add specific rates per category later
}

export interface UsageStats {
  count: number;
  lastUsedAt: number;
}

// Global App Data Store Interface (for Export/Import)
export interface AppDataBackup {
  version: number;
  exportedAt: number;
  customPrices: Record<string, number>;
  customMaterials: CustomMaterial[];
  favorites: string[];
  usage: Record<string, UsageStats>;
  mappings: Record<string, string>; // systemKey -> customId
  taxSettings: TaxSettings;
  laborSettings: LaborSettings;
  // Added for Documents
  companyProfile?: CompanyProfile;
  quotes?: QuoteDocument[];
  invoices?: InvoiceDocument[];
  docCounters?: any;
}

// --- DOCUMENTS MODULE TYPES ---

export interface CompanyProfile {
  name: string;
  address: string;
  city: string;
  zip: string;
  phone: string;
  email: string;
  siret: string;
  tvaNumber?: string;
  logoUrl?: string; // base64 or url
  footerNote?: string; // "Dispensé d'immatriculation..." or Bank details
  terms?: string; // Conditions générales
}

export interface ClientInfo {
  name: string;
  address: string;
  city: string;
  zip: string;
  email?: string;
  phone?: string;
}

export type DocumentStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'invoiced'
  | 'paid'
  | 'late';

export interface DocumentLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalHT: number;
  vatRate: number; // 0, 5.5, 10, 20
}

export interface BaseDocument {
  id: string;
  projectId?: string; // Link to HouseProject
  number: string; // "DEV-2024-001"
  createdAt: string;
  date: string; // Date displayed
  validUntil?: string; // For quotes
  client: ClientInfo;
  lines: DocumentLine[];

  // Totals (snapshot)
  totalHT: number;
  totalVAT: number;
  totalTTC: number;

  notes?: string; // Private or displayed
}

export interface QuoteDocument extends BaseDocument {
  type: 'quote';
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced';
  source?: QuoteSource;
}

export interface InvoiceDocument extends BaseDocument {
  type: 'invoice';
  status: 'draft' | 'sent' | 'paid' | 'late';
  quoteSourceId?: string; // Linked Quote
  paymentDate?: string;
}

// --- Precision Types ---

export interface SubstrateDef {
  id: string;
  label: string;
  absorptionFactor: number; // 1 = normal, 1.2 = needs 20% more paint
}

export interface PackagingDef {
  size: number;
  unit: Unit;
  label: string;
  labelShort?: string;
}

export interface MeshType {
  id: string;
  label: string;
  weightKgM2: number;
  width: number;
  height: number;
}

// --- Groundwork Types ---

export interface SoilDef {
  id: string;
  label: string;
  bulkingFactor: number; // Coef de foisonnement (ex: 1.3 for 30%)
  density: number; // T/m3 approx
}

export interface ExcavationItem {
  id: string;
  type: 'trench' | 'pit' | 'mass' | 'other';
  label: string;
  length: number;
  width: number;
  depth: number;
  quantity: number;
  slopeRatio?: number; // 0 for vertical
}

// --- Foundation Types (Advanced) ---

export interface FoundationDef {
  id: string;
  label: string;
  defaultWidth: number; // m
  defaultDepth: number; // m
}

export interface ReinforcementDef {
  id: string;
  label: string;
  type: 'cage' | 'mesh' | 'bar';
  unit: Unit;
}

export type FoundationType = 'strip' | 'pad' | 'grade_beam';

export interface PadConfig {
  id: string;
  count: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  depthCm: number;
}

export interface FoundationProjectInputs {
  mode: 'simple' | 'pro';
  type: FoundationType;

  // Geometry
  totalLengthMl: number;
  stripWidthCm: number;
  stripHeightCm: number;
  pads: PadConfig[];

  // Site
  excavationDepthCm: number;
  trenchOverwidthCm: number;
  soilType: string;
  frostDepthCm: number;
  groundwater: boolean;

  // Options
  cleanConcrete: boolean;
  cleanConcreteThickCm: number;
  formwork: boolean;
  drainage: boolean;
  drainageGravel: boolean;

  // Logistics
  evacuateSpoil: boolean;
  reuseSpoil: boolean;

  // Reinforcement
  steelRatio: number; // kg/m3
}
