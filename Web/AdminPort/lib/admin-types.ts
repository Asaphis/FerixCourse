/*
  Real response shapes for the admin console.

  Each type mirrors the columns the corresponding Express route selects. If a
  route changes its select list, this file changes with it — that is the point:
  the dashboard crash in this project came from a client inventing a field
  (`kind`) the API never sent. Nothing here is guessed; every property below
  appears in the SQL in Backend/src/routes/admin.ts or adminOps.ts.
*/

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "STUDENT" | "ADMIN" | "INSTRUCTOR";
  avatar_url: string | null;
  is_active: boolean;
  email_verified?: boolean;
  created_at: string;
};

export type Stats = {
  students: number;
  publishedCourses: number;
  activeClassrooms: number;
  enrollments: number;
  successfulPayments: number;
  revenueKobo: number;
  pendingBookings: number;
  pendingRequests: number;
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  level: "Beginner" | "Intermediate" | "Advanced";
  short_description: string;
  description: string;
  price_kobo: number;
  currency: string;
  is_published: boolean;
  cover_url: string | null;
  created_at: string;
  /** present on GET /admin/courses/:id only */
  enrolled?: number;
};

export type Lesson = {
  id: string;
  title: string;
  position: number;
  duration_sec: number;
  video_key: string | null;
  is_free_preview: boolean;
};

export type Section = {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

export type CourseDetail = Course & {
  sections: Section[];
  materials: CourseMaterial[];
  enrolled: number;
};

export type CourseMaterial = {
  id: string;
  course_id: string | null;
  lesson_id: string | null;
  title: string;
  storage_key: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  course_title?: string;
};

export type Classroom = {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: string;
  price_kobo: number;
  currency: string;
  capacity: number;
  starts_at: string | null;
  ends_at: string | null;
  schedule_text: string;
  is_published: boolean;
  livekit_room: string;
  created_at: string;
  /** GET /admin/classrooms adds this */
  enrolled: number;
};

export type ClassroomMember = {
  enrollment_id: string;
  enrolled_at: string;
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
};

export type ClassroomMaterial = {
  id: string;
  classroom_id: string;
  title: string;
  storage_key: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  classroom_title?: string;
};

export type Announcement = {
  id: string;
  classroom_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  due_at: string | null;
  created_at: string;
  submissions: number;
  classroom_title?: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  body: string;
  file_key: string | null;
  feedback: string;
  created_at: string;
  full_name: string | null;
  email: string;
};

export type Session = {
  id: string;
  classroom_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  livekit_room: string;
  status: "scheduled" | "live" | "ended";
  recording_status: "none" | "recording" | "processing" | "ready" | "failed";
  created_at: string;
  classroom_title?: string;
  /** GET /admin/live/overview adds these */
  members?: number;
  attended?: number;
  classroom_slug?: string;
};

export type Recording = {
  id: string;
  session_id: string;
  storage_key: string;
  duration_sec: number;
  size_bytes: number;
  status: "processing" | "ready" | "failed";
  created_at: string;
  session_title?: string;
};

export type TrainingRequest = {
  id: string;
  user_id: string;
  topic: string;
  current_level: string;
  background: string;
  goals: string;
  preferred_schedule: string;
  preferred_days: string;
  preferred_time: string;
  mode: string;
  audience: string;
  budget_kobo: number;
  message: string;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "converted";
  admin_note: string;
  converted_classroom_id: string | null;
  created_at: string;
  user_email?: string;
};

export type Booking = {
  id: string;
  user_id: string;
  topic: string;
  duration_min: number;
  mode: string;
  preferred_date: string | null;
  preferred_time: string;
  location: string;
  message: string;
  status: "pending" | "confirmed" | "paid" | "completed" | "cancelled";
  price_kobo: number;
  livekit_room: string | null;
  created_at: string;
  user_email?: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  amount_kobo: number;
  currency: string;
  product_type: string;
  product_id: string | null;
  flutterwave_ref: string | null;
  status: "pending" | "successful" | "failed" | "cancelled";
  created_at: string;
  completed_at: string | null;
  user_email?: string;
};

export type AdminNotification = {
  id: string;
  user_id: string;
  /** backend column is `type` — see notify() and migrations/002_phase5.sql */
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  user_email?: string;
};

export type Conversation = {
  id: string;
  student_id: string;
  subject: string;
  booking_id: string | null;
  classroom_id?: string | null;
  course_id?: string | null;
  created_at: string;
  updated_at: string;
  student_email?: string;
  unread?: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type ClassroomMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender_name: string | null;
  sender_email: string | null;
  sender_role: string | null;
  notified?: number;
};

export type Setting = { key: string; value: any; updated_at: string };

export type UserDetail = {
  profile: Profile;
  courses: Array<{ enrollment_id: string; enrolled_at: string; id: string; title: string; slug: string; cover_url: string | null }>;
  classrooms: Array<{
    enrollment_id: string;
    enrolled_at: string;
    id: string;
    title: string;
    slug: string;
    schedule_text: string;
    starts_at: string | null;
  }>;
  transactions: Transaction[];
  bookings: Booking[];
  requests: TrainingRequest[];
  submissions: Submission[];
};

export type ClassroomDetail = {
  classroom: Classroom;
  members: ClassroomMember[];
  sessions: Session[];
  materials: ClassroomMaterial[];
  announcements: Announcement[];
  assignments: Assignment[];
};

export type LiveOverview = {
  sessions: Session[];
  classrooms: Array<{
    id: string;
    title: string;
    livekit_room: string;
    is_published: boolean;
    members: number;
  }>;
};

export type AttendanceRow = {
  joined_at: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export type LiveToken = { url: string; token: string; room: string };
