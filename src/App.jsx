import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, FileBarChart, FileText,
  Filter, HeartHandshake, LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal, Plus,
  Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Users, UserRound, X, CalendarPlus,
  Stethoscope, ClipboardList, TrendingUp, LockKeyhole, Eye, EyeOff
} from 'lucide-react'
import { initialAppointments, initialClients } from './data'
import { isSupabaseConfigured, supabase } from './supabase'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Client records', icon: Users },
  { label: 'Reports & insights', icon: FileBarChart },
]
const roles = ['Admin', 'Counsellor', 'Client']
const avatarColors = ['lavender', 'mint', 'peach', 'blue', 'yellow']

function getSaved(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }
function initials(name = '') { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() }
function Status({ children }) { return <span className={`status status-${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span> }
function Avatar({ name, color = 'lavender', small = false }) { return <span className={`avatar ${color} ${small ? 'avatar-small' : ''}`}>{initials(name)}</span> }
function SectionTitle({ eyebrow, title, subtitle, action }) { return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }

export default function App() {
  const [active, setActive] = useState('Overview')
  const [role, setRole] = useState('Admin')
  const [appointments, setAppointments] = useState(() => getSaved('cc_appointments', initialAppointments))
  const [clients, setClients] = useState(() => getSaved('cc_clients', initialClients))
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [userName, setUserName] = useState('Alex Morgan')
  const [email, setEmail] = useState('alex@careconnect.demo')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ client: '', counsellor: 'Dr. Aditi Rao', date: '2026-10-29', time: '10:00 AM', type: 'Follow-up' })
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', counsellor: 'Dr. Aditi Rao' })
  const [supabaseUser, setSupabaseUser] = useState(null)

  useEffect(() => { save('cc_appointments', appointments) }, [appointments])
  useEffect(() => { save('cc_clients', clients) }, [clients])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => { if (data.session) { setSupabaseUser(data.session.user); setShowLogin(false) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setSupabaseUser(session?.user || null); if (session) setShowLogin(false) })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) }, [toast])

  const filteredClients = useMemo(() => clients.filter(c => `${c.name} ${c.email} ${c.counsellor} ${c.id}`.toLowerCase().includes(search.toLowerCase())), [clients, search])
  const filteredAppointments = useMemo(() => appointments.filter(a => `${a.client} ${a.counsellor} ${a.id} ${a.type}`.toLowerCase().includes(search.toLowerCase())), [appointments, search])

  
async function login(e) {
  e?.preventDefault()

  if (!isSupabaseConfigured) {
    setUserName(
      role === 'Admin'
        ? 'Alex Morgan'
        : role === 'Counsellor'
          ? 'Dr. Aditi Rao'
          : 'Maya Sharma'
    )
    setShowLogin(false)
    setToast('Demo workspace opened. Data is stored in this browser only.')
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  })

  if (error) {
    setToast(error.message)
    return
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    setToast('Profile not found. Please contact the administrator.')
    await supabase.auth.signOut()
    return
  }

  const actualRole = {
    admin: 'Admin',
    counsellor: 'Counsellor',
    client: 'Client'
  }[profile.role?.toLowerCase()]

  if (!actualRole) {
    setToast('Your account has an invalid role.')
    await supabase.auth.signOut()
    return
  }

  setRole(actualRole)
  setSupabaseUser(data.user)
  setUserName(profile.full_name || data.user.email?.split('@')[0] || 'CareConnect')
  setActive('Overview')
  setShowLogin(false)
  setToast(`Signed in as ${actualRole}.`)
}

  async function signUp() {
    if (!isSupabaseConfigured) {
      setToast('Demo mode has no account database. Choose a preview role and sign in to explore.')
      return
    }
    if (!email.trim() || password.length < 6) {
      setToast('Enter a valid email and a password with at least 6 characters.')
      return
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { role: 'Client' } }
    })
    if (error) { setToast(error.message); return }
    if (data.session && data.user) {
      setSupabaseUser(data.user)
      setUserName(data.user.email?.split('@')[0] || 'CareConnect User')
      setRole('Client')
      setShowLogin(false)
      setToast('Account created. You are signed in as a Client.')
    } else {
      setToast('Registration submitted. Check your email to confirm the account, then sign in.')
    }
  }
  async function resetPassword() {
    if (!isSupabaseConfigured) {
      setToast('Password reset requires a configured Supabase project. Demo mode does not use passwords.')
      return
    }
    if (!email.trim()) { setToast('Enter your email address first.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`
    })
    if (error) setToast(error.message)
    else setToast('If an account exists for this email, a password reset link has been sent.')
  }
  async function logout() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    setShowLogin(true); setPassword(''); setToast('You have signed out.')
  }
  function addAppointment(e) {
    e.preventDefault()
    if (!form.client.trim()) { setToast('Please enter a client name.'); return }
    const appt = { ...form, id: `APT-${1053 + appointments.length}`, client: form.client.trim(), initials: initials(form.client), status: 'Pending', color: avatarColors[appointments.length % avatarColors.length] }
    setAppointments(prev => [appt, ...prev]); setModal(null); setForm({ client: '', counsellor: 'Dr. Aditi Rao', date: '2026-10-29', time: '10:00 AM', type: 'Follow-up' }); setToast('Appointment added to the demo workspace.')
  }
  function addClient(e) {
    e.preventDefault()
    if (!clientForm.name.trim() || !clientForm.email.trim()) { setToast('Name and email are required.'); return }
    const client = { ...clientForm, id: `CL-${201 + clients.length}`, status: 'Active', lastVisit: '—', nextVisit: 'Not scheduled' }
    setClients(prev => [client, ...prev]); setClientForm({ name: '', email: '', phone: '', counsellor: 'Dr. Aditi Rao' }); setModal(null); setToast('Client added. Use fictional data in demo mode.')
  }
  function updateStatus(id, status) { setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a)); setToast(`Appointment marked ${status.toLowerCase()}.`) }
  function exportCsv() {
    const rows = [['Client ID', 'Name', 'Email', 'Counsellor', 'Status'], ...filteredClients.map(c => [c.id, c.name, c.email, c.counsellor, c.status])]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = 'careconnect-client-directory-demo.csv'; a.click(); URL.revokeObjectURL(url); setToast('Demo client directory exported as CSV.')
  }

  if (showLogin) return <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} role={role} setRole={setRole} login={login} signUp={signUp} resetPassword={resetPassword} isSupabaseConfigured={isSupabaseConfigured} toast={toast} />

  const displayName = role === 'Counsellor' ? 'Dr. Aditi Rao' : role === 'Client' ? 'Maya Sharma' : userName
  const visibleNavItems =
  role === 'Admin'
    ? navItems
    : role === 'Counsellor'
      ? navItems.filter(item =>
          ['Overview', 'Appointments', 'Client records'].includes(item.label)
        )
      : navItems.filter(item =>
          ['Overview', 'Appointments'].includes(item.label)
        )
  const pageTitle = active === 'Overview' ? 'Good morning' : active

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><HeartHandshake size={21} strokeWidth={2.3} /></div><div><span className="brand-name">careconnect</span><span className="brand-sub">CARE, COORDINATED</span></div><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">H</div><div className="workspace-copy"><strong>Harbour Wellness</strong><span>Workspace</span></div><ChevronDown size={15} className="muted" /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="main-nav">{navItems.map(item => <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => { setActive(item.label); setSearch(''); setMobileNav(false) }}><item.icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{item.label === 'Appointments' && <span className="nav-count">{appointments.length}</span>}</button>)}</nav>
      <div className="nav-caption management-caption">MANAGEMENT</div>
      <button className={`nav-item ${active === 'Team & access' ? 'active' : ''}`} onClick={() => { setActive('Team & access'); setMobileNav(false) }}><ShieldCheck size={18}/><span>Team & access</span></button>
      <button className={`nav-item ${active === 'Settings' ? 'active' : ''}`} onClick={() => { setActive('Settings'); setMobileNav(false) }}><Settings size={18}/><span>Settings</span></button>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Find your way around CareConnect.</p><button onClick={() => setModal({ type: 'help' })}>Visit help centre <ArrowRight size={14}/></button></div><div className="user-card"><Avatar name={displayName} color="mint"/><div className="user-copy"><strong>{displayName}</strong><span>{role}</span></div><button className="icon-btn" onClick={() => setProfileOpen(!profileOpen)}><MoreHorizontal size={19}/></button>{profileOpen && <div className="profile-menu"><div className="profile-menu-title">Switch demo role</div>{roles.map(r => <button key={r} onClick={() => { setRole(r); setProfileOpen(false); setToast(`Demo role switched to ${r}.`) }}><span>{r}</span>{role === r && <Check size={14}/>}</button>)}<button onClick={logout}><LogOut size={14}/> Sign out</button></div>}</div></div>
    </aside>
    {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs"><span>Harbour Wellness</span><span className="crumb-sep">/</span><strong>{active}</strong></div><div className="topbar-right"><div className="environment-pill"><span className="environment-dot"/>{isSupabaseConfigured ? 'Cloud connected' : 'Demo environment'}</div><button className="icon-btn notification-btn" onClick={() => setModal({ type: 'notifications' })} aria-label="Notifications"><Bell size={18}/><i/></button><button className="top-user" onClick={() => setProfileOpen(!profileOpen)}><Avatar name={displayName} color="mint" small/><span>{displayName}</span><ChevronDown size={14}/></button></div></header>
      <div className="page-content">
        {active === 'Overview' && (
  role === 'Admin' ? (
    <AdminOverview
      appointments={appointments}
      clients={clients}
      setActive={setActive}
      setModal={setModal}
      updateStatus={updateStatus}
      role={role}
    />
  ) : role === 'Counsellor' ? (
    <CounsellorOverview
      appointments={appointments}
      clients={clients}
    />
  ) : (
    <ClientOverview
      appointments={appointments}
      userName={userName}
    />
  )
)}
        {active === 'Appointments' && <AppointmentsPage appointments={filteredAppointments} setModal={setModal} updateStatus={updateStatus} search={search} setSearch={setSearch} />}
        {active === 'Client records' && <ClientsPage clients={filteredClients} setModal={setModal} search={search} setSearch={setSearch} exportCsv={exportCsv} role={role} />}
        {active === 'Reports & insights' && <ReportsPage appointments={appointments} clients={clients} exportCsv={exportCsv} />}
        {active === 'Team & access' && <TeamPage role={role} setRole={setRole} setToast={setToast} />}
        {active === 'Settings' && <SettingsPage role={role} setToast={setToast} />}
      </div>
      <footer className="app-footer"><span><LockKeyhole size={13}/> Privacy-first by design</span><span>CareConnect <b>·</b> Project demonstration build</span></footer>
    </main>
    {modal && <Modal modal={modal} close={() => setModal(null)} form={form} setForm={setForm} addAppointment={addAppointment} clientForm={clientForm} setClientForm={setClientForm} addClient={addClient} />}
    {toast && <div className="toast"><CheckCircle2 size={17}/><span>{toast}</span><button onClick={() => setToast('')}><X size={14}/></button></div>}
  </div>
}

