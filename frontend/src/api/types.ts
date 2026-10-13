export type Role = 'user' | 'admin';

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface Challenge {
  id: number;
  period: string;
  title: string;
  description: string;
  twist: string | null;
  startsAt: string;
  deadline: string;
  status: 'upcoming' | 'open' | 'closed';
}

export interface Exif {
  aperture: number | null;
  exposureTime: number | null;
  iso: number | null;
  whiteBalance: string | null;
  exposureBias: number | null;
  gpsLat: number | null;
  gpsLon: number | null;
  focalLength: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  takenAt: string | null;
}

export interface Submission {
  id: number;
  challenge: { id: number; period: string; title: string; twist: string | null; deadline: string };
  user: { id: number; username: string };
  description: string;
  showLocation: boolean;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  exif: Exif;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  isOpen: boolean;
  permissions: { edit: boolean; replace: boolean; delete: boolean };
}

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  user: { id: number; username: string };
  canDelete: boolean;
}

export interface GalleryMonth {
  challenge: Challenge;
  submissions: Submission[];
}

export interface AdminUser extends User {
  disabled: boolean;
  createdAt: string;
  submissionCount: number;
  commentCount: number;
}

export interface Theme {
  id: number;
  kind: 'subject' | 'twist';
  title: string;
  description: string;
  active: number;
  created_at: string;
}

export interface AdminChallenge extends Challenge {
  submissionCount: number;
}

export interface AdminSubmission {
  id: number;
  description: string;
  createdAt: string;
  period: string;
  challengeTitle: string;
  user: { id: number; username: string };
  commentCount: number;
  thumbUrl: string;
}

export interface AdminComment {
  id: number;
  body: string;
  createdAt: string;
  submissionId: number;
  user: { id: number; username: string };
}
