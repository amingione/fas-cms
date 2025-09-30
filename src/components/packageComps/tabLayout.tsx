import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { useMemo, useState } from 'react';
import PackagesAccordionHellcat from '@/components/packageComps/PackagesAccordionHellcat';
import F150Accordian from '@/components/packageComps/F150Accordian';
import TRXAccordian from '@/components/packageComps/TRXAccoridan';
import SuperchargerAccordion from './SuperchargerAccordian';

const tabs = [
  { name: 'Mopar', href: '#mopar', current: true, render: <PackagesAccordionHellcat /> },
  { name: 'F150', href: '#f150', current: false, render: <F150Accordian /> },
  { name: 'RAM TRX', href: '#ram-trx', current: false, render: <TRXAccordian /> },
  {
    name: 'Superchargers',
    href: '#superchargers',
    current: false,
    render: <SuperchargerAccordion />
  }
];

function classNames(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function TabLayout() {
  const defaultTab = useMemo(() => tabs.find((tab) => tab.current)?.name ?? tabs[0]?.name, []);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleNavigate = (href: string) => {
    if (!href) return;
    if (href.startsWith('#')) {
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.location.href = href;
    }
  };

  const handleChange = (name: string) => {
    const tab = tabs.find((t) => t.name === name);
    if (!tab) return;
    setActiveTab(tab.name);
    handleNavigate(tab.href);
  };

  return (
    <div className="border-b border-white/10 pb-5 sm:pb-0">
      <h3 className="text-base font-semibold text-white">Platforms</h3>
      <div className="mt-3 sm:mt-4">
        <div className="grid grid-cols-1 sm:hidden">
          {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
          <select
            value={activeTab}
            onChange={(event) => handleChange(event.target.value)}
            aria-label="Select a tab"
            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 py-2 pr-8 pl-3 text-base text-white outline-1 -outline-offset-1 outline-white/10 *:bg-gray-800 focus:outline-2 focus:-outline-offset-2 focus:outline-white"
          >
            {tabs.map((tab) => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-400"
          />
        </div>
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                type="button"
                onClick={() => handleChange(tab.name)}
                aria-current={activeTab === tab.name ? 'page' : undefined}
                className={classNames(
                  activeTab === tab.name
                    ? 'border-white/20 text-white/80'
                    : 'border-transparent text-gray-400 hover:border-white/20 hover:text-white',
                  'border-b-2 px-1 pb-4 text-sm font-medium whitespace-nowrap'
                )}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {tabs.map((tab) =>
        tab.render ? (
          <div
            key={`panel-${tab.name}`}
            id={tab.href.startsWith('#') ? tab.href.slice(1) : undefined}
            className={activeTab === tab.name ? 'mt-6' : 'hidden'}
          >
            {tab.render}
          </div>
        ) : null
      )}
    </div>
  );
}