function Login({ email, setEmail, password, setPassword, showPassword, setShowPassword, role, setRole, login, signUp, resetPassword, isSupabaseConfigured, toast }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signup') await signUp()
      else await login(e)
    } finally {
      setBusy(false)
    }
  }
  async function handleReset() {
    setBusy(true)
    try { await resetPassword() } finally { setBusy(false) }
  }
  return <div className="login-shell">
    <div className="login-left">
      <div className="login-brand"><div className="brand-mark"><HeartHandshake size={22}/></div><span>careconnect</span></div>
      <div className="login-hero"><div className="hero-kicker"><span/> BETTER CARE, TOGETHER</div><h1>More room for<br/><em>human connection.</em></h1><p>A calmer, more coordinated workspace for counselling teams to care for the people who matter most.</p>
        <div className="hero-illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="illustration-card card-one"><div className="mini-avatar mint">AR</div><div><b>Dr. Aditi Rao</b><small>Counsellor</small></div><span className="online-dot"/></div><div className="illustration-card card-two"><div className="mini-calendar"><CalendarDays size={17}/></div><div><b>Session confirmed</b><small>Today · 10:30 AM</small></div><CheckCircle2 size={18} className="green-icon"/></div><div className="illustration-center"><HeartHandshake size={48} strokeWidth={1.25}/></div><div className="floating-leaf leaf-a">✳</div><div className="floating-leaf leaf-b">✦</div></div>
        <div className="login-footnote"><ShieldCheck size={16}/> Designed around privacy, dignity and access.</div>
      </div><div className="login-left-bottom">A student project prototype · Use fictional data only</div>
    </div>
    <div className="login-right"><div className="login-form-wrap">
      <div className="mobile-login-brand"><div className="brand-mark"><HeartHandshake size={20}/></div><span>careconnect</span></div>
      <div className="form-overline">WELCOME TO CARECONNECT</div>
      {toast && <div className="auth-feedback" role="status">{toast}</div>}
      <h2>{mode === 'signup' ? 'Create your client account' : 'Sign in to your workspace'}</h2>
      <p className="login-subtitle">{mode === 'signup' ? 'Register to get started with CareConnect.' : 'Your care coordination space, all in one place.'}</p>
      <div className="role-pills auth-mode-pills">
        <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Sign in</button>
        <button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setRole('Client') }}>Create account</button>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <div className="input-wrap"><UserRound size={17}/><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/></div>
        <div className="label-row"><label htmlFor="password">Password</label>{mode === 'login' && <button type="button" className="text-link" onClick={handleReset} disabled={busy}>Forgot password?</button>}</div>
        <div className="input-wrap"><LockKeyhole size={17}/><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 6 : undefined} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Create a password (6+ characters)' : 'Enter your password'} required/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
        {mode === 'login' && !isSupabaseConfigured && <div className="demo-role"><span>Preview role</span><div className="role-pills">{roles.map(r => <button type="button" key={r} className={role === r ? 'selected' : ''} onClick={() => setRole(r)}>{r}</button>)}</div></div>}
        {mode === 'signup' && <p className="login-subtitle">New registrations are assigned the Client role. Email confirmation may be required.</p>}
        <button className="primary-btn login-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Continue to workspace'} <ArrowRight size={17}/></button>
      </form>
      {!isSupabaseConfigured && <div className="demo-note"><Sparkles size={16}/><div><b>Demo mode</b><span>Authentication is not connected. Choose a preview role and sign in to explore fictional sample data. Account creation and password reset require Supabase configuration.</span></div></div>}
      <div className="login-terms">Use fictional data only. This student prototype is not for real counselling records.</div>
    </div><div className="login-right-footer"><span>© 2026 CareConnect</span><span><CircleHelp size={14}/> Help & support</span></div></div>
  </div>
}
function AdminOverview({ appointments, clients, setActive, setModal, updateStatus, role }) {
  const today = appointments.filter(a => a.date === '2026-10-28').length
  const confirmed = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Checked in').length
  return <>
    <div className="welcome-row"><SectionTitle eyebrow="WEDNESDAY, OCTOBER 28, 2026" title="A little more connected." subtitle="Here's what's happening across your care workspace today."/><div className="welcome-actions"><button className="secondary-btn" onClick={() => setActive('Reports & insights')}><FileBarChart size={16}/> View reports</button><button className="primary-btn" onClick={() => setModal({ type: 'appointment' })}><Plus size={17}/> New appointment</button></div></div>
    <div className="demo-banner"><div className="demo-banner-icon"><Sparkles size={16}/></div><div><strong>You're exploring a demo workspace</strong><span>All names and records are fictional. Changes are saved locally in this browser, not to a live care system.</span></div><span className="demo-badge">DEMO DATA</span></div>
    <div className="stats-grid"><StatCard label="Total clients" value={clients.length.toString().padStart(2, '0')} trend="Across this workspace" icon={Users} tone="green"/><StatCard label="Sessions today" value={String(today).padStart(2, '0')} trend={`${confirmed} confirmed or checked in`} icon={CalendarDays} tone="violet"/><StatCard label="Awaiting confirmation" value={String(appointments.filter(a => a.status === 'Pending').length).padStart(2, '0')} trend="Needs a quick follow-up" icon={Clock3} tone="amber"/><StatCard label="Active counsellors" value="03" trend="Across 3 care specialties" icon={Stethoscope} tone="blue"/></div>
    <div className="dashboard-grid"><section className="panel appointments-panel"><div className="panel-heading"><div><h2>Today's appointments</h2><p>Your team's upcoming sessions</p></div><button className="link-btn" onClick={() => setActive('Appointments')}>View all <ArrowRight size={15}/></button></div><div className="appointment-list">{appointments.filter(a => a.date === '2026-10-28').slice(0, 5).map((a, i) => <div className="appointment-row" key={a.id}><div className="appointment-time"><b>{a.time}</b><span>{i === 0 ? 'In 30 min' : i === 1 ? 'In 1 hr' : a.type === 'Follow-up' ? 'Follow-up' : 'Session'}</span></div><div className="time-rail"><span className={i === 0 ? 'rail-dot current' : 'rail-dot'}/><span className="rail-line"/></div><Avatar name={a.client} color={a.color} small/><div className="appointment-person"><b>{a.client}</b><span>{a.type} <i>·</i> {a.counsellor}</span></div><Status>{a.status}</Status><button className="icon-btn row-more" onClick={() => updateStatus(a.id, a.status === 'Pending' ? 'Confirmed' : a.status === 'Confirmed' ? 'Checked in' : 'Confirmed')} title="Update appointment status"><MoreHorizontal size={18}/></button></div>)}{appointments.filter(a => a.date === '2026-10-28').length === 0 && <EmptyState text="No appointments scheduled for today."/>}</div><div className="panel-bottom-note"><span><span className="tiny-green-dot"/> Schedule is up to date</span><span>Times shown in IST (UTC+5:30)</span></div></section>
      <section className="panel focus-panel"><div className="panel-heading"><div><h2>Workspace at a glance</h2><p>A quick look at service activity</p></div><div className="icon-soft"><Activity size={17}/></div></div><div className="focus-stat"><div><span>Appointments completed</span><b>68%</b></div><div className="progress-track"><span style={{ width: '68%' }}/></div><small>Illustrative weekly completion rate</small></div><div className="focus-stat"><div><span>Client follow-ups</span><b>12 <small>due soon</small></b></div><div className="progress-track amber-track"><span style={{ width: '42%' }}/></div><small>Demo metric — connect real workflow data to calculate this.</small></div><div className="insight-card"><div className="insight-icon"><Sparkles size={16}/></div><div><b>Make space for the important things</b><p>Use reminders and consistent records to help your team spend less time coordinating and more time supporting people.</p></div></div><button className="outline-full-btn" onClick={() => setActive('Reports & insights')}>Explore workspace insights <ArrowRight size={15}/></button></section></div>
    <section className="panel client-panel"><div className="panel-heading"><div><h2>Recently active clients</h2><p>Keep track of ongoing coordination</p></div><button className="link-btn" onClick={() => setActive('Client records')}>All client records <ArrowRight size={15}/></button></div><div className="table-scroll"><table className="data-table"><thead><tr><th>CLIENT</th><th>ASSIGNED COUNSELLOR</th><th>LAST SESSION</th><th>NEXT APPOINTMENT</th><th>STATUS</th></tr></thead><tbody>{clients.slice(0, 4).map((c, i) => <tr key={c.id}><td><div className="table-person"><Avatar name={c.name} color={avatarColors[i % avatarColors.length]} small/><div><b>{c.name}</b><span>{c.id}</span></div></div></td><td>{c.counsellor}</td><td>{c.lastVisit}</td><td>{c.nextVisit}</td><td><Status>{c.status}</Status></td></tr>)}</tbody></table></div></section>
  </>
}
function CounsellorOverview({ appointments, clients }) {
  const myAppointments = appointments.filter(
    (a) => a.counsellor === 'Dr. Aditi Rao'
  );

  return (
    <>
      <SectionTitle
        eyebrow="COUNSELLOR WORKSPACE"
        title="Counsellor dashboard"
        subtitle="Manage your appointments and client follow-ups."
      />

      <div className="stats-grid">
        <StatCard
  label="My appointments"
  value={myAppointments.length.toString()}
  icon={CalendarDays}
/>
        <StatCard
          label="My clients"
          value={clients.filter(
            (c) => c.counsellor === 'Dr. Aditi Rao'
          ).length.toString()}
        />
        <StatCard
          label="Pending appointments"
          value={myAppointments.filter(
            (a) => a.status === 'Pending'
          ).length.toString()}
        />
      </div>
    </>
  );
}

