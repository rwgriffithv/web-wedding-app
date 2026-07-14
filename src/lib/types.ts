export interface Guest {
  id: number;
  display_name: string;
  party_id: number | null;
  can_bring_plus_one: number;
  unexpected: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password: string;
  display_name: string;
  type: "admin" | "viewer" | "party";
  party_id: number | null;
  created_at: string;
  last_login_at: string | null;
  total_page_views: number;
  password_changed_at: string | null;
  last_page_view_at: string | null;
}

export type SafeUser = Omit<User, "password">;

export interface Party {
  id: number;
  name: string;
  code: string;
  invited: number;
  created_at: string;
}

export interface SiteConfig {
  key: string;
  value: string;
}

export interface LodgingOption {
  id: number;
  title: string;
  image_url: string;
  thumbnail_url: string | null;
  url: string;
  sort_order: number;
}

export interface DressCodeImage {
  id: number;
  image_url: string;
  thumbnail_url: string | null;
  sort_order: number;
}

export interface RsvpResponse {
  id: number;
  guest_id: number;
  guest_name: string;
  attending: number;
  plus_one_name: string | null;
  created_at: string;
}

export interface MediaItem {
  id: number;
  type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  section: string;
  sort_order: number;
}

export interface MediaTab {
  id: number;
  slug: string;
  label: string;
  sort_order: number;
}

export interface ScheduleItem {
  id: number;
  time: string;
  label: string;
  sort_order: number;
}

export interface GuestRsvpStatus {
  guest_id: number;
  display_name: string;
  party_name: string;
  attending: number | null;
  plus_one_name: string | null;
  responded_at: string | null;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
}

export interface Question {
  id: number;
  party_id: number;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at: string | null;
}

export interface BannedIp {
  id: number;
  ip_address: string;
  reason: string;
  banned_at: string;
  unbanned_at: string | null;
}
