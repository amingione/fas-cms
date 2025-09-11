import { BrowserRouter as Router, Routes, Route } from 'react-router';
import { Suspense, lazy } from 'react';
import { ThemeProvider } from 'src/admin-react/context/ThemeContext';
const SignIn = lazy(() => import('src/admin-react/pages/AuthPages/SignIn'));
const SignUp = lazy(() => import('src/admin-react/pages/AuthPages/SignUp'));
const NotFound = lazy(() => import('src/admin-react/pages/OtherPage/NotFound'));
const UserProfiles = lazy(() => import('src/admin-react/pages/UserProfiles'));
const Videos = lazy(() => import('src/admin-react/pages/UiElements/Videos'));
const Images = lazy(() => import('src/admin-react/pages/UiElements/Images'));
const Alerts = lazy(() => import('src/admin-react/pages/UiElements/Alerts'));
const Badges = lazy(() => import('./pages/UiElements/Badges'));
const Avatars = lazy(() => import('src/admin-react/pages/UiElements/Badges'));
const Buttons = lazy(() => import('src/admin-react/pages/UiElements/Buttons'));
const LineChart = lazy(() => import('src/admin-react/pages/Charts/LineChart.tsx'));
const BarChart = lazy(() => import('src/admin-react/pages/Charts/BarChart.tsx'));
const Calendar = lazy(() => import('src/admin-react/pages/Calendar.tsx'));
const BasicTables = lazy(() => import('src/admin-react/pages/Tables/BasicTables.tsx'));
const FormElements = lazy(() => import('src/admin-react/pages/Forms/FormElements.tsx'));
const Blank = lazy(() => import('src/admin-react/pages/Blank.tsx'));
const AppLayout = lazy(() => import('src/admin-react/layout/AppLayout.tsx'));
import { ScrollToTop } from 'src/admin-react/components/common/ScrollToTop.tsx';
import Home from 'src/admin-react/pages/Dashboard/Home.tsx';

export default function App() {
  return (
    <>
      <ThemeProvider>
        <Router>
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
        </Router>
      </ThemeProvider>
    </>
  );
}
