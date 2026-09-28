"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Badge,
  Avatar,
  Progress,
  Table,
  Alert,
  Tabs,
  TabPanel,
  EmptyState,
  Skeleton,
  Dropdown,
  Tooltip,
  Breadcrumbs,
  Pagination,
} from "@/components/ui/modern";
import { Icon, type IconName } from "@/components/icons";

/* Type definitions matching backend API */
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  enrolled_at: string;
}

interface EnrolledClassroom {
  id: string;
  title: string;
  slug: string;
  schedule_text: string | null;
  starts_at: string | null;
  enrolled_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount_kobo: number;
  currency: string;
  product_type: string;
  product_id: string;
  flutterwave_ref: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  user_id: string;
  topic: string;
  duration_min: number;
  mode: string;
  preferred_date: string | null;
  preferred_time: string | null;
  location: string | null;
  message: string | null;
  status: string;
  livekit_room: string | null;
  created_at: string;
  price_kobo?: number | null;
}

interface TrainingRequest {
  id: string;
  user_id: string;
  topic: string;
  current_level: string | null;
  background: string | null;
  goals: string | null;
  preferred_schedule: string | null;
  preferred_days: string | null;
  preferred_time: string | null;
  mode: string | null;
  audience: string | null;
  budget_kobo: number | null;
  message: string | null;
  status: string;
  converted_classroom_id: string | null;
  created_at: string;
  waiting?: number;
  classroom_slug?: string | null;
  classroom_title?: string | null;
}

interface JoinedRequest {
  id: string;
  topic: string;
  status: string;
  converted_classroom_id: string | null;
  position: number;
  waiting: number;
  classroom_slug: string | null;
}

interface RequestStatus {
  sla_hours: number;
  mine: TrainingRequest[];
  joined: JoinedRequest[];
}

interface DashboardStats {
  coursesOwned: number;
  classroomsEnrolled: number;
  unreadNotifications: number;
  pendingRequests: number;
  totalLessons: number;
  completedLessons: number;
}

