export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  images: { url: string }[];
}

export interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string, images: { url: string }[] };
  uri: string;
}

export interface ChatMessage {
  role: 'dj' | 'user';
  content: string;
}
