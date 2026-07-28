/* ==========================================================================
   PROJECTS DATA AGGREGATOR (SINGLE SOURCE OF TRUTH)
   ========================================================================== */
import { curators } from './curators.js';
import { powerq } from './powerq.js';

export const PROJECTS_DATA = {
  curators,
  powerq
};

// Global attachment for site controllers
if (typeof window !== 'undefined') {
  window.PROJECTS_DATA = PROJECTS_DATA;
}
