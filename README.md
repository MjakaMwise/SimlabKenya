# SIM-Lab Kenya

**Science in Motion - STEM Education & Innovation Lab**

A modern, responsive website for SIM-Lab Kenya, an innovative science-based innovation lab bridging the gap between classroom learning and real-world application. Incubated under IOME001 Innovation Hub in Mombasa, Kenya.

[![React](https://img.shields.io/badge/React-18.3.1-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

---

##  About

SIM-Lab (Science in Motion Laboratory) is a science-based innovation lab that transforms classroom concepts into practical skills. This website serves as the digital presence for the organization, showcasing their programs, services, and providing registration channels for students interested in STEM education.

### Mission
Empowering a new generation of science-minded individuals through hands-on STEM education, innovation programs, and mentorship.

---

##  Features

- **Modern UI/UX** - Beautiful, responsive design with smooth animations powered by Framer Motion
- **Mobile-First** - Fully responsive across all devices
- **Fast Performance** - Built with Vite for lightning-fast development and optimized production builds
- **Component Library** - 49+ reusable UI components built with shadcn/ui
- **SEO Optimized** - Complete meta tags, Open Graph, and Twitter Card support
- **Accessible** - Built with accessibility in mind using Radix UI primitives

---

##  Project Structure

```
simlab/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images (hero, activity photos, logo)
│   ├── components/        # React components
│   │   ├── ui/           # 49 shadcn/ui components
│   │   ├── Navbar.tsx    # Navigation component
│   │   ├── Footer.tsx    # Footer component
│   │   ├── HeroSection.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── ...           # Other section components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   │   ├── Index.tsx     # Home page
│   │   ├── About.tsx     # About SIM-Lab
│   │   ├── Programs.tsx  # STEM programs & services
│   │   ├── HolidayProgram.tsx  # Holiday Innovation Program
│   │   ├── Gallery.tsx   # Photo gallery
│   │   ├── FAQ.tsx       # Frequently asked questions
│   │   ├── Contact.tsx   # Contact information
│   │   └── NotFound.tsx  # 404 page
│   ├── test/             # Test configuration
│   ├── App.tsx           # Main app with routing
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

##  Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **bun** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd simlab
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:5173](http://localhost:5173)

---

##  Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

---

##  Tech Stack

### Core
- **[React 18](https://reactjs.org/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite](https://vitejs.dev/)** - Next-generation frontend build tool

### Styling
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible component library
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible UI primitives

### Animation & Interactions
- **[Framer Motion](https://www.framer.com/motion/)** - Production-ready motion library

### State & Data
- **[TanStack React Query](https://tanstack.com/query)** - Powerful data synchronization
- **[React Hook Form](https://react-hook-form.com/)** - Form validation
- **[Zod](https://zod.dev/)** - Schema validation

### Routing
- **[React Router DOM](https://reactrouter.com/)** - Client-side routing

### Testing
- **[Vitest](https://vitest.dev/)** - Fast unit testing
- **[Testing Library](https://testing-library.com/)** - Testing utilities

---

##  Programs & Services

SIM-Lab offers the following programs:

| Program | Description |
|---------|-------------|
| **Chemistry in All Disciplines** | Exploring chemistry applications across subjects and real-world phenomena |
| **Climate Change & Environmental Awareness** | Training on solutions, renewable energy, and environmental monitoring |
| **Nanotechnology & Green Chemistry** | Green synthesis of nanoparticles using local plants |
| **Blue Economy & Ocean Projects** | Marine resource utilization and ocean conservation |
| **Traditional Medicine & Phytochemistry** | Research on local medicinal plants |
| **Scientific Writing & Publications** | Training on research papers and journal articles |
| **Multidisciplinary Talks & Forums** | Networking platforms for scientists and innovators |
| **Interactive Learning Aids** | Games, animations, and visual aids for STEM learning |

### Holiday Innovation Program 2025
A special Nov-Dec program for students from Grade 5 to Form 4 featuring hands-on workshops, innovation projects, mentorship, and certificates of completion.

---

##  Contact Information

- **Phone**: +254 738 668529 / +254 118 636095
- **Email**: simlabkenya@gmail.com
- **WhatsApp**: [Chat on WhatsApp](https://wa.me/254738668529)
- **Twitter**: [@simlabkenya](https://twitter.com/simlabkenya)
- **Location**: Mombasa, Kenya (Incubated under IOME001 Innovation Hub)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

##  License

This project is private and proprietary to SIM-Lab Kenya.

---



<p align="center">
  <strong> SIM-Lab Kenya - Empowering the Next Generation of Scientists & Innovators</strong>
</p>
