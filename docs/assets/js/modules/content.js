import { simpleIcon } from "./context.js?v=20261002a";
const projects = [
  {
    slug: "istage",
    title: "iStage",
    year: 2026,
    description:
      "A pixel-perfect recreation of the iOS Lock Screen for Android, including Dynamic Island, Live Activities, and extensive customization features — all powered by KLCK.",
    categories: ["Development", "Design"],
    icon: "assets/img/iStage-icon-dark.png",
    image: {
      src: "assets/img/hero-iStage-series.png",
      width: 2160,
      height: 2160,
      bounds: [412, 204, 1338, 1752]
    },
    url: "https://modelized.github.io/iStage/"
  },
  {
    slug: "vanta",
    title: "Vanta",
    year: 2025,
    description:
      "A native macOS frontend for vphone, built to launch and manage iOS virtual machines without relying on the terminal. It combines VM controls with a built-in viewer for running and interacting with virtual devices.",
    categories: ["Development", "Engineering"],
    icon: "assets/img/Vanta-icon-dark.png",
    image: {
      src: "assets/img/hero-Vanta.png",
      width: 2184,
      height: 1648,
      bounds: [111, 75, 1962, 1439]
    }
  },
  {
    slug: "sherlockgenes",
    title: "SherlockGenes",
    titleParts: ["Sherlock", "Genes"],
    year: 2025,
    description:
      "An interactive program for analyzing patterns of inheritance from pedigree data. It uses family relationships and observed traits to narrow possible genotypes and determine which modes of inheritance fit a pedigree.",
    categories: ["Development", "Research"],
    image: {
      src: "assets/img/hero-SherlockGenes.png",
      width: 2784,
      height: 1880,
      bounds: [111, 75, 2562, 1670]
    }
  },
  {
    slug: "truevision",
    title: "TrueVision",
    year: 2025,
    description:
      "A computer vision system for detecting and visualizing dangerous crowd congestion in real time. It analyzes people and their relative positions in video to estimate crowd density and display changing levels of risk.",
    categories: ["Development", "Engineering", "Research"]
  },
  {
    slug: "aero",
    title: "Aero",
    year: 2024,
    description:
      "A concept for a next-generation operating system built around personalization and adaptability. Its interface includes Space, a customizable environment shaped around the user, contextual action suggestions, and an expandable Activity Indicator for live information.",
    categories: ["Design"]
  }
];

const disciplines = [
  {
    slug: "development",
    tone: "development",
    title: "Development",
    text: "I build native applications and computational tools, primarily using Swift and Python. My work spans mobile apps, experimental systems, and small research tools. Development is where I test ideas, see what works in practice, and refine them through use.",
    arsenalKind: "development",
    arsenal: [
      { iconUrl: simpleIcon("swift"), label: "Swift" },
      { iconUrl: simpleIcon("python"), label: "Python" },
      { iconUrl: simpleIcon("c"), label: "C" },
      { iconUrl: simpleIcon("cplusplus"), label: "C++" },
      { iconUrl: simpleIcon("javascript"), label: "JavaScript" },
      { iconUrl: simpleIcon("html5"), label: "HTML" },
      { iconUrl: simpleIcon("kotlin"), label: "Kotlin" }
    ]
  },
  {
    slug: "engineering",
    tone: "engineering",
    title: "Engineering",
    text: "I explore how operating systems and devices function beneath the interface. My work involves custom ROM development, system modification, and low-level experimentation within Android environments. These projects help me grasp how software, hardware, and system architecture interact in practice."
  },
  {
    slug: "design",
    tone: "design",
    title: "Design",
    text: "I shape the visual and interactive aspects of the software I create. I design interfaces with careful attention to layout, motion, hierarchy, and interaction. To me, design is integral to how a system communicates."
  },
  {
    slug: "research",
    tone: "research",
    title: "Research",
    text: "I study living systems through biology and computer science. My main interests include neural signaling, genetics, stem-cell differentiation, tissue regeneration, and how biological systems change under different conditions. I also use computational methods to organize information, test ideas, and explore biological questions that would be difficult to investigate through observation alone."
  }
];

