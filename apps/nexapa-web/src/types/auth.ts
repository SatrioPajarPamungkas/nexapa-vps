export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  role: string;
  is_admin?: boolean | number;
  google_avatar_url?: string | null;
}
