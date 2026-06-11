import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { DashboardLayout } from "@/components/DashboardLayout"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import sportsImage from "@/assets/sports.jpeg"
import sportsEvents from "@/assets/events.jpg"
import sportsItems from "@/assets/sports items.jpg"
import merchendise from "@/assets/merchendises.png"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { ArrowRight, Boxes, CalendarDays, ChevronRight, Dumbbell, Medal, Users } from "lucide-react"

 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

const StudentDashboard = () => {
  const { user, token } = useAuth()
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [acceptedSessions, setAcceptedSessions] = useState<any[]>([])
  const [acceptedSessionsRaw, setAcceptedSessionsRaw] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!carouselApi) return

    const timer = window.setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext()
      } else {
        carouselApi.scrollTo(0)
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [carouselApi])

  useEffect(() => {
    if (!carouselApi) return

    setCurrentSlide(carouselApi.selectedScrollSnap())

    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap())
    carouselApi.on("select", onSelect)
    carouselApi.on("reInit", onSelect)

    return () => {
      carouselApi.off("select", onSelect)
      carouselApi.off("reInit", onSelect)
    }
  }, [carouselApi])

  // Fetch accepted join requests (real sessions)
  useEffect(() => {
    const fetchAcceptedSessions = async () => {
      if (!user?.id || !token) return
      
      try {
        setSessionsLoading(true)
        setSessionsError("")
        const [acceptedRes, pendingRes] = await Promise.all([
          fetch(`${API_BASE}/api/join-requests/student/my-requests?status=accepted`, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(`${API_BASE}/api/join-requests/student/my-requests?status=pending`, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store",
          }),
        ])
        
        if (!acceptedRes.ok) throw new Error("Failed to fetch sessions")
        
        const acceptedData = await acceptedRes.json()
        setAcceptedSessionsRaw(acceptedData.data || [])
        
        const sessions = acceptedData.data?.map((joinReq: any) => ({
          name: joinReq.session?.sport?.name,
          date: joinReq.session?.startTime ? new Date(joinReq.session.startTime).toLocaleDateString() : "TBD",
          time: joinReq.session?.startTime ? new Date(joinReq.session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "TBD",
          location: joinReq.session?.location?.name || "TBD",
        })) || []
        
        setAcceptedSessions(sessions)

        if (pendingRes.ok) {
          const pendingData = await pendingRes.json()
          setPendingRequests(pendingData.data || [])
        }
      } catch (err: any) {
        console.error("Error fetching sessions:", err)
        setSessionsError("Could not load your sessions")
      } finally {
        setSessionsLoading(false)
      }
    }

    fetchAcceptedSessions()
  }, [user?.id, token])

  const handleDeleteRequest = async (requestId: string, sportName: string) => {
    if (!window.confirm(`Delete your join request for ${sportName}?`)) {
      return
    }

    setDeletingId(requestId)
    try {
      const response = await fetch(`${API_BASE}/api/join-requests/${requestId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Failed to delete request")
      }

      setPendingRequests(prev => prev.filter(r => r._id !== requestId))
      console.log(`Delete request for ${sportName} successful`)
    } catch (error: any) {
      console.error("Error deleting request:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancelSession = async (sessionId: string, sportName: string) => {
    if (!window.confirm(`Cancel your booking for ${sportName}? This action cannot be undone.`)) {
      return
    }

    setDeletingId(sessionId)
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/unenroll`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Failed to cancel session")
      }

      // Remove from accepted sessions
      setAcceptedSessionsRaw(prev => prev.filter(j => j.session._id !== sessionId))
      setAcceptedSessions(prev => 
        prev.filter(s => s.name !== sportName)
      )
      toast.success(`Successfully cancelled ${sportName} session`, {
        description: "Your booking has been removed. Coach has been notified."
      })
    } catch (error: any) {
      console.error("Error cancelling session:", error)
      toast.error("Failed to cancel session", {
        description: error.message || "Please try again later"
      })
    } finally {
      setDeletingId(null)
    }
  }

  const stats = [
    {
      label: "Active Sports",
      value: acceptedSessions.length,
      subtitle: "Enrolled sports",
      icon: <Users className="h-6 w-6" />,
      cardClass: "bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 text-white",
      iconWrapClass: "bg-indigo-500/30",
    },
    {
      label: "Upcoming Sessions",
      value: acceptedSessions.length,
      subtitle: "Scheduled sessions",
      icon: <CalendarDays className="h-6 w-6" />,
      cardClass: "bg-gradient-to-br from-green-500 via-green-400 to-emerald-400 text-white",
      iconWrapClass: "bg-white/25",
    },
    {
      label: "Upcoming Events",
      value: 3,
      subtitle: "Tournaments you can join",
      icon: <Medal className="h-6 w-6" />,
      cardClass: "bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white",
      iconWrapClass: "bg-white/25",
    },
  ]

  const systemSports = [
    "Cricket",
    "Foot Ball",
    "Badminton",
    "Volleyball",
  ]

  const inventoryItems = [
    { category: "Cricket", item: "Official Jersey" },
    { category: "Football", item: "Practice Kit" },
    { category: "Basketball", item: "Wrist Band" },
    { category: "Volleyball", item: "Official Kit" },
  ]

  const upcomingEvents = [
    { eventName: "Inter-Faculty Cricket", date: "Apr 10, 2026", time: "8:30 AM", location: "Main Ground" },
    { eventName: "Freshers Badminton Cup", date: "Apr 14, 2026", time: "10:00 AM", location: "Indoor Arena" },
    { eventName: "Carrom Championship", date: "Apr 18, 2026", time: "1:00 PM", location: "F1301" },
  ]

  const quickActions = [
    {
      title: "Browse Sports",
      description: "Explore sports and join teams",
      icon: <Dumbbell className="h-5 w-5" aria-hidden="true" />,
      href: "/student/sports",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Browse Merchandise",
      description: "View available sports items",
      icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
      href: "/student/payments",
      bg: "bg-orange-500/10",
    },
    {
      title: "Tournaments",
      description: "See upcoming sports events",
      icon: <Medal className="h-5 w-5" aria-hidden="true" />,
      href: "/student/sessions",
      bg: "bg-emerald-500/10",
    },
  ]

  const dashboardSlides = [
    {
      title: "Sports",
      description: "Explore university sports and join teams.",
      actionLabel: "Explore Sports",
      href: "/student/sports",
      bgClass: "from-indigo-600 to-blue-500",
      image: sportsImage,
    },
    {
      title: "Events",
      description: "Find upcoming tournaments and campus events.",
      actionLabel: "View Events",
      href: "/student/sessions",
      bgClass: "from-emerald-600 to-green-500",
      image: sportsEvents,
    },
    {
      title: "Borrow Sports Items",
      description: "Request and borrow sports equipment quickly.",
      actionLabel: "Borrow Now",
      href: "/student/requests",
      bgClass: "from-amber-500 to-orange-500",
      image: sportsItems,
    },
    {
      title: "Merchandise",
      description: "Shop jerseys, kits, and official items.",
      actionLabel: "Shop Now",
      href: "/student/merchandise",
      bgClass: "from-pink-600 to-rose-500",
      image: merchendise,
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Student Dashboard"
          description="Manage your sports, inventory items, and upcoming events in one place"
        />

        <section className="rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-3">
          <Carousel opts={{ loop: true }} setApi={setCarouselApi}>
            <CarouselContent>
              {dashboardSlides.map((slide) => (
                <CarouselItem key={slide.title}>
                  <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40">
                    {slide.image ? (
                      <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgClass}`} />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/10" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />

                    <div className="relative min-h-[260px] p-6 text-white sm:min-h-[300px] sm:max-w-[56%] sm:p-10">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">UniSport</p>
                      <h3 className="mt-3 text-3xl font-extrabold uppercase leading-tight tracking-wide sm:text-5xl">
                        {slide.title}
                      </h3>
                      <p className="mt-3 max-w-md text-sm font-medium text-white/90 sm:text-lg">{slide.description}</p>

                      <div className="mt-6">
                        <Button asChild className="h-10 rounded-xl bg-orange-400 px-7 text-sm font-semibold uppercase tracking-wide text-white hover:bg-orange-500">
                          <Link to={slide.href}>{slide.actionLabel}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="left-2 top-1/2 z-20 -translate-y-1/2 border-slate-300/30 bg-black/45 text-white hover:bg-black/65" />
            <CarouselNext className="right-2 top-1/2 z-20 -translate-y-1/2 border-slate-300/30 bg-black/45 text-white hover:bg-black/65" />

            <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2">
              {dashboardSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => carouselApi?.scrollTo(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    currentSlide === index ? "w-8 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"
                  }`}
                  aria-label={`Go to ${slide.title} slide`}
                />
              ))}
            </div>
          </Carousel>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`${s.cardClass} rounded-2xl p-6 shadow-xl transition duration-300 hover:scale-105 hover:shadow-2xl`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-85">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold">{s.value}</p>
                </div>
                <div className={`${s.iconWrapClass} rounded-xl p-3`}>{s.icon}</div>
              </div>
              <p className="mt-3 text-xs opacity-80">{s.subtitle}</p>
            </div>
          ))}
        </section>

        {/* Pending Join Requests Section */}
        {pendingRequests.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-amber-900 flex items-center gap-2">
              ⏳ Pending Join Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {req.session?.sport?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Session: {req.session?.startTime ? new Date(req.session.startTime).toLocaleDateString() : "TBD"} at{" "}
                      {req.session?.startTime ? new Date(req.session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD"}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Requested: {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleDeleteRequest(req._id, req.session?.sport?.name || "this request")
                    }
                    disabled={deletingId === req._id}
                    className="ml-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 text-sm font-medium"
                  >
                    {deletingId === req._id ? "Deleting..." : "Cancel"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="group rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${action.bg} text-primary`}
                >
                  {action.icon}
                </div>
                <h3 className="font-semibold text-foreground">{action.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Open <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Sports System</h2>
              <Link to="/student/sports" className="text-sm font-semibold text-primary hover:underline">
                View all sports
              </Link>
            </div>
            <div className="space-y-3">
              {systemSports.map((sport) => (
                <div
                  key={sport}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm transition hover:bg-muted/80"
                >
                  <div>
                    <p className="font-semibold text-foreground">{sport}</p>
                    <p className="text-xs text-muted-foreground mt-1">Available in the sports system</p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    Sport
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Inventory Items</h2>
              <Link to="/student/payments" className="text-sm font-semibold text-primary hover:underline">
                Shop now
              </Link>
            </div>
            <div className="space-y-3">
              {inventoryItems.map((entry) => (
                <div
                  key={`${entry.category}-${entry.item}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
                >
                  <p className="font-semibold text-foreground">{entry.category}</p>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {entry.item}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Upcoming Events</h2>
              <Link to="/student/sessions" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={`${event.eventName}-${event.date}-${event.time}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-4 text-sm transition hover:bg-muted/80"
                >
                  <div>
                    <p className="font-semibold text-foreground">{event.eventName}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date} · {event.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{event.location}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StudentDashboard
