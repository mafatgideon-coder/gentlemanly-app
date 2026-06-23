export type Category =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "footwear"
  | "accessories"

export interface DetectedItem {
  name: string
  category: Category
  subcategory: string
  color: string
  pattern: string
  description: string
  confidence: number
  bbox: [number, number, number, number] | null // [x1, y1, x2, y2] normalized 0–1
}

export interface Outfit {
  id: string
  user_id: string
  photo_url: string
  flatlay_url: string | null
  occasion: string | null
  notes: string | null
  item_count: number
  items: DetectedItem[] | null
  is_favorite: boolean
  logged_at: string
  created_at: string
}


export type Occasion =
  | "Church"
  | "Recording"
  | "Date Night"
  | "Travel"
  | "Casual"
  | "Meeting"
  | "Other"
