import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './OnboardingTour.css';

const OnboardingTour = ({ onComplete }) => {
  useEffect(() => {
    // Initialize the real-world spotlight tour
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: false,
      overlayColor: 'rgba(0, 0, 0, 0.85)',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: '🚀 Start Planning',
      popoverClass: 'driverjs-theme', // Custom dark theme styling we can apply in CSS
      steps: [
        {
          popover: {
            title: 'Welcome to AI Trip Planner! ✈️',
            description: "India's smartest travel companion powered by Gemini AI + Machine Learning. Let's take a quick real-world tour!",
          }
        },
        {
          element: '.db-btn-primary', // Targets the main "Plan New Trip" button
          popover: {
            title: 'Plan Your Trip 🗺️',
            description: 'Click this button anytime to generate a fully personalized AI itinerary. Set your destination, budget, and let the AI do the magic!',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '.db-tabs', // Targets the Recent/Favourites tabs
          popover: {
            title: 'Your Saved Trips 💾',
            description: 'All your perfectly planned trips will appear right here. You can toggle between Recent History and your Starred Favourites.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '.db-quick-section', // Targets Quick Actions
          popover: {
            title: 'Quick Actions ⚡',
            description: 'Use these quick cards to rapidly open your Trip History, view destination stats, or manage your profile settings.',
            side: 'top',
            align: 'center'
          }
        },
        {
          popover: {
            title: "You're all set! 🎉",
            description: "That's everything! Start by planning your first adventure with your AI travel buddy.",
          }
        }
      ],
      onDestroyStarted: () => {
        // When the user clicks done or closes the tour
        driverObj.destroy();
        localStorage.setItem('onboarding_done', '1');
        if (onComplete) onComplete();
      }
    });

    // Start the spotlight tour
    driverObj.drive();

    // Cleanup if component unmounts early
    return () => driverObj.destroy();
  }, [onComplete]);

  // Driver.js physically injects its own overlay into the DOM, 
  // so this React component doesn't need to render anything itself.
  return null;
};

export const shouldShowOnboarding = () => !localStorage.getItem('onboarding_done');

export default OnboardingTour;
