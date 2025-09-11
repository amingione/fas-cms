import { BrowserRouter as Router, Routes, Route } from 'react-router';
import SignIn from 'src/admin-react/pages/AuthPages/SignIn';
import SignUp from 'src/admin-react/pages/AuthPages/SignUp';
import NotFound from 'src/admin-react/pages/OtherPage/NotFound';
import UserProfiles from 'src/admin-react/pages/UserProfiles';
import Videos from 'src/admin-react/pages/UiElements/Videos';
import Images from 'src/admin-react/pages/UiElements/Images';
import Alerts from 'src/admin-react/pages/UiElements/Alerts';
import Badges from './pages/UiElements/Badges';
import Avatars from 'src/admin-react/pages/UiElements/Badges';
import Buttons from 'src/admin-react/pages/UiElements/Buttons';
import LineChart from 'src/admin-react/pages/Charts/LineChart.tsx';
import BarChart from 'src/admin-react/pages/Charts/BarChart.tsx';
import Calendar from 'src/admin-react/pages/Calendar.tsx';
import BasicTables from 'src/admin-react/pages/Tables/BasicTables.tsx';
import FormElements from 'src/admin-react/pages/Forms/FormElements.tsx';
import Blank from 'src/admin-react/pages/Blank.tsx';
import AppLayout from 'src/admin-react/layout/AppLayout.tsx';
import { ScrollToTop } from 'src/admin-react/components/common/ScrollToTop.tsx';
import Home from 'src/admin-react/pages/Dashboard/Home.tsx';

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
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
      </Router>
    </>
  );
}