function renderProjects() {
  const stack = document.getElementById("project-stack");
  const template = document.getElementById("project-card-template");

  if (!stack || !template) {
    return;
  }

  stack.innerHTML = "";
  delete stack.dataset.stackReady;

  projects.forEach((project, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".project-stack-card");
    const title = fragment.querySelector(".project-stack-card__title");
    const year = fragment.querySelector(".project-stack-card__year");
    const description = fragment.querySelector(".project-stack-card__body");
    const icon = fragment.querySelector(".project-stack-card__icon");
    const media = fragment.querySelector(".project-stack-card__media");
    const image = fragment.querySelector(".project-stack-card__image");
    const categories = fragment.querySelector(".project-stack-card__categories");
    const projectLink = fragment.querySelector(".project-stack-card__link");

    if (card) {
      card.dataset.index = String(index);
      card.dataset.slug = project.slug;
      card.classList.add(`project-stack-card--${project.slug}`);
      if (project.image) {
        card.classList.add("has-media");
      }
      if (project.icon) {
        card.classList.add("has-icon");
      }
    }

    if (title) {
      const parts = project.titleParts || [project.title];
      parts.forEach((part, partIndex) => {
        if (partIndex > 0) title.append(document.createElement("wbr"));
        title.append(document.createTextNode(part));
      });
    }
    if (year) year.textContent = String(project.year);
    if (description) description.textContent = project.description;

    if (icon) {
      if (project.icon) {
        icon.hidden = false;
        icon.src = project.icon;
        icon.alt = `${project.title} icon`;
      } else {
        icon.remove();
      }
    }

    if (media && image) {
      if (project.image) {
        const { src, width, height, bounds } = project.image;
        const [x, y, contentWidth, contentHeight] = bounds;
        media.hidden = false;
        media.style.aspectRatio = `${contentWidth} / ${contentHeight}`;
        media.style.setProperty(
          "--project-image-inline-scale",
          String(Math.min(1, contentWidth / contentHeight))
        );
        image.src = src;
        image.alt = `${project.title} project preview`;
        image.width = width;
        image.height = height;
        image.style.width = `${(width / contentWidth) * 100}%`;
        image.style.left = `${(-x / contentWidth) * 100}%`;
        image.style.top = `${(-y / contentHeight) * 100}%`;
        image.draggable = false;
      } else {
        media.remove();
      }
    }

    if (categories) {
      if (project.categories?.length) {
        categories.hidden = false;
        project.categories.forEach((category) => {
          const pill = document.createElement("span");
          pill.className = "discipline-pill project-category-pill";

          const label = document.createElement("span");
          label.className = "discipline-pill__label";
          label.textContent = category;

          pill.appendChild(label);
          categories.appendChild(pill);
        });
      } else {
        categories.remove();
      }
    }

    if (projectLink) {
      if (project.url) {
        projectLink.hidden = false;
        projectLink.href = project.url;
        projectLink.setAttribute("aria-label", `Open ${project.title}`);
      } else {
        projectLink.remove();
      }
    }

    stack.appendChild(fragment);
  });
}

function renderDisciplines() {
  const stack = document.getElementById("discipline-stack");
  const template = document.getElementById("discipline-card-template");

  if (!stack || !template) {
    return;
  }

  stack.innerHTML = "";
  delete stack.dataset.stackReady;

  disciplines.forEach((discipline, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".discipline-stack-card");
    const title = fragment.querySelector(".discipline-stack-card__title");
    const bodyText = fragment.querySelector(".discipline-stack-card__body");
    const arsenal = fragment.querySelector(".discipline-stack-card__arsenal");

    if (card) {
      card.dataset.index = String(index);
      card.dataset.slug = discipline.slug;
      card.dataset.tone = discipline.tone;
      card.classList.add(`discipline-stack-card--${discipline.slug}`);
    }

    if (title) title.textContent = discipline.title;
    if (bodyText) bodyText.textContent = discipline.text;

    if (arsenal) {
      if (discipline.arsenal?.length) {
        arsenal.hidden = false;
        arsenal.dataset.arsenalKind = discipline.arsenalKind || "";

        discipline.arsenal.forEach((item) => {
          const pill = document.createElement("span");
          pill.className = "discipline-pill";
          if (item.label) {
            pill.classList.add(
              `discipline-pill--${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
            );
          }

          const icon = document.createElement("span");
          icon.className = "discipline-pill__icon";
          icon.setAttribute("aria-hidden", "true");

          if (item.iconUrl) {
            const image = document.createElement("img");
            image.src = item.iconUrl;
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.referrerPolicy = "no-referrer";
            image.draggable = false;
            icon.appendChild(image);
          }

          const label = document.createElement("span");
          label.className = "discipline-pill__label";
          label.textContent = item.label;

          pill.append(icon, label);
          arsenal.appendChild(pill);
        });
      } else {
        arsenal.remove();
      }
    }

    stack.appendChild(fragment);
  });
}

function initYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = year;
  });
  document.querySelectorAll("[data-year-prefix]").forEach((node) => {
    node.textContent = year.slice(0, 2);
  });
  document.querySelectorAll("[data-year-suffix]").forEach((node) => {
    node.textContent = year.slice(-2);
  });
  document.querySelectorAll("[data-year-label]").forEach((node) => {
    node.setAttribute("aria-label", year);
  });
}

export { disciplines, projects, renderProjects, renderDisciplines, initYear };
