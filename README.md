# WISE Sunday School Quran Tracker

A comprehensive web application designed for WISE Sunday School to track student progress in Quran memorization and recitation. Built with a focus on ease of use for teachers and motivation for students.

## 🚀 Features

- **Student Progress Tracking**: Track memorization for multiple students with a detailed view of each Surah.
- **Star Rating System**: Grade recitations on a scale of 1 to 5 stars.
- **Mastery Recognition**: Special "First-Try Perfect" status for students who achieve 5 stars on their first attempt.
- **Multi-Grade Support**: Configurable for different grade levels (4th, 5th, and 6th grade tracks).
- **Interactive Leaderboard**: View class-wide statistics and top performers based on total stars and completion.
- **Data Portability**:
  - Export progress data to Excel for official reporting.
  - Export/Import JSON for backups and synchronization.
- **Student Share Pages**: Generate read-only view links for individual students to share progress with parents.
- **Mobile Optimized**: Swipe gestures for easy navigation between students and tabs.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Backend/Database**: **Cloudflare Pages Functions + D1 (SQLite)** (free tier)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (**v20+ recommended**)
- [npm](https://www.npmjs.com/) or [Bun](https://bun.sh/)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wise-quran-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend (Cloudflare D1)

This project uses **Cloudflare Pages Functions** under `functions/api/*` and a **D1 (SQLite)** database.

- **Schema migrations** live in `migrations/`
- **API endpoints** are served from `/api/*`

#### Local dev (API + UI together)

Cloudflare Pages deploys the API automatically from `functions/`.

For local UI development, you can point your local UI at your deployed Pages backend:

```env
VITE_API_BASE=https://<your-project>.pages.dev
```

## 📊 Database Schema (D1 / SQLite)

Tables:

- `students`
- `surah_progress`
- `custom_items` (for items like “Dua e Qunoot”)

Grade separation:

- Run `migrations/0002_add_grade.sql` once to add the `students.grade` column.

## 📜 Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run test`: Run Vitest tests
- `npm run preview`: Preview production build locally

## 📄 License

This project is private and intended for use by WISE Sunday School.
