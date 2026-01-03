import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'https://meeting-dev.aidreams-factory.com';

describe('GUI Integration Tests', () => {
  describe('Page Load', () => {
    it('should load main page successfully', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('should include required meta tags', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain('<title>');
      expect(html).toContain('Meeting Visualizer');
    });

    it('should load static assets', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      // Check for Next.js static asset references
      expect(html).toContain('_next');
    });
  });

  describe('Form Elements', () => {
    it('should render textarea for input', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain('textarea');
    });

    it('should have form submission elements', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain('button');
    });
  });

  describe('Responsive Design', () => {
    it('should include viewport meta tag', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain('viewport');
      expect(html).toContain('width=device-width');
    });
  });

  describe('Accessibility', () => {
    it('should have proper HTML structure', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body');
    });

    it('should have lang attribute', async () => {
      const response = await fetch(BASE_URL);
      const html = await response.text();

      expect(html).toMatch(/lang=["'][a-z]{2}/);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent pages', async () => {
      const response = await fetch(`${BASE_URL}/non-existent-page-12345`);
      expect(response.status).toBe(404);
    });
  });
});
