
export interface TravelPhoto {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export interface TravelTrip {
  id: string;
  title: string;
  location: string;
  country: string;
  description: string;
  coverImageUrl: string | null;
  photos: TravelPhoto[];
}

export interface TravelTripRequest {
  title: string;
  location: string;
  country: string;
  description: string;
  coverImageUrl: string | null;
}

export interface TravelPhotoRequest {
  imageUrl: string;
  caption: string | null;
}
