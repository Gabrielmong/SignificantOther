export interface Place {
  id: string;
  name: string; // "Our first date"
  emoji: string; // Shown on the pin
  latitude: number;
  longitude: number;
  venue?: string; // "La Terrazza, San José" (from search, editable)
  day?: string; // "YYYY-MM-DD", optional
  note?: string;
  createdAt: number;
  createdBy: string; // User ID who added it
  updatedAt?: number;
}

export interface PlaceObject {
  [key: string]: Place;
}
