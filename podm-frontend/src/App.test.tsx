import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Frontend App Component', () => {
  it('should render the App component without crashing', async () => {
    render(<App />);

    // React Router lazy routes render Suspense loading spinner first.
    // Use findByText to wait for lazy component resolution.
    const logoElements = await screen.findAllByText(/PoDM/i);
    expect(logoElements.length).toBeGreaterThan(0);
  });
});