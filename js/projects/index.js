/* ==========================================================================
   PROJECTS DATA AGGREGATOR (SINGLE SOURCE OF TRUTH)
   ========================================================================== */
import { curators } from './curators.js';
import { powerq } from './powerq.js';
import { pervye } from './pervye.js';

export const PROJECTS_DATA = {
  curators,
  powerq,
  pervye
};

// Global attachment for site controllers
if (typeof window !== 'undefined') {
  window.PROJECTS_DATA = PROJECTS_DATA;
}
