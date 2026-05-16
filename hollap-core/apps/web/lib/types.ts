export type TeacherListItem = {
  userId: string;
  bio: string;
  category: string;
  priceMonthly: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

export type TeacherProfile = TeacherListItem & {
  isSubscribed: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
};

export type TeacherStripeStatus = {
  mode: "mock" | "stripe";
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export type StageRoom = {
  id: string;
  teacherUserId: string;
  title: string;
  description?: string | null;
  state: "ACTIVE" | "ENDED";
  createdAt: string;
};

export type WallQuestion = {
  id: string;
  questionText: string;
  createdAt: string;
};

export type WallReply = {
  id: string;
  audioUrl: string;
  durationSec: number;
  createdAt: string;
  student: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};
