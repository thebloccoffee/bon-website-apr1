import React from 'react';
import { Link } from 'react-router-dom';
import BrandPage from '@/components/home/BrandPage';

export default function Jooonbon() {
  return (
    <BrandPage
      brand="jooonbon"
      title={<span className="font-sans font-light tracking-[-0.02em]">jooonbon</span>}
      intro={
        <>
          <p>I recreate famous movie scenes in the places they were filmed, then share them as reels and longer YouTube videos.</p>
          <p className="text-tk-xl">
            Client films and past work are in the{' '}
            <Link to="/portfolio" className="underline underline-offset-4 hover:text-tk-text-primary">portfolio</Link>.
          </p>
        </>
      }
    />
  );
}
