import { injectPartial } from "./modules/site-partials.js?v=20261015c";
import { initNav, syncMobileNavState, initAnchorScroll, initSectionSpy } from "./modules/navigation.js?v=20261015c";
import { renderProjects, renderDisciplines, initYear } from "./modules/content.js?v=20261015c";
import { initAboutDisclosure, initAboutCreator } from "./modules/about.js?v=20261015c";
import { initReveal, initHeroIntro } from "./modules/reveal.js?v=20261015c";
import { initGridFittedTypography } from "./modules/typography.js?v=20261015c";
import { initRockSaltSafeAreas } from "./modules/typography-script-bounds.js?v=20261015c";
import { initHeroMaterial } from "./modules/hero-material.js?v=20261013r";
import { initTextureControl } from "./modules/texture-control.js?v=20261015a";
import { initGlyphStory } from "./glyph-story.js?v=20261015b";
import { initDisciplineStack, initProjectStack } from "./modules/card-stacks.js?v=20261015c";
import { waitForSiteReadiness, siteBootGate } from "./modules/readiness.js?v=20261015c";
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
    initGlyphStory({ heroMaterialReady: materialReady });
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
