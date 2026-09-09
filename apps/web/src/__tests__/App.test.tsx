import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeModeProvider } from '../theme/ThemeModeProvider.js';
import { AppLayout } from '../components/AppLayout.js';

function Shell({ initialPath }: { initialPath: string }) {
  return (
    <ThemeModeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppLayout>
          <Routes>
            <Route path="/workspaces" element={<div>Workspaces page</div>} />
            <Route path="/settings" element={<div>Settings page</div>} />
          </Routes>
        </AppLayout>
      </MemoryRouter>
    </ThemeModeProvider>
  );
}

describe('App shell', () => {
  it('navigates between routes and toggles theme mode', async () => {
    const user = userEvent.setup();
    render(<Shell initialPath="/workspaces" />);
    expect(screen.getByText('Workspaces page')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(screen.getByText('Settings page')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Color scheme is/i));
    expect(localStorage.getItem('claude-assistant.color-scheme')).toBeTruthy();
  });
});
