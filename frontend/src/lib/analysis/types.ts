export type GeoTiffAnalysis = {
  success: boolean;
  filename: string;
  saved_filename: string;
  file_size_mb: number;
  metadata: {
    driver: string;
    width: number;
    height: number;
    bands: number;
    dtype: string;
    crs: string | null;
    crs_epsg: number | null;
    crs_is_projected: boolean;
    crs_unit: string | null;
    gsd_x: number;
    gsd_y: number;
    pixel_area_m2: number | null;
    image_area_m2?: number;
    tile_size?: number;
    bounds: { left: number; bottom: number; right: number; top: number };
  };
  validation: { is_valid: boolean; errors: string[]; warnings: string[] };
};

export type DetectedLocation = {
  region_id: number;
  confidence: number;
  mask_pixel_area: number;
  area_m2: number;
  center_pixel: { x: number; y: number };
  map_coordinate: { x: number; y: number; crs: string | null };
  latitude: number | null;
  longitude: number | null;
  bbox_pixel?: [number, number, number, number];
};

export type DetectionResult = {
  success: boolean;
  filename: string;
  analyzed_at?: string;
  image_width?: number;
  image_height?: number;
  tile_size?: number;
  tiles_processed?: number;
  panel_count: number;
  region_count?: number;
  confidence: number;
  mask_pixel_area: number;
  pixel_area_m2: number;
  detected_area_m2: number;
  capacity_kwp: number;
  daily_energy_kwh: number;
  area_method?: "equal_area";
  detected_locations?: DetectedLocation[];
  input_preview: string;
  result_image: string;
  region_geometry?: string;
};

export type AnalysisRecord = {
  id: string;
  analyzed_at: string | null;
  metadata: GeoTiffAnalysis;
  detection: DetectionResult;
};

export type UploadRequirements = {
  min_size: number;
  max_size: number;
  min_bands: number;
  sample_available?: boolean;
  recommended_min_gsd: number;
  max_gsd: number;
};
