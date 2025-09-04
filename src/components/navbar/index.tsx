'use client';
import CartModal from '@components/cart/modal';
import LogoSquare from '../logo-square';
import Link from 'next/link';
import { useState } from 'react';
import { SearchBar } from '@components/SearchBar.tsx';
import MobileMenu from './mobile-menu';

const { SITE_NAME } = process.env;

export function Navbar() {
  const [search, setSearch] = useState('');

  return (
    <nav className="relative flex items-center justify-between p-4 lg:px-6">
      <div className="block flex-none md:hidden">
        <MobileMenu />
      </div>
      <div className="flex w-full items-center">
        <div className="flex w-full md:w-1/3">
          <Link
            href="/"
            prefetch={true}
            className="mr-2 flex w-full items-center justify-center md:w-auto lg:mr-6"
          >
            <LogoSquare />
            <div className="ml-2 flex-none text-sm font-medium uppercase md:hidden lg:block">
              {SITE_NAME}
            </div>
          </Link>
        </div>
        <div className="hidden justify-center md:flex md:w-1/3">
          <SearchBar
            value={search}
            onChange={setSearch}
            action="/search"
            variant="storefront"
            enableSuggestions
          />
        </div>
        <div className="flex justify-end md:w-1/3">
          <CartModal />
        </div>
      </div>
    </nav>
  );
}