function ClientOverview({ appointments, userName }) {
  const myAppointments = appointments.filter(
    (a) => a.client === userName
  );

  return (
    <>
      <SectionTitle
        eyebrow="CLIENT WORKSPACE"
        title="Your dashboard"
        subtitle="View your counselling appointments and their status."
      />

      <div className="stats-grid">
        <StatCard
          label="My appointments"
          value={myAppointments.length.toString()}
        />
        <StatCard
          label="Upcoming appointments"
          value={myAppointments.filter(
            (a) =>
              a.status === 'Pending' ||
              a.status === 'Confirmed'
          ).length.toString()}
        />
        <StatCard
          label="Completed appointments"
          value={myAppointments.filter(
            (a) => a.status === 'Completed'
          ).length.toString()}
        />
      </div>
    </>
  );
}
function StatCard({ label, value, trend, icon: Icon = CalendarDays, tone }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}>{Icon && <Icon size={20} />}</div></div><div className="stat-value">{value}</div><div className="stat-trend"><span>{trend}</span></div></div> }
function EmptyState({ text }) { return <div className="empty-state"><CalendarDays size={25}/><span>{text}</span></div> }

function AppointmentsPage({ appointments, setModal, updateStatus, search, setSearch }) {
  return <><SectionTitle eyebrow="CARE COORDINATION" title="Appointments" subtitle="Create, review and coordinate sessions across your team." action={<button className="primary-btn" onClick={() => setModal({ type: 'appointment' })}><Plus size={17}/> New appointment</button>}/><div className="toolbar"><div className="search-field"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, counsellor or ID..."/></div><button className="secondary-btn" onClick={() => setSearch('')}><Filter size={16}/> Clear filters</button><div className="toolbar-spacer"/><span className="result-count">{appointments.length} appointments</span></div><div className="panel table-panel"><div className="table-scroll"><table className="data-table wide-table"><thead><tr><th>APPOINTMENT</th><th>CLIENT</th><th>COUNSELLOR</th><th>DATE & TIME</th><th>SESSION TYPE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{appointments.map(a => <tr key={a.id}><td><span className="id-text">{a.id}</span></td><td><div className="table-person"><Avatar name={a.client} color={a.color} small/><div><b>{a.client}</b></div></div></td><td>{a.counsellor}</td><td><b>{a.date}</b><span className="cell-sub">{a.time}</span></td><td>{a.type}</td><td><Status>{a.status}</Status></td><td><select className="status-select" value={a.status} onChange={e => updateStatus(a.id, e.target.value)} aria-label={`Change status for ${a.id}`}><option>Pending</option><option>Confirmed</option><option>Checked in</option><option>Completed</option><option>Cancelled</option></select></td></tr>)}</tbody></table>{appointments.length === 0 && <EmptyState text="No appointments match your search."/>}</div></div><div className="inline-note"><ShieldCheck size={16}/> Appointment changes in demo mode are saved only in this browser. A production version should enforce permissions on the server.</div></>
}
function ClientsPage({ clients, setModal, search, setSearch, exportCsv, role }) {
  return <><SectionTitle eyebrow="PEOPLE & CONTINUITY" title="Client records" subtitle="A coordinated directory for client profiles and care assignments." action={<button className="primary-btn" onClick={() => setModal({ type: 'client' })}><Plus size={17}/> Add client</button>}/><div className="privacy-callout"><div className="privacy-icon"><LockKeyhole size={18}/></div><div><b>Handle every record with care</b><p>Use only fictional data in this prototype. Sensitive counselling notes are intentionally not included in this demo directory.</p></div><span>PRIVACY REMINDER</span></div><div className="toolbar"><div className="search-field"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or client ID..."/></div><button className="secondary-btn" onClick={() => setSearch('')}><SlidersHorizontal size={16}/> Clear</button><div className="toolbar-spacer"/><button className="secondary-btn" onClick={exportCsv}><Download size={16}/> Export CSV</button><span className="result-count">{clients.length} clients</span></div><div className="panel table-panel"><div className="table-scroll"><table className="data-table wide-table"><thead><tr><th>CLIENT</th><th>CONTACT</th><th>ASSIGNED COUNSELLOR</th><th>LAST SESSION</th><th>NEXT APPOINTMENT</th><th>STATUS</th></tr></thead><tbody>{clients.map((c, i) => <tr key={c.id}><td><div className="table-person"><Avatar name={c.name} color={avatarColors[i % avatarColors.length]} small/><div><b>{c.name}</b><span>{c.id}</span></div></div></td><td><b className="contact-email">{c.email}</b><span className="cell-sub">{c.phone || 'Not provided'}</span></td><td>{c.counsellor}</td><td>{c.lastVisit}</td><td>{c.nextVisit}</td><td><Status>{c.status}</Status></td></tr>)}</tbody></table>{clients.length === 0 && <EmptyState text="No client records match your search."/>}</div></div><p className="footnote">Access to real client data should be limited by role and need-to-know. This prototype uses browser-local sample records.</p></>
}
function ReportsPage({ appointments, clients, exportCsv }) {
  const total = appointments.length || 1
  const statuses = ['Confirmed', 'Pending', 'Checked in', 'Completed', 'Cancelled']
  const counts = statuses.map(s => ({ name: s, count: appointments.filter(a => a.status === s).length }))
  const max = Math.max(1, ...counts.map(c => c.count))
  return <><SectionTitle eyebrow="OPERATIONS & VISIBILITY" title="Reports & insights" subtitle="A transparent snapshot of coordination activity in this demo workspace." action={<button className="secondary-btn" onClick={exportCsv}><Download size={16}/> Export client CSV</button>}/><div className="report-notice"><FileText size={18}/><span><b>Prototype report</b> — values below are calculated from the sample data currently loaded in this browser. They are not clinical outcomes or validated service-quality measures.</span></div><div className="stats-grid report-stats"><StatCard label="Client profiles" value={String(clients.length).padStart(2, '0')} trend="Current demo directory" icon={Users} tone="green"/><StatCard label="Total appointments" value={String(appointments.length).padStart(2, '0')} trend="Across all demo statuses" icon={CalendarDays} tone="violet"/><StatCard label="Confirmation rate" value={`${Math.round(appointments.filter(a => ['Confirmed', 'Checked in', 'Completed'].includes(a.status)).length / total * 100)}%`} trend="Confirmed, checked in or completed" icon={TrendingUp} tone="blue"/><StatCard label="Pending action" value={String(appointments.filter(a => a.status === 'Pending').length).padStart(2, '0')} trend="Appointments awaiting confirmation" icon={Clock3} tone="amber"/></div><div className="reports-grid"><div className="panel report-panel"><div className="panel-heading"><div><h2>Appointment status</h2><p>Current distribution</p></div><div className="icon-soft"><Activity size={17}/></div></div><div className="bar-chart">{counts.map(c => <div className="bar-row" key={c.name}><span>{c.name}</span><div className="bar-track"><span style={{ width: `${c.count / max * 100}%` }} /></div><b>{c.count}</b></div>)}</div></div><div className="panel report-panel"><div className="panel-heading"><div><h2>Responsible reporting</h2><p>Suggested production metrics</p></div><div className="icon-soft"><ShieldCheck size={17}/></div></div><div className="metric-list"><div><span className="metric-dot green-dot"/><div><b>Appointment completion</b><small>Completed sessions ÷ scheduled sessions</small></div><span className="metric-tag">Planned</span></div><div><span className="metric-dot violet-dot"/><div><b>Time to confirmation</b><small>Time between request and confirmation</small></div><span className="metric-tag">Planned</span></div><div><span className="metric-dot amber-dot"/><div><b>Capacity utilisation</b><small>Booked slots ÷ available slots</small></div><span className="metric-tag">Planned</span></div><div><span className="metric-dot blue-dot"/><div><b>Access audit coverage</b><small>Review of privileged record access</small></div><span className="metric-tag">Planned</span></div></div></div></div><div className="inline-note"><ShieldCheck size={16}/> Reporting should support operational planning, not rank clients or infer mental-health status.</div></>
}
function TeamPage({ role, setRole, setToast }) {
  const team = [{ name: 'Dr. Aditi Rao', role: 'Counsellor', access: 'Assigned client records', color: 'mint' }, { name: 'Dr. Kabir Sen', role: 'Counsellor', access: 'Assigned client records', color: 'lavender' }, { name: 'Dr. Farah Ali', role: 'Counsellor', access: 'Assigned client records', color: 'peach' }, { name: 'Alex Morgan', role: 'Admin', access: 'Workspace operations', color: 'blue' }]
  return <><SectionTitle eyebrow="WORKSPACE GOVERNANCE" title="Team & access" subtitle="Illustrative roles and permissions for the CareConnect prototype." action={<span className="planned-pill"><ShieldCheck size={14}/> RBAC design</span>}/><div className="privacy-callout"><div className="privacy-icon"><ShieldCheck size={18}/></div><div><b>Role-based access control (RBAC)</b><p>Users should only see features and records needed for their role. The role switcher here is for demonstrating the concept, not a security boundary.</p></div></div><div className="panel table-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>INTENDED ACCESS</th><th>STATUS</th></tr></thead><tbody>{team.map(t => <tr key={t.name}><td><div className="table-person"><Avatar name={t.name} color={t.color} small/><div><b>{t.name}</b><span>Fictional demo account</span></div></div></td><td><span className="role-chip">{t.role}</span></td><td>{t.access}</td><td><Status>Active</Status></td></tr>)}</tbody></table></div></div><div className="panel role-preview"><div className="panel-heading"><div><h2>Preview a role</h2><p>Switches the demo persona shown in the interface.</p></div></div><div className="role-preview-options">{roles.map(r => <button key={r} className={`role-option ${role === r ? 'selected' : ''}`} onClick={() => { setRole(r); setToast(`Demo role switched to ${r}. This does not enforce production permissions.`) }}><span className="role-option-icon">{r === 'Admin' ? <ShieldCheck size={20}/> : r === 'Counsellor' ? <Stethoscope size={20}/> : <UserRound size={20}/>}</span><span><b>{r}</b><small>{r === 'Admin' ? 'Workspace configuration and operational reporting' : r === 'Counsellor' ? 'Assigned appointments and client coordination' : 'Own profile and appointment requests'}</small></span>{role === r && <CheckCircle2 size={18} className="green-icon"/>}</button>)}</div></div></>
}
function SettingsPage({ role, setToast }) { return <><SectionTitle eyebrow="WORKSPACE PREFERENCES" title="Settings" subtitle="A starting point for configuration and privacy controls."/><div className="settings-grid"><div className="panel setting-item"><div className="setting-icon"><Settings size={19}/></div><div><h3>Workspace profile</h3><p>Harbour Wellness · Counselling centre</p><small>Workspace branding and centre details would be managed here.</small></div><span className="planned-pill">Planned</span></div><div className="panel setting-item"><div className="setting-icon"><LockKeyhole size={19}/></div><div><h3>Security & privacy</h3><p>Authentication, access policies and audit history</p><small>Production setup requires verified identity, server-side policies, backups and review.</small></div><span className="planned-pill">Planned</span></div><div className="panel setting-item"><div className="setting-icon"><Bell size={19}/></div><div><h3>Notifications</h3><p>Appointment reminders and status updates</p><small>External email/SMS delivery is not enabled in this prototype.</small></div><span className="planned-pill">Planned</span></div><div className="panel setting-item"><div className="setting-icon"><ClipboardList size={19}/></div><div><h3>Data management</h3><p>Retention, export and deletion workflows</p><small>Define a lawful retention policy before handling real client information.</small></div><span className="planned-pill">Planned</span></div></div><button className="secondary-btn" onClick={() => setToast(`Current demo role: ${role}. No production settings have been changed.`)}>Check current role <ArrowRight size={15}/></button></> }

