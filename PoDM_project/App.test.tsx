import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './src/App'; // Adjust path if needed

describe('Frontend App Component', () => {
  it('should render the App component without crashing', () => {
    render(<App />);

    // Jest's `expect` is available globally.
    // We are looking for the "PoDM" logo text.
    const logoElements = screen.getAllByText(/PoDM/i);
    
    // Assert that the logo is present on the screen.
    expect(logoElements.length).toBeGreaterThan(0);
  });
});