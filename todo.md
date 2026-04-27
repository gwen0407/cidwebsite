# Consider It Done — Project TODO

## Database & Backend
- [x] Extend drizzle schema: employees table, tasks table, timeLogs table
- [x] Run migration and apply SQL
- [x] DB helpers: employees CRUD, tasks CRUD, timeLogs CRUD
- [x] tRPC router: employees (add, list)
- [x] tRPC router: tasks (assign, list by employee, list all, mark complete)
- [x] tRPC router: timeLogs (clock in, clock out, list by employee, list all)
- [x] Admin-only procedure guard (role === 'admin')
- [x] Employee-only procedure guard (role === 'employee' or 'user')

## Public Landing Page
- [x] Hero section with headline, subheadline, and CTA button
- [x] Services/features overview section (6 services grid)
- [x] Pricing section
- [x] Testimonials section placeholder
- [x] Footer with email, Instagram, Facebook, LinkedIn links
- [x] Polished premium visual design (typography, spacing, colors)

## Authentication & Routing
- [x] Role-based route protection (admin vs employee)
- [x] Redirect unauthenticated users to login/landing
- [x] Redirect admin to /admin, employee to /dashboard after login

## Employee Dashboard
- [x] Layout with sidebar navigation
- [x] Task list showing assigned tasks with status badges
- [x] "Mark Complete" button on each pending task
- [x] Optimistic UI update on task completion

## Employee Time Tracker
- [x] Clock In button (starts session)
- [x] Clock Out button (ends session, calculates hours)
- [x] Display current session timer (live)
- [x] Full time log history table

## Admin Panel
- [x] Layout with sidebar navigation (separate from employee)
- [x] Add employee by email (creates user record)
- [x] Employee list display
- [x] Assign task to specific employee (select employee + description)
- [x] View all tasks with status across all employees

## Admin Analytics Dashboard
- [x] Date range filter (start date + end date inputs)
- [x] Metric cards: total tasks, completed, pending, total hours logged
- [x] Per-employee overview section (tasks assigned, completed per employee)

## Tests & Quality
- [x] Vitest tests for task router (assign, complete)
- [x] Vitest tests for timeLog router (clock in/out)
- [x] Vitest tests for employee router (add, list)

## Checkpoint & Delivery
- [x] Save checkpoint
- [x] Deliver to user


## Design & Animation Refinements

- [ ] Refine color palette: enhance primary/secondary/accent colors for better visual hierarchy
- [ ] Add smooth page transitions and fade-in animations
- [ ] Add hover animations to buttons and interactive elements
- [ ] Enhance mobile responsiveness: improve spacing, font sizes, layout stacking
- [ ] Test all breakpoints (mobile, tablet, desktop)
- [ ] Optimize touch targets for mobile (min 44px)

## Deployment Documentation

- [ ] Create DEPLOYMENT.md with Vercel setup instructions
- [ ] Document environment variables required
- [ ] Add GitHub Actions CI/CD setup (optional)
- [ ] Create .env.example file
- [ ] Add build and start scripts documentation
- [ ] Create troubleshooting guide

## Bug Fixes

- [x] Fix employee record not found error: auto-create employee on first user login
