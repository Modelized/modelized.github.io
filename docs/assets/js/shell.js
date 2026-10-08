import { injectPartial, initNav, syncMobileNavState, initAnchorScroll, initSectionSpy } from "./modules/navigation.js?v=20261008i";
import { renderProjects, renderDisciplines, initYear } from "./modules/content.js?v=20261002a";
import { initAboutDisclosure, initAboutCreator } from "./modules/about.js?v=20261008i";
import { initReveal, initHeroIntro } from "./modules/reveal.js?v=20261008i";
import { initGridFittedTypography, initRockSaltSafeAreas } from "./modules/typography.js?v=20261008i";
import { initHeroMaterial } from "./modules/hero-material.js?v=20261008i";
import { initTextureControl } from "./modules/texture-control.js?v=20261008i";
import { initDisciplineStack, initProjectStack } from "./modules/card-stacks.js?v=20261002a";
import { waitForSiteReadiness, siteBootGate } from "./modules/readiness.js?v=20261002a";
async function boot() {
  let outcome = "ready";

  try {
    await Promise.all([
      injectPartial("#nav-slot", "nav.html"),
      injectPartial("#footer-slot", "footer.html")
    ]);

    renderProjects();
    renderDisciplines();
    initYear();
    initAboutDisclosure();
    initNav();
    syncMobileNavState();
    initAnchorScroll();
    initSectionSpy();
    initReveal();
    const typographyReady = initGridFittedTypography();
    const materialReady = initHeroMaterial({ typographyReady });
    initTextureControl({ materialReady });
    initRockSaltSafeAreas();
    initAboutCreator();
    initDisciplineStack();
    initProjectStack();

    outcome = await Promise.race([
      Promise.all([waitForSiteReadiness(), materialReady]).then(() => "ready"),
      siteBootGate.skipped.then(() => "skipped")
    ]);
  } catch (error) {
    console.error("Site boot failed", error);
    outcome = "failed";
  }

  await siteBootGate.release();
  initHeroIntro({ waitForFonts: outcome === "ready" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
