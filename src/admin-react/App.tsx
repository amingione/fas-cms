import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Helper to tolerate modules that don't have a default export
function lazyPage<T extends { default?: any }>(loader: () => Promise<T>) {
  return lazy(async () => {
    const m: any = await loader();
    if (m && m.default) return { default: m.default };
    // pick first function export as component fallback
    const fallback = Object.values(m).find((v) => typeof v === 'function');
    if (fallback) return { default: fallback as any };
    // last resort return a noop component to avoid hard crash (shows nothing)
    return { default: (() => null) as any };
  });
}
import { ThemeProvider } from 'src/admin-react/context/ThemeContext';
const SignIn = lazyPage(() => import('src/admin-react/pages/AuthPages/SignIn'));
const SignUp = lazyPage(() => import('src/admin-react/pages/AuthPages/SignUp'));
const NotFound = lazyPage(() => import('src/admin-react/pages/OtherPage/NotFound'));
const UserProfiles = lazyPage(() => import('src/admin-react/pages/UserProfiles'));
const Videos = lazyPage(() => import('src/admin-react/pages/UiElements/Videos'));
const Images = lazyPage(() => import('src/admin-react/pages/UiElements/Images'));
const Alerts = lazyPage(() => import('src/admin-react/pages/UiElements/Alerts'));
const Badges = lazyPage(() => import('src/admin-react/pages/UiElements/Badges'));
const Avatars = lazyPage(() => import('src/admin-react/pages/UiElements/Avatars'));
const Buttons = lazyPage(() => import('src/admin-react/pages/UiElements/Buttons'));
const LineChart = lazyPage(() => import('src/admin-react/pages/Charts/LineChart.tsx'));
const BarChart = lazyPage(() => import('src/admin-react/pages/Charts/BarChart.tsx'));
const Calendar = lazyPage(() => import('src/admin-react/pages/Calendar.tsx'));
const BasicTables = lazyPage(() => import('src/admin-react/pages/Tables/BasicTables.tsx'));
const FormElements = lazyPage(() => import('src/admin-react/pages/Forms/FormElements.tsx'));
const Blank = lazyPage(() => import('src/admin-react/pages/Blank.tsx'));
import AppLayout from 'src/admin-react/layout/AppLayout.tsx';
import { ScrollToTop } from 'src/admin-react/components/common/ScrollToTop.tsx';
import Home from 'src/admin-react/pages/Dashboard/Home.tsx';

export default function App() {
  return (
    <>
      <ThemeProvider>
        <ScrollToTop />
        <Suspense fallback={<div className="p-6 text-white/70">Loading…</div>}>
          <Routes>
            {/* Dashboard Layout */}
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
            </Route>

            {/* Auth Layout */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    </>
  );
}
