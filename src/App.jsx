import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, Clock3, Link2, LogOut, Menu, Plus, ShieldCheck, User, X } from "lucide-react"
import api from "./service/apiService"
import "./App.css"

const PLAYER_ELEMENT_ID = "live-youtube-player"

function getHostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "link"
  }
}

function getYoutubeThumbnail(url) {
  const videoId = extractYoutubeVideoId(url)
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : ""
}

function extractYoutubeVideoId(url) {
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/)
  return videoIdMatch ? videoIdMatch[1] : ""
}

function isYoutubeLink(url) {
  return /youtu\.be|youtube\.com/i.test(url)
}

function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function metric(totalMinutes) {
  if (totalMinutes === 0) return "0 min"
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

function getProgressPercent(progressSeconds, durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return 0
  return Math.min(100, (Math.max(0, progressSeconds) / durationSeconds) * 100)
}

function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function loadYoutubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") {
        previousReady()
      }
      resolve(window.YT)
    }

    if (existingScript) {
      let attempts = 0
      const timer = window.setInterval(() => {
        attempts += 1
        if (window.YT?.Player) {
          window.clearInterval(timer)
          resolve(window.YT)
        }
        if (attempts > 120) {
          window.clearInterval(timer)
          reject(new Error("YouTube player did not load"))
        }
      }, 250)
      return
    }

    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    script.onerror = () => reject(new Error("Could not load YouTube API"))
    document.body.appendChild(script)
  })
}

