export interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

export interface Experiment {
  id: number
  name: string
  description: string | null
  hypothesis: string | null
  owner: string | null
  workspace_id: number | null
  status: string
  experiment_type: string
  primary_metric: string | null
  secondary_metrics: string | null
  start_date: string | null
  end_date: string | null
  control_allocation: number
  treatment_allocation: number
  target_audience: string | null
  expected_uplift: number | null
  created_at: string
  updated_at: string | null
  variants: Variant[]
}

export interface Variant {
  id: number
  name: string
  description: string | null
  allocation: number
  is_control: boolean
}

export interface ExperimentListResponse {
  experiments: Experiment[]
  total: number
  page: number
  page_size: number
}

export interface Dataset {
  id: number
  experiment_id: number | null
  filename: string
  original_filename: string
  file_size_bytes: number
  row_count: number
  column_count: number
  quality_score: number | null
  column_mapping: string | null
  status: string
  created_at: string
  columns: DatasetColumn[]
}

export interface DatasetColumn {
  id: number
  name: string
  data_type: string
  null_count: number
  null_percentage: number
  unique_count: number
  is_mapped: boolean
  mapped_to: string | null
}

export interface ExperimentResult {
  id: number
  experiment_id: number
  metric_name: string
  control_mean: number
  treatment_mean: number
  absolute_difference: number
  relative_uplift: number
  control_sample_size: number
  treatment_sample_size: number
  p_value: number | null
  confidence_level: number | null
  confidence_interval_lower: number | null
  confidence_interval_upper: number | null
  statistical_power: number | null
  mde: number | null
  test_used: string | null
  test_explanation: string | null
  is_significant: boolean
  control_median: number | null
  treatment_median: number | null
  control_variance: number | null
  treatment_variance: number | null
  control_std: number | null
  treatment_std: number | null
  created_at: string
}

export interface SegmentResult {
  id: number
  experiment_id: number
  segment_name: string
  segment_value: string
  control_sample_size: number
  treatment_sample_size: number
  control_mean: number
  treatment_mean: number
  relative_uplift: number
  p_value: number | null
  is_significant: boolean
  confidence_level: number | null
}

export interface OverviewData {
  stats: {
    active_experiments: number
    completed_experiments: number
    average_uplift: number | null
    significant_experiments: number
    revenue_impact: number | null
  }
  status_distribution: Record<string, number>
  top_experiments: any[]
  recent_activities: any[]
  total_experiments: number
}

export interface MonitorData {
  active_experiments: number
  alerts: any[]
  experiments: any[]
}

export interface Report {
  id: number
  experiment_id: number
  title: string
  report_type: string
  status: string
  file_size_bytes: number
  created_at: string
}