/* Mock data fetcher - replace with real API calls */
async function fetchDashboardData(): Promise<{
  profile: Profile | null;
  courses: EnrolledCourse[];
  classrooms: EnrolledClassroom[];
  transactions: Transaction[];
  notifications: Notification[];
  bookings: Booking[];
  requests: RequestStatus | null;
  stats: DashboardStats;
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In real implementation, this would call the actual backend:
  // const [profile, courses, classrooms, transactions, notifications, bookings, requests] = await Promise.all([
  //   api.me(),
  //   api.myEnrollments().then(d => d.courses),
  //   api.myEnrollments().then(d => d.classrooms),
  //   api.myTransactions(),
  //   api.notifications(),
  //   api.myBookings(),
  //   api.requestStatus(),
  // ]);

  // Mock data for demonstration
  return {
    profile: {
      id: "usr_123",
      email: "learner@ferixcourse.com",
      full_name: "Alex Johnson",
      role: "STUDENT",
      avatar_url: null,
      is_active: true,
      email_verified: true,
      created_at: "2024-01-15T10:30:00Z",
    },
    courses: [
      { id: "crs_1", title: "Full-Stack React Development", slug: "fullstack-react", cover_url: null, enrolled_at: "2024-02-10T14:00:00Z" },
      { id: "crs_2", title: "Backend Engineering with Node.js", slug: "backend-nodejs", cover_url: null, enrolled_at: "2024-01-20T09:00:00Z" },
      { id: "crs_3", title: "UI/UX Design Fundamentals", slug: "ui-ux-fundamentals", cover_url: null, enrolled_at: "2024-03-05T16:30:00Z" },
    ],
    classrooms: [
      { id: "cls_1", title: "React Cohort - Spring 2024", slug: "react-spring-2024", schedule_text: "Mon/Wed/Fri 7-9 PM", starts_at: "2024-04-15T19:00:00Z", enrolled_at: "2024-03-01T12:00:00Z" },
      { id: "cls_2", title: "Advanced TypeScript Workshop", slug: "advanced-typescript", schedule_text: "Tue/Thu 6-8 PM", starts_at: "2024-04-20T18:00:00Z", enrolled_at: "2024-03-15T10:00:00Z" },
    ],
    transactions: [
      { id: "txn_1", user_id: "usr_123", amount_kobo: 4500000, currency: "NGN", product_type: "course", product_id: "crs_1", flutterwave_ref: "FLW_123", status: "successful", created_at: "2024-02-10T14:05:00Z", completed_at: "2024-02-10T14:06:00Z" },
      { id: "txn_2", user_id: "usr_123", amount_kobo: 7500000, currency: "NGN", product_type: "classroom", product_id: "cls_1", flutterwave_ref: "FLW_456", status: "successful", created_at: "2024-03-01T12:05:00Z", completed_at: "2024-03-01T12:06:00Z" },
      { id: "txn_3", user_id: "usr_123", amount_kobo: 3000000, currency: "NGN", product_type: "course", product_id: "crs_3", flutterwave_ref: "FLW_789", status: "successful", created_at: "2024-03-05T16:35:00Z", completed_at: "2024-03-05T16:36:00Z" },
    ],
    notifications: [
      { id: "not_1", user_id: "usr_123", type: "enrollment", title: "Enrolled in React Cohort", body: "Your enrollment is confirmed. Classes start April 15th.", is_read: false, created_at: "2024-03-01T12:06:00Z" },
      { id: "not_2", user_id: "usr_123", type: "payment", title: "Payment Successful", body: "₦75,000 received for React Cohort enrollment.", is_read: false, created_at: "2024-03-01T12:06:00Z" },
      { id: "not_3", user_id: "usr_123", type: "recording", title: "New Recording Available", body: "Session 3 recording is now available in your classroom.", is_read: true, created_at: "2024-03-20T10:00:00Z" },
      { id: "not_4", user_id: "usr_123", type: "assignment", title: "Assignment Due Soon", body: "React Hooks assignment due in 2 days.", is_read: true, created_at: "2024-03-18T09:00:00Z" },
    ],
    bookings: [
      { id: "bk_1", user_id: "usr_123", topic: "Career Guidance Session", duration_min: 60, mode: "online", preferred_date: "2024-04-10", preferred_time: "14:00", location: null, message: "Need advice on transitioning to full-stack", status: "confirmed", livekit_room: null, created_at: "2024-03-25T10:00:00Z", price_kobo: 1500000 },
    ],
    requests: {
      sla_hours: 48,
      mine: [
        { id: "req_1", user_id: "usr_123", topic: "Machine Learning for Beginners", current_level: "Beginner", background: "Web developer", goals: "Learn ML basics", preferred_schedule: "Weekends", preferred_days: "Sat/Sun", preferred_time: "Morning", mode: "online", audience: "group", budget_kobo: 5000000, message: "Want to add ML to my skillset", status: "reviewing", converted_classroom_id: null, created_at: "2024-03-10T10:00:00Z", waiting: 12, classroom_slug: null, classroom_title: null },
      ],
      joined: [
        { id: "req_2", topic: "DevOps Fundamentals", status: "accepted", converted_classroom_id: null, position: 3, waiting: 8, classroom_slug: null },
      ],
    },
    stats: {
      coursesOwned: 3,
      classroomsEnrolled: 2,
      unreadNotifications: 2,
      pendingRequests: 1,
      totalLessons: 47,
      completedLessons: 23,
    },
  };
}

function formatCurrency(kobo: number, currency = "NGN"): string {
  const major = kobo / 100;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(major);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getStatusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const s = status.toLowerCase();
  if (["successful", "confirmed", "paid", "completed", "active", "accepted", "verified", "published"].includes(s)) return "success";
  if (["pending", "reviewing", "processing", "queued", "draft", "scheduled"].includes(s)) return "warning";
  if (["failed", "cancelled", "canceled", "rejected", "expired", "inactive", "disabled", "error"].includes(s)) return "danger";
  if (["live", "streaming", "recorded"].includes(s)) return "info";
  return "neutral";
}

function getNotificationIcon(type: string): IconName {
  const t = type.toLowerCase();
  if (t.includes("payment")) return "creditCard";
  if (t.includes("enroll")) return "userCheck";
  if (t.includes("record")) return "video";
  if (t.includes("assign")) return "clipboard";
  if (t.includes("live")) return "broadcast";
  return "bell";
}

function getBookingStatusColor(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  return getStatusTone(status);
}

/* ==========================================================================
   Sub-components
   ========================================================================== */

