export type Role = "USER" | "ARTIST" | "ADMIN";
export type PostType = "PHOTO" | "AUDIO" | "VIDEO" | "REEL";
export type BookingStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export interface ArtistCardData {
  id: string;
  handle: string;
  stageName: string;
  category: string;
  city: string;
  coverUrl: string | null;
  priceFrom: number;
  verified: boolean;
  user: { avatarUrl: string | null };
  _count: { followers: number; posts: number };
}

export interface Pkg {
  id: string;
  title: string;
  description: string;
  price: number;
  durationMin: number;
}

export interface ArtistFull extends ArtistCardData {
  bio: string;
  languages: string[];
  packages: Pkg[];
  following: boolean;
}

export interface Post {
  id: string;
  type: PostType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  durationSec: number | null;
  createdAt: string;
  liked: boolean;
  artist: { id: string; handle: string; stageName: string; verified: boolean; user: { avatarUrl: string | null } };
  _count: { likes: number; comments: number };
}

export interface MyArtistProfile {
  id: string;
  handle: string;
  stageName: string;
  bio: string;
  category: string;
  city: string;
  languages: string[];
  priceFrom: number;
  coverUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  artistProfile?: MyArtistProfile | null;
}

export interface Booking {
  id: string;
  eventDate: string;
  location: string;
  notes: string;
  price: number;
  status: BookingStatus;
  artist: { handle: string; stageName: string; category: string; user: { avatarUrl: string | null } };
  customer: { id: string; name: string; email: string };
  package: { id: string; title: string } | null;
}