function Modal({ modal, close, form, setForm, addAppointment, clientForm, setClientForm, addClient }) {
  const [helpTab, setHelpTab] = useState('Getting started')
  if (modal.type === 'appointment') return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="modal-card"><div className="modal-header"><div><span className="modal-eyebrow">CARE COORDINATION</span><h2>New appointment</h2><p>Add a session to the demo workspace.</p></div><button className="icon-btn" onClick={close}><X size={19}/></button></div><form onSubmit={addAppointment} className="modal-form"><label>Client name<input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Enter fictional client name" required/></label><label>Assigned counsellor<select value={form.counsellor} onChange={e => setForm({ ...form, counsellor: e.target.value })}><option>Dr. Aditi Rao</option><option>Dr. Kabir Sen</option><option>Dr. Farah Ali</option></select></label><div className="form-two-col"><label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required/></label><label>Time<select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>{['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM'].map(t => <option key={t}>{t}</option>)}</select></label></div><label>Session type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>Initial consultation</option><option>Follow-up</option><option>Wellbeing check-in</option><option>Family session</option></select></label><div className="modal-note"><ShieldCheck size={15}/> Do not enter real counselling notes or sensitive personal details.</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button type="submit" className="primary-btn"><CalendarPlus size={16}/> Create appointment</button></div></form></div></div>
  if (modal.type === 'client') return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="modal-card"><div className="modal-header"><div><span className="modal-eyebrow">CLIENT DIRECTORY</span><h2>Add client profile</h2><p>Create a fictional profile for demonstration.</p></div><button className="icon-btn" onClick={close}><X size={19}/></button></div><form onSubmit={addClient} className="modal-form"><label>Full name<input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} placeholder="e.g. Jamie Patel" required/></label><label>Email address<input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} placeholder="name@example.test" required/></label><label>Phone (optional)<input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="Demo phone number"/></label><label>Assigned counsellor<select value={clientForm.counsellor} onChange={e => setClientForm({ ...clientForm, counsellor: e.target.value })}><option>Dr. Aditi Rao</option><option>Dr. Kabir Sen</option><option>Dr. Farah Ali</option></select></label><div className="modal-note"><ShieldCheck size={15}/> Only use fictional data in this prototype.</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button type="submit" className="primary-btn"><Plus size={16}/> Add client</button></div></form></div></div>
  if (modal.type === 'help') return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="modal-card"><div className="modal-header"><div><span className="modal-eyebrow">CARECONNECT GUIDE</span><h2>Help centre</h2><p>Quick guidance for exploring the prototype.</p></div><button className="icon-btn" onClick={close}><X size={19}/></button></div><div className="help-tabs">{['Getting started','Privacy','Reports'].map(t => <button className={helpTab === t ? 'selected' : ''} key={t} onClick={() => setHelpTab(t)}>{t}</button>)}</div><div className="help-content">{helpTab === 'Getting started' ? <><h3>Explore the workspace</h3><p>Use the left navigation to open appointments, client records and reports. You can add fictional appointments and client profiles with the action buttons.</p><p>Use the profile menu to switch the demo persona between Admin, Counsellor and Client.</p></> : helpTab === 'Privacy' ? <><h3>Protect sensitive information</h3><p>This is a student prototype. Never enter real client details, counselling notes or other sensitive information. Local demo data is saved in this browser.</p><p>Production use requires verified authentication, tested row-level security, audit logs, backup and retention policies, and appropriate privacy review.</p></> : <><h3>Interpret demo reports</h3><p>Counts and status bars are calculated from the current sample data. They are operational examples, not clinical outcomes or validated service-quality indicators.</p><p>Use Export CSV to download the fictional client directory.</p></>}</div><div className="modal-actions"><button className="primary-btn" onClick={close}>Got it</button></div></div></div>
  if (modal.type === 'notifications') return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="modal-card"><div className="modal-header"><div><span className="modal-eyebrow">WORKSPACE UPDATES</span><h2>Notifications</h2><p>Example updates for this demo workspace.</p></div><button className="icon-btn" onClick={close}><X size={19}/></button></div><div className="notification-list"><div><span className="notification-dot mint-dot"/><div><b>Appointment list is ready</b><p>Review today's schedule and confirm pending sessions.</p><small>Just now · Demo update</small></div></div><div><span className="notification-dot violet-dot"/><div><b>Privacy reminder</b><p>Use fictional data while exploring the prototype.</p><small>Today · Workspace notice</small></div></div><div><span className="notification-dot amber-dot"/><div><b>Reports are illustrative</b><p>Connect verified backend data before using reports operationally.</p><small>Today · Workspace notice</small></div></div></div><div className="modal-actions"><button className="primary-btn" onClick={close}>Close notifications</button></div></div></div>
  return null
}