export default function ContentLearningTracker() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [isRegistering, setIsRegistering] = useState(false)
  const [skills, setSkills] = useState([])
  const [contents, setContents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [quickForm, setQuickForm] = useState({ skillName: "", link: "", watchedMinutes: "", notes: "" })
  const [minuteInputs, setMinuteInputs] = useState({})
  const [activeLiveContentId, setActiveLiveContentId] = useState("")
  const [activeView, setActiveView] = useState("tracker")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [liveProgress, setLiveProgress] = useState({ currentSeconds: 0, durationSeconds: 0, bufferedMinutes: 0 })
  const playerRef = useRef(null)
  const liveTrackerRef = useRef({
    intervalId: null,
    previousSecond: 0,
    bufferedSeconds: 0,
    saving: false,
    lastSavedSecond: 0,
    completionSaved: false,
  })

  useEffect(() => {
    checkLoggedInUser()
  }, [])

  useEffect(() => {
    api.get("/health").catch(() => {
      // Best-effort warm-up for hosted backend cold starts.
    })
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadUserData()
    }
  }, [currentUser])

  const checkLoggedInUser = async () => {
    const token = localStorage.getItem("auth-token")
    if (!token) return

    try {
      const userData = await api.get("/auth/me")
      setCurrentUser(userData)
    } catch (requestError) {
      console.error("Auth check error:", requestError)
      localStorage.removeItem("auth-token")
    }
  }

  const loadUserData = async () => {
    try {
      setLoading(true)
      const [skillsData, contentsData, sessionsData] = await Promise.all([
        api.get("/skills"),
        api.get("/contents"),
        api.get("/sessions"),
      ])
      setSkills(skillsData)
      setContents(contentsData)
      setSessions(sessionsData)
    } catch (requestError) {
      console.error("Error loading data:", requestError)
      setError("Could not load your tracker")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setError("Enter username and password")
      return
    }

    try {
      setLoading(true)
      setError("")
      const data = await api.post("/auth/login", loginForm)
      localStorage.setItem("auth-token", data.token)
      setCurrentUser(data.user)
      setLoginForm({ username: "", password: "" })
    } catch (requestError) {
      console.error("Login error:", requestError)
      setError(requestError.response?.data?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setError("Enter username and password")
      return
    }

    try {
      setLoading(true)
      setError("")
      const data = await api.post("/auth/register", loginForm)
      localStorage.setItem("auth-token", data.token)
      setCurrentUser(data.user)
      setLoginForm({ username: "", password: "" })
      setIsRegistering(false)
    } catch (requestError) {
      console.error("Registration error:", requestError)
      setError(requestError.response?.data?.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout")
    } catch (requestError) {
      console.error("Logout error:", requestError)
    } finally {
      localStorage.removeItem("auth-token")
      setCurrentUser(null)
      setSkills([])
      setContents([])
      setSessions([])
      setError("")
      setQuickForm({ skillName: "", link: "", watchedMinutes: "", notes: "" })
      setMinuteInputs({})
      setActiveLiveContentId("")
      setActiveView("tracker")
      setIsMenuOpen(false)
      setLiveProgress({ currentSeconds: 0, durationSeconds: 0, bufferedMinutes: 0 })
    }
  }

  const stopLiveTracking = () => {
    if (liveTrackerRef.current.intervalId) {
      window.clearInterval(liveTrackerRef.current.intervalId)
      liveTrackerRef.current.intervalId = null
    }
    liveTrackerRef.current.previousSecond = 0
    liveTrackerRef.current.bufferedSeconds = 0
    liveTrackerRef.current.saving = false
    liveTrackerRef.current.lastSavedSecond = 0
    liveTrackerRef.current.completionSaved = false

    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
  }

  const persistPlaybackState = async (contentId, currentSeconds, durationSeconds, statusOverride) => {
    const safeProgress = Math.max(0, Math.floor(currentSeconds || 0))
    const safeDuration = Math.max(0, Math.floor(durationSeconds || 0))
    const payload = {
      progressSeconds: safeProgress,
      durationSeconds: safeDuration,
      lastWatchedAt: new Date().toISOString(),
    }

    if (statusOverride) {
      payload.status = statusOverride
      payload.completedAt = statusOverride === "completed" ? new Date().toISOString() : null
    }

    try {
      const updatedContent = await api.put(`/contents/${contentId}`, payload)
      setContents((current) => current.map((entry) => (entry._id === contentId ? { ...entry, ...updatedContent } : entry)))
    } catch (requestError) {
      console.error("Playback state save error:", requestError)
    }
  }

  const persistLiveMinutes = async (content, minutes) => {
    if (!minutes || minutes <= 0) return

    try {
      liveTrackerRef.current.saving = true
      const session = await api.post("/sessions", {
        contentId: content._id,
        date: new Date().toISOString().slice(0, 10),
        duration: minutes,
        notes: "Auto-tracked from live player",
      })
      setSessions((current) => [...current, session])

      if (content.status === "to-watch") {
        await api.put(`/contents/${content._id}`, { status: "in-progress" })
        setContents((current) =>
          current.map((entry) => (entry._id === content._id ? { ...entry, status: "in-progress" } : entry)),
        )
      }
    } catch (requestError) {
      console.error("Live minute save error:", requestError)
      setError("Live progress is visible, but auto-save failed once")
    } finally {
      liveTrackerRef.current.saving = false
    }
  }

  const restartContent = async (content) => {
    try {
      setLoading(true)
      setError("")

      if (activeLiveContentId === content._id) {
        setActiveLiveContentId("")
      }

      const updatedContent = await api.put(`/contents/${content._id}`, {
        progressSeconds: 0,
        status: "to-watch",
        completedAt: null,
        restartCount: (content.restartCount || 0) + 1,
      })

      setContents((current) => current.map((entry) => (entry._id === content._id ? { ...entry, ...updatedContent } : entry)))
    } catch (requestError) {
      console.error("Restart content error:", requestError)
      setError("Could not restart this content")
    } finally {
      setLoading(false)
    }
  }

  const startSkillFromDashboard = (skillName) => {
    setQuickForm((current) => ({ ...current, skillName }))
    setActiveView("tracker")
    setIsMenuOpen(false)
  }

  const continueSkillFromDashboard = (skillId, skillName) => {
    const skillContents = contentStats.filter((content) => content.skillId === skillId)
    const inProgressContent = skillContents.find((content) => content.status === "in-progress") || skillContents[0]

    setQuickForm((current) => ({ ...current, skillName }))
    setActiveView("tracker")
    setIsMenuOpen(false)

    if (inProgressContent && isYoutubeLink(inProgressContent.url)) {
      setActiveLiveContentId(inProgressContent._id)
    }
  }

  const restartSkillFromDashboard = async (skillId) => {
    const skillContents = contentStats.filter((content) => content.skillId === skillId)
    if (!skillContents.length) {
      setError("This skill has no links yet. Add one to start tracking.")
      return
    }

    try {
      setLoading(true)
      setError("")

      await Promise.all(
        skillContents.map((content) =>
          api.put(`/contents/${content._id}`, {
            progressSeconds: 0,
            status: "to-watch",
            completedAt: null,
            restartCount: (content.restartCount || 0) + 1,
          }),
        ),
      )

      const skillContentIds = new Set(skillContents.map((content) => content._id))

      setContents((current) =>
        current.map((entry) =>
          skillContentIds.has(entry._id)
            ? {
                ...entry,
                progressSeconds: 0,
                status: "to-watch",
                completedAt: null,
                restartCount: Number.parseInt(entry.restartCount || 0, 10) + 1,
              }
            : entry,
        ),
      )
    } catch (requestError) {
      console.error("Restart skill error:", requestError)
      setError("Could not restart this skill")
    } finally {
      setLoading(false)
    }
  }

  const ensureSkill = async (skillName) => {
    const existing = skills.find((skill) => skill.name.toLowerCase() === skillName.toLowerCase())
    if (existing) return existing

    const created = await api.post("/skills", {
      name: skillName,
      category: "Other",
      currentLevel: "Beginner",
      targetLevel: "Intermediate",
    })

    setSkills((current) => [...current, created])
    return created
  }

  const submitQuickTrack = async () => {
    const skillName = quickForm.skillName.trim()
    const link = quickForm.link.trim()
    const watchedMinutes = Number.parseInt(quickForm.watchedMinutes || "0", 10)

    if (!skillName || !link) {
      setError("Add a skill and a link")
      return
    }

    if (!isValidUrl(link)) {
      setError("Enter a valid link")
      return
    }

    try {
      setLoading(true)
      setError("")

      const skill = await ensureSkill(skillName)
      const title = skill.name
      const creator = getHostLabel(link)
      const type = isYoutubeLink(link) ? "youtube" : "article"

      const contentData = {
        title,
        creator,
        type,
        skillId: skill._id,
        url: link,
        thumbnail: type === "youtube" ? getYoutubeThumbnail(link) || null : null,
        status: watchedMinutes > 0 ? "in-progress" : "to-watch",
        progressSeconds: watchedMinutes > 0 ? watchedMinutes * 60 : 0,
        durationSeconds: 0,
      }

      const content = await api.post("/contents", contentData)
      setContents((current) => [...current, content])

      if (watchedMinutes > 0) {
        const session = await api.post("/sessions", {
          contentId: content._id,
          date: new Date().toISOString().slice(0, 10),
          duration: watchedMinutes,
          notes: quickForm.notes.trim(),
        })
        setSessions((current) => [...current, session])
        await api.put(`/contents/${content._id}`, {
          progressSeconds: watchedMinutes * 60,
          status: "in-progress",
          lastWatchedAt: new Date().toISOString(),
        })
      }

      setQuickForm({ skillName: "", link: "", watchedMinutes: "", notes: "" })
    } catch (requestError) {
      console.error("Quick track error:", requestError)
      setError("Could not save that link")
    } finally {
      setLoading(false)
    }
  }

  const addWatchTime = async (content) => {
    const minutes = Number.parseInt(minuteInputs[content._id] || "0", 10)
    if (!minutes || minutes <= 0) {
      setError("Enter minutes watched")
      return
    }

    try {
      setLoading(true)
      setError("")
      const session = await api.post("/sessions", {
        contentId: content._id,
        date: new Date().toISOString().slice(0, 10),
        duration: minutes,
        notes: "",
      })
      setSessions((current) => [...current, session])
      setMinuteInputs((current) => ({ ...current, [content._id]: "" }))

      if (content.status === "to-watch") {
        await api.put(`/contents/${content._id}`, { status: "in-progress" })
        setContents((current) => current.map((entry) => (entry._id === content._id ? { ...entry, status: "in-progress" } : entry)))
      }

      const nextProgressSeconds = Math.max(0, Number.parseInt(content.progressSeconds || 0, 10) + minutes * 60)
      const durationSeconds = Number.parseInt(content.durationSeconds || 0, 10)
      const shouldComplete = durationSeconds > 0 && getProgressPercent(nextProgressSeconds, durationSeconds) >= 95

      await api.put(`/contents/${content._id}`, {
        progressSeconds: nextProgressSeconds,
        lastWatchedAt: new Date().toISOString(),
        status: shouldComplete ? "completed" : "in-progress",
        completedAt: shouldComplete ? new Date().toISOString() : null,
      })

      setContents((current) =>
        current.map((entry) =>
          entry._id === content._id
            ? {
                ...entry,
                progressSeconds: nextProgressSeconds,
                status: shouldComplete ? "completed" : "in-progress",
                completedAt: shouldComplete ? new Date().toISOString() : null,
              }
            : entry,
        ),
      )
    } catch (requestError) {
      console.error("Watch time error:", requestError)
      setError("Could not log watch time")
    } finally {
      setLoading(false)
    }
  }

  const deleteContent = async (id) => {
    try {
      setLoading(true)
      if (activeLiveContentId === id) {
        setActiveLiveContentId("")
      }
      await api.delete(`/contents/${id}`)
      const relatedSessions = sessions.filter((entry) => entry.contentId === id)
      await Promise.allSettled(relatedSessions.map((entry) => api.delete(`/sessions/${entry._id}`)))
      setContents((current) => current.filter((entry) => entry._id !== id))
      setSessions((current) => current.filter((entry) => entry.contentId !== id))
    } catch (requestError) {
      console.error("Delete content error:", requestError)
      setError("Could not delete the link")
    } finally {
      setLoading(false)
    }
  }

  const contentStats = useMemo(() => {
    return contents.map((content) => {
      const contentSessions = sessions.filter((session) => session.contentId === content._id)
      const watchedMinutes = contentSessions.reduce((total, session) => total + Number.parseInt(session.duration || 0, 10), 0)
      const progressSeconds = Number.parseInt(content.progressSeconds || 0, 10)
      const durationSeconds = Number.parseInt(content.durationSeconds || 0, 10)
      return {
        ...content,
        watchedMinutes,
        sessionCount: contentSessions.length,
        skill: skills.find((skill) => skill._id === content.skillId),
        progressSeconds,
        durationSeconds,
        restartCount: Number.parseInt(content.restartCount || 0, 10),
        progressPercent: getProgressPercent(progressSeconds, durationSeconds),
      }
    })
  }, [contents, sessions, skills])

  const skillDashboard = useMemo(() => {
    const bySkillId = new Map()

    for (const skill of skills) {
      bySkillId.set(skill._id, {
        skill,
        items: [],
      })
    }

    for (const content of contentStats) {
      if (!bySkillId.has(content.skillId)) {
        bySkillId.set(content.skillId, {
          skill: content.skill || { _id: content.skillId, name: "Unknown skill" },
          items: [],
        })
      }
      bySkillId.get(content.skillId).items.push(content)
    }

    const started = []
    const completed = []
    const restart = []
    const notStarted = []

    for (const { skill, items } of bySkillId.values()) {
      const startedCount = items.filter((item) => item.status === "in-progress" || item.status === "completed").length
      const inProgressCount = items.filter((item) => item.status === "in-progress").length
      const completedCount = items.filter((item) => item.status === "completed").length
      const allCompleted = items.length > 0 && completedCount > 0 && completedCount === items.length
      const hasRestartSignal = items.some((item) => item.status === "completed" || item.restartCount > 0)

      const skillSummary = {
        skillId: skill._id,
        name: skill.name,
        total: items.length,
        completedCount,
        startedCount,
        inProgressCount,
      }

      if (!items.length) {
        notStarted.push(skillSummary)
      }

      if (startedCount > 0) {
        started.push(skillSummary)
      }

      if (allCompleted) {
        completed.push(skillSummary)
      }

      if (hasRestartSignal) {
        restart.push(skillSummary)
      }
    }

    const sorter = (a, b) => a.name.localeCompare(b.name)
    return {
      started: started.sort(sorter),
      completed: completed.sort(sorter),
      restart: restart.sort(sorter),
      notStarted: notStarted.sort(sorter),
    }
  }, [skills, contentStats])

  const totalMinutes = contentStats.reduce((total, content) => total + content.watchedMinutes, 0)
  const activeLiveContent = contentStats.find((content) => content._id === activeLiveContentId)

  useEffect(() => {
    return () => {
      stopLiveTracking()
    }
  }, [])

  useEffect(() => {
    const startLiveTracking = async () => {
      if (!activeLiveContent || !isYoutubeLink(activeLiveContent.url)) {
        stopLiveTracking()
        setLiveProgress({ currentSeconds: 0, durationSeconds: 0, bufferedMinutes: 0 })
        return
      }

      const videoId = extractYoutubeVideoId(activeLiveContent.url)
      if (!videoId) {
        setError("Could not parse this YouTube link for live tracking")
        return
      }

      stopLiveTracking()
      setError("")

      try {
        const yt = await loadYoutubeApi()
        playerRef.current = new yt.Player(PLAYER_ELEMENT_ID, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event) => {
              const resumeSeconds = Math.max(0, Number.parseInt(activeLiveContent.progressSeconds || 0, 10))
              if (resumeSeconds > 0) {
                event.target.seekTo(resumeSeconds, true)
                liveTrackerRef.current.previousSecond = resumeSeconds
                setLiveProgress((current) => ({ ...current, currentSeconds: resumeSeconds }))
              }
            },
          },
        })

        liveTrackerRef.current.intervalId = window.setInterval(async () => {
          if (!playerRef.current || typeof playerRef.current.getCurrentTime !== "function") return

          const state = playerRef.current.getPlayerState?.()
          const currentSeconds = playerRef.current.getCurrentTime?.() || 0
          const durationSeconds = playerRef.current.getDuration?.() || 0

          setLiveProgress({
            currentSeconds,
            durationSeconds,
            bufferedMinutes: Math.floor(liveTrackerRef.current.bufferedSeconds / 60),
          })

          const statusByProgress = durationSeconds > 0 && getProgressPercent(currentSeconds, durationSeconds) >= 95 ? "completed" : "in-progress"

          if (
            !liveTrackerRef.current.saving &&
            Math.abs(currentSeconds - liveTrackerRef.current.lastSavedSecond) >= 10
          ) {
            liveTrackerRef.current.lastSavedSecond = currentSeconds
            await persistPlaybackState(activeLiveContent._id, currentSeconds, durationSeconds, statusByProgress)
          }

          if (state !== 1) {
            liveTrackerRef.current.previousSecond = currentSeconds
            return
          }

          if (liveTrackerRef.current.previousSecond > 0 && currentSeconds >= liveTrackerRef.current.previousSecond) {
            liveTrackerRef.current.bufferedSeconds += currentSeconds - liveTrackerRef.current.previousSecond
          }
          liveTrackerRef.current.previousSecond = currentSeconds

          if (!liveTrackerRef.current.saving && liveTrackerRef.current.bufferedSeconds >= 60) {
            const minutesToSave = Math.floor(liveTrackerRef.current.bufferedSeconds / 60)
            liveTrackerRef.current.bufferedSeconds -= minutesToSave * 60
            await persistLiveMinutes(activeLiveContent, minutesToSave)
          }

          if (statusByProgress === "completed" && !liveTrackerRef.current.completionSaved) {
            liveTrackerRef.current.completionSaved = true
            await persistPlaybackState(activeLiveContent._id, currentSeconds, durationSeconds, "completed")
          }
        }, 1000)
      } catch (requestError) {
        console.error("Live tracker setup error:", requestError)
        setError("Could not start live player")
      }
    }

    startLiveTracking()

    return () => {
      const currentSeconds = playerRef.current?.getCurrentTime?.() || 0
      const durationSeconds = playerRef.current?.getDuration?.() || 0
      if (activeLiveContentId && durationSeconds > 0) {
        const statusByProgress =
          durationSeconds > 0 && getProgressPercent(currentSeconds, durationSeconds) >= 95 ? "completed" : "in-progress"
        persistPlaybackState(activeLiveContentId, currentSeconds, durationSeconds, statusByProgress)
      }
      stopLiveTracking()
    }
  }, [activeLiveContentId])

  if (!currentUser) {
    return (
      <div className="screen screen--auth">
        <div className="auth-card surface">
          <div className="auth-copy">
            <div className="eyebrow">Simple tracking</div>
            <h1>Save a skill, paste a link, and keep watch time moving.</h1>
            <p>
              A calmer workspace with no extra navigation. Sign in, drop in the link, log a few minutes, and the
              tracker updates right away.
            </p>

            <div className="auth-points">
              <div>
                <ShieldCheck size={18} />
                <span>One place for every learning link.</span>
              </div>
              <div>
                <Clock3 size={18} />
                <span>Watch time totals update instantly.</span>
              </div>
              <div>
                <BookOpen size={18} />
                <span>Skills stay tied to the content.</span>
              </div>
            </div>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (isRegistering) {
                handleRegister()
              } else {
                handleLogin()
              }
            }}
          >
            <div className="login-form__title">
              <div className="avatar-chip">
                <User size={18} />
              </div>
              <div>
                <h2>{isRegistering ? "Create account" : "Sign in"}</h2>
                <p>Keep it simple and continue where you left off.</p>
              </div>
            </div>

            {error && <div className="alert">{error}</div>}

            <label className="field">
              <span>Username</span>
              <input
                type="text"
                placeholder="Enter username"
                value={loginForm.username}
                onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                disabled={loading}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                disabled={loading}
              />
            </label>

            <button type="submit" className="button button--primary" disabled={loading}>
              {loading ? "Please wait..." : isRegistering ? "Create account" : "Sign in"}
            </button>

            <button type="button" className="button button--ghost" onClick={() => setIsRegistering((value) => !value)} disabled={loading}>
              {isRegistering ? "I already have an account" : "Create a new account"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="screen screen--app">
      <div className="app-shell">
        <header className="topbar surface">
          <div>
            <div className="eyebrow">Learning tracker</div>
            <h1>Hi, {currentUser.username}</h1>
            <p>
              {activeView === "tracker"
                ? "One input, one link, and the watch time updates in place."
                : "See all your skills grouped by progress status."}
            </p>
          </div>

          <div className="topbar__actions">
            <div className="menu-wrap">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-label="Open sections menu"
              >
                {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
                {activeView === "tracker" ? "Tracker" : "Dashboard"}
              </button>

              {isMenuOpen && (
                <div className="menu-panel">
                  <button
                    type="button"
                    className={`menu-item ${activeView === "tracker" ? "menu-item--active" : ""}`}
                    onClick={() => {
                      setActiveView("tracker")
                      setIsMenuOpen(false)
                    }}
                  >
                    Tracker
                  </button>
                  <button
                    type="button"
                    className={`menu-item ${activeView === "dashboard" ? "menu-item--active" : ""}`}
                    onClick={() => {
                      setActiveView("dashboard")
                      setIsMenuOpen(false)
                    }}
                  >
                    Skill dashboard
                  </button>
                  <div className="menu-divider" />
                  <button
                    type="button"
                    className="menu-item menu-item--danger"
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleLogout()
                    }}
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>

            <div className="stat-pill">
              <Clock3 size={16} />
              <span>{metric(totalMinutes)} watched</span>
            </div>
          </div>
        </header>

        {error && <div className="alert">{error}</div>}

        {activeView === "tracker" && (
          <>
            <section className="hero surface">
              <div>
                <div className="eyebrow">Quick add</div>
                <h2>Add a skill and link in one go</h2>
                <p>
                  If the skill does not exist yet, it is created automatically. Paste a YouTube or article link, add
                  the minutes you already watched, and save.
                </p>
              </div>

              <div className="quick-form">
                <label className="field">
                  <span>Skill</span>
                  <input
                    type="text"
                    placeholder="Example: React"
                    value={quickForm.skillName}
                    onChange={(event) => setQuickForm({ ...quickForm, skillName: event.target.value })}
                  />
                </label>

                <label className="field field--wide">
                  <span>Link</span>
                  <input
                    type="url"
                    placeholder="Paste your video or article link"
                    value={quickForm.link}
                    onChange={(event) => setQuickForm({ ...quickForm, link: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Minutes watched now</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="15"
                    value={quickForm.watchedMinutes}
                    onChange={(event) => setQuickForm({ ...quickForm, watchedMinutes: event.target.value })}
                  />
                </label>

                <label className="field field--wide">
                  <span>Note</span>
                  <input
                    type="text"
                    placeholder="What did you learn?"
                    value={quickForm.notes}
                    onChange={(event) => setQuickForm({ ...quickForm, notes: event.target.value })}
                  />
                </label>

                <button
                  type="button"
                  className="button button--primary quick-form__submit"
                  onClick={submitQuickTrack}
                  disabled={loading}
                >
                  <Plus size={16} />
                  Save link
                </button>
              </div>
            </section>

            <section className="feed surface">
          <div className="feed__header">
            <div>
              <div className="eyebrow">Live tracking</div>
              <h2>Your saved links</h2>
            </div>
          </div>

          {activeLiveContent && (
            <div className="live-panel">
              <div className="live-panel__header">
                <div>
                  <div className="eyebrow">Live player</div>
                  <h3>{activeLiveContent.url}</h3>
                </div>
                <button type="button" className="button button--ghost" onClick={() => setActiveLiveContentId("")}>
                  Close player
                </button>
              </div>

              <div className="live-panel__video" id={PLAYER_ELEMENT_ID} />

              <div className="live-panel__meta">
                <span>
                  {formatClock(liveProgress.currentSeconds)} / {formatClock(liveProgress.durationSeconds)}
                </span>
                <span>Auto-log buffer: {liveProgress.bufferedMinutes} min</span>
              </div>

              <div className="progress-line">
                <div
                  className="progress-line__fill"
                  style={{
                    width: `${
                      liveProgress.durationSeconds > 0
                        ? Math.min(100, (liveProgress.currentSeconds / liveProgress.durationSeconds) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {contentStats.length ? (
            <div className="content-list">
              {contentStats.map((content) => {
                const preview = content.thumbnail || (isYoutubeLink(content.url) ? getYoutubeThumbnail(content.url) : "")
                const watchedMinutes = content.watchedMinutes
                const totalItemMinutes = watchedMinutes + 0
                const progressPercent = content.progressPercent

                return (
                  <article key={content._id} className="content-row">
                    <div className="content-row__media">
                      {preview ? (
                        <img src={preview} alt={content.title} />
                      ) : (
                        <div className="content-row__placeholder">
                          <Link2 size={20} />
                        </div>
                      )}
                    </div>

                    <div className="content-row__main">
                      <div className="content-row__top">
                        <div>
                          <div className="badge">{content.skill?.name || "Skill"}</div>
                          <h3>{content.url}</h3>
                          <p>{content.creator}</p>
                        </div>

                        <button type="button" className="icon-button" onClick={() => deleteContent(content._id)} disabled={loading}>
                          ×
                        </button>
                      </div>

                      <div className="progress-line">
                        <div className="progress-line__fill" style={{ width: `${progressPercent}%` }} />
                      </div>

                      <div className="content-row__meta">
                        <span>{content.sessionCount} logs</span>
                        <span>{metric(totalItemMinutes)} watched</span>
                        <span>{content.status.replace(/-/g, " ")}</span>
                        {content.durationSeconds > 0 && (
                          <span>
                            {formatClock(content.progressSeconds)} / {formatClock(content.durationSeconds)}
                          </span>
                        )}
                        <span>{Math.round(progressPercent)}%</span>
                        {content.restartCount > 0 && <span>restarted {content.restartCount}x</span>}
                        {isYoutubeLink(content.url) && <span>Live supported</span>}
                      </div>

                      <div className="content-row__watcher">
                        <input
                          type="number"
                          min="1"
                          placeholder="Add minutes"
                          value={minuteInputs[content._id] || ""}
                          onChange={(event) => setMinuteInputs({ ...minuteInputs, [content._id]: event.target.value })}
                        />
                        <button type="button" className="button button--secondary" onClick={() => addWatchTime(content)} disabled={loading}>
                          Log watch time
                        </button>
                        {isYoutubeLink(content.url) && (
                          <button
                            type="button"
                            className="button button--secondary"
                            onClick={() => setActiveLiveContentId(content._id)}
                            disabled={loading}
                          >
                            {activeLiveContentId === content._id ? "Tracking now" : "Live track"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => restartContent(content)}
                          disabled={loading}
                        >
                          Restart
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">Add your first skill and link above. It will appear here immediately.</div>
          )}
            </section>
          </>
        )}

        {activeView === "dashboard" && (
          <>
            <section className="overview-grid">
              <div className="mini-card surface">
                <div className="mini-card__label">Skills</div>
                <div className="mini-card__value">{skills.length}</div>
                <div className="mini-card__note">Tracked learning topics</div>
              </div>
              <div className="mini-card surface">
                <div className="mini-card__label">Links</div>
                <div className="mini-card__value">{contents.length}</div>
                <div className="mini-card__note">Saved resources</div>
              </div>
              <div className="mini-card surface">
                <div className="mini-card__label">Sessions</div>
                <div className="mini-card__value">{sessions.length}</div>
                <div className="mini-card__note">Watch logs saved</div>
              </div>
            </section>

            <section className="skill-dashboard surface">
              <div className="feed__header">
                <div>
                  <div className="eyebrow">Skill dashboard</div>
                  <h2>Started, completed, and ready to restart</h2>
                  <p>Quick status view for every skill you are tracking.</p>
                </div>
              </div>

              <div className="skill-dashboard__grid">
                <article className="skill-column">
                  <h3>Started</h3>
                  {skillDashboard.started.length ? (
                    <ul className="skill-column__list">
                      {skillDashboard.started.map((entry) => (
                        <li key={`started-${entry.skillId}`}>
                          <div className="skill-row">
                            <div>
                              <span>{entry.name}</span>
                              <small>{entry.startedCount}/{entry.total} links active</small>
                            </div>
                            <button
                              type="button"
                              className="button button--secondary skill-action skill-action--start"
                              onClick={() => continueSkillFromDashboard(entry.skillId, entry.name)}
                              disabled={loading}
                            >
                              {entry.inProgressCount > 0 ? "Continue" : "Start"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-state">No started skills yet.</div>
                  )}
                </article>

                <article className="skill-column">
                  <h3>Completed</h3>
                  {skillDashboard.completed.length ? (
                    <ul className="skill-column__list">
                      {skillDashboard.completed.map((entry) => (
                        <li key={`completed-${entry.skillId}`}>
                          <div className="skill-row">
                            <div>
                              <span>{entry.name}</span>
                              <small>{entry.completedCount}/{entry.total} links completed</small>
                            </div>
                            <button
                              type="button"
                              className="button button--secondary skill-action skill-action--restart"
                              onClick={() => restartSkillFromDashboard(entry.skillId)}
                              disabled={loading}
                            >
                              Restart
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-state">No fully completed skills yet.</div>
                  )}
                </article>

                <article className="skill-column">
                  <h3>Ready to restart</h3>
                  {skillDashboard.restart.length ? (
                    <ul className="skill-column__list">
                      {skillDashboard.restart.map((entry) => (
                        <li key={`restart-${entry.skillId}`}>
                          <div className="skill-row">
                            <div>
                              <span>{entry.name}</span>
                              <small>Completed before, can restart anytime</small>
                            </div>
                            <button
                              type="button"
                              className="button button--secondary skill-action skill-action--restart"
                              onClick={() => restartSkillFromDashboard(entry.skillId)}
                              disabled={loading}
                            >
                              Restart
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-state">Nothing to restart yet.</div>
                  )}
                </article>

                <article className="skill-column">
                  <h3>Not started</h3>
                  {skillDashboard.notStarted.length ? (
                    <ul className="skill-column__list">
                      {skillDashboard.notStarted.map((entry) => (
                        <li key={`not-started-${entry.skillId}`}>
                          <div className="skill-row">
                            <div>
                              <span>{entry.name}</span>
                              <small>No links added yet</small>
                            </div>
                            <button
                              type="button"
                              className="button button--secondary skill-action skill-action--start"
                              onClick={() => startSkillFromDashboard(entry.name)}
                              disabled={loading}
                            >
                              Start
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-state">All skills have at least one link.</div>
                  )}
                </article>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}