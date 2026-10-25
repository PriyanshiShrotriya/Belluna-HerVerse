import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdultDeclaration } from '../src/features/auth/AdultConfirmation';

vi.mock('../src/app/stubs/auth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/Layout', () => ({ LangSwitch: () => null }));
vi.mock('../src/i18n/t', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

describe('adult declaration control', () => {
  it('starts unchecked, disables Continue, and does not submit on render', () => {
    const onSubmit = vi.fn();
    const html = renderToStaticMarkup(createElement(AdultDeclaration, {
      checked: false,
      submitting: false,
      error: '',
      declaration: 'I confirm that I am 18 years of age or older.',
      continueLabel: 'Continue',
      submittingLabel: 'Confirming…',
      onCheckedChange: vi.fn(),
      onSubmit,
    }));

    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('checked=""');
    expect(html).toContain('disabled=""');
    expect(html).toContain('I confirm that I am 18 years of age or older.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('enables Continue only after the explicit checkbox selection', () => {
    const html = renderToStaticMarkup(createElement(AdultDeclaration, {
      checked: true,
      submitting: false,
      error: '',
      declaration: 'I confirm that I am 18 years of age or older.',
      continueLabel: 'Continue',
      submittingLabel: 'Confirming…',
      onCheckedChange: vi.fn(),
      onSubmit: vi.fn(),
    }));

    expect(html).toContain('checked=""');
    expect(html).not.toContain('disabled=""');
  });
});
