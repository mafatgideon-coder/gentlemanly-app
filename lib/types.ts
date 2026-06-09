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
  description: string
}

export interface WardrobeItem {
  id: string
  user_id: string
  name: string
  category: Category
  subcategory: string
  color: string
  description: string
  wear_count: number
  last_worn: string
  created_at: string
}

export interface Outfit {
  id: string
  user_id: string
  photo_url: string
  flatlay_url: string | null
  occasion: string | null
  notes: string | null
  item_count: number
  logged_at: string
  created_at: string
}

export interface OutfitWithItems extends Outfit {
  items: WardrobeItem[]
}

export type Occasion =
  | "Church"
  | "Recording"
  | "Date Night"
  | "Travel"
  | "Casual"
  | "Meeting"
  | "Other"