interface StatCardProps {
  icon: IconName;
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  subLabel?: string;
}

function StatCard({ icon, label, value, trend, trendPositive, tone = "neutral", subLabel }: StatCardProps) {
  return (
    <Card variant="default" padding="md" className="fc-stat-card">
      <div className="fc-stat-card-content">
        <div className="fc-stat-icon">
          <Avatar name={icon} size="md" className={`fc-stat-avatar fc-stat-avatar-${tone}`} />
        </div>
        <div className="fc-stat-info">
          <p className="fc-stat-label">{label}</p>
          <p className="fc-stat-value">{value}</p>
          {subLabel && <p className="fc-stat-sublabel">{subLabel}</p>}
        </div>
      </div>
      {trend && (
        <div className={`fc-stat-trend ${trendPositive ? "fc-stat-trend-positive" : "fc-stat-trend-negative"}`}>
          <Icon name={trendPositive ? "trendingUp" : "trendingDown"} size={12} aria-hidden="true" />
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
}

interface CourseCardProps {
  course: EnrolledCourse;
  progress: number;
}

function CourseCard({ course, progress }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.slug}`} className="fc-course-card">
      <div className="fc-course-thumb">
        <Avatar name={course.title} size="md" />
        {progress === 100 ? (
          <span className="fc-course-complete" aria-label="Completed"><Icon name="check" size={16} /></span>
        ) : (
          <span className="fc-course-play" aria-label="Continue"><Icon name="play" size={16} /></span>
        )}
      </div>
      <div className="fc-course-info">
        <p className="fc-course-title">{course.title}</p>
        <p className="fc-course-meta">Enrolled {formatDate(course.enrolled_at)}</p>
        <Progress value={progress} size="sm" showValue />
        <p className="fc-course-next">{progress === 100 ? "All lessons complete" : `Next: Lesson ${Math.floor(progress / 10) + 1}`}</p>
      </div>
    </Link>
  );
}

interface ClassroomCardProps {
  classroom: EnrolledClassroom;
}

function ClassroomCard({ classroom }: ClassroomCardProps) {
  return (
    <Link href={`/classrooms/${classroom.slug}`} className="fc-classroom-card">
      <Avatar name={classroom.title} size="sm" />
      <div className="fc-classroom-info">
        <p className="fc-classroom-title">{classroom.title}</p>
        <p className="fc-classroom-meta">
          <Icon name="calendar" size={12} aria-hidden="true" />
          {classroom.starts_at ? formatDateTime(classroom.starts_at) : "Schedule TBD"}
        </p>
        {classroom.schedule_text && <p className="fc-classroom-schedule">{classroom.schedule_text}</p>}
      </div>
      <Icon name="chevronRight" size={16} className="fc-classroom-chevron" aria-hidden="true" />
    </Link>
  );
}

interface ActivityItemProps {
  notification: Notification;
}

function ActivityItem({ notification }: ActivityItemProps) {
  const tone = getStatusTone(notification.type);
  const icon = getNotificationIcon(notification.type);

  return (
    <div className={`fc-activity-item ${!notification.is_read ? "fc-activity-unread" : ""}`}>
      <div className={`fc-activity-icon fc-activity-icon-${tone}`}>
        <Icon name={icon} size={16} aria-hidden="true" />
      </div>
      <div className="fc-activity-content">
        <p className="fc-activity-title">{notification.title}</p>
        {notification.body && <p className="fc-activity-body">{notification.body}</p>}
        <p className="fc-activity-time">{formatDateTime(notification.created_at)}</p>
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: Booking;
}

function BookingCard({ booking }: BookingCardProps) {
  const statusTone = getBookingStatusColor(booking.status);

  return (
    <div className="fc-booking-card">
      <div className="fc-booking-main">
        <div className="fc-booking-icon">
          <Icon name="calendarCheck" size={20} aria-hidden="true" />
        </div>
        <div className="fc-booking-info">
          <p className="fc-booking-topic">{booking.topic}</p>
          <p className="fc-booking-meta">
            {booking.preferred_date && formatDate(booking.preferred_date)}
            · {booking.duration_min} min
            · {booking.mode}
          </p>
        </div>
      </div>
      <div className="fc-booking-actions">
        <Badge variant={statusTone}>{booking.status}</Badge>
        {booking.price_kobo && <span className="fc-booking-price">{formatCurrency(booking.price_kobo)}</span>}
        <Button variant="ghost" size="sm" onClick={() => console.log(`Open booking ${booking.id}`)}>Open</Button>
      </div>
    </div>
  );
}

interface WaitlistCardProps {
  item: JoinedRequest;
  slaHours: number;
}

function WaitlistCard({ item, slaHours }: WaitlistCardProps) {
  return (
    <div className="fc-waitlist-card">
      <div className="fc-waitlist-main">
        <p className="fc-waitlist-topic">{item.topic}</p>
        <p className="fc-waitlist-meta">Position {item.position} of {item.waiting} · responds in ~{slaHours}h</p>
      </div>
      <Badge variant={getStatusTone(item.status)}>{item.status}</Badge>
    </div>
  );
}

interface QuickActionProps {
  icon: IconName;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickAction({ icon, label, description, onClick }: QuickActionProps) {
  return (
    <Button variant="outline" className="fc-quick-action" onClick={onClick}>
      <div className="fc-quick-action-icon">
        <Icon name={icon} size={20} aria-hidden="true" />
      </div>
      <div className="fc-quick-action-content">
        <span className="fc-quick-action-label">{label}</span>
        <span className="fc-quick-action-desc">{description}</span>
      </div>
      <Icon name="arrowRight" size={16} aria-hidden="true" />
    </Button>
  );
}

interface ClassroomDetailCardProps {
  classroom: EnrolledClassroom;
}

function ClassroomDetailCard({ classroom }: ClassroomDetailCardProps) {
  return (
    <Card variant="outlined" className="fc-classroom-detail-card">
      <CardContent className="p-0">
        <div className="fc-classroom-detail-header">
          <div className="fc-classroom-detail-avatar">
            <Avatar name={classroom.title} size="xl" />
          </div>
          <div className="fc-classroom-detail-info">
            <h3 className="fc-classroom-detail-title">{classroom.title}</h3>
            <p className="fc-classroom-detail-meta">Enrolled {formatDate(classroom.enrolled_at)}</p>
            {classroom.schedule_text && <p className="fc-classroom-detail-schedule">{classroom.schedule_text}</p>}
            {classroom.starts_at && <p className="fc-classroom-detail-starts">Starts {formatDateTime(classroom.starts_at)}</p>}
          </div>
        </div>
        <CardFooter>
          <Button variant="primary" leftIcon="video" onClick={() => console.log(`Join ${classroom.slug}`)}>Open Classroom</Button>
          <Button variant="outline" leftIcon="fileText" onClick={() => console.log(`Materials ${classroom.slug}`)}>Materials</Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const tone = getStatusTone(notification.type);
  const icon = getNotificationIcon(notification.type);

  return (
    <div className={`fc-notification-item ${!notification.is_read ? "fc-notification-unread" : ""}`}>
      <div className={`fc-notification-icon fc-notification-icon-${tone}`}>
        <Icon name={icon} size={18} aria-hidden="true" />
      </div>
      <div className="fc-notification-content">
        <p className="fc-notification-title">{notification.title}</p>
        {notification.body && <p className="fc-notification-body">{notification.body}</p>}
        <p className="fc-notification-time">{formatDateTime(notification.created_at)}</p>
      </div>
      {!notification.is_read && <span className="fc-notification-dot" aria-hidden="true" />}
    </div>
  );
}

/* ==========================================================================
   Main Dashboard Component
   ========================================================================== */

export default function ModernDashboardDemo() {
  const [data, setData] = useState<ReturnType<typeof fetchDashboardData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchDashboardData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="fc-page fc-page-modern">
        <div className="fc-page-header">
          <div>
            <h1 className="fc-page-title">Dashboard</h1>
            <p className="fc-page-subtitle">Loading your learning space...</p>
          </div>
        </div>
        <div className="fc-page-content">
          <div className="fc-stats-grid" role="status" aria-label="Loading stats">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" height={100} className="fc-stat-card-skeleton" />)}
          </div>
          <div className="fc-grid-2" role="status" aria-label="Loading dashboard panels">
            {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={300} className="fc-panel-skeleton" />)}
          </div>
          <div className="fc-grid-2" role="status" aria-label="Loading more panels">
            {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={250} className="fc-panel-skeleton" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fc-page fc-page-modern">
        <div className="fc-page-header">
          <div>
            <h1 className="fc-page-title">Dashboard</h1>
            <p className="fc-page-subtitle">Your learning overview</p>
          </div>
        </div>
        <div className="fc-page-content">
          <Alert variant="danger" title="Unable to load dashboard" dismissible onDismiss={loadData}>
            <p>{error || "An unknown error occurred"}</p>
            <Button variant="outline" leftIcon="refresh" onClick={loadData} size="sm">
              Try Again
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  const { profile, courses, classrooms, transactions, notifications, bookings, requests, stats } = data;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Calculate live/upcoming classrooms
  const now = Date.now();
  const liveClassroom = classrooms.find((c) => c.starts_at && new Date(c.starts_at).getTime() <= now + 30 * 60 * 1000 && new Date(c.starts_at).getTime() >= now - 3 * 60 * 60 * 1000);
  const upcomingClassrooms = classrooms
    .filter((c) => c.starts_at && new Date(c.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
    .slice(0, 4);

  const upcomingBookings = bookings
    .filter((b) => ["pending", "confirmed", "paid"].includes(b.status))
    .slice(0, 2);

  const recentNotifications = notifications.slice(0, 5);
  const recentTransactions = transactions.slice(0, 5);

  const overallProgress = stats.totalLessons > 0 ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0;

  return (
    <div className="fc-page fc-page-modern">
      {/* Page Header */}
      <div className="fc-page-header">
        <div className="fc-page-header-content">
          <div>
            <h1 className="fc-page-title">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back"}
            </h1>
            <p className="fc-page-subtitle">Here's what's happening in your learning journey</p>
          </div>
          <div className="fc-page-header-actions">
            <Button variant="ghost" leftIcon="compass" onClick={() => console.log("Browse catalog")}>
              Browse Catalog
            </Button>
            <Button variant="primary" leftIcon="sparkles" onClick={() => console.log("Request training")}>
              Request Training
            </Button>
          </div>
        </div>

        {/* Live Now Banner */}
        {liveClassroom && (
          <div className="fc-live-banner" role="status" aria-live="polite">
            <div className="fc-live-indicator">
              <span className="fc-live-dot" aria-hidden="true"></span>
              <span>LIVE NOW</span>
            </div>
            <div className="fc-live-info">
              <p className="fc-live-title">{liveClassroom.title}</p>
              <p className="fc-live-meta">{liveClassroom.schedule_text || "Scheduled session"} · Started {formatDateTime(liveClassroom.starts_at!)}</p>
            </div>
            <Button variant="primary" size="sm" leftIcon="video" onClick={() => console.log("Join live")}>
              Join Now
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="fc-stats-grid" role="region" aria-label="Dashboard statistics">
          <StatCard icon="bookOpen" label="Courses Owned" value={stats.coursesOwned} trend="+2 this month" trendPositive />
          <StatCard icon="users" label="Classrooms" value={stats.classroomsEnrolled} trend="1 active now" trendPositive />
          <StatCard icon="bell" label="Unread Alerts" value={stats.unreadNotifications} tone={unreadCount > 0 ? "warning" : "neutral"} />
          <StatCard icon="clipboard" label="Pending Requests" value={stats.pendingRequests} tone={stats.pendingRequests > 0 ? "warning" : "success"} />
          <StatCard icon="graduationCap" label="Overall Progress" value={`${overallProgress}%`} subLabel={`${stats.completedLessons}/${stats.totalLessons} lessons`} />
          <StatCard icon="wallet" label="Total Invested" value={formatCurrency(transactions.filter(t => t.status === "successful").reduce((sum, t) => sum + t.amount_kobo, 0))} />
        </div>
      </div>

      {/* Main Content */}
      <div className="fc-page-content">
        {/* Tab Navigation */}
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", icon: "layoutDashboard" },
            { id: "courses", label: "My Courses", icon: "bookOpen" },
            { id: "classrooms", label: "Classrooms", icon: "users" },
            { id: "activity", label: "Activity", icon: "activity" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
          className="fc-dashboard-tabs"
        />

        {/* Overview Tab */}
        <TabPanel id="overview" activeTab={activeTab}>
          <div className="fc-grid-2">
            {/* Continue Learning */}
            <Card variant="elevated" className="fc-dashboard-card">
              <CardHeader
                title="Continue Learning"
                action={<Button variant="ghost" size="sm" rightIcon="arrowRight" onClick={() => console.log("View all courses")}>View All</Button>}
              />
              <CardContent>
                {courses.length === 0 ? (
                  <EmptyState
                    icon="bookOpen"
                    title="No courses yet"
                    description="Buy a recorded course and it lives here forever, with progress tracking across every lesson."
                    action={<Button variant="primary" size="sm" leftIcon="compass" onClick={() => console.log("Browse catalog")}>Explore Catalog</Button>}
                  />
                ) : (
                  <div className="fc-course-list">
                    {courses.slice(0, 3).map((course) => (
                      <CourseCard key={course.id} course={course} progress={Math.floor(Math.random() * 100)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Live Classes */}
            <Card variant="elevated" className="fc-dashboard-card">
              <CardHeader
                title="Upcoming Live Classes"
                action={<Button variant="ghost" size="sm" rightIcon="arrowRight" onClick={() => console.log("View all classrooms")}>View All</Button>}
              />
              <CardContent>
                {upcomingClassrooms.length === 0 ? (
                  <EmptyState
                    icon="calendar"
                    title="Nothing scheduled"
                    description="When a cohort you joined has a session, its start time appears here."
                    action={<Button variant="ghost" size="sm" onClick={() => console.log("View classrooms")}>My Classrooms</Button>}
                  />
                ) : (
                  <div className="fc-classroom-list">
                    {upcomingClassrooms.map((room) => (
                      <ClassroomCard key={room.id} classroom={room} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card variant="elevated" className="fc-dashboard-card">
              <CardHeader
                title="Recent Activity"
                action={<Button variant="ghost" size="sm" rightIcon="arrowRight" onClick={() => console.log("View all notifications")}>View All</Button>}
              />
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <EmptyState icon="bell" title="No activity yet" description="Payments, recordings, reminders and messages will appear here." />
                ) : (
                  <div className="fc-activity-list">
                    {recentNotifications.map((n) => (
                      <ActivityItem key={n.id} notification={n} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 1-on-1 Sessions */}
            <Card variant="elevated" className="fc-dashboard-card">
              <CardHeader title="1-on-1 Sessions" />
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="fc-on-one-empty">
                    <div className="fc-on-one-placeholder">
                      <Icon name="calendarCheck" size={32} className="fc-on-one-icon" aria-hidden="true" />
                    </div>
                    <p className="fc-on-one-title">No sessions booked</p>
                    <p className="fc-on-one-meta">Pick a slot with an instructor for personalized guidance.</p>
                    <Button variant="primary" className="mt-4" leftIcon="calendarPlus" onClick={() => console.log("Book 1-on-1")}>
                      Book 1-on-1 Session
                    </Button>
                  </div>
                ) : (
                  <div className="fc-booking-list">
                    {upcomingBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waiting Lists */}
            {requests?.joined.length && (
              <Card variant="elevated" className="fc-dashboard-card" style={{ gridColumn: "span 2" }}>
                <CardHeader title="Waiting Lists" />
                <CardContent>
                  <div className="fc-waitlist-list">
                    {requests.joined.slice(0, 3).map((j) => (
                      <WaitlistCard key={j.id} item={j} slaHours={requests.sla_hours} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card variant="elevated" className="fc-dashboard-card" style={{ gridColumn: "span 2" }}>
              <CardHeader title="Quick Actions" />
              <CardContent>
                <div className="fc-quick-actions">
                  <QuickAction icon="compass" label="Explore Catalog" description="Browse courses & classrooms" onClick={() => console.log("Browse")} />
                  <QuickAction icon="sparkles" label="Request Training" description="Can't find what you need?" onClick={() => console.log("Request")} />
                  <QuickAction icon="calendarCheck" label="Book 1-on-1" description="Private mentorship session" onClick={() => console.log("Book")} />
                  <QuickAction icon="messageSquare" label="Message Support" description="Get help from our team" onClick={() => console.log("Message")} />
                  <QuickAction icon="download" label="My Certificates" description="View earned certificates" onClick={() => console.log("Certificates")} />
                  <QuickAction icon="settings" label="Account Settings" description="Manage your profile" onClick={() => console.log("Settings")} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Courses Tab */}
        <TabPanel id="courses" activeTab={activeTab}>
          <Card variant="elevated">
            <CardHeader
              title="My Courses"
              subtitle={`${courses.length} course${courses.length !== 1 ? "s" : ""} in your library`}
            />
            <CardContent>
              {courses.length === 0 ? (
                <EmptyState
                  icon="bookOpen"
                  title="Your library is empty"
                  description="Courses you purchase will appear here with progress tracking."
                  action={<Button variant="primary" leftIcon="compass" onClick={() => console.log("Browse catalog")}>Browse Catalog</Button>}
                />
              ) : (
                <Table
                  columns={[
                    { key: "title", header: "Course", render: (row: EnrolledCourse) => (
                      <div className="fc-table-course">
                        <Avatar name={row.title} size="sm" />
                        <div>
                          <p className="fc-table-course-title">{row.title}</p>
                          <p className="fc-table-course-meta">Enrolled {formatDate(row.enrolled_at)}</p>
                        </div>
                      </div>
                    )},
                    { key: "progress", header: "Progress", render: () => <Progress value={Math.floor(Math.random() * 100)} size="sm" showValue /> },
                    { key: "lessons", header: "Lessons", render: () => `${Math.floor(Math.random() * 15) + 5} lessons` },
                    { key: "status", header: "Status", render: () => <Badge variant={Math.random() > 0.5 ? "success" : "warning"}>In Progress</Badge> },
                    { key: "actions", header: "", render: (row: EnrolledCourse) => (
                      <Button variant="ghost" size="sm" onClick={() => console.log(`Open ${row.slug}`)}>Continue</Button>
                    ), align: "right" },
                  ]}
                  data={courses}
                  keyExtractor={(row) => row.id}
                  hoverable
                  striped
                />
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Classrooms Tab */}
        <TabPanel id="classrooms" activeTab={activeTab}>
          <Card variant="elevated">
            <CardHeader
              title="My Classrooms"
              subtitle={`${classrooms.length} classroom${classrooms.length !== 1 ? "s" : ""} you're enrolled in`}
            />
            <CardContent>
              {classrooms.length === 0 ? (
                <EmptyState
                  icon="users"
                  title="No classrooms yet"
                  description="Join a live cohort to learn with peers and instructors."
                  action={<Button variant="primary" leftIcon="compass" onClick={() => console.log("Browse classrooms")}>Browse Classrooms</Button>}
                />
              ) : (
                <div className="fc-classroom-grid">
                  {classrooms.map((room) => (
                    <ClassroomDetailCard key={room.id} classroom={room} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Activity Tab */}
        <TabPanel id="activity" activeTab={activeTab}>
          <div className="fc-grid-2">
            <Card variant="elevated">
              <CardHeader title="Notifications" subtitle={`${unreadCount} unread`} />
              <CardContent>
                {notifications.length === 0 ? (
                  <EmptyState icon="bell" title="No notifications" description="System updates will appear here." />
                ) : (
                  <div className="fc-notification-list">
                    {notifications.map((n) => (
                      <NotificationItem key={n.id} notification={n} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader title="Transaction History" subtitle={`${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`} />
              <CardContent>
                {transactions.length === 0 ? (
                  <EmptyState icon="creditCard" title="No transactions" description="Your payment history will appear here." />
                ) : (
                  <Table
                    columns={[
                      { key: "date", header: "Date", render: (row: Transaction) => formatDate(row.created_at) },
                      { key: "product", header: "Product", render: (row: Transaction) => (
                        <span className="fc-txn-product">{row.product_type === "course" ? "Course" : "Classroom"}</span>
                      )},
                      { key: "amount", header: "Amount", render: (row: Transaction) => formatCurrency(row.amount_kobo, row.currency), align: "right" },
                      { key: "status", header: "Status", render: (row: Transaction) => <Badge variant={getStatusTone(row.status)}>{row.status}</Badge>, align: "center" },
                      { key: "ref", header: "Reference", render: (row: Transaction) => row.flutterwave_ref || "—", className: "font-mono text-xs" },
                    ]}
                    data={transactions}
                    keyExtractor={(row) => row.id}
                    hoverable
                    striped
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </div>
    </div>
  );
}